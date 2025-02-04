"use strict";

const fs = require('fs');
const parser = require('csv-parser');

const { insertMovies } = require('../lib/db');

/**
 * Quantas linhas serão inseridas por vez.
 */
const size = process.env.BATCH_SIZE ?? 100;

/**
 * Irá formatar os dados do filme em um objeto javascript.
 * @param {{year: string, title: string, studios: string, producers: string, winner: string}} row Objeto contendo as propriedades do filme
 * @returns {{year: string, title: string, studios: string, producers: array<string>, winner: boolean }} Metadados do filme
 */
function getFormattedMovieFromRow(row) {
    // ...
    return {
        ...row,
        winner: row.winner == "yes",
        producers: row.producers.replace(/ and /g, ", ").split(", ")
    };
};

/**
 * Vai processar a lista `rows` para inserir os dados dos filmes no banco
 * @param {object} db Objeto que manipula o banco
 * @param {array} rows Lote de linha para inserção
 */
async function processRowsQueue(db, rows) {
    const current = [...rows].filter(row => !!row).map(getFormattedMovieFromRow);
    rows.length = 0;
    await insertMovies(db, current);
};

/**
 * Carrega as linhas (contendo os metadados de cada filme) a partir de um stream de dados e insere no banco
 * @param {object} db Manipulador do banco
 * @param {object} csvStream Stream de dados CSV
 * @returns 
 */
async function insertMoviesFromCsvStream(db, csvStream) {
    // ... inicia com 0
    const rows = [];
    return new Promise((resolve, reject) => {
        const stream = csvStream.pipe(parser({ separator: ";" }));

        stream
            .on('data', (row) => {
                // ... pausa o stream para verificar o lote
                stream.pause();

                // Verifica se a linha possui algum valor não vazio
                const hasContent = Object.values(row).some(value => value !== "" && value !== null && typeof value !== "undefined");

                if (!hasContent) {
                    stream.resume();
                    return;
                }

                rows.push(row);
                if (rows.length > size) {
                    processRowsQueue(db, rows)
                        .then(() => stream.resume())
                        .catch(err => stream.destroy(err) | reject(err))
                } else
                    stream.resume();
            })
            .on('end', () => {
                if (rows.length > 0) {
                    processRowsQueue(db, rows)
                        .then(resolve)
                        .catch(reject);
                } else
                    resolve();
            })
            .on('error', reject);
    });
};

/**
 * Carrega as linhas (contendo os metadados de cada filme) do arquivo .csv e insere os dados no banco
 * @param {object} db Manipulador do banco
 * @param {string} filePath Caminho para o arquivo .csv
 * @returns 
 */
async function insertMoviesFromCsvDataPath(db, filePath) {
    console.log("Carregando arquivo csv de", filePath);
    const stream = fs.createReadStream(filePath);
    return insertMoviesFromCsvStream(db, stream);
};

module.exports = { getFormattedMovieFromRow, insertMoviesFromCsvDataPath, insertMoviesFromCsvStream };