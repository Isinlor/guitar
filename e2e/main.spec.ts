import { expect } from '@playwright/test'
import { test } from './test-setup'
import path from 'path'

test('build success.', async ({ page }) => {
  await page.goto('http://localhost:5173/')
  await expect(page.locator('body')).toBeVisible()
})

test('upload midi file', async ({ page }) => {
  await page.goto('/')
  await page.selectOption('select', 'ukulele')
  const filePath = path.resolve(__dirname, '../music/hejsokoly.mid')
  await page.setInputFiles('input[type="file"]', filePath)
  await expect(page.locator('.tab-row')).toHaveCount(4)
})
