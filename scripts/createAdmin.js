require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function main() {
  const email = normalizeEmail(process.argv[2]);

  if (!email) {
    console.error('Uso: node scripts/createAdmin.js usuario@example.com');
    process.exitCode = 1;
    return;
  }

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI nao definido no .env');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ email });

  if (!user) {
    console.error(`Usuario nao encontrado para o email: ${email}`);
    process.exitCode = 1;
    return;
  }

  if (user.perfil === 'admin') {
    console.log(`Usuario ja e admin: ${user.email}`);
    return;
  }

  user.perfil = 'admin';
  user.updatedAt = new Date();
  await user.save();

  console.log(`Usuario promovido para admin: ${user.email}`);
}

main()
  .catch((error) => {
    console.error('Erro ao promover usuario para admin');
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
