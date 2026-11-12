import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import { BcryptAuthService } from '@employee/infrastructure/BcryptAuthService.js'

describe('BcryptAuthService', () => {
    describe('hashPassword / comparePasswords', () => {
        it('hashes the password so the stored value differs from the plain one', async () => {
            const authService = new BcryptAuthService()

            const hash = await authService.hashPassword('password123')

            expect(hash).not.toBe('password123')
        })

        it('validates a correct password against its hash', async () => {
            const authService = new BcryptAuthService()
            const hash = await authService.hashPassword('password123')

            await expect(authService.comparePasswords('password123', hash)).resolves.toBe(true)
        })

        it('rejects an incorrect password against the hash', async () => {
            const authService = new BcryptAuthService()
            const hash = await authService.hashPassword('password123')

            await expect(authService.comparePasswords('wrong-password', hash)).resolves.toBe(false)
        })
    })

    describe('generateToken', () => {
        it('generates a token that expires 24h after issuance', () => {
            const authService = new BcryptAuthService()

            const token = authService.generateToken({ id: 'emp-1', role: 'cliente', restaurantId: null })
            const decoded = jwt.decode(token, { complete: true })

            const payload = decoded!.payload as jwt.JwtPayload
            expect(payload.exp! - payload.iat!).toBe(24 * 60 * 60)
        })

        it('includes id, role and restaurantId in the token payload', () => {
            const authService = new BcryptAuthService()

            const token = authService.generateToken({ id: 'emp-1', role: 'manager', restaurantId: 'rest-1' })
            const decoded = jwt.decode(token, { complete: true })
            const payload = decoded!.payload as jwt.JwtPayload

            expect(payload).toMatchObject({ id: 'emp-1', role: 'manager', restaurantId: 'rest-1' })
        })
    })
})
