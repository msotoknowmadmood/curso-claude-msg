import { Router } from 'express'
import { TableController } from '@controllers/table.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { TableService } from '@services/table.service.js'
import { authenticate } from '@shared/infrastructure/http/middlewares/authenticate.js'
import { authorize } from '@shared/infrastructure/http/middlewares/authorize.js'

const tableRepository = new SqliteTableRepository(dbConfig)
const restaurantRepository = new SqliteRestaurantRepository(dbConfig)
const tableService = new TableService(tableRepository, restaurantRepository)
const tableController = new TableController(tableService)

const STAFF = ['admin', 'manager', 'camarero', 'cocinero']

const router = Router({ mergeParams: true })

// /available debe ir antes de /:id para que "available" no se tome como id.
router.get('/available', authenticate, tableController.getAvailable)
router.get('/', authenticate, authorize(STAFF), tableController.getAll)
router.post('/', authenticate, authorize(['admin']), tableController.create)
router.get('/:id', authenticate, authorize(STAFF), tableController.getById)
router.put('/:id', authenticate, authorize(['admin']), tableController.update)
router.delete('/:id', authenticate, authorize(['admin']), tableController.delete)
router.patch('/:id/status', authenticate, authorize(STAFF), tableController.changeStatus)
router.patch('/:id/occupy', authenticate, tableController.occupy)

export default router
