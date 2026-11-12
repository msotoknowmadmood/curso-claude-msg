# scripts/seed-issues.sh

Crea issues en GitHub a partir de un archivo JSON, usando [GitHub CLI](https://cli.github.com/).

## Requisitos

- [`gh`](https://cli.github.com/) instalado y autenticado (`gh auth login`).
- [`jq`](https://jqlang.org/) instalado.

## Archivo de issues

Por defecto el script lee [`scripts/issues.json`](issues.json), un array de objetos con este formato:

```json
[
  {
    "title": "Título de la issue",
    "type": "bug",
    "projects": ["web-admin", "api"],
    "body": "Descripción de la issue"
  }
]
```

- `type`: `bug` o `feature`. Se usa como etiqueta.
- `projects`: uno o varios proyectos del monorepo. Cada uno se añade como etiqueta `proyecto:<nombre>`.
- `body`: descripción de la issue (admite Markdown y saltos de línea).

Las etiquetas se crean automáticamente en el repositorio si no existen todavía.

## Uso

```bash
# Crear las issues en el repo actual (el que detecta gh en este directorio)
./scripts/seed-issues.sh

# Simular sin crear nada en GitHub (útil para revisar antes de lanzarlo)
./scripts/seed-issues.sh --dry-run

# Usar otro archivo JSON
./scripts/seed-issues.sh -f otras-issues.json

# Crear las issues en un repo distinto
./scripts/seed-issues.sh -R owner/repo

# Ver la ayuda
./scripts/seed-issues.sh --help
```

## Opciones

| Opción            | Descripción                                                          |
| ------------------ | --------------------------------------------------------------------- |
| `-f`, `--file`      | Ruta al JSON de issues (por defecto: `scripts/issues.json`)          |
| `-R`, `--repo`      | Repositorio de GitHub `owner/repo` (por defecto, el del directorio actual) |
| `-n`, `--dry-run`   | Muestra lo que se crearía sin llamar a la API de GitHub               |
| `-h`, `--help`      | Muestra la ayuda                                                      |

# scripts/generate-api-docs.sh

Valida `docs/api/openapi.yml` con [Redocly CLI](https://redocly.com/docs/cli/) y genera la documentación HTML a partir de él. Usado por la skill `update-api-docs`, pero también se puede invocar directamente.

## Requisitos

- Node.js/`npx` instalado (usa `@redocly/cli` vía `npx --yes`, sin necesidad de instalarlo como dependencia).

## Uso

```bash
# Validar docs/api/openapi.yml y regenerar docs/api/html/index.html
./scripts/generate-api-docs.sh

# Solo validar el spec (lint), sin generar HTML
./scripts/generate-api-docs.sh --lint-only

# Usar otro fichero de entrada o de salida
./scripts/generate-api-docs.sh -f otra/ruta/openapi.yml -o otra/salida/index.html

# Ver la ayuda
./scripts/generate-api-docs.sh --help
```

## Opciones

| Opción              | Descripción                                                          |
| -------------------- | --------------------------------------------------------------------- |
| `-f`, `--file`        | Ruta al fichero OpenAPI (por defecto: `docs/api/openapi.yml`)        |
| `-o`, `--output`      | Ruta del HTML generado (por defecto: `docs/api/html/index.html`)     |
| `-l`, `--lint-only`   | Solo valida el spec con Redocly, sin generar el HTML                  |
| `-h`, `--help`        | Muestra la ayuda                                                      |
