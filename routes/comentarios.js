const express = require('express');
const Comentario = require('../models/Comentario');
const { authenticate } = require('../middleware/auth');
const { registrarLog } = require('../lib/sideEffects');

const router = express.Router();

router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.ocorrenciaId) filter.ocorrenciaId = req.query.ocorrenciaId;

  const comentarios = await Comentario.find(filter).sort({ dataCriacao: 1 }).populate('usuarioId', 'nome email perfil');
  res.json(comentarios);
});

router.post('/', authenticate, async (req, res) => {
  try {
    const comentario = await Comentario.create({
      ocorrenciaId: req.body.ocorrenciaId,
      usuarioId: req.user.id,
      comentario: req.body.comentario,
    });

    await registrarLog({ usuarioId: req.user.id, acao: 'CREATE', colecao: 'Comentario', documentoId: String(comentario._id) });
    res.status(201).json(comentario);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao criar comentário' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  const comentario = await Comentario.findById(req.params.id);

  if (!comentario) {
    return res.status(404).json({ erro: 'Comentário não encontrado' });
  }

  if (String(comentario.usuarioId) !== String(req.user.id) && req.user.perfil !== 'admin') {
    return res.status(403).json({ erro: 'Acesso negado' });
  }

  comentario.comentario = req.body.comentario || comentario.comentario;
  comentario.updatedAt = new Date();
  await comentario.save();

  await registrarLog({ usuarioId: req.user.id, acao: 'UPDATE', colecao: 'Comentario', documentoId: String(comentario._id) });
  res.json(comentario);
});

router.delete('/:id', authenticate, async (req, res) => {
  const comentario = await Comentario.findById(req.params.id);

  if (!comentario) {
    return res.status(404).json({ erro: 'Comentário não encontrado' });
  }

  if (String(comentario.usuarioId) !== String(req.user.id) && req.user.perfil !== 'admin') {
    return res.status(403).json({ erro: 'Acesso negado' });
  }

  await comentario.deleteOne();
  await registrarLog({ usuarioId: req.user.id, acao: 'DELETE', colecao: 'Comentario', documentoId: String(comentario._id) });
  res.json({ mensagem: 'Comentário removido com sucesso' });
});

module.exports = router;