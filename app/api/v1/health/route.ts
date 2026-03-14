import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    data: {
      status: 'ok',
      service: 'ai-regulatory-intelligence',
      timestamp: new Date().toISOString()
    }
  })
}
