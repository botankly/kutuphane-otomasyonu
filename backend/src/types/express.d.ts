import { Role } from '@prisma/client';

export interface JwtPayloadUser {
  userId: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayloadUser;
    }
  }
}
