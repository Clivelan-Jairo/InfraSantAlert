const Notificacao = require('../models/Notificacao');
const Log = require('../models/Log');
const User = require('../models/User');

async function registrarLog({ usuarioId, acao, colecao, documentoId }) {
  try {
    if (!usuarioId || !acao || !colecao || !documentoId) {
      return null;
    }

    return await Log.create({ usuarioId, acao, colecao, documentoId });
  } catch (error) {
    return null;
  }
}

async function criarNotificacao({ usuarioId, titulo, mensagem }) {
  try {
    if (!usuarioId || !titulo || !mensagem) {
      return null;
    }

    return await Notificacao.create({ usuarioId, titulo, mensagem });
  } catch (error) {
    return null;
  }
}

async function notificarUsuariosAtivos({ titulo, mensagem }) {
  const usuarios = await User.find({ ativo: true }).select('_id');

  if (!usuarios.length) {
    return [];
  }

  return Notificacao.insertMany(usuarios.map((usuario) => ({ usuarioId: usuario._id, titulo, mensagem })));
}

async function notificarAdmins({ titulo, mensagem }) {
  const admins = await User.find({ ativo: true, perfil: 'admin' }).select('_id');

  if (!admins.length) {
    return [];
  }

  return Notificacao.insertMany(admins.map((usuario) => ({ usuarioId: usuario._id, titulo, mensagem })));
}

module.exports = { registrarLog, criarNotificacao, notificarUsuariosAtivos, notificarAdmins };