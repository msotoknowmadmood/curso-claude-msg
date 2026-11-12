import type { Database } from '@config/database.js'

// Mesa a la que se asocia el pedido de ejemplo del seed.
export const SAMPLE_ORDER_TABLE_ID = 'table-1-5'

const SEED_TABLES: { id: string; restaurantId: string; number: number; capacity: number; description: string | null }[] = [
    { id: 'table-1-1', restaurantId: 'rest-1', number: 1, capacity: 2, description: 'Junto a la ventana' },
    { id: 'table-1-2', restaurantId: 'rest-1', number: 2, capacity: 2, description: 'Junto a la ventana' },
    { id: 'table-1-3', restaurantId: 'rest-1', number: 3, capacity: 4, description: null },
    { id: 'table-1-4', restaurantId: 'rest-1', number: 4, capacity: 4, description: null },
    { id: 'table-1-5', restaurantId: 'rest-1', number: 5, capacity: 6, description: 'Salón principal' },
    { id: 'table-1-6', restaurantId: 'rest-1', number: 6, capacity: 8, description: 'Reservado para grupos' },
    { id: 'table-2-1', restaurantId: 'rest-2', number: 1, capacity: 2, description: 'Terraza' },
    { id: 'table-2-2', restaurantId: 'rest-2', number: 2, capacity: 4, description: 'Terraza' },
    { id: 'table-2-3', restaurantId: 'rest-2', number: 3, capacity: 4, description: null },
    { id: 'table-2-4', restaurantId: 'rest-2', number: 4, capacity: 6, description: null }
]

// Idempotente: INSERT OR IGNORE por id fijo (y por UNIQUE(restaurant_id, number)).
export async function seedTables(db: Database): Promise<void> {
    const now = new Date().toISOString()
    for (const table of SEED_TABLES) {
        await db.run(
            `INSERT OR IGNORE INTO tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'libre', ?, ?)`,
            [table.id, table.restaurantId, table.number, table.description, table.capacity, now, now]
        )
    }
    await db.run(`UPDATE tables SET status = 'ocupada', updated_at = ? WHERE id = ?`, [now, SAMPLE_ORDER_TABLE_ID])
}
