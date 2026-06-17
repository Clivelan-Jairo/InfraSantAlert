const express = require('express');
const Ocorrencia = require('../models/Ocorrencia');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { registrarLog, criarNotificacao, notificarAdmins } = require('../lib/sideEffects');

const router = express.Router();
const STATUS_VALIDOS = ['pendente', 'confirmada', 'resolvida', 'rejeitada'];

router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.categoria) filter.categoria = req.query.categoria;

  const ocorrencias = await Ocorrencia.find(filter).sort({ dataCriacao: -1 }).populate('usuarioId', 'nome email perfil');
  res.json(ocorrencias);
});

router.get('/:id', async (req, res) => {
  const ocorrencia = await Ocorrencia.findById(req.params.id).populate('usuarioId', 'nome email perfil');

  if (!ocorrencia) {
    return res.status(404).json({ erro: 'Ocorrência não encontrada' });
  }

  res.json(ocorrencia);
});

router.post('/', authenticate, async (req, res) => {
  try {
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const categoria = String(req.body.categoria || '').trim();
    const descricao = String(req.body.descricao || '').trim();

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !categoria || !descricao) {
      return res.status(400).json({ erro: 'Informe latitude, longitude, tipo e descrição da ocorrência' });
    }

    const ocorrencia = await Ocorrencia.create({
      titulo: req.body.titulo || categoria,
      descricao,
      categoria,
      latitude,
      longitude,
      imagem: req.body.imagem,
      status: 'pendente',
      usuarioId: req.user.id,
    });

    await registrarLog({ usuarioId: req.user.id, acao: 'CREATE', colecao: 'Ocorrencia', documentoId: String(ocorrencia._id) });
    await notificarAdmins({ titulo: 'Nova ocorrência registrada', mensagem: `Uma ocorrência de ${ocorrencia.categoria} foi registrada por ${req.user.nome}.` });

    res.status(201).json(ocorrencia);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao cadastrar ocorrência' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const ocorrencia = await Ocorrencia.findById(req.params.id);

    if (!ocorrencia) {
      return res.status(404).json({ erro: 'Ocorrência não encontrada' });
    }

    const ehAdmin = req.user.perfil === 'admin';
    const ehDono = String(ocorrencia.usuarioId) === String(req.user.id);

    if (!ehAdmin && !ehDono) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    ['titulo', 'descricao', 'categoria', 'latitude', 'longitude', 'imagem'].forEach((campo) => {
      if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
        ocorrencia[campo] = req.body[campo];
      }
    });

    if (ehAdmin && Object.prototype.hasOwnProperty.call(req.body, 'status')) {
      if (!STATUS_VALIDOS.includes(req.body.status)) {
        return res.status(400).json({ erro: 'Status de ocorrência inválido' });
      }
      ocorrencia.status = req.body.status;
    }

    ocorrencia.updatedAt = new Date();
    await ocorrencia.save();

    await registrarLog({ usuarioId: req.user.id, acao: 'UPDATE', colecao: 'Ocorrencia', documentoId: String(ocorrencia._id) });

    if (ehAdmin) {
      await criarNotificacao({ usuarioId: ocorrencia.usuarioId, titulo: 'Ocorrência atualizada', mensagem: `Sua ocorrência ${ocorrencia.titulo} foi atualizada para ${ocorrencia.status}.` });
    }

    res.json(ocorrencia);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar ocorrência' });
  }
});

router.delete('/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const ocorrencia = await Ocorrencia.findByIdAndDelete(req.params.id);

    if (!ocorrencia) {
      return res.status(404).json({ erro: 'Ocorrência não encontrada' });
    }

    await registrarLog({ usuarioId: req.user.id, acao: 'DELETE', colecao: 'Ocorrencia', documentoId: String(ocorrencia._id) });
    res.json({ mensagem: 'Ocorrência removida com sucesso' });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao remover ocorrência' });
  }
});

module.exports = router;
