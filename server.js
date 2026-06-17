// ===============================
// InfraSantAlert - server.js
// ===============================

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const viasRoutes = require('./routes/vias');
const ocorrenciasRoutes = require('./routes/ocorrencias');
const comentariosRoutes = require('./routes/comentarios');
const confirmacoesRoutes = require('./routes/confirmacoes');
const alertasRoutes = require('./routes/alertas');
const notificacoesRoutes = require('./routes/notificacoes');
const logsRoutes = require('./routes/logs');
const dashboardRoutes = require('./routes/dashboard');
const mapaRoutes = require('./routes/mapa');

const app = express();
const INITIAL_PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_ATTEMPTS = 10;

// ===============================
// Middlewares
// ===============================

app.use(cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

// ===============================
// Log das requisições
// ===============================

app.use((req, res, next) => {

    console.log(`${req.method} ${req.url}`);

    next();

});

// ===============================
// Conexão MongoDB
// ===============================

mongoose.connect(process.env.MONGODB_URI)
.then(() => {

    console.log('MongoDB conectado com sucesso');

})
.catch((error) => {

    console.log('Erro ao conectar MongoDB');
    console.log(error);

});

// ===============================
// Inicialização servidor
// ===============================

function startServer(port, attempt = 1) {

    const server = app.listen(port, () => {

        console.log(`Servidor rodando em http://localhost:${port}`);

    });

    server.on('error', (error) => {

        if (error.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS) {

            const nextPort = port + 1;

            console.log(`Porta ${port} ocupada. Tentando porta ${nextPort}...`);

            startServer(nextPort, attempt + 1);

            return;

        }

        console.log('Erro ao iniciar servidor');
        console.log(error);

        process.exit(1);

    });

}

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', name: 'InfraSantAlert API' });
});

app.use('/vias', viasRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/ocorrencias', ocorrenciasRoutes);
app.use('/api/comentarios', comentariosRoutes);
app.use('/api/confirmacoes', confirmacoesRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/mapa', mapaRoutes);

// ===============================
// Frontend (Deve ser a última rota)
// ===============================

app.get('*', (req, res) => {

    res.sendFile(path.join(__dirname, 'public', 'index.html'));

});

startServer(INITIAL_PORT);
