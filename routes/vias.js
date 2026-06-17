const express = require('express');
const mongoose = require('mongoose');
const Via = require('../models/Via');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

function normalizeDateOnly(value) {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toISOString().slice(0, 10);
}

router.get('/', async (req, res) => {
  try {
    const vias = await Via.find().sort({ dataCadastro: -1 });
    res.json(vias);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar vias' });
  }
});

router.post('/', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { rua, bairro, status, motivo, previsaoLiberacao, blockedSegment, location } = req.body;

    if (!rua || !bairro || !status) {
      return res.status(400).json({ erro: 'Preencha rua, bairro e status' });
    }

    const novaVia = new Via({
      rua,
      bairro,
      status,
      motivo,
      previsaoLiberacao: normalizeDateOnly(previsaoLiberacao),
      blockedSegment: blockedSegment || undefined,
      location: location && typeof location === 'object' ? location : undefined,
    });

    await novaVia.save();
    res.status(201).json(novaVia);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao cadastrar via' });
  }
});

router.patch('/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ erro: 'ID invalido' });
    }
    
    const { status, previsaoLiberacao } = req.body;
    const updateData = {};

    if (typeof status === 'string' && status.trim()) updateData.status = status.trim();
    if (typeof previsaoLiberacao === 'string' || previsaoLiberacao === null) updateData.previsaoLiberacao = normalizeDateOnly(previsaoLiberacao);

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ erro: 'Informe ao menos status ou previsaoLiberacao para atualizar' });
    }

    const viaAtualizada = await Via.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!viaAtualizada) {
      return res.status(404).json({ erro: 'Via nao encontrada' });
    }

    res.json(viaAtualizada);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar via' });
  }
});

router.put('/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ erro: 'ID invalido' });
    }

    const { rua, bairro, status, motivo, previsaoLiberacao, blockedSegment, location } = req.body;
    const updateData = {};

    if (typeof rua === 'string' && rua.trim()) updateData.rua = rua.trim();
    if (typeof bairro === 'string' && bairro.trim()) updateData.bairro = bairro.trim();
    if (typeof status === 'string' && status.trim()) updateData.status = status.trim();
    if (typeof motivo === 'string') updateData.motivo = motivo;
    if (typeof previsaoLiberacao === 'string' || previsaoLiberacao === null) updateData.previsaoLiberacao = normalizeDateOnly(previsaoLiberacao);
    if (blockedSegment && typeof blockedSegment === 'object') updateData.blockedSegment = blockedSegment;
    if (location && typeof location === 'object') updateData.location = location;

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ erro: 'Informe ao menos um campo para atualizar' });
    }

    const viaAtualizada = await Via.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!viaAtualizada) {
      return res.status(404).json({ erro: 'Via nao encontrada' });
    }

    res.json(viaAtualizada);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar via' });
  }
});

router.delete('/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ erro: 'ID invalido' });
    }

    const viaRemovida = await Via.findByIdAndDelete(id);
    if (!viaRemovida) {
      return res.status(404).json({ erro: 'Via nao encontrada' });
    }

    res.json({ mensagem: 'Via removida com sucesso', id: viaRemovida._id });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao remover via' });
  }
});

module.exports = router;
