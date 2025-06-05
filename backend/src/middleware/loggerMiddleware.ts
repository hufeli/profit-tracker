import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[Request] ${req.method} ${req.originalUrl} - body: ${JSON.stringify(req.body)}`);

  const originalSend = res.send.bind(res);
  const originalJson = res.json.bind(res);

  function capture(body: any): any {
    (res as any).locals = (res as any).locals || {};
    (res as any).locals.responseBody = body;
    return body;
  }

  res.send = (body?: any) => originalSend(capture(body));
  res.json = (body?: any) => originalJson(capture(body));

  res.on('finish', () => {
    const body = (res as any).locals?.responseBody;
    const responseContent = body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
    console.log(`[Response] ${req.method} ${req.originalUrl} - status: ${res.statusCode} - body: ${responseContent}`);

  });

  next();
};
