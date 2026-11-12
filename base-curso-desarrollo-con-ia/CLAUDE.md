# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Resttek: a restaurant management platform (admin panel, staff app, customer ordering app) backed by a single Node.js API. npm workspaces monorepo with 5 packages under `packages/*`: `api`, `web-admin`, `web-empleados`, `web-clientes`, `web-shared`.

For anything beyond this file, read the docs first instead of re-deriving it from code — they are accurate and detailed:
- [`docs/arquitectura/arquitectura-general.md`](docs/arquitectura/arquitectura-general.md) — monorepo/workspace layout, ports, dev data flow
- [`docs/arquitectura/arquitectura-api.md`](docs/arquitectura/arquitectura-api.md) — backend architecture, full endpoint list, error handling
- [`docs/arquitectura/arquitectura-frontend.md`](docs/arquitectura/arquitectura-frontend.md) — per-app frontend structure, state pattern, auth
- [`docs/dominio/glosario.md`](docs/dominio/glosario.md) — domain terms, roles, order/dish statuses
- [`docs/dominio/modelo-datos.md`](docs/dominio/modelo-datos.md) — full SQLite schema

## Commands

Run everything from the repo root (npm workspaces — one `npm install` links all packages).

```bash
npm install          # install all packages
npm run seed          # populate SQLite with sample data (idempotent, INSERT OR IGNORE)
npm run dev:api       # Express API on :3000 (tsx watch, hot reload)
npm run dev:admin     # web-admin on :4200
npm run dev:empleados # web-empleados on :4201
npm run dev:clientes  # web-clientes on :4202
npm test              # runs the API's vitest suite (the only package with tests)
```

- No `build` or `lint` script exists for the API.
- The three Angular apps have `start` (`ng serve --proxy-config proxy.conf.json`), `build` (`ng build`), and `watch`, but **no `test` script and zero `*.spec.ts` files** — there is no frontend test suite.
- Each Angular app proxies `/api` to `http://localhost:3000` in dev via its `proxy.conf.json`; always hit the app's own port, not the API port directly, or CORS/relative-URL assumptions break.

Inside `packages/api`:

```bash
npm run test:watch                                   # vitest, watch mode
npx vitest run src/services/restaurant.service.test.ts   # single file
npx vitest run -t "nombre del test"                  # filter by test name
```

Tests live next to the code they cover (`*.test.ts` siblings), run with Vitest. They are unit tests with hand-written mocks (`**/mocks/`), plus one real-SQLite integration test (`SqliteEmployeeRepository.test.ts`, `NODE_ENV=test` → `:memory:` db). There are no HTTP-level integration tests (`supertest` is a devDependency but unused) — routes, middlewares, and the error handler are not covered by tests.

Test credentials after seeding: password equals email for every seeded user (e.g. `admin@resttek.com` / `admin@resttek.com`). Full list and role→app mapping in the root [`README.md`](README.md).

## Architecture

### Backend (`packages/api`) — two coexisting styles, know which one applies before touching code

- **Hexagonal + DDD**, only in `src/contexts/employee/` (domain/application/infrastructure layers) — covers employees, auth, roles. `src/contexts/shared/` is not a business bounded context; it just holds the `Email` value object and the cross-cutting `authenticate`/`authorize` middlewares + `errorHandler`.
- **Layered**, for everything else (`restaurant`, `dish`, `ingredient`, `order`): flat `src/models/`, `src/repositories/`, `src/services/`, `src/controllers/`, `src/routes/`, one file per domain per folder. No domain entities with behavior here — `Restaurant`/`Dish`/`Ingredient`/`Order` are plain interfaces; validation lives in `services/` and in `normalizeX()` helpers in `models/` (e.g. `normalizeIngredientUnit`, `normalizeDishCategory`, `normalizeOrderStatus`).
- Dependency wiring happens in the routes files themselves (repo → service → controller instantiated inline), except `employee`, whose wiring is centralized in `contexts/employee/infrastructure/http/dependencies.ts` since its routes are split across three files.
- Path aliases (`tsconfig.json`, `baseUrl: ./src`): `@config`, `@errors`, `@shared` → `contexts/shared`, `@employee` → `contexts/employee`, `@models`, `@repositories`, `@services`, `@controllers`, `@routes`, `@scripts`. Resolved by `tsx` at runtime and by `vite-tsconfig-paths` in tests. Package is ESM (`"type": "module"`, `module: nodenext`) — imports need the `.js` extension even for `.ts` source.
- Errors: `Error → AppError (abstract) → errors/DomainErrors.ts`. `errorHandler` maps by `err.name` to HTTP status: 404 for the `*NotFoundError` set, 401 for `InvalidCredentialsError`, 400 for any other `AppError`, 500 otherwise. Two gotchas: `OrderNotFoundError` is *not* in the 404 list (falls through to 400), and `OrderController` bypasses `errorHandler` entirely with its own try/catch.
- `authenticate`/`authorize(roles)` (in `contexts/shared/infrastructure/http/middlewares.ts`) respond directly on failure (401/403) rather than delegating to `errorHandler`.
- All routes are under `/api/v1` except `GET /health`. No route under `/orders` applies `authorize()` — any authenticated user can change any order item's status. Full endpoint/role table is in `docs/arquitectura/arquitectura-api.md`.

### Database

SQLite via a hand-written `Database` wrapper (`config/database.ts`, exported as the single instance `dbConfig`). File is `packages/api/resttek.db`, or `:memory:` when `NODE_ENV=test`. Schema is created in `runInitialMigrations()` with `CREATE TABLE IF NOT EXISTS` only — **there is no migrations framework**, so adding/changing a column does not affect an already-created database; delete `resttek.db` and re-run `npm run seed`.

### Frontend — 3 Angular 21 apps + 1 shared library, each app structured differently

All three use standalone components, signals, and zoneless change detection (no `zone.js` anywhere). State lives in Angular signals, not NgRx.

- **`web-admin` / `web-empleados`**: feature-based, each feature self-contained under `features/<name>/{models,pages,services,store}`. Standard pattern: a `*Store` (`providedIn: 'root'`) holds private signals exposed read-only, and wraps its `*Service`'s `Observable` with `firstValueFrom`. `web-empleados`'s `OrderStore` additionally polls every 30s (no websockets in the API).
- **`web-clientes`**: centralizes shared code in `core/{models,services,store}` instead; `features/` are flat components with no subfolders. The Store pattern is *not* the norm here — only `CartStore` exists (local, no HTTP). Everything else calls its `*Service` directly with `.subscribe()`. Polling is done ad hoc with `setInterval` in individual components (`my-orders` every 10s, `order-detail` every 5s).
- **`@resttek/web-shared`** (`packages/web-shared/src`): the only dependency shared between the three apps (they don't depend on each other). Exports the `API_URL` injection token, `AuthService`/`AuthStore`/`authGuard`, `authInterceptor`/`errorInterceptor`, and `LoginComponent`/`RegisterComponent`. It's consumed straight from source (`package.json main` points at `src/index.ts`, no build step) — editing it requires restarting the consuming app's dev server to pick up changes.
- `web-admin`/`web-empleados` services read `environment.apiUrl` directly; `web-clientes` and `web-shared`'s own `AuthService` inject the `API_URL` token instead. Both resolve to the same value (`/api/v1`) but only the injected form is substitutable in tests.
- Role-based navigation filtering (e.g. `web-empleados`'s `ShellComponent` deciding which menu links to show) is cosmetic only — the real authorization boundary is the API's `authorize()` middleware. The stored role value is `manager`, not `gerente`.
- The design system (`base.css`) is duplicated, not shared: `web-shared/src/lib/styles/base.css` exists but nothing imports it; each app has its own `src/styles.css` copy (`web-empleados`'s has diverged with ~46 extra lines). When changing shared styling, update all three.

### Domain model

Full ERD and column-level detail in `docs/dominio/modelo-datos.md`; the two things most likely to trip you up:
- There is no `customers` table — a customer is a row in `employees` with `role = 'cliente'` and `restaurant_id = null`. Login is the same endpoint for every role.
- Ordering N units of a dish creates N separate `order_items` rows with `quantity: 1` each, so kitchen staff can track each unit's status independently.
