import { test, expect } from '@playwright/test'

test('renders Thorondor shell and generator route', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Inicio de sesión' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar con Microsoft' })).toBeVisible()
  await page.getByRole('link', { name: 'Acceder sin logarse' }).click()

  await expect(page.getByRole('heading', { name: 'Thorondor', exact: true })).toBeVisible()
  await expect(page.getByText('Generador de agentes')).toBeVisible()

  await page.goto('/thorondor/generador-de-agentes')
  await expect(page.getByText('Fuentes de logs diagnósticos')).toBeVisible()
})
