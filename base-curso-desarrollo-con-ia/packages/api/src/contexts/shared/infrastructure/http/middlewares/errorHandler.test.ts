import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { errorHandler } from './errorHandler.js'
import {
    TableNotFoundError,
    InvalidTableNumberError,
    InvalidTableCapacityError,
    DuplicatedTableNumberError,
    TableNotAvailableError,
    InvalidPeopleCountError
} from '@errors/DomainErrors.js'

function mockResponse() {
    const res = {} as Response
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res
}

function handle(err: unknown) {
    const res = mockResponse()
    errorHandler(err, {} as Request, res, (() => {}) as NextFunction)
    return res
}

describe('errorHandler (errores de mesas)', () => {
    it('should map TableNotFoundError to 404 with { error, message }', () => {
        const res = handle(new TableNotFoundError())
        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.json).toHaveBeenCalledWith({ error: 'TableNotFoundError', message: 'Table not found' })
    })

    it.each([
        [new InvalidTableNumberError(), 'InvalidTableNumberError', 'Table number must be a positive integer'],
        [new InvalidTableCapacityError(), 'InvalidTableCapacityError', 'Table capacity must be a positive integer'],
        [new DuplicatedTableNumberError(), 'DuplicatedTableNumberError', 'Table number already exists in this restaurant'],
        [new TableNotAvailableError(), 'TableNotAvailableError', 'Table is not available'],
        [new InvalidPeopleCountError(), 'InvalidPeopleCountError', 'People count must be a positive integer']
    ])('should map %s to 400', (err, name, message) => {
        const res = handle(err)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith({ error: name, message })
    })
})
