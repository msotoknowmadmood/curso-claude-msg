import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import {
    InvalidTableNumberError,
    InvalidTableCapacityError,
    RestaurantIdRequiredError,
    RestaurantNotFoundError,
    DuplicatedTableNumberError,
    TableNotFoundError,
    TableNotAvailableError,
    InvalidPeopleCountError
} from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    restaurantId: string
    number: number
    capacity: number
    description?: string | null
    status?: string
}

export interface UpdateTableDTO {
    number: number
    capacity: number
    description?: string | null
    status?: string
}

export class TableService {
    constructor(
        private readonly tableRepository: TableRepository,
        private readonly restaurantRepository: RestaurantRepository
    ) {}

    async create(dto: CreateTableDTO): Promise<Table> {
        const now = new Date().toISOString()
        const table = this.buildTable({
            id: randomUUID(),
            restaurantId: dto.restaurantId,
            number: dto.number,
            capacity: dto.capacity,
            description: dto.description,
            status: dto.status ?? 'libre',
            createdAt: now,
            updatedAt: now
        })

        const restaurant = await this.restaurantRepository.findById(table.restaurantId)
        if (!restaurant) {
            throw new RestaurantNotFoundError()
        }
        await this.ensureNumberIsFree(table)

        await this.tableRepository.save(table)
        return table
    }

    async update(restaurantId: string, id: string, dto: UpdateTableDTO): Promise<Table> {
        const existing = await this.getById(restaurantId, id)
        const updated = this.buildTable({
            id: existing.id,
            restaurantId: existing.restaurantId,
            number: dto.number,
            capacity: dto.capacity,
            description: dto.description,
            status: dto.status ?? existing.status,
            createdAt: existing.createdAt,
            updatedAt: new Date().toISOString()
        })
        await this.ensureNumberIsFree(updated)

        await this.tableRepository.save(updated)
        return updated
    }

    // Sin restricciones de transición: es también la única forma de liberar una mesa.
    async changeStatus(restaurantId: string, id: string, status: string): Promise<Table> {
        const existing = await this.getById(restaurantId, id)
        const updated: Table = {
            ...existing,
            status: normalizeTableStatus(status),
            updatedAt: new Date().toISOString()
        }
        await this.tableRepository.save(updated)
        return updated
    }

    async findAvailable(restaurantId: string, people: number): Promise<Table[]> {
        if (!isPositiveInteger(people)) {
            throw new InvalidPeopleCountError()
        }
        return this.tableRepository.findAvailable(restaurantId, people)
    }

    async occupy(restaurantId: string, id: string): Promise<Table> {
        await this.getById(restaurantId, id)
        const occupied = await this.tableRepository.occupyIfFree(id)
        if (!occupied) {
            throw new TableNotAvailableError()
        }
        return this.getById(restaurantId, id)
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        await this.getById(restaurantId, id)
        await this.tableRepository.delete(id)
    }

    // Una mesa de otro restaurante se trata como inexistente (404).
    async getById(restaurantId: string, id: string): Promise<Table> {
        const table = await this.tableRepository.findById(id)
        if (!table || table.restaurantId !== restaurantId) {
            throw new TableNotFoundError()
        }
        return table
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return this.tableRepository.findByRestaurantId(restaurantId)
    }

    private async ensureNumberIsFree(table: Table): Promise<void> {
        const sameNumber = await this.tableRepository.findByRestaurantAndNumber(table.restaurantId, table.number)
        if (sameNumber && sameNumber.id !== table.id) {
            throw new DuplicatedTableNumberError()
        }
    }

    // Concentra las validaciones que en DDD irían en la entidad.
    private buildTable(props: {
        id: string
        restaurantId: string
        number: unknown
        capacity: unknown
        description: string | null | undefined
        status: string
        createdAt: string
        updatedAt: string
    }): Table {
        if (!props.restaurantId || props.restaurantId.trim() === '') {
            throw new RestaurantIdRequiredError()
        }
        if (!isPositiveInteger(props.number)) {
            throw new InvalidTableNumberError()
        }
        if (!isPositiveInteger(props.capacity)) {
            throw new InvalidTableCapacityError()
        }
        return {
            id: props.id,
            restaurantId: props.restaurantId,
            number: props.number,
            description: props.description ?? null,
            capacity: props.capacity,
            status: normalizeTableStatus(props.status),
            createdAt: props.createdAt,
            updatedAt: props.updatedAt
        }
    }
}

// Solo enteros JSON: un string como "3" no se convierte.
function isPositiveInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0
}
