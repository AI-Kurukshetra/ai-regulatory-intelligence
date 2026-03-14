#!/usr/bin/env node
/**
 * Merges the demo video recording with the narration audio using ffmpeg
 * Exports final-demo.mp4
 */

import { execSync, spawnSync } from 'child_process'
import { existsSync, readdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.join(__dirname, '..')
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'demo-output')
const FINAL_OUTPUT = path.join(PROJECT_ROOT, 'final-demo.mp4')

async function main() {
  console.log('🎬 Merging video + narration...')

  // Find the video file
  let videoFile = null
  const videoPathFile = path.join(OUTPUT_DIR, 'video-path.txt')
  if (existsSync(videoPathFile)) {
    const { readFileSync } = await import('fs')
    videoFile = readFileSync(videoPathFile, 'utf8').trim()
  }

  if (!videoFile || !existsSync(videoFile)) {
    // Search for webm files
    const files = readdirSync(OUTPUT_DIR)
      .filter(f => f.endsWith('.webm'))
      .map(f => path.join(OUTPUT_DIR, f))
      .sort((a, b) => {
        const { statSync } = require('fs')
        return statSync(b).mtime - statSync(a).mtime
      })

    if (files.length === 0) {
      console.error('❌ No video file found in', OUTPUT_DIR)
      process.exit(1)
    }
    videoFile = files[0]
  }

  const audioFile = path.join(OUTPUT_DIR, 'narration.mp3')

  console.log(`📹 Video: ${videoFile}`)
  console.log(`🎙️ Audio: ${audioFile}`)

  if (!existsSync(videoFile)) {
    console.error('❌ Video file not found:', videoFile)
    process.exit(1)
  }

  if (!existsSync(audioFile)) {
    console.error('❌ Audio file not found:', audioFile)
    process.exit(1)
  }

  // Get video duration
  const videoDurationCmd = spawnSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', videoFile
  ], { encoding: 'utf8' })

  const videoDuration = parseFloat(videoDurationCmd.stdout?.trim() || '0')
  console.log(`⏱️  Video duration: ${videoDuration.toFixed(1)}s`)

  // Get audio duration
  const audioDurationCmd = spawnSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', audioFile
  ], { encoding: 'utf8' })

  const audioDuration = parseFloat(audioDurationCmd.stdout?.trim() || '0')
  console.log(`⏱️  Audio duration: ${audioDuration.toFixed(1)}s`)

  const maxDuration = Math.max(videoDuration, audioDuration)
  console.log(`⏱️  Final duration: ${maxDuration.toFixed(1)}s`)

  // Build ffmpeg command
  // - Convert webm video to mp4
  // - Mix in narration audio, adjusting video speed if needed
  // - If video is shorter than audio: slow down video (video_atpts filter)
  // - If audio is shorter: pad audio with silence

  let ffmpegCmd

  if (Math.abs(videoDuration - audioDuration) < 5) {
    // Durations are close enough, just combine
    ffmpegCmd = [
      'ffmpeg', '-y',
      '-i', videoFile,
      '-i', audioFile,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      '-movflags', '+faststart',
      FINAL_OUTPUT
    ]
  } else if (videoDuration < audioDuration) {
    // Video is shorter than audio — speed down video to match audio
    const speedFactor = videoDuration / audioDuration
    console.log(`🔧 Adjusting video speed: ${speedFactor.toFixed(3)}x (to match audio duration)`)
    ffmpegCmd = [
      'ffmpeg', '-y',
      '-i', videoFile,
      '-i', audioFile,
      '-filter:v', `setpts=${(1/speedFactor).toFixed(4)}*PTS`,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      '-movflags', '+faststart',
      FINAL_OUTPUT
    ]
  } else {
    // Video is longer than audio — pad audio with silence at end
    console.log(`🔧 Padding audio with silence to match video duration`)
    ffmpegCmd = [
      'ffmpeg', '-y',
      '-i', videoFile,
      '-i', audioFile,
      '-filter_complex', `[1:a]apad=whole_dur=${videoDuration.toFixed(2)}[a]`,
      '-map', '0:v',
      '-map', '[a]',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      FINAL_OUTPUT
    ]
  }

  console.log('\n🔧 Running ffmpeg...')
  console.log(ffmpegCmd.join(' '))

  const result = spawnSync(ffmpegCmd[0], ffmpegCmd.slice(1), {
    stdio: 'inherit',
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    console.error('❌ ffmpeg failed with exit code:', result.status)
    process.exit(1)
  }

  if (existsSync(FINAL_OUTPUT)) {
    const { statSync } = await import('fs')
    const stats = statSync(FINAL_OUTPUT)
    console.log(`\n✅ Final demo video exported!`)
    console.log(`📁 Path: ${FINAL_OUTPUT}`)
    console.log(`📏 Size: ${(stats.size / (1024 * 1024)).toFixed(1)} MB`)
  } else {
    console.error('❌ Output file not created')
    process.exit(1)
  }
}

main().catch(console.error)
