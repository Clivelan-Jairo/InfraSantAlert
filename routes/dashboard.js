const express = require('express');
const User = require('../models/User');
const Ocorrencia = require('../models/Ocorrencia');
const Confirmacao = require('../models/Confirmacao');
const Alerta = require('../models/Alerta');
const Via = require('../models/Via');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorizeRoles('admin'));

router.get('/admin', async (req, res) => {
  const [totalUsuarios, totalOcorrencias, ocorrenciasPendentes, ocorrenciasConfirmadas, ocorrenciasResolvidas, alertasAtivos] = await Promise.all([
    User.countDocuments({}),
    Ocorrencia.countDocuments({}),
    Ocorrencia.countDocuments({ status: 'pendente' }),
    Ocorrencia.countDocuments({ status: 'confirmada' }),
    Ocorrencia.countDocuments({ status: 'resolvida' }),
    Alerta.countDocuments({ ativo: true }),
  ]);

  const ocorrenciasPorCategoria = await Ocorrencia.aggregate([{ $group: { _id: '$categoria', total: { $sum: 1 } } }, { $sort: { total: -1, _id: 1 } }]);
  const ocorrenciasPorStatus = await Ocorrencia.aggregate([{ $group: { _id: '$status', total: { $sum: 1 } } }, { $sort: { total: -1, _id: 1 } }]);
  const interdiccoesAtivas = await Via.countDocuments({ status: 'Interditada' });

  res.json({
    totais: { totalUsuarios, totalOcorrencias, ocorrenciasPendentes, ocorrenciasConfirmadas, ocorrenciasResolvidas, alertasAtivos, interdiccoesAtivas },
    graficos: { ocorrenciasPorCategoria, ocorrenciasPorStatus },
  });
});

router.get('/top-ocorrencias', async (req, res) => {
  try {
    const topOcorrencias = await Confirmacao.aggregate([
      {
        $group: {
          _id: '$ocorrenciaId',
          confirmacoes: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: Ocorrencia.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'ocorrencia',
        },
      },
      { $unwind: '$ocorrencia' },
      { $match: { 'ocorrencia.status': { $in: ['pendente', 'confirmada'] } } },
      { $sort: { confirmacoes: -1, 'ocorrencia.dataCriacao': -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: '$ocorrencia._id',
          tipo: '$ocorrencia.categoria',
          descricao: '$ocorrencia.descricao',
          confirmacoes: 1,
          status: '$ocorrencia.status',
        },
      },
    ]);

    res.json(topOcorrencias);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao carregar top ocorrencias' });
  }
});

module.exports = router;
