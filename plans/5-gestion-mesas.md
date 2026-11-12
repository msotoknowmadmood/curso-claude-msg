# Plan: Gestión de mesas

- **Issue:** #5
- **Tipo:** Feature
- **Fecha:** 2026-11-12
- **Autor del plan:** alumno_16ed05@pronoide.com

## Objetivo

Introducir el concepto de **mesa** en Resttek para que cada pedido quede asociado a una mesa real del restaurante. El administrador gestiona las mesas de cada restaurante (alta, edición, baja, listado); el cliente, al entrar en un restaurante, indica cuántas personas son, elige una mesa libre con capacidad suficiente y esta pasa a ocupada antes de ver la carta; y los empleados ven el estado de todas las mesas, lo cambian (libre / ocupada / reservada) y consultan los pedidos en curso de las mesas ocupadas.

## Alcance

**Incluye:**
- **API (estilo por capas, como `ingredient`)**: nueva tabla `tables` y dominio `table` (`models/`, `repositories/`, `services/`, `controllers/`, `routes/`) con:
  - CRUD de mesas por restaurante (`id`, `number`, `description`, `capacity`, `status`, `restaurantId`, `createdAt`, `updatedAt`).
  - Cambio de estado de una mesa por empleados.
  - Listado de mesas libres con capacidad ≥ N personas, y ocupación atómica de una mesa libre por parte del cliente.
- Nuevos errores de dominio y alta de `TableNotFoundError` en la lista de 404 del `errorHandler`.
- Datos de ejemplo de mesas en el seed para `rest-1` y `rest-2`, y el pedido de ejemplo apuntando a una mesa real.
- El listado de pedidos devuelve también el número de mesa (`tableNumber`), para que cocina/barra/salón muestren "Mesa 3" en vez de un UUID.
- **web-admin**: feature `tables` (listado + formulario crear/editar + borrar) bajo `restaurants/:restaurantId/tables`, enlazada desde el dashboard del restaurante.
- **web-empleados**: nueva página "Mesas" con el estado de cada mesa, selector para cambiarlo y, en las ocupadas, sus pedidos activos con el estado de cada ítem.
- **web-clientes**: nuevo paso "Elegir mesa" entre la lista de restaurantes y la carta (nº de personas → mesas disponibles → continuar = ocupar), y envío del `tableId` al crear el pedido.
- Tests unitarios del servicio y test de integración SQLite del repositorio de mesas.
- Actualización de la documentación (`modelo-datos.md`, `arquitectura-api.md`, `glosario.md`) y del OpenAPI (skill `/update-api-docs`).

**No incluye (fuera de alcance):**
- Liberación automática de la mesa (al entregar/pagar el pedido o por tiempo): la mesa vuelve a `libre` solo cuando un empleado lo cambia a mano.
- Flujo de reservas para clientes (fecha/hora, reservar desde la app): `reservada` es solo un estado que fija un empleado o el admin.
- Comprobar que el empleado pertenece al restaurante de la mesa que modifica: hoy ninguna ruta por restaurante (platos, ingredientes) lo comprueba y se mantiene la misma convención.
- Validar en `POST /orders` que el `tableId` exista, pertenezca al restaurante o esté ocupada (ver "Dudas y decisiones").
- Unir varias mesas, plano visual del salón, o mover un pedido de mesa.
- Tests de frontend (no existe suite de tests en las apps Angular) y tests HTTP con `supertest`.
- Unificar el `styles.css` duplicado de las tres apps.

## Archivos afectados

**API (`packages/api/src`)**
- `config/database.ts` — añadir `CREATE TABLE IF NOT EXISTS tables (...)` con `UNIQUE(restaurant_id, number)` y FK a `restaurants`.
- `models/table.model.ts` (nuevo) — interfaz `Table`, tipo `TableStatusType` (`libre`, `ocupada`, `reservada`) y `normalizeTableStatus()`.
- `errors/DomainErrors.ts` — nuevos errores: `TableNotFoundError`, `InvalidTableNumberError`, `InvalidTableCapacityError`, `InvalidTableStatusError`, `DuplicatedTableNumberError`, `TableNotAvailableError`, `InvalidPeopleCountError`.
- `repositories/table.repository.ts` (nuevo) — interfaz `TableRepository` + `SqliteTableRepository` (`findById`, `findByRestaurantId`, `findByRestaurantAndNumber`, `findAvailable(restaurantId, people)`, `save`, `delete`, `occupyIfFree(id): Promise<boolean>`).
- `repositories/table.repository.test.ts` (nuevo) — integración con SQLite `:memory:`.
- `repositories/mocks/MockTableRepository.ts` (nuevo) — doble en memoria para los tests del servicio.
- `services/table.service.ts` (nuevo) — `create`, `update`, `delete`, `findById`, `findByRestaurantId`, `changeStatus`, `findAvailable`, `occupy`, con validaciones en `buildTable()`.
- `services/table.service.test.ts` (nuevo) — tests unitarios del servicio.
- `controllers/table.controller.ts` (nuevo) — adaptador HTTP que delega errores en `next(error)` (como `IngredientController`, no como `OrderController`).
- `routes/table.routes.ts` (nuevo) — cableado repo → servicio → controlador y rutas con `authenticate`/`authorize`.
- `app.ts` — montar `/api/v1/restaurants/:restaurantId/tables`.
- `contexts/shared/infrastructure/http/middlewares/errorHandler.ts` — añadir `TableNotFoundError` a `NOT_FOUND_ERRORS`.
- `repositories/order.repository.ts` — `LEFT JOIN tables` para devolver `tableNumber` en las consultas de pedidos.
- `models/order.model.ts` — campo opcional `tableNumber?: number | null` en `Order`.
- `scripts/seed.ts` — insertar mesas de ejemplo con ids fijos y usar una de ellas en el pedido de ejemplo (hoy `table_id = '5'`).

**web-admin (`packages/web-admin/src/app`)**
- `features/tables/models/table.model.ts` (nuevo) — tipos `Table`, `TableStatus`, DTOs.
- `features/tables/services/table.service.ts` (nuevo) — llamadas HTTP CRUD (`environment.apiUrl`).
- `features/tables/store/table.store.ts` (nuevo) — signals + `firstValueFrom`, mismo patrón que `IngredientStore`.
- `features/tables/pages/table-list/*` (nuevo) — tabla con número, descripción, capacidad, estado, acciones editar/borrar.
- `features/tables/pages/table-form/*` (nuevo) — formulario crear/editar.
- `features/tables/tables.routes.ts` (nuevo) — `TABLE_ROUTES` (`''`, `new`, `:id/edit`).
- `app.routes.ts` — ruta hija `tables` bajo `restaurants/:restaurantId`.
- `features/restaurants/pages/restaurant-dashboard/restaurant-dashboard.component.html` — tarjeta "Mesas".

**web-empleados (`packages/web-empleados/src/app`)**
- `features/tables/models/table.model.ts` (nuevo) — tipos de mesa.
- `features/tables/services/table.service.ts` (nuevo) — `getAll(restaurantId)`, `changeStatus(...)`.
- `features/tables/store/table.store.ts` (nuevo) — signals + polling de 30 s (como `OrderStore`).
- `features/tables/pages/mesas/*` (nuevo) — tarjetas de mesas con estado, selector de estado y pedidos activos de las ocupadas (reutilizando `OrderStore.orders` filtrado por `tableId`).
- `app.routes.ts` — ruta `mesas`.
- `core/layout/shell.component.ts` / `shell.component.html` — `canSeeMesas` y enlace "Mesas" en el menú.
- `features/orders/models/order.model.ts` — `tableNumber?: number | null`.
- `features/orders/pages/{cocina,barra,salon}/*.component.html` — mostrar `Mesa {{ order.tableNumber ?? order.tableId }}`.

**web-clientes (`packages/web-clientes/src/app`)**
- `core/models/table.model.ts` (nuevo) — tipo `Table`.
- `core/services/table.service.ts` (nuevo) — `getAvailable(restaurantId, people)`, `occupy(restaurantId, tableId)` (con `API_URL` inyectado).
- `core/store/cart.store.ts` — guardar `tableId`/`tableNumber` seleccionados (`setTable`, se limpian en `clear()` y al cambiar de restaurante).
- `features/tables/select-table.component.ts` (nuevo) — paso "¿Cuántas personas?" → lista de mesas → "Continuar".
- `app.routes.ts` — ruta `restaurants/:id/table`.
- `features/restaurants/restaurant-list.component.ts` — el enlace de cada restaurante va a `/restaurants/:id/table`.
- `features/menu/restaurant-menu.component.ts` — si no hay mesa elegida para ese restaurante, redirigir a `/restaurants/:id/table`; mostrar "Mesa N".
- `core/services/order.service.ts` — `createOrder` recibe y envía `tableId`.
- `features/cart/cart.component.ts` — pasar `cartStore.tableId()` a `createOrder`.
- `core/models/order.model.ts` — `tableNumber?: number | null` (para mostrarlo en el detalle si se desea).

**Documentación**
- `docs/dominio/modelo-datos.md` — tabla `tables`, relación `restaurants → tables`, `orders.table_id` → FK lógica a `tables.id`.
- `docs/arquitectura/arquitectura-api.md` — sección de endpoints de mesas y nuevo 404.
- `docs/dominio/glosario.md` — términos Mesa y estados de mesa.
- `docs/api/openapi.yml` (+ HTML generado) — vía `/update-api-docs`.

## Tareas

> Cada tarea debe poder completarse en 5-10 minutos. Si una tarea es más grande, divídela.

### API — modelo y persistencia

- [x] 1. Crear `models/table.model.ts` con `VALID_TABLE_STATUSES`, `TableStatusType`, interfaz `Table` y `normalizeTableStatus()`; añadir `InvalidTableStatusError` en `DomainErrors.ts`. Test: `normalizeTableStatus(' Ocupada ')` → `'ocupada'` y valor inválido lanza el error (en `table.service.test.ts` o un `table.model.test.ts`).
- [x] 2. Añadir en `DomainErrors.ts` el resto de errores: `TableNotFoundError`, `InvalidTableNumberError`, `InvalidTableCapacityError`, `DuplicatedTableNumberError`, `TableNotAvailableError`, `InvalidPeopleCountError`; añadir `TableNotFoundError` a `NOT_FOUND_ERRORS` en `errorHandler.ts`.
- [x] 3. Añadir `CREATE TABLE IF NOT EXISTS tables (id TEXT PK, restaurant_id TEXT NOT NULL, number INTEGER NOT NULL, description TEXT, capacity INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'libre', created_at, updated_at, UNIQUE(restaurant_id, number), FK restaurants)` en `runInitialMigrations()`.
- [x] 4. Crear `repositories/table.repository.ts` con la interfaz `TableRepository` y `SqliteTableRepository.save()` (UPDATE/INSERT) + `findById()` con alias `snake_case → camelCase`; test de integración en `table.repository.test.ts` (guardar y recuperar).
- [x] 5. Implementar `findByRestaurantId()` (ordenado por `number`) y `findByRestaurantAndNumber()` con sus tests de integración.
- [ ] 6. Implementar `delete()` y `findAvailable(restaurantId, people)` (`status = 'libre' AND capacity >= ?`, ordenado por `capacity, number`) con tests: excluye ocupadas/reservadas, excluye capacidad insuficiente, excluye otros restaurantes.
- [ ] 7. Implementar `occupyIfFree(id)` con `UPDATE tables SET status='ocupada', updated_at=? WHERE id=? AND status='libre'` devolviendo `changes === 1`; test: primera llamada `true`, segunda `false`.
- [ ] 8. Crear `repositories/mocks/MockTableRepository.ts` (array en memoria) implementando toda la interfaz.

### API — servicio

- [ ] 9. `TableService.create()` + `buildTable()`: valida `number` entero > 0, `capacity` entero > 0, `restaurantId` obligatorio, `status` por defecto `libre` y normalizado. Tests con el mock (caso feliz + cada validación).
- [ ] 10. En `create()`, rechazar número duplicado en el mismo restaurante con `DuplicatedTableNumberError` (y permitir el mismo número en otro restaurante). Tests.
- [ ] 11. `TableService.update()` (404 si no existe, revalida, mantiene `restaurantId`/`createdAt`, comprueba duplicado ignorando la propia mesa) y `delete()` (404 si no existe). Tests.
- [ ] 12. `TableService.changeStatus(id, status)` (404 si no existe, normaliza estado, actualiza `updatedAt`). Tests.
- [ ] 13. `TableService.findAvailable(restaurantId, people)` (lanza `InvalidPeopleCountError` si `people` no es entero ≥ 1) y `occupy(id)` (404 si no existe; `TableNotAvailableError` si `occupyIfFree` devuelve `false`). Tests.

### API — HTTP

- [ ] 14. Crear `controllers/table.controller.ts` con `create`, `getAll`, `getById`, `update`, `delete` (arrow functions, `next(error)` en el `catch`, `restaurantId` desde `req.params`).
- [ ] 15. Añadir en el controlador `changeStatus` (body `{ status }`), `getAvailable` (query `?people=`, convertido a número) y `occupy` (devuelve la mesa ocupada).
- [ ] 16. Crear `routes/table.routes.ts` (`mergeParams: true`): `GET /available` y `PATCH /:id/occupy` solo con `authenticate`; `GET /` y `GET /:id` para `admin, manager, camarero, cocinero`; `PATCH /:id/status` para `admin, manager, camarero, cocinero`; `POST /`, `PUT /:id`, `DELETE /:id` solo `admin`. Declarar `/available` antes de `/:id`. Montar en `app.ts` bajo `/api/v1/restaurants/:restaurantId/tables`.
- [ ] 17. Añadir `tableNumber` a `Order` y `LEFT JOIN tables t ON t.id = o.table_id` en las consultas de `order.repository.ts` (`findById`, `findActiveByRestaurant`, `findByClientId`); ajustar `MockOrderRepository` si hace falta y comprobar que `order.service.test.ts` sigue en verde.
- [ ] 18. Seed: insertar mesas fijas (`table-1-1` … `table-1-6` para `rest-1` con capacidades 2/2/4/4/6/8, y 3–4 mesas para `rest-2`) con `INSERT OR IGNORE`; cambiar el `table_id` del pedido de ejemplo de `'5'` a `table-1-5` y marcar esa mesa como `ocupada`.
- [ ] 19. Ejecutar `npm test` desde la raíz y verificación manual con curl/Postman de todos los endpoints de mesas (incluidos 400/403/404 y doble `occupy` → 400 `TableNotAvailableError`).

### web-admin

- [x] 20. Crear `features/tables/models/table.model.ts` y `features/tables/services/table.service.ts` (`getAll`, `getById`, `create`, `update`, `delete` sobre `${environment.apiUrl}/restaurants/:restaurantId/tables`).
- [x] 21. Crear `features/tables/store/table.store.ts` siguiendo `IngredientStore` (signals privados de solo lectura, `loading`, `error`, `firstValueFrom`).
- [x] 22. Crear `pages/table-list` (tabla número/descripción/capacidad/estado con badge, botones editar/borrar con confirmación, botón "Nueva mesa").
- [x] 23. Crear `pages/table-form` (número, descripción, capacidad, estado; modo crear/editar según `:id`; mostrar el `message` del error de la API, p. ej. número duplicado).
- [x] 24. Crear `tables.routes.ts`, registrar `tables` en `app.routes.ts` bajo `restaurants/:restaurantId` y añadir la tarjeta "Mesas" en `restaurant-dashboard.component.html`. Verificar en `:4200` el CRUD completo. (Pendiente: verificación manual en :4200; solo se ha comprobado que compila con `npx ng build`.)

### web-empleados

- [x] 25. Crear `features/tables/models/table.model.ts`, `services/table.service.ts` (`getAll(restaurantId)`, `changeStatus(restaurantId, id, status)`) y `store/table.store.ts` con polling cada 30 s (mismo patrón que `OrderStore`).
- [x] 26. Crear `pages/mesas` con una tarjeta por mesa (número, capacidad, descripción, estado con color) y un `<select>` para cambiar el estado que llame al store y refresque.
- [x] 27. En `pages/mesas`, para las mesas `ocupada`, mostrar los pedidos activos de esa mesa (`OrderStore.orders()` filtrado por `order.tableId === table.id`) con el estado de cada ítem; asegurar que `OrderStore` se carga/polling también desde esta página.
- [x] 28. Añadir ruta `mesas` en `app.routes.ts`, `canSeeMesas` en `shell.component.ts` (todos los roles de empleado) y el enlace "Mesas" en `shell.component.html`.
- [x] 29. Añadir `tableNumber` a `features/orders/models/order.model.ts` y mostrar `Mesa {{ order.tableNumber ?? order.tableId }}` en `cocina`, `barra` y `salon`. Verificar en `:4201` con `camarero1@resttek.com`.
  - Nota: compila con `ng build`; la verificación manual en `:4201` con `camarero1@resttek.com` queda pendiente.

### web-clientes

- [x] 30. Crear `core/models/table.model.ts` y `core/services/table.service.ts` (`getAvailable(restaurantId, people)` → `GET .../tables/available?people=N`; `occupy(restaurantId, tableId)` → `PATCH .../tables/:id/occupy`) con `API_URL` inyectado.
- [x] 31. Ampliar `CartStore` con `tableId`, `tableNumber`, `setTable(restaurantId, tableId, tableNumber)`; limpiar mesa en `clear()` y al cambiar de restaurante.
- [x] 32. Crear `features/tables/select-table.component.ts`: input nº de personas (entero ≥ 1) + botón "Buscar mesas"; lista de mesas disponibles seleccionables (número, capacidad, descripción); mensaje si no hay ninguna.
- [x] 33. En el mismo componente, botón "Continuar" (deshabilitado sin mesa elegida) que llama a `occupy`; en éxito `cartStore.setTable(...)` y navega a `/restaurants/:id`; si la API responde `TableNotAvailableError`, mostrar aviso y recargar disponibles.
- [x] 34. Registrar la ruta `restaurants/:id/table` en `app.routes.ts` y cambiar el enlace de `restaurant-list.component.ts` a `['/restaurants', restaurant.id, 'table']`.
- [x] 35. En `restaurant-menu.component.ts`, redirigir a `/restaurants/:id/table` si `cartStore.tableId()` es nulo o la mesa es de otro restaurante; mostrar "Mesa N" en la cabecera.
- [ ] 36. Cambiar `OrderService.createOrder` para recibir `tableId` y enviarlo en el body; pasar `cartStore.tableId()` desde `cart.component.ts`. Verificar en `:4202` el flujo completo con `cliente1@resttek.com`.

### Documentación y cierre

- [ ] 37. Actualizar `docs/dominio/modelo-datos.md` (tabla `tables`, ERD, relaciones) y `docs/dominio/glosario.md` (Mesa, estados `libre`/`ocupada`/`reservada`).
- [ ] 38. Actualizar `docs/arquitectura/arquitectura-api.md` (tabla de endpoints de mesas, `TableNotFoundError` en la lista de 404, `table` en los dominios por capas) y ejecutar `/update-api-docs` para el OpenAPI.
- [ ] 39. Verificación end-to-end: cliente ocupa mesa y pide → empleado ve la mesa ocupada con su pedido en "Mesas" y "Mesa N" en cocina/barra → empleado la pasa a `libre` → vuelve a aparecer como disponible para el cliente.

## Criterios de aceptación

> Comportamiento observable que debe cumplirse para dar la tarea por terminada. Deben poder verificarse sin ambigüedad.

- [ ] Un `admin` puede crear, listar, editar y borrar mesas de un restaurante desde web-admin (`Restaurantes → <restaurante> → Mesas`), con número, descripción, capacidad y estado.
- [ ] La API rechaza (400) una mesa con número o capacidad no enteros o ≤ 0, con estado distinto de `libre`/`ocupada`/`reservada`, o con un número ya usado en el mismo restaurante; una mesa inexistente devuelve 404.
- [ ] Un usuario que no es `admin` recibe 403 al crear, editar o borrar mesas.
- [ ] En web-clientes, al pulsar un restaurante el cliente ve primero la pantalla "¿Cuántas personas?"; al indicar N solo aparecen las mesas `libre` de ese restaurante con capacidad ≥ N.
- [ ] Al elegir una mesa y pulsar "Continuar", la mesa pasa a `ocupada` en la base de datos y el cliente llega a la carta, donde se muestra el número de mesa.
- [ ] Si dos clientes intentan ocupar la misma mesa, solo el primero lo consigue; el segundo ve un aviso y la lista de disponibles actualizada.
- [ ] No se puede acceder a la carta de un restaurante (`/restaurants/:id`) sin haber elegido mesa en ese restaurante: se redirige a la selección de mesa.
- [ ] El pedido enviado desde el carrito se guarda con el `tableId` de la mesa elegida, y en cocina/barra/salón aparece como "Mesa N" (número de mesa, no UUID).
- [ ] En web-empleados existe la página "Mesas" visible para manager, camarero y cocinero, que muestra todas las mesas del restaurante del empleado con su estado, permite cambiarlo y se refresca sola cada 30 s.
- [ ] En esa página, cada mesa `ocupada` muestra sus pedidos activos con el estado de cada ítem.
- [ ] Tras `npm run seed`, existen mesas de ejemplo en `rest-1` y `rest-2` y el pedido de ejemplo está asociado a una de ellas.
- [ ] `npm test` pasa en verde, incluyendo los nuevos tests de `TableService` y `SqliteTableRepository`.
- [ ] `modelo-datos.md`, `arquitectura-api.md`, `glosario.md` y el OpenAPI reflejan la nueva entidad y sus endpoints.

## Dudas y decisiones tomadas

> Ambigüedades del pedido original y cómo se resolvieron, o decisiones técnicas tomadas sin consultar al usuario (con la razón). Si no hay ninguna, escribir "Ninguna".

- **Duda/Decisión:** ¿Estilo arquitectónico para el nuevo dominio?
  - **Resolución / Alternativas consideradas:** Por capas (`models/repositories/services/controllers/routes`), igual que `ingredient`/`dish`. El hexagonal solo se usa en `employee`; introducir un segundo bounded context sería inconsistente con el resto de dominios de negocio.
- **Duda/Decisión:** Nombre de la tabla y del campo "id/numero/descripcion/capacidad/estado" del issue.
  - **Resolución / Alternativas consideradas:** Tabla `tables`, columnas en inglés `snake_case` (`number`, `description`, `capacity`, `status`) y valores de estado en español (`libre`, `ocupada`, `reservada`), siguiendo la convención de `dishes`/`order_items` (columnas en inglés, valores de dominio en español). `id` es UUID; `number` es el número visible para el cliente, único por restaurante.
- **Duda/Decisión:** ¿Hace falta borrar `resttek.db`?
  - **Resolución / Alternativas consideradas:** No: se añade una tabla nueva (no una columna), así que `CREATE TABLE IF NOT EXISTS` la crea en una BD existente. `orders.table_id` ya existe y se reutiliza para guardar el `id` de la mesa; no se añade FK física para no tener que recrear `orders` (no hay framework de migraciones). Solo hay que volver a ejecutar `npm run seed` para tener mesas de ejemplo.
- **Duda/Decisión:** ¿Quién gestiona (CRUD) las mesas? El issue dice "el administrador".
  - **Resolución / Alternativas consideradas:** Solo `admin` puede crear/editar/borrar (mismo criterio que ingredientes). El `manager` no se incluye para ceñirse al issue; ampliarlo es trivial cambiando `authorize()`.
- **Duda/Decisión:** ¿Qué empleados pueden ver y cambiar el estado de las mesas?
  - **Resolución / Alternativas consideradas:** El issue dice "los empleados" sin distinguir rol, así que `admin`, `manager`, `camarero` y `cocinero` pueden listar mesas y cambiar su estado, y el enlace "Mesas" se muestra a todos los roles de web-empleados. No se comprueba que la mesa sea del restaurante del empleado, por coherencia con el resto de rutas por restaurante (riesgo conocido, fuera de alcance).
- **Duda/Decisión:** ¿Cómo ocupa el cliente la mesa sin que pueda cambiar estados arbitrariamente?
  - **Resolución / Alternativas consideradas:** Endpoints específicos `GET .../tables/available?people=N` y `PATCH .../tables/:id/occupy`, solo con `authenticate` (cualquier usuario logueado, incluido `cliente`), en vez de abrirle `PATCH .../status`. La ocupación es atómica (`UPDATE ... WHERE status = 'libre'`) para evitar que dos clientes ocupen la misma mesa. Se descartó ponerlos bajo `/public/...` porque toda web-clientes ya está tras `authGuard` y ocupar una mesa debe requerir usuario.
- **Duda/Decisión:** Código HTTP cuando la mesa ya no está libre.
  - **Resolución / Alternativas consideradas:** 400 (`TableNotAvailableError` cae en la regla genérica de `AppError` del `errorHandler`). Un 409 sería más preciso, pero exigiría introducir un nuevo código en el `errorHandler`, que hoy no lo contempla; se deja anotado como posible mejora.
- **Duda/Decisión:** ¿Qué pasa si el cliente abandona tras ocupar la mesa sin pedir, o cuando termina?
  - **Resolución / Alternativas consideradas:** El issue no define la liberación; se deja manual por parte de los empleados (que es precisamente la funcionalidad que el issue les da). La liberación automática queda fuera de alcance.
- **Duda/Decisión:** ¿Validar en `POST /orders` que el `tableId` exista y esté ocupada?
  - **Resolución / Alternativas consideradas:** No en este plan: `OrderService` no conoce hoy otros repositorios y `OrderController` tiene su propio manejo de errores; acoplarlo amplía el alcance. El frontend solo envía un `tableId` obtenido tras ocupar la mesa. Queda como mejora posible.
- **Duda/Decisión:** ¿Cómo muestran los empleados "los pedidos de las mesas ocupadas"?
  - **Resolución / Alternativas consideradas:** Reutilizando `GET /orders/active?restaurantId=` (ya usado por `OrderStore`) y cruzando por `tableId` en el frontend, en vez de crear un endpoint nuevo `GET /tables/:id/orders`. Además, el repositorio de pedidos devuelve `tableNumber` vía `LEFT JOIN`, porque al pasar `table_id` a ser un UUID las vistas de cocina/barra/salón mostrarían un identificador ilegible.
- **Duda/Decisión:** Ubicación de la nueva pantalla en web-clientes, que usa `features/` planos.
  - **Resolución / Alternativas consideradas:** `features/tables/select-table.component.ts` (componente inline, sin subcarpetas `models/services/store`), y modelo/servicio en `core/`, como el resto de esa app. La mesa elegida se guarda en `CartStore` (único store de la app) en lugar de crear un `TableStore` nuevo.
- **Duda/Decisión:** ¿Debe persistir la mesa elegida si el cliente recarga la página?
  - **Resolución / Alternativas consideradas:** No: `CartStore` es en memoria (igual que el carrito hoy). Si recarga, se le redirige a elegir mesa de nuevo; la anterior queda `ocupada` hasta que un empleado la libere. Se acepta por simplicidad y queda anotado.
- **Duda/Decisión:** Contrato de la API acordado entre los 4 agentes (api, web-admin, web-empleados, web-clientes) antes de implementar.
  - **Resolución / Alternativas consideradas:** Fijado en `docs/api/openapi.yml` (v1.0.1), aprobado por los 4 agentes. Puntos clave que amplían o concretan el plan:
    - Una mesa que no pertenece al `:restaurantId` de la ruta responde 404 `TableNotFoundError` en `GET /{id}`, `PUT`, `DELETE`, `/status` y `/occupy`. Por eso el servicio recibe `restaurantId` en esas operaciones.
    - `PATCH /status` y `PATCH /occupy` responden 200 con la `Table` completa, y `DELETE` responde 204. Se puede borrar una mesa en cualquier estado.
    - `PUT` es un reemplazo: `number` y `capacity` son obligatorios, si falta `status` se conserva y si falta `description` queda en `null`.
    - `number` y `capacity` tienen que ser enteros JSON. Un string, un decimal, `null` o un valor ≤ 0 dan 400.
    - `?people` ausente, no numérico, decimal o ≤ 0 da 400 `InvalidPeopleCountError`.
    - `POST /tables` con un restaurante que no existe da 404 `RestaurantNotFoundError`.
    - Los mensajes de error van en inglés. Los clientes distinguen los errores por el campo `error` (el nombre de la clase), no por `message`, y web-admin muestra los textos traducidos al español.
    - `POST /orders` no devuelve `tableNumber`, pero `GET /orders/{id}`, `/mine` y `/active` sí.
- **Duda/Decisión:** Ciclo de vida de la mesa en `CartStore` (web-clientes).
  - **Resolución / Alternativas consideradas:** La mesa se guarda en su propio `tableRestaurantId`, y `removeItem` no la borra. `clear()`, que se llama tras confirmar el pedido, conserva la mesa para que el cliente pueda volver a pedir sin elegirla otra vez. `clearTable()` es la función que sí la borra, y la mesa también se limpia al cambiar de restaurante. Además, `select-table` redirige a la carta si ya hay mesa en ese restaurante, para que el cliente no ocupe dos mesas.
- **Duda/Decisión:** Polling en web-empleados.
  - **Resolución / Alternativas consideradas:** `OrderStore.startPolling()` llama antes a `stopPolling()` para que no se acumulen intervalos al compartirlo con la página Mesas. `canSeeMesas` se activa para cocinero, camarero y manager (admin no usa web-empleados). Una mesa ocupada sin pedidos activos muestra "Sin pedidos activos".
