import type { TableRepository } from '@repositories/table.repository.js'
import type { Table } from '@models/table.model.js'

export class MockTableRepository implements TableRepository {
    private tables: Table[] = []

    async findById(id: string): Promise<Table | null> {
        const table = this.tables.find(t => t.id === id)
        return table ? { ...table } : null
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return this.tables
            .filter(t => t.restaurantId === restaurantId)
            .sort((a, b) => a.number - b.number)
            .map(t => ({ ...t }))
    }

    async findByRestaurantAndNumber(restaurantId: string, number: number): Promise<Table | null> {
        const table = this.tables.find(t => t.restaurantId === restaurantId && t.number === number)
        return table ? { ...table } : null
    }

    async findAvailable(restaurantId: string, people: number): Promise<Table[]> {
        return this.tables
            .filter(t => t.restaurantId === restaurantId && t.status === 'libre' && t.capacity >= people)
            .sort((a, b) => a.capacity - b.capacity || a.number - b.number)
            .map(t => ({ ...t }))
    }

    async save(table: Table): Promise<void> {
        const index = this.tables.findIndex(t => t.id === table.id)
        if (index >= 0) {
            this.tables[index] = { ...table }
        } else {
            this.tables.push({ ...table })
        }
    }

    async delete(id: string): Promise<void> {
        this.tables = this.tables.filter(t => t.id !== id)
    }

    async occupyIfFree(id: string): Promise<boolean> {
        const table = this.tables.find(t => t.id === id)
        if (!table || table.status !== 'libre') return false
        table.status = 'ocupada'
        table.updatedAt = new Date().toISOString()
        return true
    }
}
