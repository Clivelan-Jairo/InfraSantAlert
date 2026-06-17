const mongoose = require('mongoose');

const AlertaSchema = new mongoose.Schema({
  titulo: { type: String, required: true, trim: true },
  descricao: { type: String, required: true, trim: true },
  tipo: { type: String, enum: ['Interdição', 'Alagamento', 'Emergência', 'Manutenção'], required: true },
  prioridade: { type: String, enum: ['Baixa', 'Média', 'Alta'], default: 'Média' },
  ativo: { type: Boolean, default: true },
  dataCriacao: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Alerta', AlertaSchema);
