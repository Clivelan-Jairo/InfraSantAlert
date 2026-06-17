const mongoose = require('mongoose');

const NotificacaoSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  titulo: { type: String, required: true, trim: true },
  mensagem: { type: String, required: true, trim: true },
  lida: { type: Boolean, default: false },
  dataCriacao: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notificacao', NotificacaoSchema);