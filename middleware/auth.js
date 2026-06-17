const jwt = require('jsonwebtoken');
const User = require('../models/User');

function getJwtSecret() {
  return process.env.JWT_SECRET || 'infrasantalert-dev-secret';
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ erro: 'Token de acesso ausente' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const user = await User.findById(payload.sub).select('nome email perfil ativo');

    if (!user || !user.ativo) {
      return res.status(401).json({ erro: 'Usuário inválido ou bloqueado' });
    }

    req.user = {
      id: String(user._id),
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ erro: 'Autenticação obrigatória' });
    }

    if (!roles.includes(req.user.perfil)) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    return next();
  };
}

module.exports = { authenticate, authorizeRoles, getJwtSecret };