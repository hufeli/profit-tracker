# Profit Tracker

Este repositório contém um frontend React (Vite) e um backend Node/Express.
O frontend se comunica com o backend por meio de requisições HTTP.
As instruções abaixo mostram como configurar ambas as partes para desenvolvimento local.

## Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 18 ou superior recomendada)
- Uma instância do PostgreSQL em execução para o backend

## Executando o Backend

1. Navegue até a pasta `backend`:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` dentro de `backend` com as seguintes variáveis (ajuste
   `CLIENT_URL` caso o frontend seja servido de outro host/porta):
   ```bash
   DATABASE_URL=postgres://user:password@localhost:5432/profit_tracker
   JWT_SECRET=some-secret-key
   # Endereço do frontend para CORS.
   # Altere "localhost" para o IP público se expor o Vite em 0.0.0.0:4000.
   CLIENT_URL=http://localhost:4000
   ```
4. Inicie o backend em modo de desenvolvimento:
   ```bash
   npm run dev
   ```
   A API estará disponível em `http://localhost:3001/api`.

## Executando o Frontend

1. Navegue até a pasta `frontend`:
   ```bash
   cd frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env.local` para variáveis de ambiente do Vite (opcional):
   ```bash
   GEMINI_API_KEY=your-gemini-key
   # Sobrescreva a URL do backend caso não seja http://localhost:3001/api
   VITE_API_URL=http://localhost:3001/api
   ```
4. Inicie o frontend:
   ```bash
   npm run dev
   ```
   A aplicação abrirá em `http://localhost:4000` (ou na porta escolhida pelo Vite)
   e se comunicará com o backend usando a URL definida em `VITE_API_URL`.

   Para expor o servidor de desenvolvimento em todas as interfaces de rede
   (por exemplo para acessá-lo por um IP público ou de outro dispositivo), execute o Vite
   especificando host e porta:
   ```bash
   npm run dev -- --host 0.0.0.0 --port 4000
   ```

## Observações

- O frontend utiliza a variável `VITE_API_URL` em `utils/apiClient.ts` para decidir
  qual URL do backend chamar. Se essa variável não for fornecida, o padrão é
  `http://localhost:3001/api`.
- Ao fazer o deploy, verifique se tanto o backend quanto o frontend estão
  configurados com as variáveis de ambiente corretas para o seu ambiente de produção.

## Executando com Docker

O repositório inclui um arquivo `docker-compose.yml` que monta o frontend, o backend e um banco PostgreSQL.

1. Certifique-se de que [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/install/) estão instalados.
2. A partir da raiz do projeto, execute:
   ```bash
   docker-compose up --build
   ```
3. Acesse a aplicação em `http://localhost:4000` e a API em `http://localhost:3001/api`.

As credenciais padrão do banco estão definidas em `docker-compose.yml`. Ajuste as variáveis de ambiente conforme necessário.
