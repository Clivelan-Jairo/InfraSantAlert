const mongoose = require('mongoose');

const OcorrenciaSchema = new mongoose.Schema({
  titulo: { type: String, required: true, trim: true },
  descricao: { type: String, required: true, trim: true },
  categoria: { type: String, enum: ['Buraco', 'Ilumina\u00e7\u00e3o', 'Alagamento', 'Lixo', 'Sinaliza\u00e7\u00e3o', 'Outros'], required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  imagem: { type: String },
  status: { type: String, enum: ['pendente', 'confirmada', 'resolvida', 'rejeitada'], default: 'pendente' },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  dataCriacao: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Ocorrencia', OcorrenciaSchema);
