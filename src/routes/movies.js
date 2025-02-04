"use strict";

const {
    getAllMovies,
    insertMovie,
    insertMovies
} = require('../lib/db');

const {
    insertMoviesFromCsvStream,
    getFormattedMovieFromRow
} = require('../utils/insert-from-csv');

const express = require('express');
const router = express.Router();

// ... recebe o upload via arquivo csv
router.post('/movies/upload', async (req, res) => {
    // ...
    if (!req.headers['content-type'] || !req.headers['content-type'].includes('text/csv'))
        return res.status(400).json({ error: 'Envie um arquivo CSV válido' });

    try {
        await insertMoviesFromCsvStream(req.locals.db, req);
        res.status(200).json({ message: 'Arquivo processado com sucesso' });
    } catch (error) {
        console.error('Erro ao processar o arquivo:', error);
        res.status(500).json({ error: 'Erro interno ao processar o arquivo' });
    }
});

const checkMovie = (movie) =>
    typeof movie.winner == 'string' &&
    typeof movie.producers == 'string' &&
    movie.title && 
    movie.year &&
    movie.studios;

// ... insere um ou mais filmes via json
const insertOrUpdate = async (req, res) => {
    const movies = [req.body].flat();

    // ... validação simples
    if(movies.length <= 0 || !movies.every(checkMovie))
        return res.status(400).json({ error: 'Verifique os dados enviados' });

    try {
        if(movies.length == 1)
            await insertMovie(req.locals.db, getFormattedMovieFromRow(movies[0]));
        else
            await insertMovies(req.locals.db, movies.map(getFormattedMovieFromRow));

        res.status(200).json({ message: 'Dados inseridos com sucesso' });
    } catch(error){
        console.error('Erro ao processar requisição de inserção de filme JSON', error);
        res.status(500).json({ error: 'Erro interno ao processar requisição' });
    }
};

router.post('/movies', insertOrUpdate);
router.put('/movies', insertOrUpdate);

// ... retorna a lista de filmes
router.get('/movies', async (req, res) => {
    try {
        const results = await getAllMovies(req.locals.db);
        res.status(200).json(results);
    } catch (error) {
        console.error('Erro ao retornar lista de filmes', error);
        res.status(500).json({ error: 'Erro interno ao processar requisição' });
    }
}).all('/movies', (_, res) => res.status(405));

module.exports = router;