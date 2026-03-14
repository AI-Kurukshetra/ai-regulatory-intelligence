import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function parseEnvFile(raw) {
  const values = {}

  for (const line of raw.split(/\r?\n/)) {
    const trimmedLine = line.trim()

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmedLine.indexOf('=')
    if (separatorIndex === -1) {
      continue
    }

    const key = trimmedLine.slice(0, separatorIndex).trim()
    const value = trimmedLine.slice(separatorIndex + 1).trim()
    values[key] = value
  }

  return values
}

async function loadLocalEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    const raw = await fs.readFile(envPath, 'utf8')
    return parseEnvFile(raw)
  } catch {
    return {}
  }
}

function parseCsv(text) {
  const rows = []
  let row = []
  let currentValue = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(currentValue)
      currentValue = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1
      }

      row.push(currentValue)
      currentValue = ''

      if (row.some((value) => value.trim() !== '')) {
        rows.push(row)
      }

      row = []
      continue
    }

    currentValue += char
  }

  if (currentValue.length > 0 || row.length > 0) {
    row.push(currentValue)
    if (row.some((value) => value.trim() !== '')) {
      rows.push(row)
    }
  }

  return rows
}

function normalizeName(value) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function mapEntityType(rawType) {
  switch (rawType?.toLowerCase()) {
    case 'individual':
      return 'individual'
    case 'entity':
      return 'entity'
    case 'vessel':
      return 'vessel'
    case 'aircraft':
      return 'aircraft'
    default:
      return 'unknown'
  }
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))]
}

function chunkArray(values, size) {
  const chunks = []

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }

  return chunks
}

async function fetchText(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  return response.text()
}

async function main() {
  const localEnv = await loadLocalEnv()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || localEnv.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || localEnv.SUPABASE_SERVICE_ROLE_KEY
  const ofacSdnUrl =
    process.env.OFAC_SDN_URL || localEnv.OFAC_SDN_URL || 'https://www.treasury.gov/ofac/downloads/sdn.csv'
  const ofacAltUrl =
    process.env.OFAC_ALT_URL || localEnv.OFAC_ALT_URL || 'https://www.treasury.gov/ofac/downloads/alt.csv'

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  console.log(`Downloading OFAC data from ${ofacSdnUrl} and ${ofacAltUrl}`)
  const [sdnText, altText] = await Promise.all([fetchText(ofacSdnUrl), fetchText(ofacAltUrl)])

  const sdnRows = parseCsv(sdnText)
  const altRows = parseCsv(altText)

  const aliasesByEntity = new Map()

  for (const row of altRows) {
    const entityRef = row[0]?.trim()
    const aliasName = row[3]?.trim()

    if (!entityRef || !aliasName) {
      continue
    }

    const existingAliases = aliasesByEntity.get(entityRef) ?? []
    existingAliases.push(aliasName)
    aliasesByEntity.set(entityRef, existingAliases)
  }

  const records = sdnRows
    .map((row) => {
      const externalRef = row[0]?.trim()
      const entityName = row[1]?.trim()
      const entityType = row[2]?.trim()
      const program = row[3]?.trim() || null
      const title = row[4]?.trim() || null
      const remarks = row[row.length - 1]?.trim() || null
      const aliases = uniqueStrings(aliasesByEntity.get(externalRef) ?? [])

      if (!externalRef || !entityName) {
        return null
      }

      return {
        source: 'OFAC',
        list_name: 'OFAC_SDN',
        external_ref: externalRef,
        entity_name: entityName,
        entity_type: mapEntityType(entityType),
        country: null,
        aliases,
        name_normalized: normalizeName(entityName),
        aliases_normalized: aliases.map(normalizeName).filter(Boolean),
        is_active: true,
        metadata: {
          program,
          title,
          remarks
        }
      }
    })
    .filter(Boolean)

  if (records.length === 0) {
    throw new Error('No OFAC records were parsed from the downloaded files')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const { error: deleteError } = await supabase
    .from('watchlist_entries')
    .delete()
    .eq('source', 'OFAC')

  if (deleteError) {
    throw new Error(`Failed to clear existing OFAC data: ${deleteError.message}`)
  }

  for (const chunk of chunkArray(records, 500)) {
    const { error } = await supabase.from('watchlist_entries').insert(chunk)

    if (error) {
      throw new Error(`Failed to insert OFAC chunk: ${error.message}`)
    }
  }

  console.log(`Imported ${records.length} OFAC watchlist entries`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
