# Profit Tracker

This repository contains a React frontend (Vite) and a Node/Express backend. The
frontend communicates with the backend through HTTP requests. The instructions
below describe how to set up both parts for local development.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- A running PostgreSQL instance for the backend

## Running the Backend

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file inside `backend` with the following variables (adjust
   `CLIENT_URL` if your frontend will be served from a different host/port):
   ```bash
   DATABASE_URL=postgres://user:password@localhost:5432/profit_tracker
   JWT_SECRET=some-secret-key
   # Address of the frontend for CORS. Change if the frontend runs on a
   # different host/port.
   CLIENT_URL=http://localhost:4000
   ```
4. Start the backend in development mode:
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:3001/api`.

## Running the Frontend

1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file for Vite environment variables (optional):
   ```bash
   GEMINI_API_KEY=your-gemini-key
   # Override the backend URL if it is not http://localhost:3001/api
   VITE_API_URL=http://localhost:3001/api
   ```
4. Start the frontend:
   ```bash
   npm run dev
   ```
   The application will open at `http://localhost:4000` (or whatever port Vite
   chooses) and communicate with the backend using the URL defined in
   `VITE_API_URL`.

   To expose the dev server on your machine's network interface (for example to
   access it via a public IP or from another device), run Vite with the
   `--host` flag:
   ```bash
   npm run dev -- --host
   ```

## Notes

- The frontend uses the `VITE_API_URL` variable in `utils/apiClient.ts` to decide
  which backend URL to call. If this variable is not provided, it defaults to
  `http://localhost:3001/api`.
- When deploying, make sure both the backend and frontend are configured with
  the correct environment variables for your production environment.

## Running with Docker

The repository includes a `docker-compose.yml` file that builds the frontend, backend and a PostgreSQL database.

1. Ensure [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) are installed.
2. From the project root, run:
   ```bash
   docker-compose up --build
   ```
3. Access the application at `http://localhost:4000` and the API at `http://localhost:3001/api`.

The default database credentials are defined in `docker-compose.yml`. Adjust environment variables as needed.
