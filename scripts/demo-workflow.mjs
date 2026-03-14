#!/usr/bin/env node
/**
 * Playwright demo workflow for AI Regulatory Intelligence
 * Records a full demo video showcasing the AML compliance platform
 */

import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.join(__dirname, '..')
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'demo-output')

mkdirSync(OUTPUT_DIR, { recursive: true })

const BASE_URL = 'http://localhost:3002'
const EMAIL = 'demo@aml-demo.com'
const PASSWORD = 'Demo@123456'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('🎬 Starting Playwright demo recording...')

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1440, height: 900 },
    },
    colorScheme: 'dark',
  })

  const page = await context.newPage()

  try {
    // ── Step 1: Login ──────────────────────────────────────────────────────────
    console.log('📝 Step 1: Login')
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    await sleep(2500) // Let the page render

    // Fill in credentials
    await page.fill('input[type="email"]', EMAIL)
    await sleep(600)
    await page.fill('input[type="password"]', PASSWORD)
    await sleep(600)

    // Click sign in
    await page.click('button[type="submit"]')
    await page.waitForURL('**/overview', { timeout: 15000 })
    await sleep(3000) // Let dashboard load

    // ── Step 2: Overview Dashboard ─────────────────────────────────────────────
    console.log('📊 Step 2: Overview Dashboard')
    await page.waitForSelector('body', { timeout: 10000 })
    await sleep(3000)

    // Scroll down slightly to show metrics
    await page.evaluate(() => window.scrollBy(0, 200))
    await sleep(2000)
    await page.evaluate(() => window.scrollTo(0, 0))
    await sleep(1500)

    // ── Step 3: Transactions ───────────────────────────────────────────────────
    console.log('💰 Step 3: Transactions')
    await page.click('a[href*="transactions"]')
    await page.waitForURL('**/transactions', { timeout: 10000 })
    await sleep(3000)

    // Scroll down to see transactions
    await page.evaluate(() => window.scrollBy(0, 300))
    await sleep(2000)

    // Click on first flagged transaction to view detail
    const flaggedTx = page.locator('a[href*="/transactions/"]').first()
    if (await flaggedTx.count() > 0) {
      await flaggedTx.click()
      await sleep(3000)
      await page.goBack()
      await sleep(1500)
    }

    await page.evaluate(() => window.scrollTo(0, 0))
    await sleep(1000)

    // ── Step 4: Alerts ─────────────────────────────────────────────────────────
    console.log('🚨 Step 4: Alerts')
    await page.click('a[href*="alerts"]')
    await page.waitForURL('**/alerts', { timeout: 10000 })
    await sleep(3000)

    // Scroll to show alerts
    await page.evaluate(() => window.scrollBy(0, 250))
    await sleep(2500)
    await page.evaluate(() => window.scrollTo(0, 0))
    await sleep(1000)

    // ── Step 5: Cases ──────────────────────────────────────────────────────────
    console.log('📋 Step 5: Case Management')
    await page.click('a[href*="cases"]')
    await page.waitForURL('**/cases', { timeout: 10000 })
    await sleep(3000)

    // Click into first case
    const firstCase = page.locator('a[href*="/cases/"]').first()
    if (await firstCase.count() > 0) {
      await firstCase.click()
      await sleep(3500)
      // Scroll down to see case details
      await page.evaluate(() => window.scrollBy(0, 300))
      await sleep(2000)
      await page.goBack()
      await sleep(1500)
    }

    await page.evaluate(() => window.scrollTo(0, 0))
    await sleep(1000)

    // ── Step 6: Regulatory Intelligence ───────────────────────────────────────
    console.log('📚 Step 6: Regulatory Intelligence')
    await page.click('a[href*="intelligence"]')
    await page.waitForURL('**/intelligence', { timeout: 10000 })
    await sleep(3500)

    // Scroll to show documents
    await page.evaluate(() => window.scrollBy(0, 300))
    await sleep(2000)

    // Click first doc if available
    const firstDoc = page.locator('a[href*="/intelligence/"]').first()
    if (await firstDoc.count() > 0) {
      await firstDoc.click()
      await sleep(3000)
      await page.goBack()
      await sleep(1500)
    }

    await page.evaluate(() => window.scrollTo(0, 0))
    await sleep(1000)

    // ── Step 7: Reports ────────────────────────────────────────────────────────
    console.log('📄 Step 7: Reports')
    await page.click('a[href*="reports"]')
    await page.waitForURL('**/reports', { timeout: 10000 })
    await sleep(3000)

    await page.evaluate(() => window.scrollBy(0, 200))
    await sleep(2000)
    await page.evaluate(() => window.scrollTo(0, 0))
    await sleep(1000)

    // ── Step 8: Back to Overview ───────────────────────────────────────────────
    console.log('🏠 Step 8: Return to Overview')
    await page.click('a[href*="overview"]')
    await page.waitForURL('**/overview', { timeout: 10000 })
    await sleep(3000)

    console.log('✅ Demo recording complete!')

  } catch (error) {
    console.error('Error during recording:', error)
    // Take screenshot of error state
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'error-screenshot.png') })
  } finally {
    await context.close()
    await browser.close()
  }

  // Find the recorded video file
  const { readdirSync } = await import('fs')
  const files = readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.webm'))
  if (files.length > 0) {
    const videoFile = path.join(OUTPUT_DIR, files[files.length - 1])
    console.log(`\n🎥 Video saved: ${videoFile}`)
    writeFileSync(path.join(OUTPUT_DIR, 'video-path.txt'), videoFile)
    return videoFile
  }
  return null
}

main().catch(console.error)
