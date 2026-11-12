---
name: implement-plan
description: Implementa el plan publicado como comentario en una issue de GitHub (número o URL), aplicando TDD estricto tarea por tarea, en uno o varios git worktrees bajo .claude/worktrees con rama(s) con formato <num_issue>-<breve-descripcion>. Por cada tarea escribe primero el test en rojo, el código mínimo para ponerlo en verde, marca la tarea como hecha y commitea con el slash command /commit. Al terminar todas las tareas, deja abierta (sin mergear) una pull request para que la revise alguien. Úsalo cuando el usuario pida implementar, ejecutar o llevar a cabo el plan de una issue, o invoque /implement-plan.
argument-hint: "<número o URL de la issue>"
---

# Implement Plan

Implementa, tarea por tarea y aplicando **TDD estricto**, el plan que `/plan-feature` dejó publicado como comentario en una issue de GitHub. Ningún código de producción se escribe sin un test en rojo que lo exija primero. Al terminar, deja abierta una pull request sin mergear para que alguien la revise.

Argumentos recibidos del usuario (si los hay): $ARGUMENTS

## 1. Identifica la issue y recupera el plan con `gh`

1. Determina el número o la URL de la issue a partir de `$ARGUMENTS` (p. ej. `42`, `#42`, `issue 42`, o una URL completa de GitHub). Si no hay nada identificable, pregunta al usuario antes de continuar (no inventes un número).
2. Comprueba que `gh` está disponible y autenticado (`gh auth status`). Si no lo está, o el repo no tiene remoto de GitHub, detente y pregunta al usuario cómo proceder.
3. Obtén la issue y sus comentarios con `gh issue view <número_o_url> --json number,title,url,comments`.
4. Entre los comentarios, localiza el que contiene el plan: el que tiene una sección `## Tareas` con checkboxes `- [ ] N. ...` y sigue la plantilla de `/plan-feature` (Objetivo, Alcance, Archivos afectados, Tareas, Criterios de aceptación, Dudas y decisiones tomadas). Si hay varios comentarios que parecen planes, usa el más reciente y dilo en el resumen final; si no encuentras ninguno, dile al usuario que no hay ningún plan publicado en esa issue y detente.
5. Guarda el cuerpo de ese comentario tal cual en un archivo local `plans/<num_issue>-<breve-descripcion>.md` (crea `plans/` si no existe; deriva `<breve-descripcion>` del título de la issue, con la misma convención de slug que usa `/plan-feature`). Este archivo es la copia de trabajo sobre la que irás marcando las tareas como hechas durante la implementación.
6. Si ya existe un archivo de plan distinto para ese mismo issue, pregunta al usuario si quiere sobrescribirlo con el plan actual de la issue o conservar el que ya tenía en disco (no lo sobrescribas en silencio).

## 2. Verifica precondiciones de Git

- Comprueba que el directorio es un repositorio Git (`git rev-parse --is-inside-work-tree`). Si no lo es, detente y pregúntale al usuario cómo quiere proceder (no inicialices el repo por tu cuenta).
- Comprueba que no hay cambios sin commitear en el checkout principal (`git status --porcelain`). Si los hay, detente y pregunta al usuario si quiere commitearlos/descartarlos antes de continuar (no mezcles trabajo ajeno al plan en los worktrees/commits que vas a crear).

## 3. Prepara el/los worktree(s) de trabajo

1. Calcula el nombre de rama a partir del número de issue y su título, con el formato `<num_issue>-<breve-descripcion>` (la misma convención de slug que el nombre del archivo de plan, ej. `42-cancelar-pedidos`). Esta es la rama de integración: la que acabará abriendo la pull request.
2. Comprueba si existe la rama `development` (`git show-ref --verify --quiet refs/heads/development`):
   - Si **no existe**: créala a partir de `main` (`git branch development main`), sin cambiar la rama activa del checkout principal. Si tampoco existe `main` (p. ej. el repo usa `master` u otro nombre), pregunta al usuario antes de asumir cuál es la rama base.
   - Si **ya existe** y tiene remoto configurado, intenta actualizarla (`git fetch origin development:development` o equivalente) sin que un fallo de red detenga el resto del flujo.
3. Asegúrate de que `.claude/worktrees/` está excluido en `.gitignore` (añade la línea si falta), para no arrastrar los worktrees a los commits del proyecto.
4. Decide cuántos worktrees necesitas:
   - **Caso normal (un solo agente)**: crea un único worktree con `git worktree add .claude/worktrees/<rama> -b <rama> development`. Todo el trabajo de los pasos 4 a 6 ocurre dentro de ese worktree.
   - **Si vas a repartir la implementación entre varios agentes en paralelo** (porque el usuario lo pide explícitamente, o porque el plan tiene tareas claramente independientes entre sí y conviene paralelizar): crea primero el worktree de integración anterior (rama `<rama>`), y además un worktree y una rama por cada agente, también ramificados desde `development`, con el sufijo `-agenteN` (ej. `.claude/worktrees/<rama>-agente1` con rama `<rama>-agente1`). Reparte las tareas del plan en subconjuntos disjuntos entre los agentes (ningún agente debe tocar un archivo que otro agente también vaya a tocar, para evitar conflictos de merge) y haz que cada uno siga el ciclo TDD del paso 5 de forma independiente dentro de su propio worktree. Cuando todos terminen, desde el worktree de integración fusiona cada rama de agente (`git merge <rama>-agenteN`, resolviendo conflictos si aparecen) y, una vez fusionadas, elimina esas ramas y worktrees temporales (`git worktree remove .claude/worktrees/<rama>-agenteN` y `git branch -d <rama>-agenteN`).
   - Si ya existe un worktree o rama con ese nombre de una ejecución anterior del mismo plan, pregunta al usuario si quiere continuar el trabajo sobre él (recomendado) o recrearlo desde cero (acción destructiva: solo si lo pide explícitamente).

## 4. Entiende el contexto técnico antes de tocar código

- Localiza cómo se ejecutan los tests en este proyecto y cómo correr un único test/archivo de test (revisa `CLAUDE.md`, `package.json`, configuración de pytest/jest/etc., o la carpeta de tests existente). No lo asumas: verifícalo con Glob/Grep/Read.
- Revisa las convenciones de código ya usadas (naming, capas, ubicación de archivos) para que el código nuevo encaje con el resto del proyecto.

## 5. Implementa el plan, tarea por tarea, con TDD estricto

Dentro del worktree que corresponda (el único worktree, o el worktree del agente al que se le asignó el subconjunto de tareas), recorre las tareas de la sección `## Tareas` del archivo de plan **en orden**, saltando las que ya estén marcadas como hechas (`- [x]`). Para cada tarea pendiente, sigue este ciclo completo antes de pasar a la siguiente:

1. **Rojo**: escribe (o extiende) el test que exige exactamente el comportamiento de esta tarea, sin adelantarte a tareas futuras del plan. Ejecuta solo ese test y confirma que falla, y que falla por la razón correcta (funcionalidad ausente), no por un error de sintaxis o de configuración.
2. **Verde**: escribe el código mínimo de producción necesario para que ese test pase. No implementes de más. Ejecuta el test de nuevo y, si es rápido, la suite relacionada, para confirmar que pasa y que no rompiste nada existente.
3. **Refactor** (opcional): si el código admite una limpieza evidente manteniendo los tests en verde, hazla ahora y vuelve a ejecutar los tests.
4. **Marca la tarea como hecha**: edita el archivo de plan dentro del worktree, cambiando únicamente el checkbox de esta tarea de `- [ ]` a `- [x]`. No toques otras tareas ni otras secciones del plan en este paso.
5. **Commit**: invoca el skill `commit` (equivalente a `/commit`) para crear el commit de esta tarea en la rama de ese worktree, pasándole como contexto qué tarea del plan se completó (número y texto), de forma que el mensaje de commit resultante la refleje. El commit debe incluir tanto el código y los tests de la tarea como la actualización del checkbox en el archivo de plan.

Reglas estrictas:

- Nunca escribas código de producción sin un test en rojo que lo exija primero.
- Una tarea = un ciclo rojo-verde-(refactor) = un commit. No agrupes varias tareas en un mismo commit ni completes varias tareas antes de marcar/commitear.
- Si una tarea no admite un test automatizado razonable (p. ej. un cambio puramente de documentación o configuración), dilo explícitamente, aplica el cambio, confirma que la suite existente sigue en verde, y continúa igualmente con los pasos 4 y 5.
- Si para completar una tarea necesitas tomar una decisión no cubierta por el plan, resuélvela con tu propio criterio y añade una entrada breve en la sección "Dudas y decisiones tomadas" del plan (si el plan no tiene esa sección, créala al final) en vez de detener todo el flujo. Pregunta al usuario solo ante decisiones realmente bloqueantes o con consecuencias importantes (p. ej. cambios de alcance, de arquitectura o irreversibles).

## 6. Al terminar todas las tareas

- Si hubo varios agentes en paralelo, fusiona todas sus ramas en la rama de integración (ver paso 3) antes de seguir.
- Ejecuta la suite de tests completa una vez más, en el worktree de integración, para confirmar que todo sigue en verde.
- Revisa la sección "Criterios de aceptación" del plan: marca los que queden verificablemente cumplidos por lo implementado; deja sin marcar (indicándolo en tu resumen) los que requieran verificación manual o del usuario.
- No hagas merge de la rama de integración contra `development` ni contra `main` tú mismo: eso se decide en la revisión de la pull request del paso 7.

## 7. Publica la rama y abre la pull request

1. Desde el worktree de integración, haz push de su rama al remoto: `git push -u origin <rama>`.
2. Crea la pull request con `gh pr create --base development --head <rama> --title "<título>" --body "<cuerpo>"` desde ese mismo worktree. El título debe ser breve y basado en el título de la issue. El cuerpo debe resumir qué se implementó, listar las tareas completadas (y las pendientes, si quedó alguna), y referenciar la issue original: usa `Closes #<num_issue>` si se completaron todas las tareas y criterios de aceptación verificables, o `Relates to #<num_issue>` si quedó algo pendiente de verificación manual (para no cerrar la issue automáticamente al mergear).
3. No apruebes ni mergees la pull request tú mismo: déjala creada para que la revise alguien antes de integrarla.

## 8. Cierra con un resumen breve

Al terminar (o si te detienes por una pregunta bloqueante), indica en pocas líneas: issue y plan usados, worktree(s)/rama(s) creadas, cuántas tareas se completaron, si quedó algún criterio de aceptación pendiente de verificación manual, y el número/enlace de la pull request creada. No repitas el contenido completo del plan ni el diff en el chat.

## 9. Notifica en el canal de Slack

Si completaste todas las tareas del plan (no si te detuviste a mitad por una pregunta bloqueante), avisa en el canal de Slack `curso-claude-ed3` (ID `C0CGZ01R9M2`) de que se ha implementado el plan y abierto la pull request:

1. Publica un mensaje breve con la herramienta de Slack para publicar mensajes, usando ese `channel_id`, indicando que se ha implementado el plan de la issue correspondiente y que hay una PR abierta para revisión (incluye el número de issue, la rama y el número/enlace de la PR, p. ej. "Se ha implementado el plan de la issue #42 en la rama 42-cancelar-pedidos y se ha abierto la PR #57 para revisión").
2. Si no hay herramienta de Slack disponible o falla el envío, no detengas el resto del skill por eso: avísalo brevemente al usuario en el resumen y continúa.
