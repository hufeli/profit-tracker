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

   O script `dev` já expõe o servidor de desenvolvimento em todas as interfaces
   de rede (`0.0.0.0`) na porta `4000`. A aplicação poderá ser acessada pelo IP
   público da máquina e se comunicará com o backend usando a URL definida em
   `VITE_API_URL`.

=======
   A aplicação abrirá em `http://localhost:4000` (ou na porta escolhida pelo Vite)
   e se comunicará com o backend usando a URL definida em `VITE_API_URL`.

   Para expor o servidor de desenvolvimento na interface de rede da máquina
   (por exemplo para acessá-lo por um IP público ou de outro dispositivo), execute o
   Vite com a flag `--host`:
   ```bash
   npm run dev -- --host
   ```
## Observações

- O frontend utiliza a variável `VITE_API_URL` em `utils/apiClient.ts` para decidir
  qual URL do backend chamar. Se essa variável não for fornecida, o padrão é
  `http://localhost:3001/api`.
- Ao fazer o deploy, verifique se tanto o backend quanto o frontend estão
  configurados com as variáveis de ambiente corretas para o seu ambiente de produção.

## Executando com Docker

O repositório inclui um arquivo `docker-compose.yml` que monta o frontend, o backend e um banco PostgreSQL.
As variáveis de ambiente podem ser definidas em um arquivo `.env` na raiz do projeto (veja `.env.example`).

1. Certifique-se de que [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/install/) estão instalados.
2. Copie o arquivo de exemplo e ajuste as variáveis desejadas:
   ```bash
   cp .env.example .env
   ```
3. A partir da raiz do projeto, execute:
   ```bash
   docker-compose up --build
   ```
4. Acesse a aplicação em `http://localhost:4000` e a API em `http://localhost:3001/api`.

As credenciais padrão do banco e as portas podem ser sobrescritas pelas variáveis definidas no arquivo `.env` ou diretamente no ambiente.
