const mongoose = require('mongoose');

// Sub-schema: inspeção
const InspecaoSchema = new mongoose.Schema({
  data: { type: Date, default: Date.now },
  inspetorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String },
  observacoes: { type: String },
  fotos: [String],
});

// Sub-schema: manutenção
const ManutencaoSchema = new mongoose.Schema({
  dataInicio: { type: Date },
  dataFim: { type: Date },
  tipo: { type: String },
  custo: { type: Number },
  fornecedor: { type: String },
  status: { type: String },
  observacoes: { type: String },
});

// Schema para representar uma via em manutenção/interdição
const ViaSchema = new mongoose.Schema({
  rua: { type: String, required: true },
  bairro: { type: String, required: true },
  status: { type: String, required: true },
  motivo: { type: String },
  previsaoLiberacao: { type: String },
  dataCadastro: { type: Date, default: Date.now },
  // GeoJSON point para localizar a via
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
  // Trecho interditado: início/fim (lat/lng)
  blockedSegment: {
    from: { lat: Number, lng: Number },
    to: { lat: Number, lng: Number },
  },
  fotos: [String],
  // Referências a usuários inscritos para receber alertas sobre esta via
  subscribers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Histórico/coleções locais como subdocuments (inspecoes e manutencoes)
  inspecoes: [InspecaoSchema],
  manutencoes: [ManutencaoSchema],
});

// Index para consultas geoespaciais
ViaSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Via', ViaSchema);
