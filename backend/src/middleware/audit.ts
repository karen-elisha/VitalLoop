import { query } from '../database/pool';
import { AuthRequest } from './auth';
import { Response, NextFunction } from 'express';

export async function auditLog(
  userId: string | undefined,
  action: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, action, resource, resourceId, JSON.stringify(details), ipAddress, userAgent]
    );
  } catch (error) {
    // Audit logging should not break the request flow
    console.error('Audit log failed:', error);
  }
}

// SaMD Classification Note: This middleware supports audit trail requirements
// for potential future SaMD (Software as a Medical Device) classification.
// All data access and modifications are logged for regulatory readiness.
export function auditMiddleware(action: string, resource: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    
    res.json = function (body: any) {
      // Log after successful response
      if (res.statusCode < 400) {
        auditLog(
          req.user?.id,
          action,
          resource,
          req.params.id,
          { method: req.method, path: req.path },
          typeof req.ip === 'string' ? req.ip : undefined,
          req.get('User-Agent')
        );
      }
      return originalJson(body);
    };
    
    next();
  };
}
