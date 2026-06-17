const mongoose = require('mongoose');

const ComentarioSchema = new mongoose.Schema({
  ocorrenciaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ocorrencia', required: true, index: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  comentario: { type: String, required: true, trim: true },
  dataCriacao: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Comentario', ComentarioSchema);