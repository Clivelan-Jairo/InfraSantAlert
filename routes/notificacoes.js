const express = require('express');
const Notificacao = require('../models/Notificacao');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  const notificacoes = await Notificacao.find({ usuarioId: req.user.id }).sort({ dataCriacao: -1 });
  const naoLidas = await Notificacao.countDocuments({ usuarioId: req.user.id, lida: false });
  res.json({ notificacoes, naoLidas });
});

router.patch('/:id/read', async (req, res) => {
  const notificacao = await Notificacao.findOneAndUpdate({ _id: req.params.id, usuarioId: req.user.id }, { lida: true }, { new: true });

  if (!notificacao) {
    return res.status(404).json({ erro: 'Notificação não encontrada' });
  }

  res.json(notificacao);
});

router.patch('/read-all', async (req, res) => {
  await Notificacao.updateMany({ usuarioId: req.user.id, lida: false }, { lida: true });
  res.json({ mensagem: 'Notificações marcadas como lidas' });
});

module.exports = router;