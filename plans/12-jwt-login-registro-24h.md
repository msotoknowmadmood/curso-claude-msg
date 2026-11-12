# Plan: Login y registro con JWT caducando a las 24h

- **Issue:** #12
- **Tipo:** Feature
- **Fecha:** 2026-11-06
- **Autor del plan:** alumno_16ed05@pronoide.com

## Objetivo

Asegurar que el login y el registro de usuarios del contexto `employee` cumplen el contrato pedido: autenticación con JWT (librería `jsonwebtoken`) cuyo token caduca a las 24h, y un usuario con nombre, email, contraseña hasheada y rol. El sistema de login/registro ya existe en el proyecto (`LoginUseCase`, `RegisterClientUseCase`, `BcryptAuthService`); este plan lo ajusta donde no cumple el requisito (caducidad del token) y añade cobertura de test explícita para el resto de requisitos, que ya se cumplen pero no están verificados por un test dedicado.

## Alcance

**Incluye:**
- Cambiar la caducidad del JWT de 8h a 24h en `BcryptAuthService.generateToken`.
- Añadir un test unitario para `BcryptAuthService` que verifique que el token generado usa `jsonwebtoken`, incluye el payload esperado y caduca a las 24h (hoy no existe ningún test para esta clase).
- Actualizar la documentación de dominio (`docs/dominio/glosario.md`) que describe la caducidad del JWT como "8 h".
- Revisar y, si falta, completar la cobertura de test de `RegisterClientUseCase` y `LoginUseCase` respecto a los campos requeridos (nombre, email, contraseña hasheada, rol) y a que el rol de autorregistro quede fijado a `cliente`.

**No incluye (fuera de alcance):**
- Cambiar el modelo de roles (`admin`, `manager`, `camarero`, `cocinero`, `cliente`): se mantienen los roles actuales del dominio Resttek en vez de los roles genéricos mencionados en la petición original (`admin`, `usuario-free`, `usuario`), que no existen en este proyecto. Ver "Dudas y decisiones".
- Sustituir `firstName`/`lastName` por un único campo `nombre`: se mantiene el modelo actual de dos campos.
- Permitir que el endpoint público `POST /auth/register` reciba y aplique un rol distinto de `cliente`. Crear usuarios con otros roles sigue haciéndose solo vía `POST /employees` (admin).
- Tocar frontend (`web-shared`, `web-admin`, `web-empleados`, `web-clientes`): los formularios ya envían los campos correctos y no cambian.
- Migrar a un framework de migraciones de base de datos ni tocar el esquema de `employees`.

## Archivos afectados

- `packages/api/src/contexts/employee/infrastructure/BcryptAuthService.ts` — cambiar `expiresIn: '8h'` por `expiresIn: '24h'` en `generateToken`.
- `packages/api/src/contexts/employee/infrastructure/BcryptAuthService.test.ts` (nuevo) — tests de `hashPassword`, `comparePasswords` y, en particular, de que `generateToken` firma con `jsonwebtoken` y produce un token cuyo `exp - iat` es 86400 segundos (24h).
- `packages/api/src/contexts/employee/application/RegisterClientUseCase.test.ts` — añadir caso(s) que comprueben explícitamente que el empleado registrado guarda `passwordHash` (no la contraseña en plano) y que el rol resultante es siempre `cliente` aunque no se pueda forzar otro desde el DTO actual.
- `docs/dominio/glosario.md` — actualizar la entrada de **JWT** de "Caduca a las **8 h**" a "Caduca a las **24 h**".

## Tareas

> Cada tarea debe poder completarse en 5-10 minutos. Si una tarea es más grande, divídela.

- [x] 1. Crear `BcryptAuthService.test.ts` con un test que llame a `generateToken({ id, role, restaurantId })`, decodifique el token con `jwt.decode(token, { complete: true })` y compruebe que `decoded.payload.exp - decoded.payload.iat === 24 * 60 * 60` (24h en segundos); confirmar que falla contra el código actual (hoy son 8h) y luego cambiar `{ expiresIn: '8h' }` por `{ expiresIn: '24h' }` en `BcryptAuthService.generateToken` hasta que el test pase.
- [x] 2. En el mismo archivo, añadir un test que compruebe que `hashPassword` devuelve un hash distinto de la contraseña en plano y que `comparePasswords` valida correctamente contraseña correcta/incorrecta contra ese hash.
- [ ] 3. Añadir un test que compruebe que el payload decodificado del token contiene `id`, `role` y `restaurantId` tal cual se pasaron a `generateToken`.
- [ ] 4. En `RegisterClientUseCase.test.ts`, añadir un test que compruebe que `employeeRepo.save` se llama con un `Employee` cuyo `passwordHash` es el valor devuelto por `authService.hashPassword` (mock), nunca la contraseña en plano recibida en el DTO.
- [ ] 5. En `RegisterClientUseCase.test.ts`, añadir un test que compruebe que el `role` del empleado creado es siempre `'cliente'`, incluso si el DTO de entrada incluyera un campo `role` adicional (debe seguir ignorándose).
- [ ] 6. Actualizar `docs/dominio/glosario.md` línea de **JWT**: "Caduca a las **8 h**" → "Caduca a las **24 h**".
- [ ] 7. Ejecutar `npm test` desde la raíz (o `npx vitest run` dentro de `packages/api`) y confirmar que toda la suite pasa, incluidos los tests nuevos.
- [ ] 8. Verificación manual: con la API levantada (`npm run dev:api`), hacer `POST /api/v1/auth/register` y `POST /api/v1/auth/login` con una herramienta como curl/Postman, decodificar el `token` devuelto (p. ej. en jwt.io) y comprobar que `exp - iat` corresponde a 24h y que el payload trae `id`, `role` y `restaurantId`.

## Criterios de aceptación

> Comportamiento observable que debe cumplirse para dar la tarea por terminada. Deben poder verificarse sin ambigüedad.

- [ ] Un token JWT generado por login o registro (vía `jsonwebtoken`) caduca exactamente 24h después de emitirse (`exp - iat = 86400`).
- [ ] `POST /api/v1/auth/register` sigue exigiendo nombre (`firstName`/`lastName`), email y contraseña; la contraseña nunca se guarda en plano, solo su hash (`passwordHash`).
- [ ] El usuario registrado por auto-registro público queda siempre con rol `cliente`; los demás roles (`admin`, `manager`, `camarero`, `cocinero`) solo se asignan vía `POST /employees` por un `admin` autenticado, como ya ocurre hoy.
- [ ] `POST /api/v1/auth/login` sigue devolviendo `{ token, employee }` con el `role` real del usuario, y rechaza con 401 (`InvalidCredentialsError`) credenciales incorrectas.
- [ ] La suite de tests de `packages/api` pasa en verde, incluyendo los nuevos tests de `BcryptAuthService` y los casos añadidos a `RegisterClientUseCase.test.ts`.
- [ ] `docs/dominio/glosario.md` refleja la caducidad de 24h, no 8h.

## Dudas y decisiones tomadas

- **Duda/Decisión:** La petición original pedía roles `admin`, `usuario-free` y `usuario`, que no existen en el dominio Resttek (que usa `admin`, `manager`, `camarero`, `cocinero`, `cliente`, usados en toda la autorización de pedidos/restaurantes/empleados).
  - **Resolución / Alternativas consideradas:** Preguntado al usuario; confirmó mantener los roles actuales del dominio y tratar este plan como una reforma del sistema de login/registro ya existente en Resttek, no como un sistema nuevo. No se modifica `Role.ts` ni `VALID_ROLES`.
- **Duda/Decisión:** La petición pedía "el nombre" del usuario como campo único; el modelo actual (`Employee`, tabla `employees`) usa `firstName` + `lastName`.
  - **Resolución / Alternativas consideradas:** Se mantiene el modelo de dos campos existente, que ya cubre el requisito de pedir el nombre del usuario; cambiarlo a un único campo `nombre` obligaría a migrar el esquema de BD, `EmployeeController`, `CreateEmployeeUseCase`, el seed y los formularios de `web-admin`/`web-shared`, lo cual excede el alcance pedido (login/registro con JWT y caducidad de 24h).
- **Duda/Decisión:** La petición pedía "pedir el rol" al registrar un usuario; hoy `POST /auth/register` fuerza siempre `role: 'cliente'` e ignora cualquier rol recibido.
  - **Resolución / Alternativas consideradas:** Se decide no permitir que el autorregistro público elija su propio rol, por motivo de seguridad (cualquiera podría autoasignarse `admin`). El requisito de "pedir el rol" se interpreta como: el modelo de usuario tiene un campo rol (ya existe, vía `Role` value object) y se puede asignar explícitamente al crear un usuario desde `POST /employees` (solo accesible por un `admin` autenticado), que es el flujo ya existente para crear usuarios con roles distintos de `cliente`.
- **Duda/Decisión:** Número de issue para nombrar el archivo del plan; no existe un issue de login/registro en `scripts/issues.json` ni hay repositorio Git/GitHub en el proyecto.
  - **Resolución / Alternativas consideradas:** Preguntado al usuario; se usa el número 12 (siguiente consecutivo tras el último issue existente, #11).
- **Duda/Decisión:** El proyecto no tenía repositorio Git al implementar este plan.
  - **Resolución / Alternativas consideradas:** Preguntado al usuario; se decidió inicializar git (`git init`, `.gitignore` para `node_modules`/`.angular`/`resttek.db`, commit inicial) y renombrar la rama por defecto de `master` a `main` antes de crear `development` y la rama del plan, en vez de implementar sin control de versiones.
- **Duda/Decisión:** Orden de las tareas 1-4 originales para respetar TDD estricto (rojo antes que verde).
  - **Resolución / Alternativas consideradas:** La tarea 1 original cambiaba código de producción (`expiresIn`) sin un test en rojo previo; se reordenó fusionando ese cambio con el test de caducidad de 24h (antigua tarea 4) como una sola tarea 1, ya que ese es el único punto del plan con una transición real de rojo a verde (8h → 24h). El resto de tests nuevos (hashPassword/comparePasswords, payload, passwordHash en registro, rol fijo) cubren comportamiento que ya era correcto en el código existente, así que actúan como tests de caracterización/regresión más que como TDD de funcionalidad nueva; se escriben igualmente antes de confirmar que pasan, tal y como ya advertía la sección "Alcance" del plan.
