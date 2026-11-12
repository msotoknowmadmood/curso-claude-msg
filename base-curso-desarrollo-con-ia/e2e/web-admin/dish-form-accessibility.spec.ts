import { test, expect, type Page } from '@playwright/test'

const MANAGER_EMAIL = 'gerente1@resttek.com'
const MANAGER_PASSWORD = 'gerente1@resttek.com'
const RESTAURANT_ID = 'rest-1'
const DISH_NAME = 'Ensalada de prueba E2E'

interface FocusedInfo {
  id: string
  tag: string
  type: string
  href: string
  text: string
  ariaLabel: string
}

async function focusedInfo(page: Page): Promise<FocusedInfo> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    return {
      id: el?.id ?? '',
      tag: el?.tagName ?? '',
      type: (el as HTMLButtonElement | HTMLInputElement | null)?.type ?? '',
      href: (el as HTMLAnchorElement | null)?.getAttribute?.('href') ?? '',
      text: (el?.textContent ?? '').trim(),
      ariaLabel: el?.getAttribute?.('aria-label') ?? ''
    }
  })
}

async function tabTo(page: Page, matches: (info: FocusedInfo) => boolean, maxPresses = 30): Promise<FocusedInfo> {
  for (let i = 0; i < maxPresses; i++) {
    await page.keyboard.press('Tab')
    const info = await focusedInfo(page)
    if (matches(info)) return info
  }
  throw new Error('No se alcanzó el elemento esperado tabulando hacia adelante (Tab)')
}

async function shiftTabTo(page: Page, matches: (info: FocusedInfo) => boolean, maxPresses = 30): Promise<FocusedInfo> {
  for (let i = 0; i < maxPresses; i++) {
    await page.keyboard.press('Shift+Tab')
    const info = await focusedInfo(page)
    if (matches(info)) return info
  }
  throw new Error('No se alcanzó el elemento esperado tabulando hacia atrás (Shift+Tab)')
}

// Plato creado durante el test, para poder borrarlo al terminar y que el test sea repetible
// sin ir acumulando platos de prueba en la base de datos de desarrollo.
let createdDishId: string | null = null

test.afterEach(async ({ page, request }) => {
  if (!createdDishId) return
  const token = await page.evaluate(() => localStorage.getItem('auth_token')).catch(() => null)
  if (token) {
    await request
      .delete(`http://localhost:3000/api/v1/restaurants/${RESTAURANT_ID}/dishes/${createdDishId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .catch(() => {})
  }
  createdDishId = null
})

test('navegación por teclado del formulario de platos: editar, añadir/quitar ingrediente, validación y creación', async ({ page }) => {
  // --- Login (solo teclado) ---
  await page.goto('/login')

  await page.keyboard.press('Tab')
  expect((await focusedInfo(page)).id).toBe('email')
  await page.keyboard.type(MANAGER_EMAIL)

  await page.keyboard.press('Tab')
  expect((await focusedInfo(page)).id).toBe('password')
  await page.keyboard.type(MANAGER_PASSWORD)

  await page.keyboard.press('Enter')
  await page.waitForURL(`**/restaurants/${RESTAURANT_ID}/dashboard`)

  // --- Navegar con teclado hasta "Platos" > "Nuevo plato" ---
  await tabTo(page, info => !!info.href?.endsWith(`/restaurants/${RESTAURANT_ID}/dishes`))
  await page.keyboard.press('Enter')
  await page.waitForURL(`**/restaurants/${RESTAURANT_ID}/dishes`)

  await tabTo(page, info => !!info.href?.endsWith(`/restaurants/${RESTAURANT_ID}/dishes/new`))
  await page.keyboard.press('Enter')
  await page.waitForURL(`**/restaurants/${RESTAURANT_ID}/dishes/new`)

  // --- Modificar nombre y precio (solo teclado) ---
  await tabTo(page, info => info.id === 'dish-name')
  await page.keyboard.type(DISH_NAME)

  const priceInfo = await tabTo(page, info => info.id === 'dish-price')
  expect(priceInfo.id).toBe('dish-price')
  await page.keyboard.type('12.5')

  // --- Añadir un ingrediente (solo teclado) ---
  await tabTo(page, info => info.id === 'new-ingredient-id')
  await page.keyboard.press('ArrowDown')
  const addedIngredientLabel = (await page.locator('#new-ingredient-id option:checked').textContent())?.trim() ?? ''
  expect(addedIngredientLabel).not.toBe('Seleccionar ingrediente')

  await tabTo(page, info => info.id === 'new-ingredient-qty')
  await page.keyboard.press('Control+A')
  await page.keyboard.type('2')

  await tabTo(page, info => info.ariaLabel === 'Añadir ingrediente')
  await page.keyboard.press('Enter')

  await expect(page.locator('.ingredient-chip')).toHaveCount(1)
  await expect(page.locator('.ingredient-chip')).toContainText(addedIngredientLabel.split(' (')[0])

  // --- Quitar el ingrediente recién añadido (solo teclado) ---
  await shiftTabTo(page, info => info.ariaLabel.startsWith('Eliminar '))
  await page.keyboard.press('Enter')

  await expect(page.locator('.ingredient-chip')).toHaveCount(0)
  // El foco no debe perderse al desaparecer el botón: debe volver al selector de ingredientes.
  expect((await focusedInfo(page)).id).toBe('new-ingredient-id')

  // --- Enviar el formulario incompleto (nombre vacío) y comprobar los errores ---
  await shiftTabTo(page, info => info.id === 'dish-name')
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(new RegExp(`/restaurants/${RESTAURANT_ID}/dishes/new$`))
  await expect(page.locator('#dish-name-error')).toHaveText('El nombre del plato es obligatorio.')
  await expect(page.locator('#dish-name')).toHaveAttribute('aria-invalid', 'true')
  // El foco debe moverse automáticamente al primer campo inválido.
  expect((await focusedInfo(page)).id).toBe('dish-name')

  // --- Completar correctamente y enviar (solo teclado) ---
  await page.keyboard.type(DISH_NAME)

  await tabTo(page, info => info.type === 'submit' && info.text.includes('Guardar'))
  const [createResponse] = await Promise.all([
    page.waitForResponse(
      resp => resp.request().method() === 'POST' && resp.url().includes(`/restaurants/${RESTAURANT_ID}/dishes`)
    ),
    page.keyboard.press('Enter')
  ])
  createdDishId = (await createResponse.json()).id

  await page.waitForURL(`**/restaurants/${RESTAURANT_ID}/dishes`)
  await expect(page.getByText(DISH_NAME).first()).toBeVisible()
})
