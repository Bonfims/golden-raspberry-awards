const sqlite3 = require("sqlite3");
const { open, Database } = require("sqlite");

/**
 * Iniciando a conexão com o banco de dados e garante a existência da tabela de filmes
 * @returns {Promise<Database>} db
 */
async function openDB() {
    const db = await open({
        filename: ":memory:",
        driver: sqlite3.Database
    });

    // ...
    await db.exec(`
        CREATE TABLE producers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );
    `);

    // ...
    await db.exec(`
        CREATE TABLE movies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            studios TEXT NOT NULL,
            year INTEGER NOT NULL,
            winner BOOLEAN NOT NULL,
            UNIQUE(title, studios, year)
        );
    `);

    // ...
    await db.exec(`
        CREATE TABLE movie_producers (
            movie_id INTEGER,
            producer_id INTEGER,
            FOREIGN KEY(movie_id) REFERENCES movies(id),
            FOREIGN KEY(producer_id) REFERENCES producers(id),
            PRIMARY KEY(movie_id, producer_id)
        );
    `);

    return db;
}

/**
 * Insere os dados de um filme no banco, caso o filme já exista os dados serão sobrepostos
 * @param {Database} db Objeto do banco de dados
 * @param {{ title: string, studios: string, producers: array<string>, year: string, winner: boolean }} movie Objeto com os metadados do filme
 */
async function insertMovie(db, { title, studios, producers, year, winner }) {

    // ... insere o filme na base
    const { lastID: movieID } = await db.run(
        `INSERT OR REPLACE INTO movies (title, studios, year, winner) VALUES (?, ?, ?, ?)`,
        [title, studios, year, winner]
    );
    
    for (let producer of producers) {
        // ... adiciona o nome do produtor na base
        const { lastID: producerID } = await db.run(
            `INSERT OR IGNORE INTO producers (name) VALUES (?)`,
            [producer]
        );

        // ... insere uma relação de filme x produtor na base
        await db.run(
            `INSERT INTO movie_producers (movie_id, producer_id) VALUES (?, ?)`,
            [movieID, producerID]
        );
    }
}

/**
 * Divide uma lista em sub listas menores (tamanho de sub lista determinado por `size`)
 * @param {Array<T>} list Lista a ser dividida
 * @param {number} size Número máximo de itens por sub lista
 * @returns {Array<Array<T>>} Lista dividida
 */
function splitList(list, size) {
    const lists = [];
    for (let i = 0; i < list.length; i += size) {
        lists.push(list.slice(i, i + size));
    }
    return lists;
}

/**
 * Insere uma lista de filmes no banco
 * @param {Database} db Objeto do banco de dados
 * @param {Array<{title: string, studios: string, producers: array<string>, year: string, winner: boolean}>} movies Lista de filmes
 */
async function insertMovies(db, movies) {
    try {
        await db.run("BEGIN TRANSACTION");

        const list = [...movies];

        // ... Inserindo os filmes e gerando ids
        const mStmt = await db.prepare(`
            INSERT OR REPLACE INTO movies (title, studios, year, winner) VALUES (?, ?, ?, ?)
        `);
        // ...
        for(let movie of list){
            const { lastID: movieID } = await mStmt.run(movie.title, movie.studios, movie.year, movie.winner);
            movie.id = movieID;
        }
        
        await mStmt.finalize();

        // ... inserindo os produtores
        const producers = [...new Set(list.flat().map(movie => movie.producers).flat())]; // ... gerando uma lista de produtores, sem duplicadas
        // ... tentando proteger para que a string do sql não estoure em função do volume (1000 nomes de produtor por vez)
        const producersBatches = splitList(producers, 1000);
        for(let batch of producersBatches)
            await db.run(`INSERT OR IGNORE INTO producers (name) VALUES ${batch.map(() => '(?)').join(', ')}`, batch);
     
        // ... associar filmes e produtores
        const mpStmt = await db.prepare(`
            INSERT INTO movie_producers (movie_id, producer_id)
            VALUES (?, (SELECT id FROM producers WHERE name = ?))
        `);

        for(let movie of list){
            for(let producer of movie.producers)
                await mpStmt.run(movie.id, producer);
        }

        await mpStmt.finalize();

        await db.run("COMMIT");
    } catch (error) {
        await db.run("ROLLBACK");
        throw error;
    }
}

/**
 * Retorna uma lista de produtores indicando o que teve maior intervalo de tempo entre dois prêmios e o que o menor intervalo de tempo entre dois prêmios
 * @param {Database} db Objeto do banco de dados
 * @returns {Promise<{ maxInterval: object, minInterval: object }>}
 */
async function getProducersIntervals(db) {

    const query = `
        -- Seleciona os produtores com filmes vencedores
        WITH ranked AS (
            SELECT 
                p.name AS producer,
                m.year AS followingWin,
                LAG(m.year) OVER (PARTITION BY p.name ORDER BY m.year) AS previousWin
            FROM movies m
            JOIN movie_producers mp ON m.id = mp.movie_id
            JOIN producers p ON mp.producer_id = p.id
            WHERE m.winner = 1
        ),
        -- Determina o intervalo entre um premio e outro por produtor
        intervals AS (
            SELECT 
                producer,
                previousWin,
                followingWin,
                followingWin - previousWin AS interval
            FROM ranked
            WHERE previousWin IS NOT NULL
        ),
        -- Indica os produtores que tem o maior intervalo da amostra
        max_interval AS (
            SELECT producer, interval, previousWin, followingWin
            FROM intervals
            WHERE interval = (SELECT MAX(interval) FROM intervals)
        ),
        -- Indica os produtores que tem o menor intervalo da amostra
        min_interval AS (
            SELECT producer, interval, previousWin, followingWin
            FROM intervals
            WHERE interval = (SELECT MIN(interval) FROM intervals)
        )
        -- Formata a Saida com um identificador 'type'
        SELECT 'max' AS type, producer, interval, previousWin, followingWin FROM max_interval
        UNION ALL
        SELECT 'min', producer, interval, previousWin, followingWin FROM min_interval;    
    `;

    const results = await db.all(query);

    return results;
}

async function getAllMovies(db){
    return db.all(`SELECT m.*, GROUP_CONCAT(p.name, ', ') AS producers FROM movies m 
        LEFT JOIN movie_producers mp ON m.id = mp.movie_id
        LEFT JOIN producers p ON mp.producer_id = p.id
        GROUP BY m.id
    `);
}

async function getAllProducers(db){
    return db.all(`SELECT p.*, GROUP_CONCAT(m.title, ', ') AS movies FROM producers p
        LEFT JOIN movie_producers mp ON p.id = mp.producer_id
        LEFT JOIN movies m ON mp.movie_id = m.id
        GROUP BY p.id
    `);
}

/**
 * Fecha a conexão com o banco de dados.
 * @param {Database} db Objeto do banco de dados
 */
async function closeDB(db) {
    await db.close();
}

module.exports = { openDB, closeDB, insertMovie, insertMovies, getProducersIntervals, getAllMovies, getAllProducers };