"use strict";

const path = require("path");
const fs = require("fs");

const request = require("supertest");
const app = require("../server");

const {
    openDB,
    closeDB
} = require("../lib/db");

const {
    insertMoviesFromCsvDataPath
} = require("../utils/insert-from-csv");


// ... Caminho do arquivo CSV que será carregado
const csvArg = process.argv.find(arg => arg.startsWith('--csv='));
const csvPath = path.resolve(__dirname, "../..", 
    csvArg?.replace('--csv=', '') ?? 
    process.env.DATA_PATH ?? 
    `./data/Movielist.csv`
);

// ... retorno esperado para a API de intervalos
const expectedResponse = require("./expected-intervals");

let db;

beforeAll(async () => {
    // ...
    app.locals.db = db = await openDB();
    // ...
    await insertMoviesFromCsvDataPath(db, csvPath);
});

afterAll(async () => {
    // ...
    await closeDB(db);
});

describe("Testes de integração da API", () => {
    // ...
    describe("Rotas de Produtores", () => {
        test("GET /api/producers deve retornar uma lista de produtores", async () => {
            const res = await request(app).get("/api/producers");
            expect(Array.isArray(res.body)).toBe(true);
            if (res.body.length > 0) {
                const producer = res.body[0];
                expect(producer).toHaveProperty("name");
                expect(producer).toHaveProperty("movies");
            }
        });

        test("GET /api/producers/intervals produtores com premiações consecutivas (min/max)", async () => {
            const res = await request(app).get("/api/producers/intervals");
            expect(res.status).toBe(200);
            // ... verifica as propriedades do body
            expect(res.body).toHaveProperty("max");
            expect(res.body).toHaveProperty("min");
            // ... `min` e `max` precisam ser uma lista
            expect(Array.isArray(res.body.max)).toBe(true);
            expect(Array.isArray(res.body.min)).toBe(true);

            // ... verifica as propriedades de cada item dentro de `min` e `max`
            let props = [res.body.min, res.body.max];
            for(let prop of props){
                for(let item of prop){
                    expect(item).toHaveProperty("producer");
                    expect(item).toHaveProperty("interval");
                    expect(item).toHaveProperty("followingWin");
                    expect(item).toHaveProperty("previousWin");

                    // ... adicionando verificação de tipo
                    expect(typeof item?.producer).toBe("string");
                    expect(isNaN(item?.interval)).toBe(false);
                    expect(isNaN(item?.followingWin)).toBe(false);
                    expect(isNaN(item?.previousWin)).toBe(false);
                }    
            }
            
            // ... tentando validar para falhar se o arquivo for modificado de forma que qualquer aspecto do resultado (esperado com base no csv padrão Movielist) mude.
            expect(res.body).toEqual(expectedResponse);
        });
    });

    // ...
    describe("Rotas de Filmes", () => {
        test("GET /api/movies deve retornar uma lista de filmes", async () => {
            const res = await request(app).get("/api/movies");
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);

            // ... Verifica se cada filme possui as propriedades esperadas
            if (res.body.length > 0) {
                const movie = res.body[0];
                expect(movie).toHaveProperty("title");
                expect(movie).toHaveProperty("studios");
                expect(movie).toHaveProperty("year");
                expect(movie).toHaveProperty("winner");
                expect(movie).toHaveProperty("producers");
            }
        });

        test("POST /api/movies deve inserir um novo filme", async () => {
            const newMovie = {
                title: "New Movie",
                studios: "Studios X",
                year: "2024",
                winner: "",
                producers: "Producer 1 and Producer 2"
            };

            // Insere o filme via POST
            const resPost = await request(app).post("/api/movies").send(newMovie);
            expect(resPost.status).toBe(200);
            expect(resPost.body).toEqual({ message: "Dados inseridos com sucesso" });

            // Verifica se o filme foi inserido recuperando a lista e buscando o novo registro
            const resGet = await request(app).get("/api/movies");
            expect(resGet.status).toBe(200);
            expect(resGet.body.some(filme => filme.title === newMovie.title)).toBe(true);
        });

        test("POST /api/movies inserção em massa e concorrente (?)", async () => {
            const newMovies = [{
                title: "New Movie 1",
                studios: "Studios Y",
                year: "2022",
                winner: "",
                producers: "Producer 3 and Producer 4"
            }, {
                title: "New Movie 2",
                studios: "Studios Z",
                year: "2023",
                winner: "",
                producers: "Producer 5 and Producer 6"
            }];

            const otherMovie = {
                title: "Other Movie X",
                studios: "Studios AVC",
                year: "2025",
                winner: "",
                producers: "Producer T and Producer F"
            }

            // Insere o filme via POST
            const resPosts = await Promise.all([
                await request(app).post("/api/movies").send(newMovies),
                await request(app).post("/api/movies").send(otherMovie)
            ]);

            for(let resPost of resPosts){
                expect(resPost.status).toBe(200);
                expect(resPost.body).toEqual({ message: "Dados inseridos com sucesso" });
            }

            // Verifica se o filme foi inserido recuperando a lista e buscando o novo registro
            const resGet = await request(app).get("/api/movies");
            expect(resGet.status).toBe(200);
            expect(resGet.body.some(filme => filme.title === otherMovie.title)).toBe(true);
            expect(resGet.body.some(filme => filme.title === newMovies[0].title)).toBe(true);
        });

        test("POST /api/movies/upload inserção com upload de arquivo CSV", async () => {
            const file = path.resolve(__dirname, "../../data/test.csv");
            const content = fs.readFileSync(file);
            // ...
            const res = await request(app)
                .post("/api/movies/upload")
                .set("Content-Type", "text/csv")
                .send(content);

            // ...
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ message: "Arquivo processado com sucesso" });
            // Verifica se o filme foi inserido recuperando a lista e buscando o novo registro
            const resGet = await request(app).get("/api/movies");
            expect(resGet.status).toBe(200);
            expect(resGet.body.some(filme => filme.title === "Can't Stop the Test")).toBe(true); // ... do arquivo data/test.csv
        });

        test("POST /api/movies com dados inválidos deve retornar 400", async () => {
            // Envia um objeto sem as propriedades obrigatórias
            const res = await request(app).post("/api/movies").send({ title: "empty" });
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("error");
        });

    });


    describe("Rotas inválidas", () => {
        test("Rota inválida retorna 404", async () => {
            const res = await request(app).get("/api/whatever");
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty("error", "Rota não encontrada.");
        });
    });

});
