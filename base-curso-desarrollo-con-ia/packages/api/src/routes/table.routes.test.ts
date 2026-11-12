import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'
import router from './table.routes.js'
import { authenticate } from '@shared/infrastructure/http/middlewares/authenticate.js'

type Handler = (req: Request, res: Response, next: () => void) => unknown
interface Layer { route?: { path: string; methods: Record<string, boolean>; stack: { handle: Handler }[] } }

const ALL_ROLES = ['admin', 'manager', 'camarero', 'cocinero', 'cliente']
const STAFF = ['admin', 'manager', 'camarero', 'cocinero']

const layers = (router as unknown as { stack: Layer[] }).stack.filter(l => l.route)

function findRoute(method: string, path: string) {
    const index = layers.findIndex(l => l.route!.path === path && l.route!.methods[method])
    expect(index, `${method.toUpperCase()} ${path} should exist`).toBeGreaterThanOrEqual(0)
    return { index, handlers: layers[index]!.route!.stack.map(s => s.handle) }
}

// Devuelve los roles que dejan pasar los middlewares posteriores a authenticate (sin llegar al controlador).
function allowedRoles(handlers: Handler[]): string[] {
    const guards = handlers.slice(1, -1)
    return ALL_ROLES.filter(role => guards.every(guard => {
        const next = vi.fn()
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as Response
        guard({ user: { role } } as unknown as Request, res, next)
        return next.mock.calls.length === 1
    }))
}

describe('table.routes', () => {
    it.each([
        ['get', '/', STAFF],
        ['post', '/', ['admin']],
        ['get', '/available', ALL_ROLES],
        ['get', '/:id', STAFF],
        ['put', '/:id', ['admin']],
        ['delete', '/:id', ['admin']],
        ['patch', '/:id/status', STAFF],
        ['patch', '/:id/occupy', ALL_ROLES]
    ])('%s %s should require authentication and allow %j', (method, path, roles) => {
        const { handlers } = findRoute(method, path)
        expect(handlers[0]).toBe(authenticate)
        expect(allowedRoles(handlers)).toEqual(roles)
    })

    it('should declare /available before /:id', () => {
        expect(findRoute('get', '/available').index).toBeLessThan(findRoute('get', '/:id').index)
    })
})
