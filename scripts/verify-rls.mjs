import fs from 'node:fs'

function readEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const result = {}

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }

  return result
}

async function callJson(url, method, apiKey, body) {
  const response = await fetch(url, {
    method,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })

  const text = await response.text()
  let data

  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }

  return { response, data }
}

async function main() {
  const env = readEnvFile('.env.local')
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials in .env.local')
  }

  const timestamp = Date.now()
  const userAEmail = `phase1.rls.a.${timestamp}@example.com`
  const userBEmail = `phase1.rls.b.${timestamp}@example.com`
  const password = `Phase1Check!${timestamp}`
  const cleanup = []
  const cleanupOrgIds = []

  try {
    const signUpA = await callJson(`${url}/auth/v1/signup`, 'POST', anonKey, {
      email: userAEmail,
      password,
      data: {
        full_name: 'Phase One User A',
        organization_name: 'Phase One Org A'
      }
    })
    const signUpB = await callJson(`${url}/auth/v1/signup`, 'POST', anonKey, {
      email: userBEmail,
      password,
      data: {
        full_name: 'Phase One User B',
        organization_name: 'Phase One Org B'
      }
    })

    const userAId = signUpA.data?.user?.id
    const userBId = signUpB.data?.user?.id

    if (!userAId || !userBId) {
      throw new Error('Failed to create verification users')
    }

    cleanup.push(userAId, userBId)

    const profileA = await fetch(
      `${url}/rest/v1/profiles?select=organization_id&id=eq.${userAId}`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`
        }
      }
    ).then(async (response) => ({
      status: response.status,
      data: await response.json()
    }))

    const profileB = await fetch(
      `${url}/rest/v1/profiles?select=organization_id&id=eq.${userBId}`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`
        }
      }
    ).then(async (response) => ({
      status: response.status,
      data: await response.json()
    }))

    const orgAId = profileA.data?.[0]?.organization_id
    const orgBId = profileB.data?.[0]?.organization_id

    if (!orgAId || !orgBId) {
      throw new Error('Failed to load verification profile organization ids')
    }

    cleanupOrgIds.push(orgAId, orgBId)

    const signInA = await callJson(
      `${url}/auth/v1/token?grant_type=password`,
      'POST',
      anonKey,
      { email: userAEmail, password }
    )
    const signInB = await callJson(
      `${url}/auth/v1/token?grant_type=password`,
      'POST',
      anonKey,
      { email: userBEmail, password }
    )

    const tokenA = signInA.data?.access_token
    const tokenB = signInB.data?.access_token

    if (!tokenA || !tokenB) {
      throw new Error('Failed to sign in verification users')
    }

    const createTx = await fetch(`${url}/rest/v1/transactions`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        idempotency_key: `phase1-rls-${timestamp}`,
        organization_id: orgAId,
        amount: 1000,
        currency: 'USD',
        transaction_type: 'wire',
        status: 'pending'
      })
    })

    const createTxBody = await createTx.text()
    let createTxData
    try {
      createTxData = JSON.parse(createTxBody)
    } catch {
      createTxData = createTxBody
    }

    if (createTx.status >= 400) {
      throw new Error(`Failed to insert verification transaction: ${JSON.stringify(createTxData)}`)
    }

    const txId = createTxData?.[0]?.id
    if (!txId) {
      throw new Error('Verification transaction id missing')
    }

    const crossRead = await fetch(
      `${url}/rest/v1/transactions?select=id&id=eq.${txId}`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${tokenB}`
        }
      }
    )

    const crossReadBody = await crossRead.text()
    let crossReadData
    try {
      crossReadData = JSON.parse(crossReadBody)
    } catch {
      crossReadData = crossReadBody
    }

    if (!Array.isArray(crossReadData) || crossReadData.length !== 0) {
      throw new Error(`Cross-org read unexpectedly succeeded: ${JSON.stringify(crossReadData)}`)
    }

    console.log('RLS verification passed: org B cannot read org A transaction.')
  } finally {
    for (const userId of cleanup) {
      await fetch(`${url}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`
        }
      })
    }

    for (const organizationId of cleanupOrgIds) {
      await fetch(`${url}/rest/v1/organizations?id=eq.${organizationId}`, {
        method: 'DELETE',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`
        }
      })
    }
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
