import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import { BcryptAuthService } from '@employee/infrastructure/BcryptAuthService.js'

describe('BcryptAuthService', () => {
    describe('generateToken', () => {
        it('generates a token that expires 24h after issuance', () => {
            const authService = new BcryptAuthService()

            const token = authService.generateToken({ id: 'emp-1', role: 'cliente', restaurantId: null })
            const decoded = jwt.decode(token, { complete: true })

            const payload = decoded!.payload as jwt.JwtPayload
            expect(payload.exp! - payload.iat!).toBe(24 * 60 * 60)
        })
    })
})
