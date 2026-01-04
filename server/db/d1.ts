// Cloudflare D1 database client (REST API)
// D1 is the single source of truth for data storage

import { createTables } from '../../lib/db/schema.js'

const D1_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const D1_DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID
const D1_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN

const D1_ENDPOINT = D1_ACCOUNT_ID && D1_DATABASE_ID
  ? `https://api.cloudflare.com/client/v4/accounts/${D1_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`
  : ''

type D1StatementResult<T> = {
  results?: T[]
  success: boolean
  meta?: {
    changes?: number
    last_row_id?: number
    duration?: number
  }
}

type D1Response<T> = {
  success: boolean
  errors?: Array<{ message?: string }>
  result?: D1StatementResult<T>[]
}

function assertD1Config(): void {
  if (!D1_ACCOUNT_ID || !D1_DATABASE_ID || !D1_API_TOKEN) {
    throw new Error('D1 config missing: set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN')
  }
}

async function requestD1<T>(sql: string, params: unknown[] = []): Promise<D1StatementResult<T>> {
  assertD1Config()

  const response = await fetch(D1_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${D1_API_TOKEN}`,
    },
    body: JSON.stringify({ sql, params }),
  })

  const payload = (await response.json()) as D1Response<T>

  if (!response.ok || !payload.success) {
    const message = payload.errors?.[0]?.message || response.statusText
    throw new Error(`D1 query failed: ${message}`)
  }

  const statement = payload.result?.[0]
  if (!statement || !statement.success) {
    throw new Error('D1 query did not execute successfully')
  }

  return statement
}

export async function d1Query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const statement = await requestD1<T>(sql, params)
  return statement.results ?? []
}

export async function d1Execute(sql: string, params: unknown[] = []): Promise<{
  meta: NonNullable<D1StatementResult<unknown>['meta']>
}> {
  const statement = await requestD1<unknown>(sql, params)
  return { meta: statement.meta ?? {} }
}

export async function initializeDatabase(): Promise<void> {
  assertD1Config()

  const statements = splitSqlStatements(createTables)
  for (const statement of statements) {
    await d1Execute(statement)
  }

  await ensureColumns()
  console.log('D1 initialized')
}

async function ensureColumns(): Promise<void> {
  const rows = await d1Query<{ name: string }>('PRAGMA table_info(food_spots)')
  const existing = new Set(rows.map(row => row.name))

  if (!existing.has('screenshot_urls')) {
    await d1Execute('ALTER TABLE food_spots ADD COLUMN screenshot_urls TEXT')
  }

  if (!existing.has('source_url')) {
    await d1Execute('ALTER TABLE food_spots ADD COLUMN source_url TEXT')
  }

  if (!existing.has('taste')) {
    await d1Execute('ALTER TABLE food_spots ADD COLUMN taste TEXT')
  }
}

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean)
}

export function closeDatabase(): void {
  // D1 is HTTP based, no local connection to close.
}

export default { d1Query, d1Execute, initializeDatabase }
