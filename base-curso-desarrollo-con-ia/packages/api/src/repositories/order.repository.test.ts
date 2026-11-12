import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqliteOrderRepository } from './order.repository.js'
import type { Order } from '@models/order.model.js'

const now = () => new Date().toISOString()

function order(id: string, tableId: string | null): Order {
    return {
        id,
        restaurantId: 'r1',
        tableId,
        clientId: 'client-1',
        createdAt: new Date(),
        items: [{ id: `${id}-item`, dishId: 'd1', quantity: 1, notes: null, status: 'pendiente' }]
    }
}

describe('SqliteOrderRepository - tableNumber (Integration)', () => {
    let db: Database
    let repo: SqliteOrderRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteOrderRepository(db)

        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'El Gourmet', 'Calle Mayor 10', 'info@gourmet.com', '912345678', 'Carlos', 'García', now(), now()]
        )
        await db.run(
            'INSERT INTO dishes (id, name, description, price, category, available, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['d1', 'Paella', null, 12, 'principal', 1, 'r1', now(), now()]
        )
        await db.run(
            'INSERT INTO tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ['table-1', 'r1', 7, null, 4, 'ocupada', now(), now()]
        )

        await repo.create(order('o-with-table', 'table-1'))
        await repo.create(order('o-without-table', null))
        await repo.create(order('o-unknown-table', '5'))
    })

    afterAll(async () => {
        await db.close()
    })

    it('findById should return the table number of the order', async () => {
        expect((await repo.findById('o-with-table'))?.tableNumber).toBe(7)
    })

    it('findById should return tableNumber null without table or with an unknown tableId', async () => {
        expect((await repo.findById('o-without-table'))?.tableNumber).toBeNull()
        const unknown = await repo.findById('o-unknown-table')
        expect(unknown?.tableNumber).toBeNull()
        expect(unknown?.tableId).toBe('5')
    })

    it('findActiveByRestaurant should include tableNumber', async () => {
        const orders = await repo.findActiveByRestaurant('r1')
        const byId = Object.fromEntries(orders.map(o => [o.id, o.tableNumber]))
        expect(byId).toEqual({ 'o-with-table': 7, 'o-without-table': null, 'o-unknown-table': null })
    })

    it('findByClientId should include tableNumber', async () => {
        const orders = await repo.findByClientId('client-1')
        expect(orders.find(o => o.id === 'o-with-table')?.tableNumber).toBe(7)
        expect(orders.find(o => o.id === 'o-without-table')?.tableNumber).toBeNull()
    })
})
