import type { Request, Response } from 'express'
import type { LoginUseCase } from '@employee/application/LoginUseCase.js'
import type { RegisterClientUseCase } from '@employee/application/RegisterClientUseCase.js'

export class AuthController {
    constructor(
        private loginUseCase: LoginUseCase,
        private registerClientUseCase?: RegisterClientUseCase
    ) {}

    login = async (req: Request, res: Response): Promise<void> => {
        const result = await this.loginUseCase.execute({
            email: req.body.email,
            passwordRaw: req.body.password
        })
        res.status(200).json(result)
    }

    register = async (req: Request, res: Response): Promise<void> => {
        if (!this.registerClientUseCase) {
            throw new Error('RegisterClientUseCase not configured')
        }
        const result = await this.registerClientUseCase.execute({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: req.body.password
        })
        res.status(201).json(result)
    }
}
