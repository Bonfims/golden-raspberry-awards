"use strict";

const {
    getProducersIntervals,
    getAllProducers
} = require('../lib/db');

const express = require('express');
const router = express.Router();

// ... retorna os produtores com o maior e menor intervalo entre prêmios consecutivos.
router.get('/producers/intervals', async (req, res) => {
    try {
        const results = await getProducersIntervals(req.locals.db);
        const json = {
            min: results.filter(e => e.type == "min").map(e => { delete e.type; return e }),
            max: results.filter(e => e.type == "max").map(e => { delete e.type; return e }),
        };
        res.status(200).json(json);
    } catch(error){
        console.error('Erro ao realizar consulta de intervalo de prêmios por produtor', error);
        res.status(500).json({ error: 'Erro interno ao processar a requisição' });
    }
});

// ... retorna a lista de produtores
router.get('/producers', async (req, res) => {
    // ...
    try {
        const results = await getAllProducers(req.locals.db);
        res.status(200).json(results);
    } catch (error) {
        console.error('Erro ao retornar lista de produtores:', error);
        res.status(500).json({ error: 'Erro interno ao processar a requisição' });
    }
}).all('/producers', (_, res) => res.status(405));

module.exports = router;