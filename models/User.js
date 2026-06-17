const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  senhaHash: { type: String, required: true, select: false },
  perfil: { type: String, enum: ['admin', 'usuario'], default: 'usuario' },
  ativo: { type: Boolean, default: true },
  telefone: { type: String },
  // Se true, recebe alertas de novas vias automaticamente
  notifyOnNewVia: { type: Boolean, default: true },
  // Preferências: por tipo de alerta, canais, etc.
  preferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
  },
  // Tokens de dispositivo para push notifications (opcional)
  deviceTokens: [String],
  // Vias que o usuário quer acompanhar explicitamente
  subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Via' }],
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);
