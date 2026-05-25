// ===============================
// InfraSantAlert - server.js
// ===============================

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const INITIAL_PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_ATTEMPTS = 10;

// ===============================
// Middlewares
// ===============================

app.use(cors());

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// ===============================
// Log das requisições
// ===============================

app.use((req, res, next) => {

    console.log(`${req.method} ${req.url}`);

    next();

});

// ===============================
// Modelo
// ===============================

const Via = require('./models/Via');

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
// ROTAS
// ===============================

// --------------------------------
// GET /vias
// Lista todas as vias
// --------------------------------

app.get('/vias', async (req, res) => {

    try {

        const vias = await Via.find().sort({
            dataCadastro: -1
        });

        res.json(vias);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            erro: 'Erro ao buscar vias'
        });

    }

});

// --------------------------------
// POST /vias
// Cadastra nova via
// --------------------------------

app.post('/vias', async (req, res) => {

    try {

        console.log(req.body);

        const {
            rua,
            bairro,
            status,
            motivo,
            previsaoLiberacao
        } = req.body;

        // validação simples
        if (!rua || !bairro || !status) {

            return res.status(400).json({
                erro: 'Preencha rua, bairro e status'
            });

        }

        const novaVia = new Via({

            rua,
            bairro,
            status,
            motivo,
            previsaoLiberacao

        });

        await novaVia.save();

        res.status(201).json(novaVia);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            erro: 'Erro ao cadastrar via'
        });

    }

});

// ===============================
// Frontend
// ===============================

app.get('*', (req, res) => {

    res.sendFile(path.join(__dirname, 'public', 'index.html'));

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

startServer(INITIAL_PORT);

// --------------------------------
// PATCH /vias/:id
// Atualiza status e/ou previsao de liberacao
// --------------------------------

app.patch('/vias/:id', async (req, res) => {

    try {

        const {
            id
        } = req.params;

        const {
            status,
            previsaoLiberacao
        } = req.body;

        const updateData = {};

        if (typeof status === 'string' && status.trim()) {
            updateData.status = status.trim();
        }

        if (typeof previsaoLiberacao === 'string' || previsaoLiberacao === null) {
            updateData.previsaoLiberacao = previsaoLiberacao;
        }

        if (!Object.keys(updateData).length) {
            return res.status(400).json({
                erro: 'Informe ao menos status ou previsaoLiberacao para atualizar'
            });
        }

        const viaAtualizada = await Via.findByIdAndUpdate(
            id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        );

        if (!viaAtualizada) {
            return res.status(404).json({
                erro: 'Via nao encontrada'
            });
        }

        res.json(viaAtualizada);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            erro: 'Erro ao atualizar via'
        });

    }

});