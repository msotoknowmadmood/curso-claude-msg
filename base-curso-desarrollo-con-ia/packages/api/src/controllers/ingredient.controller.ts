import type { Request, Response } from 'express'
import type { IngredientService } from '@services/ingredient.service.js'
import type { Ingredient } from '@models/ingredient.model.js'
import { IngredientNotFoundError } from '@errors/DomainErrors.js'

export class IngredientController {
    constructor(private readonly ingredientService: IngredientService) {}

    create = async (req: Request, res: Response): Promise<void> => {
        const ingredient = await this.ingredientService.create({
            name: req.body.name,
            unit: req.body.unit,
            currentStock: req.body.currentStock ?? 0,
            restaurantId: req.params.restaurantId as string
        })
        res.status(201).json(this.toJSON(ingredient))
    }

    getAll = async (req: Request, res: Response): Promise<void> => {
        const ingredients = await this.ingredientService.findByRestaurantId(req.params.restaurantId as string)
        res.status(200).json(ingredients.map(i => this.toJSON(i)))
    }

    getById = async (req: Request, res: Response): Promise<void> => {
        const ingredient = await this.ingredientService.findById(req.params.id as string)
        if (!ingredient) {
            throw new IngredientNotFoundError()
        }
        res.status(200).json(this.toJSON(ingredient))
    }

    update = async (req: Request, res: Response): Promise<void> => {
        const ingredient = await this.ingredientService.update(req.params.id as string, {
            name: req.body.name,
            unit: req.body.unit,
            currentStock: req.body.currentStock
        })
        res.status(200).json(this.toJSON(ingredient))
    }

    delete = async (req: Request, res: Response): Promise<void> => {
        await this.ingredientService.delete(req.params.id as string)
        res.status(204).send()
    }

    private toJSON(ingredient: Ingredient) {
        return {
            id: ingredient.id,
            name: ingredient.name,
            unit: ingredient.unit,
            currentStock: ingredient.currentStock,
            restaurantId: ingredient.restaurantId,
            createdAt: ingredient.createdAt,
            updatedAt: ingredient.updatedAt
        }
    }
}
