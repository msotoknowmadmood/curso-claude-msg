import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { TableController } from './table.controller.js'
import { TableService } from '@services/table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import {
    TableNotFoundError,
    InvalidTableNumberError,
    RestaurantNotFoundError,
    InvalidTableStatusError,
    InvalidPeopleCountError,
    TableNotAvailableError
} from '@errors/DomainErrors.js'
import type { Table } from '@models/table.model.js'

const TABLE_KEYS = ['capacity', 'createdAt', 'description', 'id', 'number', 'restaurantId', 'status', 'updatedAt']

function mockResponse() {
    const res = {} as Response & { statusCode?: number; body?: unknown }
    res.status = vi.fn((code: number) => { res.statusCode = code; return res }) as unknown as Response['status']
    res.json = vi.fn((body: unknown) => { res.body = body; return res }) as unknown as Response['json']
    res.send = vi.fn(() => res) as unknown as Response['send']
    return res
}

function request(params: Record<string, string>, body: unknown = {}, query: Record<string, unknown> = {}): Request {
    return { params, body, query } as unknown as Request
}

describe('TableController', () => {
    let service: TableService
    let controller: TableController
    let next: NextFunction & ReturnType<typeof vi.fn>
    let existing: Table

    beforeEach(async () => {
        const restaurantRepo = new MockRestaurantRepository()
        await restaurantRepo.save({
            id: 'r1', name: 'R1', address: 'a', email: 'r1@resttek.com', phone: '912345678',
            ownerFirstName: 'a', ownerLastName: 'b', logoUrl: null, createdAt: 'x', updatedAt: 'x'
        })
        service = new TableService(new MockTableRepository(), restaurantRepo)
        controller = new TableController(service)
        next = vi.fn() as NextFunction & ReturnType<typeof vi.fn>
        existing = await service.create({ restaurantId: 'r1', number: 1, capacity: 4 })
    })

    describe('create', () => {
        it('should create a table using restaurantId from the route (ignoring the body) and respond 201', async () => {
            const res = mockResponse()
            await controller.create(request({ restaurantId: 'r1' }, { restaurantId: 'r9', number: 2, capacity: 2, description: 'Barra' }), res, next)

            expect(res.statusCode).toBe(201)
            expect(Object.keys(res.body as object).sort()).toEqual(TABLE_KEYS)
            expect(res.body).toMatchObject({ restaurantId: 'r1', number: 2, capacity: 2, description: 'Barra', status: 'libre' })
            expect(next).not.toHaveBeenCalled()
        })

        it('should always include description (null) in the response', async () => {
            const res = mockResponse()
            await controller.create(request({ restaurantId: 'r1' }, { number: 3, capacity: 2 }), res, next)
            expect((res.body as Table).description).toBeNull()
        })

        it('should pass domain errors to next()', async () => {
            const res = mockResponse()
            await controller.create(request({ restaurantId: 'r1' }, { number: '3', capacity: 2 }), res, next)
            expect(next).toHaveBeenCalledWith(expect.any(InvalidTableNumberError))

            await controller.create(request({ restaurantId: 'nope' }, { number: 3, capacity: 2 }), mockResponse(), next)
            expect(next).toHaveBeenCalledWith(expect.any(RestaurantNotFoundError))
        })

        it('should not fail with an undefined body', async () => {
            await controller.create(request({ restaurantId: 'r1' }, undefined), mockResponse(), next)
            expect(next).toHaveBeenCalledWith(expect.any(InvalidTableNumberError))
        })
    })

    describe('getAll / getById', () => {
        it('should list the tables of the restaurant', async () => {
            const res = mockResponse()
            await controller.getAll(request({ restaurantId: 'r1' }), res, next)
            expect(res.statusCode).toBe(200)
            expect(res.body).toEqual([existing])
        })

        it('should return one table', async () => {
            const res = mockResponse()
            await controller.getById(request({ restaurantId: 'r1', id: existing.id }), res, next)
            expect(res.statusCode).toBe(200)
            expect(res.body).toEqual(existing)
        })

        it('should pass TableNotFoundError to next()', async () => {
            await controller.getById(request({ restaurantId: 'r2', id: existing.id }), mockResponse(), next)
            expect(next).toHaveBeenCalledWith(expect.any(TableNotFoundError))
        })
    })

    describe('update / delete', () => {
        it('should update the table and respond 200', async () => {
            const res = mockResponse()
            await controller.update(request({ restaurantId: 'r1', id: existing.id }, { number: 5, capacity: 6 }), res, next)
            expect(res.statusCode).toBe(200)
            expect(res.body).toMatchObject({ id: existing.id, number: 5, capacity: 6, description: null, status: 'libre' })
        })

        it('should delete the table and respond 204 without body', async () => {
            const res = mockResponse()
            await controller.delete(request({ restaurantId: 'r1', id: existing.id }), res, next)
            expect(res.status).toHaveBeenCalledWith(204)
            expect(res.send).toHaveBeenCalledWith()
        })

        it('should pass TableNotFoundError to next()', async () => {
            await controller.update(request({ restaurantId: 'r1', id: 'nope' }, { number: 5, capacity: 6 }), mockResponse(), next)
            await controller.delete(request({ restaurantId: 'r1', id: 'nope' }), mockResponse(), next)
            expect(next).toHaveBeenCalledTimes(2)
            expect(next).toHaveBeenNthCalledWith(2, expect.any(TableNotFoundError))
        })
    })

    describe('changeStatus', () => {
        it('should change the status from body.status and respond 200 with the table', async () => {
            const res = mockResponse()
            await controller.changeStatus(request({ restaurantId: 'r1', id: existing.id }, { status: 'reservada' }), res, next)
            expect(res.statusCode).toBe(200)
            expect(res.body).toMatchObject({ id: existing.id, status: 'reservada' })
        })

        it('should pass InvalidTableStatusError to next() when status is missing', async () => {
            await controller.changeStatus(request({ restaurantId: 'r1', id: existing.id }, undefined), mockResponse(), next)
            expect(next).toHaveBeenCalledWith(expect.any(InvalidTableStatusError))
        })
    })

    describe('getAvailable', () => {
        it('should convert ?people to a number and list the available tables', async () => {
            const res = mockResponse()
            await controller.getAvailable(request({ restaurantId: 'r1' }, {}, { people: '4' }), res, next)
            expect(res.statusCode).toBe(200)
            expect(res.body).toEqual([existing])
        })

        it.each([[undefined], ['abc'], ['2.5'], ['0'], ['-1'], [''], [['2', '3']]])('should pass InvalidPeopleCountError for people = %s', async (people) => {
            await controller.getAvailable(request({ restaurantId: 'r1' }, {}, { people }), mockResponse(), next)
            expect(next).toHaveBeenCalledWith(expect.any(InvalidPeopleCountError))
        })
    })

    describe('occupy', () => {
        it('should occupy the table ignoring the body and respond 200 with the table', async () => {
            for (const body of [undefined, {}]) {
                const table = await service.create({ restaurantId: 'r1', number: body ? 10 : 11, capacity: 2 })
                const res = mockResponse()
                await controller.occupy(request({ restaurantId: 'r1', id: table.id }, body), res, next)
                expect(res.statusCode).toBe(200)
                expect(res.body).toMatchObject({ id: table.id, status: 'ocupada' })
            }
            expect(next).not.toHaveBeenCalled()
        })

        it('should pass TableNotAvailableError to next() the second time', async () => {
            await controller.occupy(request({ restaurantId: 'r1', id: existing.id }), mockResponse(), next)
            await controller.occupy(request({ restaurantId: 'r1', id: existing.id }), mockResponse(), next)
            expect(next).toHaveBeenCalledWith(expect.any(TableNotAvailableError))
        })
    })
})
