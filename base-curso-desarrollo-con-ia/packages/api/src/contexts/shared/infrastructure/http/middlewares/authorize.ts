import type { Response, NextFunction } from 'express'
import type { AuthRequest } from './authenticate.js'

export const authorize = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Forbidden: Insufficient permissions' })
            return
        }
        next()
    }
}
