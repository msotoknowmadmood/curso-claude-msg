---
description: Crea un commit siguiendo la especificación de Conventional Commits
argument-hint: "[alcance opcional o instrucciones adicionales]"
---

Crea un commit de git siguiendo estrictamente la especificación de [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/).

Contexto adicional del usuario (si aplica): $ARGUMENTS

## Pasos a seguir

1. Ejecuta en paralelo:
   - `git status` para ver archivos sin trackear y staged.
   - `git diff HEAD` (o `git diff --staged` si ya hay archivos en staging) para ver los cambios reales.
   - `git log --oneline -10` para seguir el estilo de mensajes previo del repo.
2. Si no hay nada en staging, decide qué archivos corresponde añadir (evita `git add -A` o `git add .`; añade archivos específicos) y agrégalos con `git add`.
3. Analiza el diff para determinar:
   - **type**: uno de `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
   - **scope** (opcional): módulo o área afectada, entre paréntesis, en minúsculas y sin espacios (ej. `feat(auth): ...`). Usa el alcance indicado en $ARGUMENTS si el usuario lo proporcionó.
   - **description**: resumen en imperativo, minúscula inicial, sin punto final, menor a 72 caracteres.
   - **body** (opcional): explica el *por qué* del cambio, no el *qué* (eso ya lo dice el diff). Solo si aporta contexto no obvio.
   - **breaking change**: si el cambio rompe compatibilidad, añade `!` tras el type/scope (ej. `feat(api)!: ...`) y agrega un footer `BREAKING CHANGE: <explicación>`.
   - **footer** (opcional): referencias a issues (`Refs: #123`, `Closes #123`) si el usuario las menciona.
4. Si los cambios staged mezclan propósitos no relacionados (ej. un fix y una feature sin relación), sugiérele al usuario dividirlos en commits separados antes de continuar, en lugar de forzar un solo mensaje.
5. Construye el mensaje de commit con este formato exacto:
   ```
   <type>[scope opcional][!]: <description>

   [body opcional]

   [footer(s) opcional]
   ```
6. Crea el commit usando un HEREDOC para preservar el formato:
   ```bash
   git commit -m "$(cat <<'EOF'
   <mensaje aquí>
   EOF
   )"
   ```
7. Ejecuta `git status` después del commit para confirmar que se aplicó correctamente.

## Reglas importantes

- NUNCA uses `--no-verify` para saltar hooks de pre-commit.
- Si un hook de pre-commit falla, corrige el problema real y crea un NUEVO commit (no uses `--amend`).
- No agregues archivos que parezcan contener secretos (`.env`, credenciales, claves) sin confirmarlo antes con el usuario.
- No hagas `git push` a menos que el usuario lo pida explícitamente.
- Si el usuario no indicó alcance ni tipo, infiérelos del diff; si hay ambigüedad real entre dos tipos razonables, pregunta antes de commitear.
