
import express, { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestLogger } from './middleware/loggerMiddleware';

// Import routes
import authRoutes from './routes/authRoutes';
import settingsRoutes from './routes/settingsRoutes';
import initialBalanceRoutes from './routes/initialBalanceRoutes';
import entriesRoutes from './routes/entriesRoutes';
import goalsRoutes from './routes/goalsRoutes';
import setupRoutes from './routes/setupRoutes'; 
import dashboardRoutes from './routes/dashboardRoutes'; 

dotenv.config();

const app = express();
// Disable ETag headers to avoid 304 responses that break fetch handling
app.disable('etag');
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'; // Default if not set

// Middleware
app.use(cors({
  origin: CLIENT_URL, // Allow requests from your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Dashboard-ID'], 
}));
app.use(express.json()); // For parsing application/json
app.use(requestLogger);

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.send('Profit Tracker Backend is running!');
});

// API Routes
app.use('/api/setup', setupRoutes); // Setup routes should be accessible without auth
app.use('/api/auth', authRoutes);
app.use('/api/dashboards', dashboardRoutes); // New dashboard routes


// Data routes now expect dashboardId in query or body as handled by each route
app.use('/api/settings', settingsRoutes);
app.use('/api/initial-balance', initialBalanceRoutes);
app.use('/api/entries', entriesRoutes);
app.use('/api/goals', goalsRoutes);


// Global error handler
const globalErrorHandler: ErrorRequestHandler = (err, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err.stack || err); // Log stack or error object
  // Check if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({ 
    message: err.message || 'An unexpected error occurred.',
    // ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) // Optionally include stack in dev
  });
};
app.use(globalErrorHandler);


app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Accepting requests from client at: ${CLIENT_URL}`);
  if(!process.env.DATABASE_URL) {
    console.warn("WARNING: DATABASE_URL environment variable is not set!");
  }
   if(!process.env.JWT_SECRET) {
    console.warn("WARNING: JWT_SECRET environment variable is not set!");
  }
});
