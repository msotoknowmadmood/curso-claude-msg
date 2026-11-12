import { describe, it, expect } from 'vitest'
import { normalizeTableStatus } from './table.model.js'
import { InvalidTableStatusError } from '@errors/DomainErrors.js'

describe('normalizeTableStatus', () => {
    it('should trim and lowercase a valid status', () => {
        expect(normalizeTableStatus(' Ocupada ')).toBe('ocupada')
    })

    it('should accept all valid statuses', () => {
        for (const s of ['libre', 'ocupada', 'reservada']) {
            expect(normalizeTableStatus(s)).toBe(s)
        }
    })

    it('should throw InvalidTableStatusError for an invalid status', () => {
        expect(() => normalizeTableStatus('sucia')).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus('sucia')).toThrow('Invalid table status: sucia. Must be one of: libre, ocupada, reservada')
    })

    it('should throw InvalidTableStatusError for a missing or non-string status', () => {
        expect(() => normalizeTableStatus(undefined as unknown as string)).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus(3 as unknown as string)).toThrow(InvalidTableStatusError)
    })
})
