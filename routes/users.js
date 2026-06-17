const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { registrarLog } = require('../lib/sideEffects');

const router = express.Router();

router.use(authenticate);

router.get('/', authorizeRoles('admin'), async (req, res) => {
  const usuarios = await User.find().sort({ createdAt: -1 });
  res.json(usuarios);
});

router.get('/me', async (req, res) => {
  const usuario = await User.findById(req.user.id).select('nome email perfil ativo createdAt updatedAt');
  res.json(usuario);
});

router.post('/', authorizeRoles('admin'), async (req, res) => {
  try {
    const { nome, email, senha, perfil, ativo } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Informe nome, email e senha' });
    }

    const usuario = await User.create({
      nome,
      email,
      senhaHash: await bcrypt.hash(String(senha), 10),
      perfil: perfil === 'admin' ? 'admin' : 'usuario',
      ativo: typeof ativo === 'boolean' ? ativo : true,
    });

    await registrarLog({ usuarioId: req.user.id, acao: 'CREATE', colecao: 'User', documentoId: String(usuario._id) });

    res.status(201).json(usuario);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ erro: 'Email já cadastrado' });
    }

    res.status(500).json({ erro: 'Erro ao cadastrar usuário' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const usuario = await User.findById(req.params.id).select('+senhaHash');

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    const podeEditar = req.user.perfil === 'admin' || String(req.user.id) === String(usuario._id);

    if (!podeEditar) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    ['nome', 'email'].forEach((campo) => {
      if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
        usuario[campo] = req.body[campo];
      }
    });
    
    if (req.user.perfil === 'admin') {
      if (Object.prototype.hasOwnProperty.call(req.body, 'perfil')) usuario.perfil = req.body.perfil;
      if (Object.prototype.hasOwnProperty.call(req.body, 'ativo')) usuario.ativo = req.body.ativo;
    }

    if (req.body.senha) {
      usuario.senhaHash = await bcrypt.hash(String(req.body.senha), 10);
    }

    usuario.updatedAt = new Date();
    await usuario.save();

    await registrarLog({ usuarioId: req.user.id, acao: 'UPDATE', colecao: 'User', documentoId: String(usuario._id) });

    res.json(usuario);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar usuário' });
  }
});

router.delete('/:id', authorizeRoles('admin'), async (req, res) => {
  try {
    const usuario = await User.findByIdAndUpdate(req.params.id, { ativo: false, updatedAt: new Date() }, { new: true });

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    await registrarLog({ usuarioId: req.user.id, acao: 'DELETE', colecao: 'User', documentoId: String(usuario._id) });

    res.json({ mensagem: 'Usuário bloqueado com sucesso' });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao bloquear usuário' });
  }
});

module.exports = router;