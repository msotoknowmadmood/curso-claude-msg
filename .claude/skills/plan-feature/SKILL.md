---
name: plan-feature
description: Planifica la funcionalidad o el arreglo de bug descrito en una issue de GitHub (número o URL), usando `gh` para leerla y publicar el plan como comentario, con una plantilla fija (objetivo, alcance, archivos afectados, tareas de 5-10 min, criterios de aceptación, dudas/decisiones). Úsalo cuando el usuario pida planificar, diseñar o desglosar en tareas una issue de GitHub, o invoque /plan-feature. Guarda el resultado como archivo en plans/<num_issue>-<breve-descripcion>.md.
argument-hint: "<número o URL de la issue> [contexto adicional opcional]"
---

# Plan Feature

Planifica la funcionalidad o el arreglo de bug descrito en una issue de GitHub, y guarda el plan como archivo siguiendo siempre la misma plantilla, para que todos los planes del proyecto tengan el mismo formato. Al terminar, publica el plan como comentario en la propia issue.

Este skill **solo planifica, no implementa**. No escribas ni modifiques código de la aplicación al ejecutar este skill.

Argumentos recibidos del usuario (si los hay): $ARGUMENTS

## 1. Identifica y obtén la issue con `gh`

Este skill planifica siempre a partir de una issue de GitHub, no a partir de una descripción libre.

1. Determina el número o la URL de la issue a partir de `$ARGUMENTS` (p. ej. `42`, `#42`, `issue 42`, o una URL completa de GitHub). Si `$ARGUMENTS` no incluye nada identificable como número o URL de issue, pregunta al usuario el número o la URL antes de continuar (no inventes un número ni asumas cuál es). Esto es lo único que debe bloquear el avance del skill: todo lo demás (alcance, tareas, decisiones) se resuelve sin preguntar, dejando constancia en la sección de dudas/decisiones del plan.
2. Comprueba que `gh` está disponible y autenticado (`gh auth status`). Si no lo está, o el repo no tiene remoto de GitHub, avisa al usuario y pide cómo proceder; no sigas planificando sin poder leer la issue.
3. Obtén el contenido de la issue con `gh issue view <número_o_url> --json number,title,body,url,labels,comments`. Usa el `title` y el `body` (y los `comments` relevantes, si aportan contexto necesario para planificar) como la descripción de la feature o del bug a planificar. Si el usuario añadió contexto adicional en `$ARGUMENTS` además del número/URL, combínalo con el contenido de la issue.
4. El número de issue que se usa en el resto del skill (nombre de archivo, comentario) es siempre el campo `number` devuelto por `gh`, no un número escrito a mano por el usuario que no coincida.

## 2. Entiende la petición antes de planificar

- Si la issue describe una **feature**: entiende qué debe hacer, quién la usa (qué rol/app, si el proyecto tiene varios) y cómo encaja con lo que ya existe.
- Si la issue describe un **fix**: entiende el síntoma descrito y, si es posible, localiza la causa raíz leyendo el código relevante (no asumas la causa sin mirar el código).
- Explora el código con Glob/Grep/Read para identificar módulos, archivos y patrones existentes relevantes **antes** de escribir el plan. No adivines rutas de archivo: verifícalas.
- Si el proyecto tiene un `CLAUDE.md` u otra documentación de arquitectura, revísala para respetar las convenciones existentes (capas, naming, ubicación de archivos, etc.) en las tareas que propongas.
- Si la issue es ambigua o le falta información relevante para planificar, no te detengas a preguntar por eso: decide una interpretación razonable y anótala en "Dudas y decisiones tomadas", igual que con cualquier otra ambigüedad del pedido.

## 3. Redacta el plan con la plantilla

Usa como base **literal** la plantilla de [`template.md`](template.md) en esta misma carpeta de skill. No cambies el orden de las secciones ni omitas ninguna, aunque alguna quede breve (p. ej. "Ninguna" en dudas/decisiones si no hubo ninguna).

Reglas por sección:

- **Objetivo**: el "qué" y el "para qué", sin detalles de implementación.
- **Alcance**: separa explícitamente qué incluye y qué queda fuera. Si el pedido es ambiguo sobre el alcance, decide tú una interpretación razonable y anótala en "Dudas y decisiones tomadas".
- **Archivos afectados**: rutas reales del repo (verificadas, no inventadas), con una frase de qué cambia en cada una.
- **Tareas**: cada una debe completarse en 5-10 minutos. Si una tarea te parece más grande, divídela en varias. Deben ser acciones concretas y verificables (ej. "Añadir endpoint `DELETE /api/v1/orders/:id`" en vez de "Implementar backend").
- **Criterios de aceptación**: comportamiento observable (qué debe poder hacer o ver el usuario/sistema), no implementación. Deben permitir decir sin ambigüedad si el trabajo está terminado.
- **Dudas y decisiones tomadas**: toda ambigüedad del pedido original y cómo la resolviste, y toda decisión técnica relevante que tomaste por tu cuenta sin preguntar, con la razón. Esta sección va siempre al final.

## 4. Guarda el archivo

- Ruta: `plans/<num_issue>-<breve-descripcion>.md` en la raíz del proyecto (crea la carpeta `plans/` si no existe).
- `<breve-descripcion>`: 3-6 palabras en kebab-case, en minúsculas, sin tildes ni caracteres especiales (ej. `42-cancelar-pedidos-cliente.md`).
- Si ya existe un archivo para ese issue, pregunta al usuario si quiere sobrescribirlo o crear una nueva versión (no lo sobrescribas en silencio).

## 5. Publica el plan como comentario en la issue

Una vez guardado el archivo del plan, publica su contenido completo como comentario en la issue de GitHub de la que proviene:

1. Publica el comentario con `gh issue comment <número> --body-file <ruta_del_plan>` (usa `--body-file` apuntando al archivo guardado en el paso 4, para preservar el formato Markdown exacto del plan en vez de reescribirlo).
2. Si falla la publicación (permisos, red, `gh` no autenticado, etc.), no lo reintentes en bucle: anótalo en el resumen del paso 6 con el motivo del fallo y continúa con el resto del skill igualmente.

## 6. Cierra con un resumen breve

Al terminar, muestra al usuario en 2-3 líneas: qué se planificó, la ruta del archivo creado, si el comentario se publicó correctamente en la issue (o por qué no, si falló), y si quedó alguna duda importante registrada en el plan. No repitas el contenido completo del plan en el chat. No comiences a implementar salvo que el usuario lo pida explícitamente.

## 7. Notifica en el canal de Slack

Una vez guardado el archivo del plan, avisa en el canal de Slack `curso-claude-ed3` (ID `C0CGZ01R9M2`) de que se ha planificado la tarea:

1. Publica un mensaje breve con la herramienta de Slack para publicar mensajes, usando ese `channel_id`, indicando que se ha planificado la tarea/issue correspondiente (incluye el número de issue si lo tienes y la ruta del archivo de plan, p. ej. "Se ha planificado la tarea #42 (cancelar pedidos del cliente): plans/42-cancelar-pedidos.md").
2. Si no hay herramienta de Slack disponible o falla el envío, no detengas el resto del skill por eso: avísalo brevemente al usuario en el resumen y continúa.
