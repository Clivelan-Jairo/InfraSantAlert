const mongoose = require('mongoose');

// Schema para representar uma via em manutenção/interdição
const ViaSchema = new mongoose.Schema({
  rua: { type: String, required: true },
  bairro: { type: String, required: true },
  status: { type: String, required: true },
  motivo: { type: String },
  previsaoLiberacao: { type: String },
  dataCadastro: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Via', ViaSchema);
