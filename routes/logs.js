const express = require('express');
const Log = require('../models/Log');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorizeRoles('admin'));

router.get('/', async (req, res) => {
  const logs = await Log.find().sort({ dataCriacao: -1 }).populate('usuarioId', 'nome email perfil');
  res.json(logs);
});

module.exports = router;