import { describe, it, expect, beforeEach } from 'vitest'
import { MockTableRepository } from './MockTableRepository.js'
import type { Table } from '@models/table.model.js'

function table(overrides: Partial<Table>): Table {
    return {
        id: 't', restaurantId: 'r1', number: 1, description: null, capacity: 4, status: 'libre',
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', ...overrides
    }
}

// Asegura que el doble en memoria se comporta como SqliteTableRepository.
describe('MockTableRepository', () => {
    let repo: MockTableRepository

    beforeEach(async () => {
        repo = new MockTableRepository()
        await repo.save(table({ id: 'a', number: 3, capacity: 4 }))
        await repo.save(table({ id: 'b', number: 1, capacity: 6 }))
        await repo.save(table({ id: 'c', number: 2, capacity: 4, status: 'reservada' }))
        await repo.save(table({ id: 'd', restaurantId: 'r2', number: 1, capacity: 8 }))
    })

    it('should find by id, by restaurant (ordered by number) and by restaurant + number', async () => {
        expect((await repo.findById('a'))?.number).toBe(3)
        expect(await repo.findById('zzz')).toBeNull()
        expect((await repo.findByRestaurantId('r1')).map(t => t.id)).toEqual(['b', 'c', 'a'])
        expect((await repo.findByRestaurantAndNumber('r2', 1))?.id).toBe('d')
        expect(await repo.findByRestaurantAndNumber('r2', 2)).toBeNull()
    })

    it('should find available tables ordered by capacity and number', async () => {
        expect((await repo.findAvailable('r1', 4)).map(t => t.id)).toEqual(['a', 'b'])
    })

    it('should delete and occupy only once', async () => {
        await repo.delete('a')
        expect(await repo.findById('a')).toBeNull()

        expect(await repo.occupyIfFree('b')).toBe(true)
        expect((await repo.findById('b'))?.status).toBe('ocupada')
        expect(await repo.occupyIfFree('b')).toBe(false)
        expect(await repo.occupyIfFree('c')).toBe(false)
    })

    it('should return copies so callers cannot mutate stored tables', async () => {
        const found = await repo.findById('a')
        found!.number = 42
        expect((await repo.findById('a'))?.number).toBe(3)
    })
})
