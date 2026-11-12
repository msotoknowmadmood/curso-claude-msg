import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import {
    InvalidTableNumberError,
    InvalidTableCapacityError,
    InvalidTableStatusError,
    RestaurantIdRequiredError,
    RestaurantNotFoundError,
    DuplicatedTableNumberError,
    TableNotFoundError,
    TableNotAvailableError,
    InvalidPeopleCountError
} from '@errors/DomainErrors.js'
import type { Table } from '@models/table.model.js'

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

        it('should reject a duplicated number in the same restaurant', async () => {
            await service.create(validInput)
            await expect(service.create({ ...validInput, capacity: 2 })).rejects.toThrow(DuplicatedTableNumberError)
            expect(await tableRepo.findByRestaurantId('r1')).toHaveLength(1)
        })

        it('should allow the same number in another restaurant', async () => {
            await service.create(validInput)
            const other = await service.create({ ...validInput, restaurantId: 'r2' })
            expect(other.number).toBe(1)
        })
    })
})

describe('TableService (por id)', () => {
    let tableRepo: MockTableRepository
    let restaurantRepo: MockRestaurantRepository
    let service: TableService
    let existing: Table

    beforeEach(async () => {
        tableRepo = new MockTableRepository()
        restaurantRepo = new MockRestaurantRepository()
        await restaurantRepo.save(restaurant('r1'))
        await restaurantRepo.save(restaurant('r2'))
        service = new TableService(tableRepo, restaurantRepo)
        existing = await service.create({ restaurantId: 'r1', number: 1, capacity: 4, description: 'Ventana', status: 'reservada' })
        await service.create({ restaurantId: 'r1', number: 2, capacity: 2 })
    })

    describe('getById / findByRestaurantId', () => {
        it('should return a table of the restaurant', async () => {
            expect(await service.getById('r1', existing.id)).toEqual(existing)
        })

        it('should throw TableNotFoundError if it does not exist or belongs to another restaurant', async () => {
            await expect(service.getById('r1', 'nope')).rejects.toThrow(TableNotFoundError)
            await expect(service.getById('r2', existing.id)).rejects.toThrow(TableNotFoundError)
        })

        it('should list the tables of a restaurant ordered by number', async () => {
            expect((await service.findByRestaurantId('r1')).map(t => t.number)).toEqual([1, 2])
            expect(await service.findByRestaurantId('r2')).toEqual([])
        })
    })

    describe('update', () => {
        it('should update number, capacity and description keeping id, restaurantId, createdAt and status', async () => {
            const updated = await service.update('r1', existing.id, { number: 7, capacity: 6, description: 'Terraza' })

            expect(updated).toMatchObject({
                id: existing.id, restaurantId: 'r1', number: 7, capacity: 6, description: 'Terraza',
                status: 'reservada', createdAt: existing.createdAt
            })
            expect(await tableRepo.findById(existing.id)).toEqual(updated)
        })

        it('should set description to null when omitted and change the status when given', async () => {
            const updated = await service.update('r1', existing.id, { number: 1, capacity: 4, status: 'LIBRE' })
            expect(updated.description).toBeNull()
            expect(updated.status).toBe('libre')
        })

        it('should allow keeping its own number', async () => {
            await expect(service.update('r1', existing.id, { number: 1, capacity: 8 })).resolves.toMatchObject({ capacity: 8 })
        })

        it('should reject a number used by another table of the restaurant', async () => {
            await expect(service.update('r1', existing.id, { number: 2, capacity: 4 })).rejects.toThrow(DuplicatedTableNumberError)
        })

        it('should revalidate the input', async () => {
            await expect(service.update('r1', existing.id, { number: 0, capacity: 4 })).rejects.toThrow(InvalidTableNumberError)
            await expect(service.update('r1', existing.id, { number: 1, capacity: '4' as unknown as number })).rejects.toThrow(InvalidTableCapacityError)
            await expect(service.update('r1', existing.id, { number: 1, capacity: 4, status: 'x' })).rejects.toThrow(InvalidTableStatusError)
        })

        it('should throw TableNotFoundError if it does not exist or belongs to another restaurant', async () => {
            await expect(service.update('r1', 'nope', { number: 9, capacity: 4 })).rejects.toThrow(TableNotFoundError)
            await expect(service.update('r2', existing.id, { number: 9, capacity: 4 })).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('delete', () => {
        it('should delete the table', async () => {
            await service.delete('r1', existing.id)
            expect(await tableRepo.findById(existing.id)).toBeNull()
        })

        it('should throw TableNotFoundError if it does not exist or belongs to another restaurant', async () => {
            await expect(service.delete('r1', 'nope')).rejects.toThrow(TableNotFoundError)
            await expect(service.delete('r2', existing.id)).rejects.toThrow(TableNotFoundError)
            expect(await tableRepo.findById(existing.id)).not.toBeNull()
        })
    })

    describe('changeStatus', () => {
        it('should normalize and save the new status updating updatedAt', async () => {
            const changed = await service.changeStatus('r1', existing.id, ' Ocupada ')

            expect(changed.status).toBe('ocupada')
            expect(changed.updatedAt >= existing.updatedAt).toBe(true)
            expect(changed).toMatchObject({ number: 1, capacity: 4, description: 'Ventana', createdAt: existing.createdAt })
            expect((await tableRepo.findById(existing.id))?.status).toBe('ocupada')
        })

        it('should allow any transition, e.g. freeing a table', async () => {
            await service.changeStatus('r1', existing.id, 'ocupada')
            expect((await service.changeStatus('r1', existing.id, 'libre')).status).toBe('libre')
        })

        it('should reject an invalid or missing status', async () => {
            await expect(service.changeStatus('r1', existing.id, 'sucia')).rejects.toThrow(InvalidTableStatusError)
            await expect(service.changeStatus('r1', existing.id, undefined as unknown as string)).rejects.toThrow(InvalidTableStatusError)
        })

        it('should throw TableNotFoundError if it does not exist or belongs to another restaurant', async () => {
            await expect(service.changeStatus('r1', 'nope', 'libre')).rejects.toThrow(TableNotFoundError)
            await expect(service.changeStatus('r2', existing.id, 'libre')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('findAvailable', () => {
        it('should return free tables of the restaurant with enough capacity', async () => {
            await service.create({ restaurantId: 'r1', number: 3, capacity: 6 })
            await service.create({ restaurantId: 'r2', number: 1, capacity: 8 })

            const tables = await service.findAvailable('r1', 2)
            expect(tables.map(t => t.number)).toEqual([2, 3])
        })

        it.each([[0], [-1], [2.5], [NaN], ['3'], [undefined]])('should throw InvalidPeopleCountError for people = %s', async (people) => {
            await expect(service.findAvailable('r1', people as unknown as number)).rejects.toThrow(InvalidPeopleCountError)
        })
    })

    describe('occupy', () => {
        it('should occupy a free table and return it', async () => {
            const free = (await service.findByRestaurantId('r1')).find(t => t.number === 2)!

            const occupied = await service.occupy('r1', free.id)
            expect(occupied).toMatchObject({ id: free.id, status: 'ocupada' })
            expect((await tableRepo.findById(free.id))?.status).toBe('ocupada')
        })

        it('should throw TableNotAvailableError the second time and for reserved tables', async () => {
            const free = (await service.findByRestaurantId('r1')).find(t => t.number === 2)!
            await service.occupy('r1', free.id)

            await expect(service.occupy('r1', free.id)).rejects.toThrow(TableNotAvailableError)
            await expect(service.occupy('r1', existing.id)).rejects.toThrow(TableNotAvailableError)
        })

        it('should throw TableNotFoundError if it does not exist or belongs to another restaurant', async () => {
            const free = (await service.findByRestaurantId('r1')).find(t => t.number === 2)!
            await expect(service.occupy('r1', 'nope')).rejects.toThrow(TableNotFoundError)
            await expect(service.occupy('r2', free.id)).rejects.toThrow(TableNotFoundError)
            expect((await tableRepo.findById(free.id))?.status).toBe('libre')
        })
    })
})
