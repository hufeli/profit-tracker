
import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { query } from '../db'; // Main query function using the pool from db.ts
import process from 'process';

dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Ensure .env from backend root is loaded

const router = Router();

// SQL for table creation (idempotent)
const createTablesSQL = \`
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, name) 
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    enable_notifications BOOLEAN DEFAULT FALSE,
    notification_time VARCHAR(5) DEFAULT '18:00', -- HH:MM
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, dashboard_id)
  );

  CREATE TABLE IF NOT EXISTS initial_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    balance NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, dashboard_id)
  );

  CREATE TABLE IF NOT EXISTS daily_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    date_key DATE NOT NULL,
    final_balance NUMERIC(15, 2) NOT NULL,
    tags TEXT[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, dashboard_id, date_key)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL, -- 'daily', 'weekly', 'monthly'
    amount NUMERIC(15, 2) NOT NULL,
    applies_to VARCHAR(20) NOT NULL, -- 'YYYY-MM-DD', 'YYYY-WNN', 'YYYY-MM'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Consider unique constraint if needed: UNIQUE(user_id, dashboard_id, type, applies_to) 
    -- but this might be too restrictive if users want multiple goals of same type for same period (e.g. different amounts)
    -- Current app design seems to imply one goal of a type per period, so a unique constraint might be appropriate.
    -- For now, let's assume the application logic handles one-goal-per-type-period if needed.
    CONSTRAINT check_goal_type CHECK (type IN ('daily', 'weekly', 'monthly'))
  );

  -- Trigger function to update 'updated_at' columns
  CREATE OR REPLACE FUNCTION trigger_set_timestamp()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Apply trigger to tables that have 'updated_at'
  DO $$
  DECLARE
    t_name TEXT;
  BEGIN
    FOR t_name IN SELECT table_name FROM information_schema.columns WHERE column_name = 'updated_at' AND table_schema = current_schema()
    LOOP
      -- Drop existing trigger first if it exists, to make this idempotent
      EXECUTE format('DROP TRIGGER IF EXISTS set_timestamp ON %I;', t_name);
      EXECUTE format('CREATE TRIGGER set_timestamp BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();', t_name);
    END LOOP;
  END;
  $$;
\`;

// Utility function to create tables if they don't exist using the main pool
async function createTablesIfNotExist() {
  try {
    await query(createTablesSQL);
    console.log("Tables checked/created successfully.");
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error; // Re-throw to be caught by the route handler
  }
}

// GET /api/setup/status
// Checks if the backend considers itself configured (e.g., DATABASE_URL is set and DB is accessible).
router.get('/status', async (req: Request, res: Response) => {
  if (!process.env.DATABASE_URL) {
    return res.json({ 
        isConfigured: false, 
        message: 'DATABASE_URL não está configurada no ambiente do backend. Por favor, adicione-a ao arquivo .env na pasta \\'backend\\' e reinicie o servidor.',
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
        message: \`Falha ao conectar ao banco de dados: \${error.message}. Verifique a DATABASE_URL e o status do servidor PostgreSQL.\`,
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
    let userMessage = \`Falha na inicialização do banco de dados: \${error.message}.\`;
    let requiresUpdate = true; // Default to true for DB errors suggesting config issues

    if (error.code === 'ECONNREFUSED' || error.message.includes("ECONNREFUSED")) {
        userMessage = \`Conexão recusada pelo servidor PostgreSQL. Verifique se o servidor está rodando e acessível na URL: \${process.env.DATABASE_URL}. Detalhes: \${error.message}\`;
    } else if (error.message.includes("getaddrinfo ENOTFOUND") || error.code === 'ENOTFOUND') {
        userMessage = \`Não foi possível encontrar o host do banco de dados especificado em DATABASE_URL. Verifique o nome do host e a porta. Detalhes: \${error.message}\`;
    } else if (error.message.includes("password authentication failed")) {
        userMessage = \`Autenticação com o banco de dados falhou. Verifique usuário e senha em DATABASE_URL. Detalhes: \${error.message}\`;
    } else if (error.message.includes("database") && error.message.includes("does not exist")) {
        userMessage = \`O banco de dados especificado em DATABASE_URL ("\${error.database}") não existe. Crie-o ou verifique a configuração. Detalhes: \${error.message}\`;
    } else if (error.message.includes("permission denied to create database")) {
        userMessage = \`Permissão negada para criar o banco de dados ou tabelas. Verifique as permissões do usuário do banco. Detalhes: \${error.message}\`;
        requiresUpdate = false; // This is a permission issue, not necessarily a .env content issue
    } else if (error.message.includes("role") && error.message.includes("does not exist")){
        userMessage = \`O usuário (role) "\${error.routine}" especificado na DATABASE_URL não existe. Detalhes: \${error.message}\`;
    }
    
    return res.status(500).json({
      isConfigured: false,
      message: userMessage,
      requiresManualEnvUpdate: requiresUpdate
    });
  }
});

export default router;
