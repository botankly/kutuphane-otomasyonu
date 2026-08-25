import jwt from 'jsonwebtoken';
import { JwtPayloadUser } from '../types/express';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export const generateToken = (payload: JwtPayloadUser): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayloadUser | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayloadUser;
    return decoded;
  } catch (error) {
    return null;
  }
};
