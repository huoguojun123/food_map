// OpenAI API service for vision and text operations
// Uses fetch API directly for lightweight memory footprint

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

const API_TIMEOUT = 10000
const MAX_RETRIES = 2

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === retries) throw error

      const delay = Math.pow(2, i) * 1000
      console.warn(`⚠️ Retry ${i + 1}/${retries} after ${delay}ms`, error)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Max retries exceeded')
}

const IMAGE_SYSTEM_PROMPT = `
你是一个专业的美食信息提取助手。请从图片中提取餐厅信息，以 JSON 格式返回。
必须提取字段：
- name: 餐厅名称（必填）
- address_text: 地址文本（可选）
- price: 人均价格（可选，整数）
- rating: 评分（可选，1-5 之间小数）
- dishes: 推荐菜品列表（可选，字符串数组）
- vibe: 氛围描述（可选，短文本）
- summary: AI 生成总结，最多 20 字，简洁有观点

示例：
{
  "name": "蜀大侠火锅",
  "address_text": "北京市朝阳区三里屯路19号",
  "price": 150,
  "rating": 4.5,
  "dishes": ["麻辣牛肉", "冰粉"],
  "vibe": "热闹，排队长",
  "summary": "排队两小时，值不值？"
}

只返回 JSON，不要输出解释文字。
`

const TEXT_SYSTEM_PROMPT = `
你是一个专业的美食信息解析助手。请从分享文本中提取餐厅信息，以 JSON 格式返回。
必须提取字段：
- name: 餐厅名称（必填）
- address_text: 地址文本（可选）
- price: 人均价格（可选，整数）
- rating: 评分（可选，1-5 之间小数）
- dishes: 提到的菜品（可选，字符串数组）
- vibe: 氛围或体验（可选）
- summary: AI 生成总结，最多 20 字，简洁有观点

只返回 JSON，不要输出解释文字。
`

export async function extractFromImage(base64Image: string): Promise<AiExtractionResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  console.log('👁️ Extracting info from image...')

  const response = await retryWithBackoff(async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
      const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
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
          max_tokens: 1000,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`OpenAI API error: ${res.status} - ${errorText}`)
      }

      return await res.json()
    } catch (error: unknown) {
      clearTimeout(timeoutId)
      throw error
    }
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No content returned from AI')
  }

  try {
    const result = JSON.parse(content.trim())
    console.log('✅ Image extraction successful:', result.summary)
    return result
  } catch (error) {
    console.error('Failed to parse AI response:', content)
    throw new Error('Failed to parse AI response as JSON')
  }
}

export async function extractFromText(text: string): Promise<AiExtractionResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  console.log('📝 Extracting info from text...')

  const response = await retryWithBackoff(async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
      const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: TEXT_SYSTEM_PROMPT },
            { role: 'user', content: text },
          ],
          max_tokens: 500,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`OpenAI API error: ${res.status} - ${errorText}`)
      }

      return await res.json()
    } catch (error: unknown) {
      clearTimeout(timeoutId)
      throw error
    }
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No content returned from AI')
  }

  try {
    const result = JSON.parse(content.trim())
    console.log('✅ Text extraction successful:', result.summary)
    return result
  } catch (error) {
    console.error('Failed to parse AI response:', content)
    throw new Error('Failed to parse AI response as JSON')
  }
}

export default { extractFromImage, extractFromText }

type AiExtractionResult = {
  name: string
  address_text?: string
  price?: number
  rating?: number
  dishes?: string[]
  vibe?: string
  summary: string
}
