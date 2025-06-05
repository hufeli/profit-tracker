import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[Request] ${req.method} ${req.originalUrl} - body: ${JSON.stringify(req.body)}`);

  res.on('finish', () => {
    console.log(`[Response] ${req.method} ${req.originalUrl} - status: ${res.statusCode}`);
  });

  next();
};
