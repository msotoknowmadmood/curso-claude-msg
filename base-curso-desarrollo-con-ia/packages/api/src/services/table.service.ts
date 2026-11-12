import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import {
    InvalidTableNumberError,
    InvalidTableCapacityError,
    RestaurantIdRequiredError,
    RestaurantNotFoundError
} from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    restaurantId: string
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

        await this.tableRepository.save(table)
        return table
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
