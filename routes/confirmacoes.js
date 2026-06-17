const express = require('express');
const Confirmacao = require('../models/Confirmacao');
const Ocorrencia = require('../models/Ocorrencia');
const { authenticate } = require('../middleware/auth');
const { registrarLog } = require('../lib/sideEffects');

const router = express.Router();

router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.ocorrenciaId) filter.ocorrenciaId = req.query.ocorrenciaId;

  const total = await Confirmacao.countDocuments(filter);
  res.json({ total });
});

router.post('/', authenticate, async (req, res) => {
  try {
    const ocorrenciaId = req.body.ocorrenciaId;

    if (!ocorrenciaId) {
      return res.status(400).json({ erro: 'Informe a ocorrência a ser confirmada' });
    }

    const ocorrencia = await Ocorrencia.findById(ocorrenciaId);

    if (!ocorrencia) {
      return res.status(404).json({ erro: 'Ocorrência não encontrada' });
    }

    const autorId = ocorrencia.usuarioId?._id
      || ocorrencia.usuarioId?.id
      || ocorrencia.usuarioId
      || null;

    if (autorId && String(autorId) === String(req.user.id)) {
      return res.status(403).json({ erro: 'Você não pode confirmar sua própria ocorrência' });
    }

    const existente = await Confirmacao.findOne({ ocorrenciaId, usuarioId: req.user.id });

    if (existente) {
      return res.status(409).json({ erro: 'Você já confirmou este problema' });
    }

    const confirmacao = await Confirmacao.create({ ocorrenciaId, usuarioId: req.user.id });
    await registrarLog({ usuarioId: req.user.id, acao: 'CREATE', colecao: 'Confirmacao', documentoId: String(confirmacao._id) });

    const total = await Confirmacao.countDocuments({ ocorrenciaId });
    res.status(201).json({ confirmacao, mensagem: `${total} pessoas confirmam este problema`, total });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao confirmar ocorrência' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  const confirmacao = await Confirmacao.findById(req.params.id);

  if (!confirmacao) {
    return res.status(404).json({ erro: 'Confirmação não encontrada' });
  }

  if (String(confirmacao.usuarioId) !== String(req.user.id)) {
    return res.status(403).json({ erro: 'Acesso negado' });
  }

  await confirmacao.deleteOne();
  await registrarLog({ usuarioId: req.user.id, acao: 'DELETE', colecao: 'Confirmacao', documentoId: String(confirmacao._id) });
  res.json({ mensagem: 'Confirmação removida' });
});

module.exports = router;
