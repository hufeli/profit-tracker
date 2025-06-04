// src/types/express.d.ts
import 'express'; // Import express to ensure module augmentation applies correctly

declare module 'express-serve-static-core' { // Express builds on this for its core types
  interface Request {
    user?: {
      id: string;
      email: string;
    };
  }
}

export {}; // Keep this to ensure it's treated as a module
