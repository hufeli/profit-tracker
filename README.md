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
3. Create a `.env` file inside `backend` with the following variables:
   ```bash
   DATABASE_URL=postgres://user:password@localhost:5432/profit_tracker
   JWT_SECRET=some-secret-key
   # Address of the frontend for CORS. Change if the frontend runs on a
   # different host/port.
   CLIENT_URL=http://localhost:3000
   ```
4. Start the backend in development mode:
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:3001/api`.

## Running the Frontend

From the repository root:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file for Vite environment variables (optional):
   ```bash
   GEMINI_API_KEY=your-gemini-key
   # Override the backend URL if it is not http://localhost:3001/api
   VITE_API_URL=http://localhost:3001/api
   ```
3. Start the frontend:
   ```bash
   npm run dev
   ```
   The application will open at `http://localhost:3000` and communicate with the
   backend using the URL defined in `VITE_API_URL`.

## Notes

- The frontend uses the `VITE_API_URL` variable in `utils/apiClient.ts` to decide
  which backend URL to call. If this variable is not provided, it defaults to
  `http://localhost:3001/api`.
- When deploying, make sure both the backend and frontend are configured with
  the correct environment variables for your production environment.
