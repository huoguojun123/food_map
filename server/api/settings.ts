// Settings API endpoint
// Persists config into .env.local for personal use

type SettingsPayload = {
  aiKey?: string
  aiBaseUrl?: string
  aiModel?: string
  amapKey?: string
}

type SettingsTestResult = {
  ok: boolean
  message: string
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

export async function handleSettingsTest(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as SettingsPayload
    const effective = {
      aiKey: body.aiKey || process.env.OPENAI_API_KEY,
      aiBaseUrl: body.aiBaseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      aiModel: body.aiModel || process.env.OPENAI_MODEL || 'gpt-4o',
      amapKey: body.amapKey || process.env.AMAP_KEY,
    }

    const [aiResult, amapResult] = await Promise.all([
      testAiConnection(effective.aiKey, effective.aiBaseUrl, effective.aiModel),
      testAmapConnection(effective.amapKey),
    ])

    return Response.json({
      success: true,
      ai: aiResult,
      amap: amapResult,
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '测试失败',
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

async function testAiConnection(
  apiKey: string | undefined,
  baseUrl: string,
  model: string
): Promise<SettingsTestResult> {
  if (!apiKey) {
    return { ok: false, message: '未提供 AI Key' }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 6000)

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      return { ok: false, message: `AI 连接失败：${response.status} ${errorText}` }
    }

    return { ok: true, message: 'AI 连接正常' }
  } catch (error) {
    clearTimeout(timeoutId)
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'AI 连接失败',
    }
  }
}

async function testAmapConnection(amapKey: string | undefined): Promise<SettingsTestResult> {
  if (!amapKey) {
    return { ok: false, message: '未提供高德 Key' }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 6000)

  try {
    const params = new URLSearchParams({
      key: amapKey,
      address: '北京市',
    })
    const response = await fetch(`https://restapi.amap.com/v3/geocode/geo?${params.toString()}`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return { ok: false, message: `地图连接失败：${response.status}` }
    }

    const data = (await response.json()) as { status?: string; info?: string }
    if (data.status !== '1') {
      return { ok: false, message: `地图连接失败：${data.info || '未知错误'}` }
    }

    return { ok: true, message: '地图连接正常' }
  } catch (error) {
    clearTimeout(timeoutId)
    return {
      ok: false,
      message: error instanceof Error ? error.message : '地图连接失败',
    }
  }
}
