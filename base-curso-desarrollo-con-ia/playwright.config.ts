import { defineConfig, devices } from '@playwright/test'
import path from 'path'

export default defineConfig({
  testDir: './e2e',
  outputDir: path.join(__dirname, '..', 'evidencias'),
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4200',
    video: 'on',
    trace: 'off'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
})
