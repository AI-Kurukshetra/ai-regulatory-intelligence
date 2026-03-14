#!/usr/bin/env node
/**
 * Generates narration audio using OpenAI TTS for the demo video
 */

import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const gTTS = require('node-gtts')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.join(__dirname, '..')
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'demo-output')

mkdirSync(OUTPUT_DIR, { recursive: true })

const NARRATION_SCRIPT = `
Welcome to the AI Regulatory Intelligence platform — a next-generation AML and compliance command center designed for financial institutions operating under intense regulatory scrutiny.

Let's begin with the login. The platform uses enterprise-grade authentication, ensuring only authorized compliance personnel can access sensitive financial intelligence data.

Once inside the Overview Dashboard, you immediately see the operational pulse of your compliance program. At a glance: total transactions under monitoring, high-risk alerts requiring immediate action, regulatory documents needing your attention, and open investigation cases. This real-time situational awareness is critical for compliance officers managing live transaction pressure.

Moving to the Transactions module, every financial movement is scored by our AI risk engine. Notice the color-coded risk levels — critical transactions flagged in red, high-risk in orange, and routine activity in green. Our proprietary model analyzes counterparty geography, transaction patterns, velocity, and sanctions exposure to generate a precise risk score between zero and one hundred.

The Alerts feed is where the compliance team lives. Here, critical alerts like OFAC sanctions hits and frozen account breaches surface instantly. The platform automatically correlates related alerts, reducing analyst workload by up to sixty percent compared to traditional tools.

In Case Management, investigators can consolidate multiple related alerts into a single investigation. Our AI assists in drafting Suspicious Activity Reports — a process that typically takes hours, now completed in minutes with AI-generated narratives that meet FinCEN filing requirements.

The Regulatory Intelligence module is a game-changer. Instead of manually tracking Federal Register notices and FinCEN advisories, our system ingests regulatory documents automatically and uses AI to extract key compliance action items specific to your institution's risk profile.

Finally, the Reports section maintains a complete audit trail of all SAR filings, providing regulators with transparent evidence of your institution's compliance posture.

The AI Regulatory Intelligence platform brings together real-time transaction monitoring, AI-powered risk scoring, sanctions screening, and regulatory tracking — all in one secure, auditable workspace. This is what modern financial compliance looks like.
`.trim()

async function generateTTS() {
  console.log('🎙️ Generating narration audio with Google TTS...')

  const audioPath = path.join(OUTPUT_DIR, 'narration.mp3')

  await new Promise((resolve, reject) => {
    const tts = gTTS('en')
    tts.save(audioPath, NARRATION_SCRIPT, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })

  const { statSync } = await import('fs')
  const stats = statSync(audioPath)
  console.log(`✅ Narration saved: ${audioPath}`)
  console.log(`📏 Audio size: ${(stats.size / 1024).toFixed(1)} KB`)

  // Save the script too
  const scriptPath = path.join(OUTPUT_DIR, 'narration-script.txt')
  writeFileSync(scriptPath, NARRATION_SCRIPT)
  console.log(`📝 Script saved: ${scriptPath}`)

  return audioPath
}

generateTTS().catch(console.error)
