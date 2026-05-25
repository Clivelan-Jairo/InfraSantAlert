// ===============================
// InfraSantAlert - server.js
// ===============================

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => {

    console.log(`Servidor rodando em http://localhost:${PORT}`);

});