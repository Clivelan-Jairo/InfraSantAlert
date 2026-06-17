const express = require('express');
const Ocorrencia = require('../models/Ocorrencia');
const Alerta = require('../models/Alerta');
const Via = require('../models/Via');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/markers', async (req, res) => {
  const include = String(req.query.tipos || 'ocorrencias,alertas,interdicoes').split(',').map((item) => item.trim());
  const markers = [];

  if (include.includes('ocorrencias')) {
    const ocorrencias = await Ocorrencia.find({ status: { $in: ['pendente', 'confirmada'] } }).lean();
    ocorrencias.forEach((item) => markers.push({ tipo: 'ocorrencia', id: item._id, titulo: item.titulo, descricao: item.descricao, status: item.status, latitude: item.latitude, longitude: item.longitude, data: item.dataCriacao }));
  }

  if (include.includes('alertas')) {
    const alertas = await Alerta.find({ ativo: true }).lean();
    alertas.forEach((item) => {
      if (typeof item.latitude === 'number' && typeof item.longitude === 'number') {
        markers.push({ tipo: 'alerta', id: item._id, titulo: item.titulo, descricao: item.descricao, status: item.tipo, latitude: item.latitude, longitude: item.longitude, data: item.dataCriacao });
      }
    });
  }

  if (include.includes('interdicoes')) {
    const vias = await Via.find({ status: 'Interditada' }).lean();
    vias.forEach((item) => {
      const coordinates = item.location && Array.isArray(item.location.coordinates) ? item.location.coordinates : null;
      if (coordinates && coordinates.length === 2) {
        markers.push({ tipo: 'interdicao', id: item._id, titulo: item.rua, descricao: item.motivo, status: item.status, latitude: coordinates[1], longitude: coordinates[0], data: item.dataCadastro });
      }
    });
  }

  res.json(markers);
});

module.exports = router;
