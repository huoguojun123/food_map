// OpenAI API service for vision and text operations
// Uses fetch API directly for lightweight memory footprint

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o'
const OPENAI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || OPENAI_MODEL
const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL || OPENAI_MODEL
// Mock mode: when OPENAI_MOCK=1, skip network and return stub data
const OPENAI_MOCK = process.env.OPENAI_MOCK === '1'

// 默认 120s（第三方兼容网关通常更慢），支持通过环境变量调整
const API_TIMEOUT = Number(process.env.OPENAI_TIMEOUT_MS || '120000')
const MAX_RETRIES = 2

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '')
}

function extractJsonObjectString(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const candidate = (fenced ? fenced[1] : trimmed).trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    return candidate.slice(start, end + 1)
  }
  return candidate
}

function parseJsonFromAi<T>(raw: string): T {
  const jsonText = extractJsonObjectString(raw)
  return JSON.parse(jsonText) as T
}

async function readChatCompletionContent(res: Response): Promise<string> {
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/event-stream')) {
    return readChatCompletionContentFromSse(res)
  }

  const payload = (await res.json()) as any
  return payload?.choices?.[0]?.message?.content || ''
}

async function readChatCompletionContentFromSse(res: Response): Promise<string> {
  if (!res.body) {
    throw new Error('Empty response body')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let content = ''
  let eventLines: string[] = []
  let loggedFirstChunk = false
  let totalBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    if (value) {
      totalBytes += value.length
      if (!loggedFirstChunk) {
        loggedFirstChunk = true
        console.log('[AI] SSE first chunk', { bytes: value.length })
      }
    }

    buffer += decoder.decode(value, { stream: true })

    while (true) {
      const newlineIndex = buffer.indexOf('\n')
      if (newlineIndex === -1) {
        break
      }

      const rawLine = buffer.slice(0, newlineIndex)
      buffer = buffer.slice(newlineIndex + 1)

      const line = rawLine.replace(/\r$/, '')
      if (line.trim() === '') {
        const data = eventLines.join('\n').trim()
        eventLines = []

        if (!data) {
          continue
        }

        if (data === '[DONE]') {
          await reader.cancel()
          return content
        }

        try {
          const parsed = JSON.parse(data) as any
          const delta = parsed?.choices?.[0]?.delta?.content
          const message = parsed?.choices?.[0]?.message?.content
          if (typeof delta === 'string') {
            content += delta
          } else if (typeof message === 'string') {
            content += message
          }
        } catch {
          // ignore malformed chunks
        }
        continue
      }

      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) {
        continue
      }
      const dataPart = trimmed.slice(5).trim()
      if (!dataPart) {
        continue
      }

      if (dataPart === '[DONE]') {
        await reader.cancel()
        return content
      }

      try {
        const parsed = JSON.parse(dataPart) as any
        const delta = parsed?.choices?.[0]?.delta?.content
        const message = parsed?.choices?.[0]?.message?.content
        if (typeof delta === 'string') {
          content += delta
        } else if (typeof message === 'string') {
          content += message
        }
      } catch {
        // 多行 JSON（非标准）时，先累计，遇到空行再一起解析
        eventLines.push(dataPart)
      }
    }
  }

  buffer += decoder.decode()

  const tailData = eventLines.join('\n').trim()
  if (tailData) {
    try {
      const parsed = JSON.parse(tailData) as any
      const delta = parsed?.choices?.[0]?.delta?.content
      const message = parsed?.choices?.[0]?.message?.content
      if (typeof delta === 'string') {
        content += delta
      } else if (typeof message === 'string') {
        content += message
      }
    } catch {
      // ignore
    }
  }

  return content
}

async function requestChatCompletion(params: {
  messages: any[]
  max_tokens: number
  model?: string
}): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const baseUrl = normalizeBaseUrl(OPENAI_BASE_URL)
    const endpoint = `${baseUrl}/chat/completions`
    const startedAt = Date.now()
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: params.model || OPENAI_MODEL,
        messages: params.messages,
        max_tokens: params.max_tokens,
        stream: true,
        temperature: 0,
      }),
      signal: controller.signal,
    })

    console.log('[AI] chat/completions response', {
      status: res.status,
      contentType: res.headers.get('content-type'),
      durationMs: Date.now() - startedAt,
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`OpenAI API error: ${res.status} - ${errorText}`)
    }

    return await readChatCompletionContent(res)
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`AI request timeout after ${API_TIMEOUT}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (error instanceof Error && /timeout/i.test(error.message)) {
        throw error
      }
      if (i === retries) throw error

      const delay = Math.pow(2, i) * 1000
      console.warn(`Retry ${i + 1}/${retries} after ${delay}ms`, error)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Max retries exceeded')
}

const IMAGE_SYSTEM_PROMPT = `
你是美食信息提取助手。请从图片中提取餐厅信息，只返回 JSON：
{
  "name": "餐厅名称",
  "address_text": "尽量完整的地址文本（缺失写空）",
  "taste": "口味/风格短语（如麻辣鲜香/清淡/炭烤/奶香），无法判断用“风格未知”",
  "summary": "最多24字，包含口味关键词，补充1个细节（口感/环境/招牌）"
}

要求：
- 优先识别店名与地址，避免遗漏
- 若图片中出现明显口味/口感词（麻辣/香辣/清淡/咸鲜/甜辣/酸辣/浓郁/酥脆等），请提取为 taste
- 若未明确口味，也要根据菜系/店名推断口味风格
- summary 必须 ≤24 字
- summary 必须包含 taste（若 taste 为“风格未知”，summary 也要包含该词）
 - summary 不要包含地址
只返回 JSON，不要输出其它文字。
`

const TEXT_SYSTEM_PROMPT = `
你是美食信息解析助手。请从文本中提取餐厅信息，只返回 JSON：
{
  "name": "餐厅名称",
  "address_text": "尽量完整的地址文本（缺失写空）",
  "taste": "口味/风格短语（如麻辣鲜香/清淡/炭烤/奶香），无法判断用“风格未知”",
  "summary": "最多24字，包含口味关键词，补充1个细节（口感/环境/招牌）"
}

要求：
- 优先识别店名与地址，避免遗漏
- 若文本中明确给出“口味/风格/推荐/特色”等描述（如 麻辣鲜香/清淡/咸鲜/甜辣/酸辣/浓郁/酥脆），请优先提取为 taste
- 若未明确口味，也要根据菜系/店名推断口味风格
- summary 必须 ≤24 字
- summary 必须包含 taste（若 taste 为“风格未知”，summary 也要包含该词）
 - summary 不要包含地址
只返回 JSON，不要输出其它文字。
`

const SUMMARY_SYSTEM_PROMPT = `
你是美食记录整理助手。必须基于店名/菜系/文本线索推断口味风格与简短点评。
仅返回 JSON，格式：
{
  "taste": "口味/风格，短语",
  "summary": "最多24字的简短描述，必须包含口味关键词"
}

要求：
- 如果提供了口味，就保持该口味，不要改写。
- 如果未给出口味，也需要基于店名/菜系推断口味风格（例如：火锅=麻辣鲜香、日料=清爽鲜甜、烧烤=炭烤香辣、甜品=甜香浓郁）。
- 只有在完全无法判断时才使用“风格未知”。
- summary 必须包含 taste，且有1个细节（口感/环境/招牌/性价比），不要包含地址。
`

export async function extractFromImage(base64Image: string): Promise<AiExtractionResult> {
  if (OPENAI_MOCK) {
    return {
      name: 'Mock餐厅',
      address_text: 'Mock地址',
      taste: '麻辣鲜香',
      price: 99,
      rating: 4.5,
      dishes: ['招牌菜'],
      summary: 'Mock摘要',
    }
  }
  console.log('[AI] extractFromImage start', {
    model: OPENAI_VISION_MODEL,
    base: OPENAI_BASE_URL,
    timeout: API_TIMEOUT,
    imageBytes: base64Image?.length,
  })

  const content = await retryWithBackoff(async () =>
    requestChatCompletion({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: IMAGE_SYSTEM_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 512,
      model: OPENAI_VISION_MODEL,
    })
  )
  if (!content) {
    throw new Error('No content returned from AI')
  }

  try {
    const result = parseJsonFromAi<AiExtractionResult>(content)
    console.log('Image extraction successful:', result.summary)
    return result
  } catch (error) {
    console.error('Failed to parse AI response:', content)
    throw new Error('Failed to parse AI response as JSON')
  }
}

export async function extractFromText(text: string): Promise<AiExtractionResult> {
  if (OPENAI_MOCK) {
    return {
      name: 'Mock餐厅',
      address_text: 'Mock地址',
      taste: '清淡',
      price: 50,
      rating: 4.0,
      dishes: ['Mock菜'],
      summary: 'Mock文本摘要',
    }
  }
  console.log('[AI] extractFromText start', {
    model: OPENAI_TEXT_MODEL,
    base: OPENAI_BASE_URL,
    timeout: API_TIMEOUT,
    textLength: text?.length,
  })

  const content = await retryWithBackoff(async () =>
    requestChatCompletion({
      messages: [
        { role: 'system', content: TEXT_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      max_tokens: 256,
      model: OPENAI_TEXT_MODEL,
    })
  )
  if (!content) {
    throw new Error('No content returned from AI')
  }

  try {
    const result = parseJsonFromAi<AiExtractionResult>(content)
    console.log('Text extraction successful:', result.summary)
    return result
  } catch (error) {
    console.error('Failed to parse AI response:', content)
    throw new Error('Failed to parse AI response as JSON')
  }
}

export async function generateTasteSummary(input: {
  name: string
  address_text?: string
  city?: string
  taste?: string
  summary?: string
  original_share_text?: string
  source_url?: string
}): Promise<{ taste: string; summary: string }> {
  if (OPENAI_MOCK) {
    return { taste: input.taste || '风格未知', summary: 'Mock简短描述' }
  }
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  const promptLines = [
    `店名：${input.name}`,
    input.address_text ? `地址：${input.address_text}` : '',
    input.city ? `城市：${input.city}` : '',
    input.taste ? `口味：${input.taste}` : '',
    input.summary ? `已有描述：${input.summary}` : '',
    input.original_share_text ? `分享文本：${input.original_share_text}` : '',
    input.source_url ? `链接：${input.source_url}` : '',
  ].filter(Boolean)

  const content = await retryWithBackoff(async () =>
    requestChatCompletion({
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: promptLines.join('\n') },
      ],
      max_tokens: 200,
      model: OPENAI_TEXT_MODEL,
    })
  )
  if (!content) {
    throw new Error('No content returned from AI')
  }

  try {
    const result = parseJsonFromAi<{ taste?: unknown; summary?: unknown }>(content)
    return {
      taste: typeof result.taste === 'string' ? result.taste.trim() : '风格未知',
      summary: typeof result.summary === 'string' ? result.summary.trim() : '',
    }
  } catch (error) {
    console.error('Failed to parse AI summary response:', content)
    throw new Error('Failed to parse AI response as JSON')
  }
}

export async function generatePlan(input: {
  intent: string
  spots: Array<{
    id: number
    name: string
    address_text?: string
    taste?: string
    summary?: string
    distance_km?: number
  }>
}): Promise<{ title: string; summary: string; order?: number[] }> {
  if (OPENAI_MOCK) {
    return {
      title: 'Mock 旅途计划',
      summary: 'Mock 计划说明',
      order: input.spots.map(spot => spot.id),
    }
  }

  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  const spotLines = input.spots.map(spot =>
    `#${spot.id} ${spot.name} | ${spot.taste || '口味未知'} | ${
      spot.summary || '无描述'
    }${typeof spot.distance_km === 'number' ? ` | 距离约${spot.distance_km.toFixed(1)}km` : ''}`
  )

  const prompt = `
你是旅途规划助手，请根据用户需求与餐厅列表输出 JSON：
{
  "title": "计划标题（20字以内）",
  "summary": "计划说明（60字以内）",
  "order": [按推荐顺序的餐厅id数组]
}

要求：
- 计划标题必须简洁清楚，突出需求场景。
- 计划说明包含“口味/氛围/动线”至少两点，并优先考虑距离更近的餐厅。
- order 必须是输入的餐厅 id 子集（可以全部）。

用户需求：${input.intent || '未提供'}

餐厅列表：
${spotLines.join('\n')}
`

  const content = await retryWithBackoff(async () =>
    requestChatCompletion({
      messages: [
        { role: 'system', content: '只返回 JSON，不要输出其它文字。' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      model: OPENAI_TEXT_MODEL,
    })
  )

  if (!content) {
    throw new Error('No content returned from AI')
  }

  try {
    const result = parseJsonFromAi<{ title?: unknown; summary?: unknown; order?: unknown }>(content)
    const title = typeof result.title === 'string' ? result.title.trim() : '旅途规划'
    const summary = typeof result.summary === 'string' ? result.summary.trim() : ''
    const order = Array.isArray(result.order)
      ? result.order.filter(value => Number.isFinite(Number(value))).map(value => Number(value))
      : undefined
    return { title, summary, order }
  } catch (error) {
    console.error('Failed to parse AI plan response:', content)
    throw new Error('Failed to parse AI response as JSON')
  }
}

export default { extractFromImage, extractFromText, generateTasteSummary, generatePlan }

type AiExtractionResult = {
  name: string
  address_text?: string
  taste?: string
  price?: number
  rating?: number
  dishes?: string[]
  vibe?: string
  summary: string
}
