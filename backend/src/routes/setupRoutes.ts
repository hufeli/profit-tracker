
import { Router, Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { query } from '../db'; // Main query function using the pool from db.ts
import process from 'process';
import { createTablesIfNotExist } from '../db/tableSetup';

dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Ensure .env from backend root is loaded

const router = Router();


// GET /api/setup/status
// Checks if the backend considers itself configured (e.g., DATABASE_URL is set and DB is accessible).
router.get('/status', async (req: Request, res: Response) => {
  if (!process.env.DATABASE_URL) {
    return res.json({ 
        isConfigured: false, 
        message: 'DATABASE_URL not configured in backend environment. Please add it to the backend .env file and restart the server.',
        requiresManualEnvUpdate: true
    });
  }
  try {
    await query('SELECT NOW()'); // Simple query to check DB connection
    // Further check if tables exist might be good here, but /initialize handles creation
    // For now, if DB connects, assume basic config is OK, /initialize will do more.
    res.json({ isConfigured: true, message: 'Backend está conectado ao banco de dados.' });
  } catch (error: any) {
    console.error("Database status check failed:", error);
    res.status(500).json({ 
        isConfigured: false, 
        message: `Falha ao conectar ao banco de dados: \${error.message}. Verifique a DATABASE_URL e o status do servidor PostgreSQL.`,
        requiresManualEnvUpdate: true // Implies DB_URL might be wrong
    });
  }
});


// POST /api/setup/initialize
// Initializes the database based on process.env.DATABASE_URL: checks connection, creates tables if they don't exist.
router.post('/initialize', async (req: Request, res: Response) => {
  if (!process.env.DATABASE_URL) {
    return res.status(400).json({
      isConfigured: false,
      message: "DATABASE_URL não está configurada no arquivo .env do backend. Por favor, adicione-a e reinicie o servidor.",
      requiresManualEnvUpdate: true 
    });
  }

  try {
    // The main pool (from db.ts) is already initialized with process.env.DATABASE_URL.
    // A simple query tests connection and if the pool is valid.
    await query('SELECT NOW()'); // Test connection
    console.log('Conexão com o banco de dados bem-sucedida.');

    await createTablesIfNotExist(); // This uses the main pool
    
    res.status(200).json({
      isConfigured: true,
      message: 'Banco de dados conectado e tabelas verificadas/criadas com sucesso.',
      requiresManualEnvUpdate: false
    });

  } catch (error: any) {
    console.error('Database initialization error:', error);
    let userMessage = `Falha na inicialização do banco de dados: \${error.message}.`;
    let requiresUpdate = true; // Default to true for DB errors suggesting config issues

    if (error.code === 'ECONNREFUSED' || error.message.includes("ECONNREFUSED")) {
        userMessage = `Conexão recusada pelo servidor PostgreSQL. Verifique se o servidor está rodando e acessível na URL: \${process.env.DATABASE_URL}. Detalhes: \${error.message}`;
    } else if (error.message.includes("getaddrinfo ENOTFOUND") || error.code === 'ENOTFOUND') {
        userMessage = `Não foi possível encontrar o host do banco de dados especificado em DATABASE_URL. Verifique o nome do host e a porta. Detalhes: \${error.message}`;
    } else if (error.message.includes("password authentication failed")) {
        userMessage = `Autenticação com o banco de dados falhou. Verifique usuário e senha em DATABASE_URL. Detalhes: \${error.message}`;
    } else if (error.message.includes("database") && error.message.includes("does not exist")) {
        userMessage = `O banco de dados especificado em DATABASE_URL ("\${error.database}") não existe. Crie-o ou verifique a configuração. Detalhes: \${error.message}`;
    } else if (error.message.includes("permission denied to create database")) {
        userMessage = `Permissão negada para criar o banco de dados ou tabelas. Verifique as permissões do usuário do banco. Detalhes: \${error.message}`;
        requiresUpdate = false; // This is a permission issue, not necessarily a .env content issue
    } else if (error.message.includes("role") && error.message.includes("does not exist")){
        userMessage = `O usuário (role) "\${error.routine}" especificado na DATABASE_URL não existe. Detalhes: \${error.message}`;
    }
    
    return res.status(500).json({
      isConfigured: false,
      message: userMessage,
      requiresManualEnvUpdate: requiresUpdate
    });
  }
});

export default router;
