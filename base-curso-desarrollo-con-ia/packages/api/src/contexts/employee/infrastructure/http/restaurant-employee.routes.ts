import { Router } from 'express'
import { employeeController } from '@employee/infrastructure/http/dependencies.js'
import { authenticate } from '@shared/infrastructure/http/middlewares/authenticate.js'
import { authorize } from '@shared/infrastructure/http/middlewares/authorize.js'

const router = Router({ mergeParams: true })

router.get('/', authenticate, authorize(['admin']), employeeController.listEmployeesByRestaurant)

export default router
