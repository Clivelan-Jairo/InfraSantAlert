const express = require('express');
const Alerta = require('../models/Alerta');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { registrarLog, notificarUsuariosAtivos } = require('../lib/sideEffects');

const router = express.Router();

router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.ativo !== undefined) {
    filter.ativo = req.query.ativo === 'true';
  }

  const alertas = await Alerta.find(filter).sort({ dataCriacao: -1 });
  res.json(alertas);
});

router.post('/', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const alerta = await Alerta.create(req.body);
    await registrarLog({ usuarioId: req.user.id, acao: 'CREATE', colecao: 'Alerta', documentoId: String(alerta._id) });

    if (alerta.ativo) {
      await notificarUsuariosAtivos({ titulo: 'Novo alerta disponível', mensagem: alerta.titulo });
    }

    res.status(201).json(alerta);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao criar alerta' });
  }
});

router.put('/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const alerta = await Alerta.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (!alerta) {
      return res.status(404).json({ erro: 'Alerta não encontrado' });
    }

    await registrarLog({ usuarioId: req.user.id, acao: 'UPDATE', colecao: 'Alerta', documentoId: String(alerta._id) });
    res.json(alerta);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar alerta' });
  }
});

router.delete('/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const alerta = await Alerta.findByIdAndDelete(req.params.id);

    if (!alerta) {
      return res.status(404).json({ erro: 'Alerta não encontrado' });
    }

    await registrarLog({ usuarioId: req.user.id, acao: 'DELETE', colecao: 'Alerta', documentoId: String(alerta._id) });
    res.json({ mensagem: 'Alerta removido com sucesso' });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao remover alerta' });
  }
});

module.exports = router;