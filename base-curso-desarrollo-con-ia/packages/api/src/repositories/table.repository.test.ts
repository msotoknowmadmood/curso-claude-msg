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
})
