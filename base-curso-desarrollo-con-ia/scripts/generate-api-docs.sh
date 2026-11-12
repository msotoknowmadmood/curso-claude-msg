#!/usr/bin/env bash
#
# Valida docs/api/openapi.yml con Redocly y genera la documentación HTML a partir de él.
#
# Uso:
#   ./scripts/generate-api-docs.sh [-f openapi.yml] [-o salida.html] [-l]
#
# Opciones:
#   -f, --file        Ruta al fichero OpenAPI (por defecto: docs/api/openapi.yml)
#   -o, --output       Ruta del HTML generado (por defecto: docs/api/html/index.html)
#   -l, --lint-only    Solo valida el spec con Redocly, sin generar el HTML
#   -h, --help         Muestra esta ayuda

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OPENAPI_FILE="${REPO_ROOT}/docs/api/openapi.yml"
OUTPUT_FILE="${REPO_ROOT}/docs/api/html/index.html"
LINT_ONLY=false

usage() {
  sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--file)
      OPENAPI_FILE="$2"
      shift 2
      ;;
    -o|--output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    -l|--lint-only)
      LINT_ONLY=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Opción desconocida: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: se requiere Node.js/npx para ejecutar Redocly CLI." >&2
  exit 1
fi

if [[ ! -f "$OPENAPI_FILE" ]]; then
  echo "Error: no se encuentra el fichero OpenAPI '$OPENAPI_FILE'." >&2
  exit 1
fi

echo "Validando '$OPENAPI_FILE' con Redocly..."
npx --yes @redocly/cli lint "$OPENAPI_FILE"

if [[ "$LINT_ONLY" == true ]]; then
  echo "Lint superado. Generación de HTML omitida (--lint-only)."
  exit 0
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "Generando documentación HTML en '$OUTPUT_FILE'..."
npx --yes @redocly/cli build-docs "$OPENAPI_FILE" -o "$OUTPUT_FILE"

echo "Listo: $OUTPUT_FILE"
