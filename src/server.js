"use strict";

const express = require('express');
const movies = require('./routes/movies');
const producers = require('./routes/producers');

const app = express();

app.use(express.json());

app.use(`/api`, [(req, _, next) => {
    // ... propaga o objeto que manipula o banco para ser usado no middleware.
    req.locals = { db: app.locals.db };
    next();
}, movies, producers]);

// ...
app.use((req, res, next) => {
    res.status(404).json({ error: 'Rota não encontrada.' });
});

// ...
app.use((err, req, res, next) => {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
});

module.exports = app;