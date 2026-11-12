# Plan: Documentar la API con un fichero OpenAPI (`openapi.yml`)

- **Issue:** #doc
- **Tipo:** Feature
- **Fecha:** 2026-11-12
- **Autor del plan:** alumno_16ed05@pronoide.com

## Objetivo

Crear un documento OpenAPI 3.x (`openapi.yml`) que describa de forma completa y verificable todos los endpoints de la API de Resttek (rutas, métodos, roles requeridos, esquemas de petición/respuesta y códigos de error). Sirve como fuente única de verdad legible por máquina sobre el contrato HTTP de la API, y será el insumo de entrada para la generación posterior de documentación HTML (fuera de este plan).

## Alcance

**Incluye:**
- Un fichero `openapi.yml` válido (OpenAPI 3.0.x) en `base-curso-desarrollo-con-ia/docs/api/`.
- Todos los endpoints listados en `docs/arquitectura/arquitectura-api.md`: públicos, auth, restaurantes, empleados, platos, ingredientes y pedidos.
- Esquema de seguridad `bearerAuth` (JWT) aplicado a las rutas que pasan por `authenticate`/`authorize`, y ausente en las rutas públicas.
- Esquemas (`components/schemas`) para los recursos devueltos por los controladores actuales (Employee, Restaurant, Dish, Ingredient, Order/OrderItem) y para el objeto de error genérico.
- Documentación de los códigos de respuesta relevantes por endpoint (200/201/204, 400, 401, 403, 404), coherente con el mapeo de `errorHandler` descrito en `arquitectura-api.md`.
- Añadir la referencia al nuevo fichero en `base-curso-desarrollo-con-ia/CLAUDE.md`, junto al resto de documentos listados.

**No incluye (fuera de alcance):**
- La skill que mantiene el `openapi.yml` actualizado y genera HTML con Redocly, ni el script en `scripts/` — se construyen directamente, sin plan previo, por petición explícita del usuario.
- Cambios en el código de la API (controladores, rutas, validación).
- Documentación de autenticación/autorización como mecanismo de prueba automatizada (tests de contrato).

## Archivos afectados

- `base-curso-desarrollo-con-ia/docs/api/openapi.yml` — nuevo fichero, documento OpenAPI completo.
- `base-curso-desarrollo-con-ia/CLAUDE.md` — añadir una entrada enlazando al nuevo documento en la lista de docs de la sección "Project".

## Tareas

> Cada tarea debe poder completarse en 5-10 minutos. Si una tarea es más grande, divídela.

- [ ] 1. Crear `base-curso-desarrollo-con-ia/docs/api/openapi.yml` con la cabecera base: `openapi: 3.0.3`, `info` (título, versión `1.0.0`, descripción breve de Resttek), `servers` (`http://localhost:3000` con prefijo `/api/v1`) y el esquema de seguridad `bearerAuth` (`type: http`, `scheme: bearer`, `bearerFormat: JWT`) en `components/securitySchemes`.
- [ ] 2. Añadir en `components/schemas` los esquemas `Employee`, `LoginResponse` (`token` + `employee`) y `Error` (forma genérica de error devuelta por `errorHandler`).
- [ ] 3. Documentar `GET /health` (sin prefijo `/api/v1`, sin auth) y los endpoints de auth: `POST /api/v1/auth/login` y `POST /api/v1/auth/register`, con sus request bodies y respuestas 200/201/401/400.
- [ ] 4. Añadir en `components/schemas` el esquema `Restaurant`, y documentar los endpoints públicos: `GET /api/v1/public/restaurants`, `GET /api/v1/public/restaurants/:id`, `GET /api/v1/public/restaurants/:restaurantId/dishes` (sin seguridad).
- [ ] 5. Documentar los endpoints privados de restaurantes: `POST`, `GET`, `GET /:id`, `PUT /:id` bajo `/api/v1/restaurants`, incluyendo en la descripción de `GET /api/v1/restaurants` el comportamiento distinto según rol (admin ve todos, el resto solo el suyo), y los roles permitidos por operación.
- [ ] 6. Añadir en `components/schemas` el esquema `Dish`, y documentar los endpoints de platos bajo `/api/v1/restaurants/:restaurantId/dishes` (`POST`, `GET`, `GET /:id`, `PUT /:id`, `DELETE /:id`) con sus roles.
- [ ] 7. Añadir en `components/schemas` el esquema `Ingredient`, y documentar los endpoints de ingredientes bajo `/api/v1/restaurants/:restaurantId/ingredients` (`POST`, `GET`, `GET /:id`, `PUT /:id`, `DELETE /:id`) con sus roles.
- [ ] 8. Documentar los endpoints de empleados: `POST /api/v1/employees`, `GET /api/v1/employees` (parámetros `limit`, `offset`, `role`), `GET /api/v1/employees/:id` y `GET /api/v1/restaurants/:restaurantId/employees`, todos admin-only.
- [ ] 9. Añadir en `components/schemas` los esquemas `Order` y `OrderItem`, y documentar `POST /api/v1/orders` y `GET /api/v1/orders/:id`.
- [ ] 10. Documentar `GET /api/v1/orders/active` (parámetro obligatorio `restaurantId`, 400 si falta), `GET /api/v1/orders/mine` y `PATCH /api/v1/orders/:orderId/items/:itemId/status` (respuesta 204 sin cuerpo), dejando constancia en la descripción de que ninguna ruta de pedidos aplica `authorize()`.
- [ ] 11. Revisar el documento completo: que todas las rutas protegidas referencien `security: [bearerAuth: []]`, que las públicas no lo hagan, y que los códigos 400/401/403/404 estén presentes donde aplique según `arquitectura-api.md`.
- [ ] 12. Añadir la entrada de `docs/api/openapi.yml` a la lista de documentos en `base-curso-desarrollo-con-ia/CLAUDE.md`.

## Criterios de aceptación

> Comportamiento observable que debe cumplirse para dar la tarea por terminada. Deben poder verificarse sin ambigüedad.

- [ ] `base-curso-desarrollo-con-ia/docs/api/openapi.yml` existe y es un documento OpenAPI 3.0.x sintácticamente válido (verificable con `npx @redocly/cli lint docs/api/openapi.yml` sin errores de sintaxis).
- [ ] Cada endpoint listado en `docs/arquitectura/arquitectura-api.md` (públicos, auth, restaurantes, empleados, platos, ingredientes, pedidos) tiene una entrada en el spec con método, ruta, parámetros, request body (si aplica) y respuestas documentadas.
- [ ] Las rutas que pasan por `authenticate` declaran `bearerAuth`; las rutas públicas (`/health`, `/auth/*`, `/public/*`) no lo requieren.
- [ ] `base-curso-desarrollo-con-ia/CLAUDE.md` enlaza al nuevo `openapi.yml` junto al resto de documentos de `docs/`.

## Dudas y decisiones tomadas

- **Duda/Decisión:** El usuario pidió crear el documento en "docs/api", pero la raíz del repo no tiene una carpeta `docs/` propia — toda la documentación real vive en `base-curso-desarrollo-con-ia/docs/` (`arquitectura/`, `dominio/`).
  - **Resolución:** Se crea en `base-curso-desarrollo-con-ia/docs/api/openapi.yml`, manteniendo la estructura de documentación existente, en vez de crear una carpeta `docs/` nueva en la raíz del repositorio.
- **Duda/Decisión:** No se especificó versión de OpenAPI.
  - **Resolución:** Se usa `3.0.3`, por ser la más ampliamente soportada por Redocly y otras herramientas de validación/generación.
- **Duda/Decisión:** El pedido original incluye también crear una skill de actualización automática + generación HTML con Redocly y su script en `scripts/`.
  - **Resolución:** Queda explícitamente fuera de este plan porque el usuario pidió "planificar" solo la creación del documento, y pidió generar la skill directamente (no planificarla). Se implementa en un paso posterior, separado de este plan.
- **Duda/Decisión:** Nivel de detalle de los esquemas de datos.
  - **Resolución:** Se documentan los campos tal y como los serializan los controladores actuales (p. ej. `Employee` con `id, firstName, lastName, email, role, restaurantId`), no el esquema interno de la base de datos (`docs/dominio/modelo-datos.md` ya cubre eso).
