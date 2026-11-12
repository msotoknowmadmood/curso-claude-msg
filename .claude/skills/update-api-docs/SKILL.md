---
name: update-api-docs
description: Actualiza base-curso-desarrollo-con-ia/docs/api/openapi.yml para que refleje el estado actual de las rutas y controladores de la API (packages/api), y genera la documentación HTML a partir de ese fichero ejecutando scripts/generate-api-docs.sh (Redocly CLI). Úsalo cada vez que se añadan, cambien o eliminen rutas, controladores, middlewares de auth/roles o formas de request/response en packages/api, o cuando el usuario invoque /update-api-docs.
argument-hint: "[descripción opcional de qué endpoints cambiaron]"
---

# Update API Docs

Mantiene sincronizado `base-curso-desarrollo-con-ia/docs/api/openapi.yml` con el código real de la API, y regenera su documentación HTML con Redocly. Este skill **sí modifica ficheros de documentación** (el spec y el HTML generado), pero no código de `packages/api`.

Argumentos recibidos del usuario (si los hay): $ARGUMENTS

## 1. Localiza el spec actual

- El fichero vive en `base-curso-desarrollo-con-ia/docs/api/openapi.yml`.
- Si no existe todavía, créalo desde cero (sección "2. Estructura del spec") cubriendo **todos** los endpoints actuales de la API, no solo los que menciona `$ARGUMENTS`.
- Si ya existe, léelo completo antes de tocarlo para entender su estructura (`info`, `servers`, `components.securitySchemes`, `components.schemas`, `paths`) y respetar el estilo ya usado (agrupación por dominio, nombres de schemas, etc.).

## 2. Identifica qué cambió en la API

- Si `$ARGUMENTS` describe los endpoints afectados, úsalo como punto de partida, pero verifícalo siempre contra el código — no documentes de oídas.
- Si no, compara el spec existente contra el estado actual del código explorando:
  - `base-curso-desarrollo-con-ia/packages/api/src/app.ts` — qué routers están montados y bajo qué prefijo.
  - `src/routes/*.routes.ts`, `src/contexts/employee/infrastructure/http/*.routes.ts` — método, ruta, middlewares `authenticate`/`authorize(roles)` aplicados.
  - Los controladores correspondientes (`src/controllers/*.controller.ts`, `src/contexts/employee/infrastructure/http/*Controller.ts`) — forma del request body y de la respuesta JSON.
  - Si existe, usa `docs/arquitectura/arquitectura-api.md` como referencia cruzada rápida de rutas y roles (puede no estar actualizado tras el cambio; el código manda).
- Identifica concretamente: endpoints nuevos, eliminados, con ruta/método/roles cambiados, o con forma de request/response distinta a la documentada.

## 3. Actualiza `openapi.yml`

- **Estructura base** (si hay que crear el fichero desde cero): `openapi: 3.0.3`, `info` (título, `version`, descripción breve de Resttek), `servers` (`http://localhost:3000/api/v1`), y `components.securitySchemes.bearerAuth` (`type: http`, `scheme: bearer`, `bearerFormat: JWT`).
- Para cada endpoint nuevo o modificado: añade/edita su entrada en `paths`, incluyendo parámetros de ruta/query, `requestBody` cuando aplique, y las respuestas relevantes (200/201/204, 400, 401, 403, 404) coherentes con cómo `errorHandler` traduce los errores de dominio a código HTTP (ver `docs/arquitectura/arquitectura-api.md` si existe).
- Para cada endpoint eliminado del código: elimina su entrada de `paths` (y cualquier schema en `components.schemas` que quedara huérfano solo por ese endpoint).
- Mantén `security: [bearerAuth: []]` únicamente en los endpoints que pasan por `authenticate`; los públicos no deben declararlo.
- Si cambia la forma de un recurso devuelto por un controlador, actualiza su schema en `components/schemas` en vez de duplicar la forma inline en cada endpoint que lo usa.
- Incrementa el `patch` de `info.version` (p. ej. `1.0.0` → `1.0.1`) siempre que modifiques el spec, para dejar constancia de que cambió.

## 4. Valida y genera el HTML con Redocly

Ejecuta el script `base-curso-desarrollo-con-ia/scripts/generate-api-docs.sh` (añadido junto a esta skill):

```bash
./scripts/generate-api-docs.sh
```

- El script primero valida (`lint`) el spec y después genera el HTML estático en `docs/api/html/index.html` con `@redocly/cli build-docs` (vía `npx`, sin necesidad de instalarlo como dependencia).
- Si el lint falla, **no continúes**: corrige los errores de sintaxis o de referencias en `openapi.yml` y vuelve a ejecutar el script hasta que pase, antes de dar la tarea por terminada.
- Ejecútalo siempre desde `base-curso-desarrollo-con-ia/` (o usa `-f`/`-o` con rutas absolutas si lo lanzas desde otro directorio).

## 5. Revisa el resultado

- Confirma que `docs/api/html/index.html` se actualizó (timestamp reciente) y que el spec sigue reflejando fielmente las rutas, roles y schemas tal y como están en el código en este momento.
- Repasa el `git diff` de `docs/api/openapi.yml` y `docs/api/html/` para asegurarte de que no quedaron cambios a medias.

## 6. Commit

Invoca el skill `commit` (equivalente a `/commit`) para crear el commit de la actualización de documentación, incluyendo `docs/api/openapi.yml`, `docs/api/html/` y, si es la primera vez que se usa esta skill, `scripts/generate-api-docs.sh`. Usa un mensaje de tipo `docs(api): ...` que describa qué endpoints cambiaron en la documentación.

## 7. Cierra con un resumen breve

Indica en 2-3 líneas qué endpoints se añadieron/cambiaron/eliminaron en `openapi.yml`, y si la generación del HTML con Redocly fue exitosa. No repitas el spec completo ni el HTML en el chat.
