import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      status: 'error',
      message: 'Yetkisiz erişim. Geçerli bir token gereklidir.'
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({
      status: 'error',
      message: 'Geçersiz veya süresi dolmuş token.'
    });
    return;
  }

  req.user = decoded;
  next();
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Kullanıcı kimliği doğrulanamadı.'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        status: 'error',
        message: 'Erişim engellendi. Yeterli yetkiniz bulunmamaktadır.'
      });
      return;
    }

    next();
  };
};
