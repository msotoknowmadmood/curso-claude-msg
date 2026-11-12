---
name: implement-plan
description: Implementa un plan ya creado (archivo en plans/*.md) aplicando TDD estricto tarea por tarea, en una rama dedicada creada desde development (creando development desde main si no existe). Por cada tarea escribe primero el test en rojo, el código mínimo para ponerlo en verde, marca la tarea como hecha en el plan y commitea con el slash command /commit. Úsalo cuando el usuario pida implementar, ejecutar o llevar a cabo un plan existente, o invoque /implement-plan.
argument-hint: "<ruta al archivo de plan, p. ej. plans/42-cancelar-pedidos.md>"
---

# Implement Plan

Implementa un plan de funcionalidad o fix ya escrito (normalmente creado con `/plan-feature`), tarea por tarea, aplicando **TDD estricto**: ningún código de producción se escribe sin un test en rojo que lo exija primero.

Argumentos recibidos del usuario (si los hay): $ARGUMENTS

## 1. Identifica el plan a implementar

1. Si `$ARGUMENTS` incluye una ruta a un archivo, úsala.
2. Si no, busca archivos `.md` en `plans/`:
   - Si hay exactamente uno, úsalo.
   - Si hay varios, pregunta al usuario cuál implementar (no adivines).
   - Si no hay ninguno, dile al usuario que no encontraste ningún plan y detente.
3. Lee el archivo completo. Si no sigue la estructura esperada (sección `## Tareas` con checkboxes `- [ ] N. ...`), pregunta al usuario cómo proceder en vez de improvisar un formato.

## 2. Verifica precondiciones de Git

- Comprueba que el directorio es un repositorio Git (`git rev-parse --is-inside-work-tree`). Si no lo es, detente y pregúntale al usuario cómo quiere proceder (no inicialices el repo por tu cuenta).
- Comprueba que no hay cambios sin commitear (`git status --porcelain`). Si los hay, detente y pregunta al usuario si quiere commitearlos/descartarlos antes de continuar (no mezcles trabajo ajeno al plan en las ramas/commits que vas a crear).

## 3. Prepara la rama de trabajo

1. Calcula el nombre de rama a partir del nombre del archivo de plan, sin la carpeta `plans/` ni la extensión `.md` (ej. `plans/42-cancelar-pedidos.md` → `42-cancelar-pedidos`).
2. Comprueba si existe la rama `development` (`git show-ref --verify --quiet refs/heads/development`):
   - Si **no existe**: créala a partir de `main` (`git checkout -b development main`). Si tampoco existe `main` (p. ej. el repo usa `master` u otro nombre), pregunta al usuario antes de asumir cuál es la rama base.
   - Si **ya existe**: colócate en ella (`git checkout development`). Si tiene una rama remota configurada, intenta actualizarla (`git pull`) sin que un fallo de red detenga el resto del flujo.
3. Crea la rama del plan a partir de `development`: `git checkout -b <nombre-rama> development`.
   - Si esa rama ya existe, pregunta al usuario si quiere continuar el trabajo sobre ella (recomendado) o recrearla desde cero (acción destructiva: solo si lo pide explícitamente).

## 4. Entiende el contexto técnico antes de tocar código

- Localiza cómo se ejecutan los tests en este proyecto y cómo correr un único test/archivo de test (revisa `CLAUDE.md`, `package.json`, configuración de pytest/jest/etc., o la carpeta de tests existente). No lo asumas: verifícalo con Glob/Grep/Read.
- Revisa las convenciones de código ya usadas (naming, capas, ubicación de archivos) para que el código nuevo encaje con el resto del proyecto.

## 5. Implementa el plan, tarea por tarea, con TDD estricto

Recorre las tareas de la sección `## Tareas` **en orden**, saltando las que ya estén marcadas como hechas (`- [x]`). Para cada tarea pendiente, sigue este ciclo completo antes de pasar a la siguiente:

1. **Rojo**: escribe (o extiende) el test que exige exactamente el comportamiento de esta tarea, sin adelantarte a tareas futuras del plan. Ejecuta solo ese test y confirma que falla, y que falla por la razón correcta (funcionalidad ausente), no por un error de sintaxis o de configuración.
2. **Verde**: escribe el código mínimo de producción necesario para que ese test pase. No implementes de más. Ejecuta el test de nuevo y, si es rápido, la suite relacionada, para confirmar que pasa y que no rompiste nada existente.
3. **Refactor** (opcional): si el código admite una limpieza evidente manteniendo los tests en verde, hazla ahora y vuelve a ejecutar los tests.
4. **Marca la tarea como hecha**: edita el archivo de plan, cambiando únicamente el checkbox de esta tarea de `- [ ]` a `- [x]`. No toques otras tareas ni otras secciones del plan en este paso.
5. **Commit**: invoca el skill `commit` (equivalente a `/commit`) para crear el commit de esta tarea, pasándole como contexto qué tarea del plan se completó (número y texto), de forma que el mensaje de commit resultante la refleje. El commit debe incluir tanto el código y los tests de la tarea como la actualización del checkbox en el archivo de plan.

Reglas estrictas:

- Nunca escribas código de producción sin un test en rojo que lo exija primero.
- Una tarea = un ciclo rojo-verde-(refactor) = un commit. No agrupes varias tareas en un mismo commit ni completes varias tareas antes de marcar/commitear.
- Si una tarea no admite un test automatizado razonable (p. ej. un cambio puramente de documentación o configuración), dilo explícitamente, aplica el cambio, confirma que la suite existente sigue en verde, y continúa igualmente con los pasos 4 y 5.
- Si para completar una tarea necesitas tomar una decisión no cubierta por el plan, resuélvela con tu propio criterio y añade una entrada breve en la sección "Dudas y decisiones tomadas" del plan (si el plan no tiene esa sección, créala al final) en vez de detener todo el flujo. Pregunta al usuario solo ante decisiones realmente bloqueantes o con consecuencias importantes (p. ej. cambios de alcance, de arquitectura o irreversibles).

## 6. Al terminar todas las tareas

- Ejecuta la suite de tests completa una vez más para confirmar que todo sigue en verde.
- Revisa la sección "Criterios de aceptación" del plan: marca los que queden verificablemente cumplidos por lo implementado; deja sin marcar (indicándolo en tu resumen) los que requieran verificación manual o del usuario.
- No hagas merge de la rama ni la pushees por tu cuenta: eso lo decide el usuario.

## 7. Cierra con un resumen breve

Al terminar (o si te detienes por una pregunta bloqueante), indica en pocas líneas: rama creada, cuántas tareas de las totales se completaron, y si quedó algún criterio de aceptación pendiente de verificación manual. No repitas el contenido completo del plan ni el diff en el chat.
