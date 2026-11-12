import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqliteTableRepository } from './table.repository.js'
import type { Table } from '@models/table.model.js'

const now = () => new Date().toISOString()

function buildTable(overrides: Partial<Table> = {}): Table {
    return {
        id: 't1',
        restaurantId: 'r1',
        number: 1,
        description: 'Ventana',
        capacity: 4,
        status: 'libre',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides
    }
}

async function insertRestaurant(db: Database, id: string) {
    await db.run(
        'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, `Restaurante ${id}`, 'Calle Mayor 10', `${id}@resttek.com`, '+34 612345678', 'Carlos', 'García', now(), now()]
    )
}

describe('tables schema (Integration)', () => {
    let db: Database

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        await insertRestaurant(db, 'r1')
    })

    afterAll(async () => {
        await db.close()
    })

    it('should create the tables table with status defaulting to libre', async () => {
        await db.run(
            'INSERT INTO tables (id, restaurant_id, number, description, capacity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['s1', 'r1', 1, null, 4, now(), now()]
        )
        const row = await db.get<{ status: string }>('SELECT status FROM tables WHERE id = ?', ['s1'])
        expect(row?.status).toBe('libre')
    })

    it('should reject a duplicated number in the same restaurant', async () => {
        await expect(db.run(
            'INSERT INTO tables (id, restaurant_id, number, description, capacity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['s2', 'r1', 1, null, 2, now(), now()]
        )).rejects.toThrow(/UNIQUE/)
    })

    it('should reject a table for a non-existent restaurant', async () => {
        await expect(db.run(
            'INSERT INTO tables (id, restaurant_id, number, description, capacity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['s3', 'nope', 1, null, 2, now(), now()]
        )).rejects.toThrow(/FOREIGN KEY/)
    })
})

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        await insertRestaurant(db, 'r1')
        await insertRestaurant(db, 'r2')
        await insertRestaurant(db, 'r3')
        await insertRestaurant(db, 'r4')
        repo = new SqliteTableRepository(db)
    })

    afterAll(async () => {
        await db.close()
    })

    describe('save / findById', () => {
        it('should insert a table and find it by id mapped to camelCase', async () => {
            await repo.save(buildTable())

            const found = await repo.findById('t1')
            expect(found).toEqual(buildTable())
        })

        it('should return null when the table does not exist', async () => {
            expect(await repo.findById('nope')).toBeNull()
        })

        it('should update an existing table', async () => {
            await repo.save(buildTable({ number: 2, description: null, capacity: 6, status: 'reservada', updatedAt: '2026-02-01T00:00:00.000Z' }))

            const found = await repo.findById('t1')
            expect(found).toEqual(buildTable({ number: 2, description: null, capacity: 6, status: 'reservada', updatedAt: '2026-02-01T00:00:00.000Z' }))
        })
    })

    describe('findByRestaurantId / findByRestaurantAndNumber', () => {
        beforeAll(async () => {
            await repo.save(buildTable({ id: 'r1-t5', restaurantId: 'r1', number: 5 }))
            await repo.save(buildTable({ id: 'r1-t3', restaurantId: 'r1', number: 3 }))
            await repo.save(buildTable({ id: 'r2-t3', restaurantId: 'r2', number: 3 }))
        })

        it('should return only the tables of the restaurant ordered by number', async () => {
            const tables = await repo.findByRestaurantId('r1')
            expect(tables.map(t => t.number)).toEqual([2, 3, 5])
            expect(tables.every(t => t.restaurantId === 'r1')).toBe(true)
        })

        it('should return an empty array for a restaurant without tables', async () => {
            expect(await repo.findByRestaurantId('unknown')).toEqual([])
        })

        it('should find a table by restaurant and number', async () => {
            const found = await repo.findByRestaurantAndNumber('r2', 3)
            expect(found?.id).toBe('r2-t3')
        })

        it('should return null when the number does not exist in that restaurant', async () => {
            expect(await repo.findByRestaurantAndNumber('r2', 5)).toBeNull()
        })
    })

    describe('delete', () => {
        it('should delete a table', async () => {
            await repo.save(buildTable({ id: 'to-delete', restaurantId: 'r2', number: 99 }))
            await repo.delete('to-delete')
            expect(await repo.findById('to-delete')).toBeNull()
        })
    })

    describe('findAvailable', () => {
        beforeAll(async () => {
            await repo.save(buildTable({ id: 'av-1', restaurantId: 'r3', number: 1, capacity: 2, status: 'libre' }))
            await repo.save(buildTable({ id: 'av-2', restaurantId: 'r3', number: 2, capacity: 6, status: 'libre' }))
            await repo.save(buildTable({ id: 'av-3', restaurantId: 'r3', number: 3, capacity: 4, status: 'libre' }))
            await repo.save(buildTable({ id: 'av-4', restaurantId: 'r3', number: 4, capacity: 4, status: 'libre' }))
            await repo.save(buildTable({ id: 'av-5', restaurantId: 'r3', number: 5, capacity: 8, status: 'ocupada' }))
            await repo.save(buildTable({ id: 'av-6', restaurantId: 'r3', number: 6, capacity: 8, status: 'reservada' }))
            await repo.save(buildTable({ id: 'av-other', restaurantId: 'r4', number: 1, capacity: 10, status: 'libre' }))
        })

        it('should return free tables with enough capacity ordered by capacity and number', async () => {
            const tables = await repo.findAvailable('r3', 3)
            expect(tables.map(t => t.id)).toEqual(['av-3', 'av-4', 'av-2'])
        })

        it('should exclude occupied and reserved tables', async () => {
            const tables = await repo.findAvailable('r3', 7)
            expect(tables).toEqual([])
        })

        it('should exclude tables with insufficient capacity', async () => {
            const tables = await repo.findAvailable('r3', 5)
            expect(tables.map(t => t.id)).toEqual(['av-2'])
        })

        it('should exclude tables of other restaurants', async () => {
            const tables = await repo.findAvailable('r3', 1)
            expect(tables.some(t => t.restaurantId !== 'r3')).toBe(false)
            expect(tables).toHaveLength(4)
        })
    })

    describe('occupyIfFree', () => {
        it('should occupy a free table only once', async () => {
            await repo.save(buildTable({ id: 'occ-1', restaurantId: 'r4', number: 2, status: 'libre' }))

            expect(await repo.occupyIfFree('occ-1')).toBe(true)
            const occupied = await repo.findById('occ-1')
            expect(occupied?.status).toBe('ocupada')
            expect(occupied?.updatedAt).not.toBe('2026-01-01T00:00:00.000Z')

            expect(await repo.occupyIfFree('occ-1')).toBe(false)
        })

        it('should not occupy a reserved table', async () => {
            await repo.save(buildTable({ id: 'occ-2', restaurantId: 'r4', number: 3, status: 'reservada' }))
            expect(await repo.occupyIfFree('occ-2')).toBe(false)
            expect((await repo.findById('occ-2'))?.status).toBe('reservada')
        })

        it('should return false for a non-existent table', async () => {
            expect(await repo.occupyIfFree('nope')).toBe(false)
        })
    })
})
