---
name: plan-feature
description: Planifica una nueva funcionalidad o el arreglo de un bug antes de implementarlo, usando una plantilla fija (objetivo, alcance, archivos afectados, tareas de 5-10 min, criterios de aceptación, dudas/decisiones). Úsalo cuando el usuario pida planificar, diseñar o desglosar en tareas una feature o un fix, o invoque /plan-feature. Guarda el resultado como archivo en plans/<num_issue>-<breve-descripcion>.md.
argument-hint: "[num_issue] <descripción de la feature o del bug a arreglar>"
---

# Plan Feature

Planifica una funcionalidad nueva o el arreglo de un bug, y guarda el plan como archivo siguiendo siempre la misma plantilla, para que todos los planes del proyecto tengan el mismo formato.

Este skill **solo planifica, no implementa**. No escribas ni modifiques código de la aplicación al ejecutar este skill.

Argumentos recibidos del usuario (si los hay): $ARGUMENTS

## 1. Identifica el número de issue

El nombre del archivo final requiere un número de issue. Para obtenerlo, en este orden:

1. Si `$ARGUMENTS` incluye un número (p. ej. `42`, `#42`, `issue 42`), úsalo.
2. Si no, busca si el proyecto tiene un repositorio Git con GitHub remoto y `gh` disponible; si es así, intenta localizar un issue relacionado con `gh issue list` / `gh issue view` por título o palabras clave.
3. Si sigue sin poder determinarse, pregunta al usuario el número de issue antes de crear el archivo (no inventes un número ni uses "0" o "sin-numero"). Esto es lo único que debe bloquear el avance del skill: todo lo demás (alcance, tareas, decisiones) se resuelve sin preguntar, dejando constancia en la sección de dudas/decisiones del plan.

## 2. Entiende la petición antes de planificar

- Si es una **feature**: entiende qué debe hacer, quién la usa (qué rol/app, si el proyecto tiene varios) y cómo encaja con lo que ya existe.
- Si es un **fix**: entiende el síntoma y, si es posible, localiza la causa raíz leyendo el código relevante (no asumas la causa sin mirar el código).
- Explora el código con Glob/Grep/Read para identificar módulos, archivos y patrones existentes relevantes **antes** de escribir el plan. No adivines rutas de archivo: verifícalas.
- Si el proyecto tiene un `CLAUDE.md` u otra documentación de arquitectura, revísala para respetar las convenciones existentes (capas, naming, ubicación de archivos, etc.) en las tareas que propongas.

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

## 5. Cierra con un resumen breve

Al terminar, muestra al usuario en 2-3 líneas: qué se planificó, la ruta del archivo creado, y si quedó alguna duda importante registrada en el plan. No repitas el contenido completo del plan en el chat. No comiences a implementar salvo que el usuario lo pida explícitamente.

## 6. Notifica en el canal de Slack

Una vez guardado el archivo del plan, avisa en el canal de Slack `curso-claude-ed3` (ID `C0CGZ01R9M2`) de que se ha planificado la tarea:

1. Publica un mensaje breve con la herramienta de Slack para publicar mensajes, usando ese `channel_id`, indicando que se ha planificado la tarea/issue correspondiente (incluye el número de issue si lo tienes y la ruta del archivo de plan, p. ej. "Se ha planificado la tarea #42 (cancelar pedidos del cliente): plans/42-cancelar-pedidos.md").
2. Si no hay herramienta de Slack disponible o falla el envío, no detengas el resto del skill por eso: avísalo brevemente al usuario en el resumen y continúa.
