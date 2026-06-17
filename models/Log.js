const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  acao: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN'], required: true },
  colecao: { type: String, required: true, trim: true },
  documentoId: { type: String, required: true, trim: true },
  dataCriacao: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Log', LogSchema);