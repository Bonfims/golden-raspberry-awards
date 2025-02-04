# Golden Raspberry Awards - Node API Test

Projeto proposto para resolução do teste.

> Detalhes do teste disponível em [Especificação Backend](./inc/Especificação%20Backend.pdf)

## Objetivo

- Desenvolva uma API RESTful para possibilitar a leitura da lista de indicados e vencedores da categoria Pior Filme do Golden Raspberry Awards.

- Obter o produtor com maior intervalo entre dois prêmios consecutivos, e o que
  obteve dois prêmios mais rápido, seguindo a especificação de formato definida na
  página 2.

## Requisitos

- O web service RESTful deve ser implementado com base no [nível 2 de maturidade
  de Richardson](https://rivaildojunior.medium.com/modelo-de-maturidade-de-richardson-para-apis-rest-8845f93b288).

- Devem ser implementados somente testes de integração. Eles devem garantir que
  os dados obtidos estão de acordo com os dados fornecidos na proposta.

- O banco de dados deve estar em memória utilizando um SGBD embarcado (por
  exemplo, H2). Nenhuma instalação externa deve ser necessária.

## Como usar

Após clonar o repositório, faça a instalação das dependências:

```
npm install
```

Em seguida, inicie o serviço:

```
npm start
```

**E para realizar o teste integrado**:

```
npm test
```
> Tanto o `test` quanto o `start` vão iniciar com o arquivo base [Movielist.csv](./data/Movielist.csv)  

> O `test` especifica testes integrados para `GET /api/producers/intervals` conforme especificado no documento [Especificação Backend](./inc/Especificação%20Backend.pdf)

### Testando com outros arquivos

Para executar o `test` ou o `start` da aplicação usando outro arquivo .csv como referencia, é possível passar o caminho como um argumento do comando:

```
npm start -- --csv=./data/other.csv
```

ou

```
npm test -- --csv=./data/other.csv
```

## Variáveis de Ambiente

```env
# Porta do Servidor
PORT=3000
# A inserção do conteúdo do CSV é feita em lotes, determine a quantidade de itens por lote
BATCH_SIZE=100
# Caminho do arquivo CSV para upload no inicio da aplicação
DATA_PATH="../../data/Movielist.csv"
```

## Considerações

A aplicação não valida o formato do arquivo CSV, assume que será enviado um arquivo com as colunas do arquivo base.

> Colunas `year;title;studios;producers;winner``

## APIs

Algumas rotas estão disponíveis à partir de `/api` ao iniciar a aplicação com `npm start`.

### 📌 GET /api/producers/intervals 

Retorna uma lista de produtores com maior intervalo entre dois prêmios e o que obteve dois prêmios mais rápido.

```
curl -X GET http://localhost:3000/api/producers/intervals
```

Exemplo de retorno:

```JSON
{
  "min": [
    {
      "producer": "Joel Silver",
      "interval": 1,
      "previousWin": 1990,
      "followingWin": 1991
    }
  ],
  "max": [
    {
      "producer": "Buzz Feitshans",
      "interval": 9,
      "previousWin": 1985,
      "followingWin": 1994
    }
  ]
}
```


### GET /api/producers

Retorna uma lista de produtores e seus filmes

```
curl -X GET http://localhost:3000/api/producers
```

### GET /movies

Retorna uma lista de filmes

```
curl -X GET http://localhost:3000/api/movies
```

### POST /movies

Insere um ou mais filmes na base

```
curl -X POST http://localhost:3000/api/movies -H "Content-Type: application/json" \
-d '{"title":"Shield Enemies","studios":"Marvel","year":"2020","producers":"Some Guy and Gun James","winner":"yes"}'
```

## POST /movies/upload

Faz upload do arquivo csv com os dados dos filmes

```
curl -X POST http://localhost:3000/api/movies/upload -H "Content-Type: text/csv" \
--data-binary "@./data/test.csv"
```
