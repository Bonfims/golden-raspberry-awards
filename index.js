"use strict";

const path = require('path');

const { 
    openDB, 
    closeDB
} = require('./src/lib/db');

const {
    insertMoviesFromCsvDataPath
} = require('./src/utils/insert-from-csv');

const app = require('./src/server');
const port = process.env?.PORT ?? 3000;

// ... Caminho do arquivo CSV que será carregado
const csvArg = process.argv.find(arg => arg.startsWith('--csv='));
const csvPath = path.resolve(__dirname, 
    csvArg?.replace('--csv=', '') ?? 
    process.env.DATA_PATH ?? 
    `./data/Movielist.csv`
);

// ... Abre a conexão com o banco
openDB()
    // ... Carrega os arquivos .csv em ../data
    .then(async (db) => {
        await insertMoviesFromCsvDataPath(db, csvPath);
        console.log("Arquivo CSV carregado com sucesso.")

        // ... Inicia o express propagando o `db`
        app.locals.db = db;

        const server = app.listen(port, () => {
            console.log(`NodeJS Teste API rodando na porta ${port}`);
        });

        // ... encerrando servidor e fechando conexão com o banco
        //process.on('SIGINT', () => {
        //    server.close(() => closeDB(db).finally(() => process.exit(0)))
        //});
    })
.catch(err => {
    console.error(`Falha ao iniciar o banco de dados`, err);
    process.exit(1);
});