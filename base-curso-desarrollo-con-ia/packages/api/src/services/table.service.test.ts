import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import {
    InvalidTableNumberError,
    InvalidTableCapacityError,
    InvalidTableStatusError,
    RestaurantIdRequiredError,
    RestaurantNotFoundError
} from '@errors/DomainErrors.js'

function restaurant(id: string) {
    return {
        id, name: `Restaurante ${id}`, address: 'Calle Mayor 10', email: `${id}@resttek.com`, phone: '912345678',
        ownerFirstName: 'Carlos', ownerLastName: 'García', logoUrl: null,
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
    }
}

describe('TableService', () => {
    let tableRepo: MockTableRepository
    let restaurantRepo: MockRestaurantRepository
    let service: TableService

    const validInput = { restaurantId: 'r1', number: 1, capacity: 4, description: 'Ventana' }

    beforeEach(async () => {
        tableRepo = new MockTableRepository()
        restaurantRepo = new MockRestaurantRepository()
        await restaurantRepo.save(restaurant('r1'))
        await restaurantRepo.save(restaurant('r2'))
        service = new TableService(tableRepo, restaurantRepo)
    })

    describe('create', () => {
        it('should create and save a table with status libre by default', async () => {
            const table = await service.create(validInput)

            expect(table.id).toBeDefined()
            expect(table).toMatchObject({ restaurantId: 'r1', number: 1, capacity: 4, description: 'Ventana', status: 'libre' })
            expect(table.createdAt).toBe(table.updatedAt)
            expect(await tableRepo.findById(table.id)).toEqual(table)
        })

        it('should default description to null when omitted', async () => {
            const table = await service.create({ restaurantId: 'r1', number: 1, capacity: 4 })
            expect(table.description).toBeNull()
        })

        it('should normalize the given status', async () => {
            const table = await service.create({ ...validInput, status: ' Reservada ' })
            expect(table.status).toBe('reservada')
        })

        it('should reject an invalid status', async () => {
            await expect(service.create({ ...validInput, status: 'sucia' })).rejects.toThrow(InvalidTableStatusError)
        })

        it.each([[0], [-1], [1.5], ['3'], [null], [undefined]])('should reject number %s', async (number) => {
            await expect(service.create({ ...validInput, number: number as unknown as number }))
                .rejects.toThrow(InvalidTableNumberError)
        })

        it.each([[0], [-2], [2.5], ['4'], [null], [undefined]])('should reject capacity %s', async (capacity) => {
            await expect(service.create({ ...validInput, capacity: capacity as unknown as number }))
                .rejects.toThrow(InvalidTableCapacityError)
        })

        it('should require restaurantId', async () => {
            await expect(service.create({ ...validInput, restaurantId: ' ' })).rejects.toThrow(RestaurantIdRequiredError)
        })

        it('should reject a non-existent restaurant with RestaurantNotFoundError', async () => {
            await expect(service.create({ ...validInput, restaurantId: 'nope' })).rejects.toThrow(RestaurantNotFoundError)
            expect(await tableRepo.findByRestaurantId('nope')).toEqual([])
        })
    })
})
