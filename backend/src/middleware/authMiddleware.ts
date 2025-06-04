
import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined.");
  (process as any).exit(1);
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { userId: string; email: string };
    req.user = { id: decoded.userId, email: decoded.email }; // req.user is now recognized due to express.d.ts
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};
