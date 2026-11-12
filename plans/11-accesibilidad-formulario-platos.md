# Plan: Accesibilizar el formulario de platos (web-admin)

- **Issue:** #11
- **Tipo:** Feature
- **Fecha:** 2026-11-05
- **Autor del plan:** alumno_16ed05@pronoide.com

## Objetivo

Hacer que el formulario de creación/edición de platos de web-admin cumpla WCAG 2.2 nivel AA: debe poder completarse y enviarse por completo con el teclado, con un orden de tabulación lógico, un foco siempre visible y errores de validación anunciados y asociados a sus campos. Como evidencia de aceptación, se debe disponer de un test de Playwright que grabe en vídeo una navegación completa por teclado (editar datos, añadir/quitar un ingrediente, intentar enviar incompleto y ver los errores, y finalmente crear el plato con éxito y verlo en el listado).

## Alcance

**Incluye:**
- Cambios de accesibilidad en `dish-form.component.{html,ts,css}` (web-admin): formulario semántico, labels reales, botones focusables/operables por teclado, validación de campos con mensajes asociados, gestión de foco en error, foco visible.
- Ajuste puntual de CSS global de `web-admin` para que los botones (`.btn`) tengan un indicador de foco visible, ya que hoy `button { outline: none }` lo elimina sin sustituto.
- Instalación y configuración de Playwright de forma **centralizada en la raíz del monorepo** (no solo en `packages/web-admin`), ya que se reutilizará más adelante para `web-empleados` y `web-clientes`, con grabación de vídeo activada y guardada en una carpeta de evidencias común fuera del monorepo.
- Un test E2E de Playwright que automatice la navegación por teclado descrita en el objetivo y produzca un vídeo como salida, organizado en una subcarpeta propia de `web-admin` dentro de la carpeta de tests E2E centralizada.

**No incluye (fuera de alcance):**
- `web-empleados` y `web-clientes`: no se toca ningún archivo de estos paquetes. Esto es un piloto solo para `web-admin` / formulario de platos; si el resultado es satisfactorio, aplicarlo al resto será un trabajo posterior (otra issue/plan).
- Migrar el formulario de `FormsModule`/`ngModel` a Reactive Forms (se mantiene el patrón actual para minimizar el alcance del cambio).
- Accesibilidad del resto de páginas de web-admin (listado de platos, ingredientes, empleados, etc.), salvo el ajuste de foco visible en `.btn` que es global por necesidad.
- Auditoría automatizada con axe-core u otra herramienta de testing de accesibilidad; el criterio de verificación aquí es el test de Playwright descrito y una revisión manual.

## Archivos afectados

- `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.html` — estructura semántica: `<h1>`, `<form (ngSubmit)>`, `<label for>` por campo, botones reales, mensajes de error por campo.
- `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.ts` — validación de nombre/precio, signal de errores por campo, gestión de foco al fallar validación.
- `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.css` — estilos de campo inválido y ajustes de foco/layout si hacen falta.
- `packages/web-admin/src/styles.css` — estilo `:focus-visible` para `.btn` y para el botón de quitar ingrediente (hoy sin indicador de foco al pasar de `div` a `button`).
- `package.json` (raíz del monorepo) — nueva devDependency `@playwright/test` y script `test:e2e`, compartido por todos los paquetes.
- `playwright.config.ts` (raíz del monorepo, nuevo) — configuración centralizada de Playwright: `testDir: './e2e'`, `video: 'on'`, `outputDir` apuntando a `C:\Users\msoto\Downloads\CursoClaude\Proyecto_inicial\evidencias`.
- `e2e/web-admin/dish-form-accessibility.spec.ts` (nuevo) — test E2E de navegación por teclado del formulario de platos; se organiza bajo `e2e/web-admin/` para dejar sitio a `e2e/web-empleados/` y `e2e/web-clientes/` en el futuro.

## Tareas

> Cada tarea debe poder completarse en 5-10 minutos. Si una tarea es más grande, divídela.

- [x] 1. Cambiar el `<div class="fake-title">` del formulario por un `<h1>` real; adaptar el CSS (`.fake-title` → estilo de `h1` en `dish-form.component.css`).
- [x] 2. Envolver los campos del formulario en un `<form (ngSubmit)="onSubmit()" novalidate>` y cambiar el botón "Guardar" de `<div (click)>` a `<button type="submit">`.
- [x] 3. Sustituir los `<div class="fake-label">` por `<label for="...">` reales y añadir `id` a cada input/select/textarea correspondiente (nombre, precio, categoría, disponible, descripción).
- [x] 4. Cambiar "Cancelar" de `<div class="btn btn-secondary" [routerLink]>` a `<a class="btn btn-secondary" [routerLink]="listUrl">` (enlace real, navegable con teclado).
- [x] 5. Cambiar el botón de añadir ingrediente (icono `+`) de `<div (click)="addIngredient()">` a `<button type="button" (click)="addIngredient()">`.
- [x] 6. Cambiar el botón de quitar ingrediente (icono papelera) a `<button type="button">` con `[attr.aria-label]="'Eliminar ' + getIngredientName(ing.ingredientId)"`.
- [x] 7. Añadir `<label>` reales (pueden ser visualmente compactas pero asociadas por `for`/`id`) al `<select>` de ingrediente y al `<input>` de cantidad en `add-ingredient-row`.
- [x] 8. En `dish-form.component.ts`, añadir un signal `fieldErrors = signal<Record<string, string>>({})` y un método `validate(): boolean` que compruebe `name` no vacío (trim) y `price > 0`, rellenando `fieldErrors`.
- [x] 9. Llamar a `validate()` al inicio de `onSubmit()`; si devuelve `false`, no llamar al store/API y salir sin tocar `loading`.
- [x] 10. En la plantilla, mostrar un `<p class="field-error" [id]="...">` bajo cada campo con error (nombre, precio), condicionado a `fieldErrors()['name']` / `['price']`.
- [x] 11. Añadir `[attr.aria-invalid]` y `[attr.aria-describedby]` a los inputs de nombre y precio, apuntando al `id` del mensaje de error correspondiente cuando existe.
- [x] 12. Al fallar `validate()` en `onSubmit()`, mover el foco al primer campo inválido (nombre antes que precio) usando `ElementRef`/`document.getElementById('dish-name').focus()`.
- [x] 13. Añadir `aria-live="assertive"` al `<div class="alert-error">` existente y a un nuevo contenedor que envuelva los mensajes de error de validación, para que los lectores de pantalla los anuncien.
- [x] 14. En `packages/web-admin/src/styles.css`, añadir una regla `:focus-visible` para `.btn` (y para los botones de icono como quitar ingrediente) que restaure un indicador de foco visible, ya que `button { outline: none }` lo elimina sin sustituto.
- [x] 15. En `dish-form.component.css`, añadir un estilo para `.form-control[aria-invalid="true"]` (borde/color de error) coherente con las variables de `styles.css` (`--red`).
- [x] 16. Verificación manual: levantar `npm run dev:api` y `npm run dev:admin`, recorrer el formulario completo solo con teclado (Tab/Shift+Tab/flechas/Enter/Espacio) y confirmar orden lógico, foco visible y envío/errores correctos. (Ver nota en "Dudas y decisiones": verificado mediante `ng build` + revisión de código; la comprobación real de navegación por teclado en navegador la realiza el test de Playwright de las tareas 20-24.)
- [x] 17. Añadir Playwright en la **raíz del monorepo**: `npm install -D @playwright/test` (en `package.json` raíz, no en `packages/web-admin`) y añadir script `"test:e2e": "playwright test"` a ese `package.json` raíz.
- [x] 18. Crear `playwright.config.ts` en la raíz del monorepo con `testDir: './e2e'`, `use: { video: 'on', baseURL: 'http://localhost:4200' }`, `outputDir` apuntando a la ruta absoluta `C:\Users\msoto\Downloads\CursoClaude\Proyecto_inicial\evidencias`, y un solo proyecto `chromium` por ahora (fácil de ampliar luego con más `baseURL` para `web-empleados`/`web-clientes`).
- [x] 19. Instalar el navegador necesario: `npx playwright install chromium` (ejecutado desde la raíz del monorepo).
- [x] 20. Crear `e2e/web-admin/dish-form-accessibility.spec.ts` con un primer bloque de test que haga login (`gerente1@resttek.com` / `gerente1@resttek.com`) y navegue con teclado hasta "Platos" → "Nuevo plato".
- [x] 21. En el mismo test, usar solo teclado (`page.keyboard.press`, `locator.fill` solo tras enfocar con Tab, sin `.click()` salvo que sea inevitable) para modificar nombre y precio, y añadir un ingrediente (seleccionar del `select`, rellenar cantidad, activar el botón `+`).
- [x] 22. Continuar el test: quitar el ingrediente recién añadido con teclado (Tab hasta su botón "Eliminar..." y Enter/Espacio).
- [x] 23. Continuar el test: vaciar el campo nombre con teclado y enviar el formulario (Enter o Tab hasta "Guardar"); comprobar que se muestran los mensajes de error de validación y que la URL no cambia.
- [x] 24. Continuar el test: rellenar correctamente el formulario con teclado y enviarlo; comprobar que redirige al listado de platos y que el nuevo plato aparece en la tabla por su nombre.
- [x] 25. Ejecutar `npm run test:e2e` desde la raíz del monorepo (con la API y web-admin levantados), confirmar que el test pasa y que Playwright escribe el vídeo directamente bajo `C:\Users\msoto\Downloads\CursoClaude\Proyecto_inicial\evidencias\` (carpeta por nombre de test); renombrar/copiar ese `.webm` a `evidencias\dish-form-keyboard-nav.webm` para tener una ruta fija y estable que compartir.

## Criterios de aceptación

> Comportamiento observable que debe cumplirse para dar la tarea por terminada. Deben poder verificarse sin ambigüedad.

- [x] El formulario de creación/edición de platos se puede completar y enviar por completo usando solo el teclado (Tab, Shift+Tab, flechas en selects, Enter/Espacio en botones), sin usar el ratón. _(Verificado por el test de Playwright, que completa todo el flujo sin un solo `.click()`.)_
- [x] El orden de tabulación sigue el orden visual/lógico del formulario (datos del plato → ingredientes → acciones). _(El test avanza siempre tabulando hacia adelante, sin saltos hacia atrás salvo los explícitos con Shift+Tab para volver a campos ya visitados.)_
- [ ] Todos los elementos interactivos (inputs, selects, botones, enlaces) muestran un indicador de foco visible al navegar con teclado. _(Se añadió CSS `:focus-visible`/`:focus` para cubrirlo, pero el estilo visual no lo comprueba el test automatizado; pendiente de una revisión visual rápida en navegador.)_
- [x] Cada campo del formulario tiene una `<label>` asociada mediante `for`/`id`.
- [x] Al enviar el formulario con el nombre vacío o el precio ≤ 0, se muestran mensajes de error visibles y asociados al campo mediante `aria-describedby`/`aria-invalid`, y el foco se mueve automáticamente al primer campo con error.
- [x] Se puede añadir y quitar un ingrediente del plato usando solo el teclado; el botón de quitar tiene un nombre accesible que identifica qué ingrediente elimina.
- [x] Existe un test de Playwright (`e2e/web-admin/dish-form-accessibility.spec.ts`, con Playwright configurado de forma centralizada en la raíz del monorepo) que automatiza todo el flujo anterior y, al ejecutarlo, pasa en verde y genera un vídeo (`.webm`) del recorrido completo en `C:\Users\msoto\Downloads\CursoClaude\Proyecto_inicial\evidencias`.
- [x] El plato creado durante el test de Playwright aparece en el listado de platos tras guardarse correctamente.
- [x] Ningún archivo de `web-empleados` ni `web-clientes` se ha modificado como parte de este plan.

## Dudas y decisiones tomadas

- **Duda/Decisión:** El test E2E creaba un plato nuevo en cada ejecución y, al repetirlo, `getByText(DISH_NAME)` dejaba de ser único (strict mode violation de Playwright) por los platos duplicados acumulados.
  - **Resolución / Alternativas consideradas:** Se añade un `test.afterEach` que borra el plato creado llamando directamente a `DELETE /api/v1/restaurants/:id/dishes/:id` con el token de `localStorage`, capturando el `id` de la respuesta del `POST` de creación. Así el test es repetible sin ir acumulando platos de prueba en la base de datos de desarrollo compartida. (También se limpiaron a mano, vía API, los 3 platos duplicados "Ensalada de prueba E2E" que habían quedado de las ejecuciones previas a este arreglo.)
- **Duda/Decisión:** Qué hacer con el foco al quitar un ingrediente con teclado (encontrado al preparar el test de la tarea 22).
  - **Resolución / Alternativas consideradas:** El botón "Eliminar ingrediente" enfocado se destruye al quitarse el chip del DOM, lo que hacía que el foco se perdiera (volvía a `body`), rompiendo la navegación por teclado — un problema real de orden/gestión de foco no listado explícitamente en las tareas originales. Se añade `removeIngredient()` moviendo el foco al `<select>` de "Ingrediente" tras eliminar, en vez de dejarlo perdido.
- **Duda/Decisión:** Qué versión de `@playwright/test` instalar.
  - **Resolución / Alternativas consideradas:** La versión `latest` (`1.65.0`) del registro de npm está rota en el momento de implementar este plan: declara una dependencia de `playwright-core@1.65.0`, versión que no existe publicada como estable (solo hay alpha/beta de `1.65.0` y `1.66.0`). Se decide fijar `@playwright/test@1.64.1` (última versión estable consistente con `playwright-core@1.64.1`) en vez de `latest`.
- **Duda/Decisión:** Cómo ejecutar la "verificación manual" de la tarea 16 sin acceso directo a un navegador interactivo fuera de Playwright.
  - **Resolución / Alternativas consideradas:** Se confirmó que `ng build` compila sin errores y que la plantilla/TS quedan coherentes (revisión de código), y se decidió no duplicar la comprobación real de navegación por teclado en esta tarea: queda cubierta de forma más rigurosa por el test de Playwright de las tareas 20-24, que ejecuta exactamente ese recorrido de forma automatizada y deja vídeo como evidencia.

- **Duda/Decisión:** Qué campos validar en el cliente.
  - **Resolución / Alternativas consideradas:** Se valida solo `name` (no vacío) y `price` (> 0), replicando las reglas ya existentes en el backend (`DishNameRequiredError`, `InvalidPriceError` en `packages/api/src/services/dish.service.ts`). `category` no se valida porque el `<select>` siempre tiene un valor por defecto válido (`principal`) y no permite estados vacíos.
- **Duda/Decisión:** Dónde instalar Playwright.
  - **Resolución / Alternativas consideradas:** Instrucción explícita del usuario: centralizarlo en la raíz del monorepo (devDependency y `playwright.config.ts` compartidos) en vez de en el workspace `packages/web-admin`, porque se reutilizará más adelante para `web-empleados` y `web-clientes`. Los tests se organizan en subcarpetas por app (`e2e/web-admin/`, etc.) dentro de un único `testDir` compartido.
- **Duda/Decisión:** Con qué usuario iniciar sesión en el test E2E.
  - **Resolución / Alternativas consideradas:** `gerente1@resttek.com` (restaurante `rest-1`), en vez de `admin@resttek.com`, porque el admin no tiene un restaurante asignado por defecto y requeriría pasos extra de navegación para seleccionar uno antes de llegar al formulario de platos.
- **Duda/Decisión:** Mantener `FormsModule`/`ngModel` o migrar a Reactive Forms.
  - **Resolución / Alternativas consideradas:** Se mantiene el patrón actual (`ngModel` + signals manuales para errores) para no ampliar el alcance del cambio; Reactive Forms habría facilitado la validación pero implica refactorizar todo el componente.
- **Duda/Decisión:** Dónde dejar el vídeo generado por Playwright.
  - **Resolución / Alternativas consideradas:** Instrucción explícita del usuario: `outputDir` de Playwright apunta a `C:\Users\msoto\Downloads\CursoClaude\Proyecto_inicial\evidencias` (fuera del monorepo, compartido entre apps), en vez de dejarlo en `test-results/` dentro de `packages/web-admin`. Como Playwright anida el vídeo en una subcarpeta con el nombre del test, se añade un paso final para copiarlo/renombrarlo a `evidencias\dish-form-keyboard-nav.webm` con una ruta fija y fácil de compartir.
