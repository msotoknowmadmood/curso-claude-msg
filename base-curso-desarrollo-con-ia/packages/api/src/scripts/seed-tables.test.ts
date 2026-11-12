import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { seedTables, SAMPLE_ORDER_TABLE_ID } from './seed-tables.js'

interface Row { id: string; restaurant_id: string; number: number; capacity: number; status: string }

describe('seedTables (Integration)', () => {
    let db: Database

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        for (const id of ['rest-1', 'rest-2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, id, 'Calle', `${id}@resttek.com`, '912345678', 'A', 'B', 'x', 'x']
            )
        }
        await seedTables(db)
    })

    afterAll(async () => {
        await db.close()
    })

    const tablesOf = (restaurantId: string) =>
        db.all<Row>('SELECT * FROM tables WHERE restaurant_id = ? ORDER BY number', [restaurantId])

    it('should create table-1-1 … table-1-6 for rest-1 with capacities 2/2/4/4/6/8', async () => {
        const rows = await tablesOf('rest-1')
        expect(rows.map(r => r.id)).toEqual(['table-1-1', 'table-1-2', 'table-1-3', 'table-1-4', 'table-1-5', 'table-1-6'])
        expect(rows.map(r => r.number)).toEqual([1, 2, 3, 4, 5, 6])
        expect(rows.map(r => r.capacity)).toEqual([2, 2, 4, 4, 6, 8])
    })

    it('should create 3-4 tables for rest-2', async () => {
        const rows = await tablesOf('rest-2')
        expect(rows.length).toBeGreaterThanOrEqual(3)
        expect(rows.length).toBeLessThanOrEqual(4)
        expect(rows.every(r => r.id.startsWith('table-2-'))).toBe(true)
    })

    it('should mark the sample order table (table-1-5) as ocupada and the rest as libre', async () => {
        expect(SAMPLE_ORDER_TABLE_ID).toBe('table-1-5')
        const rows = [...await tablesOf('rest-1'), ...await tablesOf('rest-2')]
        expect(rows.filter(r => r.status === 'ocupada').map(r => r.id)).toEqual(['table-1-5'])
    })

    it('should be idempotent', async () => {
        await expect(seedTables(db)).resolves.toBeUndefined()
        expect(await tablesOf('rest-1')).toHaveLength(6)
    })
})
