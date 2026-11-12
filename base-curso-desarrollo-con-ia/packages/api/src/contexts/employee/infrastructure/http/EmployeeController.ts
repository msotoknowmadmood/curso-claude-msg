import type { Request, Response } from 'express'
import type { CreateEmployeeUseCase } from '@employee/application/CreateEmployeeUseCase.js'
import type { IEmployeeRepository } from '@employee/domain/IEmployeeRepository.js'
import { EmployeeNotFoundError } from '@errors/DomainErrors.js'

export class EmployeeController {
    constructor(
        private createEmployeeUseCase: CreateEmployeeUseCase,
        private employeeRepository: IEmployeeRepository
    ) {}

    createEmployee = async (req: Request, res: Response): Promise<void> => {
        const { firstName, lastName, email, password, role, restaurantId } = req.body
        const employee = await this.createEmployeeUseCase.execute({
            firstName,
            lastName,
            email,
            passwordPlain: password,
            role,
            restaurantId: restaurantId ?? null
        })
        res.status(201).json({
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            role: employee.role,
            restaurantId: employee.restaurantId
        })
    }

    listEmployees = async (req: Request, res: Response): Promise<void> => {
        const limit = parseInt(req.query.limit as string) || 10
        const offset = parseInt(req.query.offset as string) || 0
        const role = req.query.role as string

        const employees = await this.employeeRepository.findAll(limit, offset, role)
        res.status(200).json(employees.map(e => ({
            id: e.id,
            firstName: e.firstName,
            lastName: e.lastName,
            email: e.email,
            role: e.role,
            restaurantId: e.restaurantId
        })))
    }

    getEmployee = async (req: Request, res: Response): Promise<void> => {
        const employee = await this.employeeRepository.findById(req.params.id as string)
        if (!employee) {
            throw new EmployeeNotFoundError()
        }
        res.status(200).json({
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            role: employee.role,
            restaurantId: employee.restaurantId
        })
    }

    listEmployeesByRestaurant = async (req: Request, res: Response): Promise<void> => {
        const restaurantId = req.params['restaurantId'] as string
        const employees = await this.employeeRepository.findByRestaurant(restaurantId)
        res.status(200).json(employees.map(e => ({
            id: e.id,
            firstName: e.firstName,
            lastName: e.lastName,
            email: e.email,
            role: e.role,
            restaurantId: e.restaurantId
        })))
    }
}
