const mongoose = require('mongoose');

const ConfirmacaoSchema = new mongoose.Schema({
  ocorrenciaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ocorrencia', required: true, index: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  dataCriacao: { type: Date, default: Date.now },
});

ConfirmacaoSchema.index({ ocorrenciaId: 1, usuarioId: 1 }, { unique: true });

module.exports = mongoose.model('Confirmacao', ConfirmacaoSchema);