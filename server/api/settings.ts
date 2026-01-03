// Settings API endpoint
// Persists config into .env.local for personal use

type SettingsPayload = {
  aiKey?: string
  aiBaseUrl?: string
  aiModel?: string
  amapKey?: string
}

const ENV_PATH = '.env.local'

const KEY_MAP: Record<keyof SettingsPayload, string> = {
  aiKey: 'OPENAI_API_KEY',
  aiBaseUrl: 'OPENAI_BASE_URL',
  aiModel: 'OPENAI_MODEL',
  amapKey: 'AMAP_KEY',
}

type EnvEntry =
  | { type: 'comment' | 'blank'; raw: string }
  | { type: 'pair'; key: string; value: string }

export async function handleSettings(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }

    const body = (await req.json()) as SettingsPayload

    const updates: Record<string, string> = {}
    Object.entries(KEY_MAP).forEach(([payloadKey, envKey]) => {
      const value = body[payloadKey as keyof SettingsPayload]
      if (value !== undefined) {
        updates[envKey] = String(value)
      }
    })

    const fs = require('fs')
    const path = require('path')
    const envPath = path.resolve(process.cwd(), ENV_PATH)
    const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''
    const { entries, keyOrder } = parseEnv(content)

    for (const entry of entries) {
      if (entry.type === 'pair' && Object.prototype.hasOwnProperty.call(updates, entry.key)) {
        entry.value = updates[entry.key]
      }
    }

    const missingKeys = Object.keys(updates).filter(key => !keyOrder.has(key))
    for (const key of missingKeys) {
      entries.push({ type: 'pair', key, value: updates[key] })
    }

    const output = serializeEnv(entries)
    fs.writeFileSync(envPath, output, 'utf-8')

    return Response.json({
      success: true,
      message: '配置已保存到 .env.local，重启后端后生效',
      note: '前端配置仍保存在 localStorage（仅本机）',
    })
  } catch (error) {
    console.error('Error in settings API:', error)
    return Response.json(
      {
        error: error instanceof Error ? error.message : '操作失败',
        details: String(error),
      },
      { status: 500 }
    )
  }
}

function parseEnv(content: string): {
  entries: EnvEntry[]
  keyOrder: Set<string>
} {
  if (!content) {
    return { entries: [], keyOrder: new Set() }
  }

  const entries: EnvEntry[] = []
  const keyOrder = new Set<string>()

  content.split(/\r?\n/).forEach(line => {
    if (!line.trim()) {
      entries.push({ type: 'blank', raw: line })
      return
    }

    if (line.trim().startsWith('#')) {
      entries.push({ type: 'comment', raw: line })
      return
    }

    const match = line.match(/^([^=]+)=(.*)$/)
    if (!match) {
      entries.push({ type: 'comment', raw: line })
      return
    }

    const key = match[1].trim()
    const value = stripQuotes(match[2].trim())
    entries.push({ type: 'pair', key, value })
    keyOrder.add(key)
  })

  return { entries, keyOrder }
}

function serializeEnv(entries: EnvEntry[]): string {
  return entries
    .map(entry => {
      if (entry.type !== 'pair') {
        return entry.raw
      }
      const value = formatEnvValue(entry.value)
      return `${entry.key}=${value}`
    })
    .join('\n')
    .trimEnd()
    .concat('\n')
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function formatEnvValue(value: string): string {
  if (!value) {
    return ''
  }

  if (/[\s#]/.test(value)) {
    return JSON.stringify(value)
  }

  return value
}
