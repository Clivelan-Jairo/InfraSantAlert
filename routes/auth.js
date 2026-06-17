const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate, getJwtSecret } = require('../middleware/auth');
const { registrarLog } = require('../lib/sideEffects');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { perfil: user.perfil, nome: user.nome, email: user.email },
    getJwtSecret(),
    { subject: String(user._id), expiresIn: '7d' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Informe nome, email e senha' });
    }

    const user = await User.create({
      nome,
      email,
      senhaHash: await bcrypt.hash(String(senha), 10),
      perfil: 'usuario',
    });

    res.status(201).json({
      usuario: { id: user._id, nome: user.nome, email: user.email, perfil: user.perfil, ativo: user.ativo },
      token: signToken(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ erro: 'Email já cadastrado' });
    }

    res.status(500).json({ erro: 'Erro ao cadastrar usuário' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Informe email e senha' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+senhaHash');

    if (!user || !user.ativo) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const senhaValida = await bcrypt.compare(String(senha), user.senhaHash || '');
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    await registrarLog({ usuarioId: user._id, acao: 'LOGIN', colecao: 'User', documentoId: String(user._id) });

    res.json({
      usuario: { id: user._id, nome: user.nome, email: user.email, perfil: user.perfil, ativo: user.ativo },
      token: signToken(user),
    });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao autenticar usuário' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  const user = await User.findById(req.user.id).select('nome email perfil ativo createdAt updatedAt');
  res.json({ usuario: user });
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase().trim() }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.json({ mensagem: 'Se o email existir, você receberá instruções para redefinir a senha.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    res.json({ mensagem: 'Token de recuperação gerado com sucesso.', resetToken: process.env.NODE_ENV === 'production' ? undefined : resetToken });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao gerar recuperação de senha' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, senha } = req.body;

    if (!token || !senha) {
      return res.status(400).json({ erro: 'Informe token e nova senha' });
    }

    const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex');
    const user = await User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: new Date() } }).select('+senhaHash');

    if (!user) {
      return res.status(400).json({ erro: 'Token inválido ou expirado' });
    }

    user.senhaHash = await bcrypt.hash(String(senha), 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ mensagem: 'Senha alterada com sucesso' });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao redefinir senha' });
  }
});

module.exports = router;