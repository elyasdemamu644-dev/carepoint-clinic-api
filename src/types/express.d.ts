export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  tokenVersion: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
