// AI API endpoints
// Handles AI extraction from images and text

import { extractFromImage, extractFromText, generatePlan } from '../services/openai.js';

/**
 * Handle POST /api/ai/extract - Extract restaurant info
 */
export async function handleAiExtract(req: Request): Promise<Response> {
  let body: any = null

  try {
    body = await req.json();
    console.log('[AI] /api/ai/extract start', {
      type: body?.type,
      textLength: typeof body?.text === 'string' ? body.text.length : undefined,
      url: body?.url,
      imageBytes: typeof body?.image === 'string' ? body.image.length : undefined,
      baseUrl: process.env.OPENAI_BASE_URL,
      model: process.env.OPENAI_MODEL,
      timeoutMs: process.env.OPENAI_TIMEOUT_MS,
    })

    // Validate request body
    if (!body.type || (body.type !== 'image' && body.type !== 'text' && body.type !== 'url')) {
      return Response.json(
        { error: 'Invalid type, must be "image", "text" or "url"' },
        { status: 400 }
      );
    }

    // Handle image extraction
    if (body.type === 'image') {
      if (!body.image) {
        return Response.json(
          { error: 'Image data is required for image type' },
          { status: 400 }
        );
      }

      const result = await extractFromImage(body.image);
      const merged = applyExtractionFallback(result, undefined);
      console.log('[AI] /api/ai/extract image done')
      return Response.json({
        success: true,
        data: merged,
      });
    }

    // Handle text extraction
    if (body.type === 'text') {
      if (!body.text) {
        return Response.json(
          { error: 'Text data is required for text type' },
          { status: 400 }
        );
      }

      const { nameHint, addressHint } = parseShareText(body.text);
      const hintPrefix =
        nameHint || addressHint
          ? `已解析信息：${nameHint ? `店名=${nameHint}` : ''}${nameHint && addressHint ? '；' : ''}${
              addressHint ? `地址=${addressHint}` : ''
            }\n`
          : '';
      const enrichedText = `${hintPrefix}${body.text}`;
      const result = await extractFromText(enrichedText);
      const merged = applyExtractionFallback(result, body.text);
      console.log('[AI] /api/ai/extract text done')
      return Response.json({
        success: true,
        data: merged,
      });
    }

    // Handle URL extraction
    if (body.type === 'url') {
      if (!body.url || typeof body.url !== 'string') {
        return Response.json(
          { error: 'URL is required for url type' },
          { status: 400 }
        );
      }

      const normalizedUrl = normalizeUrl(body.url);
      if (!normalizedUrl) {
        return Response.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }

      if (!isSafeUrl(normalizedUrl)) {
        return Response.json(
          { error: 'URL is not allowed' },
          { status: 400 }
        );
      }

      const pageText = await fetchPageText(normalizedUrl);
      const result = await extractFromText(pageText);
      return Response.json({
        success: true,
        data: result,
      });
    }

    // Should not reach here
    return Response.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const debug = {
      type: body?.type,
      textLength: typeof body?.text === 'string' ? body.text.length : undefined,
      url: body?.url,
      imageBytes: typeof body?.image === 'string' ? body.image.length : undefined,
    }
    console.error('Error in AI extract:', { error, debug });

    // Return user-friendly error message
    const errorMessage =
      error instanceof Error ? error.message : 'AI extraction failed';

    return Response.json(
      {
        success: false,
        data: null,
        error: errorMessage,
        debug,
      },
      { status: 500 }
    );
  }
}

export async function handleAiPlan(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as {
      intent?: string
      spots?: Array<{
        id: number
        name: string
        address_text?: string
        taste?: string
        summary?: string
        distance_km?: number
      }>
    }

    const intent = typeof body.intent === 'string' ? body.intent.trim() : ''
    const spots = Array.isArray(body.spots) ? body.spots : []
    if (spots.length === 0) {
      return Response.json({ error: 'spots is required' }, { status: 400 })
    }

    const cleaned = spots
      .filter(spot => spot && typeof spot.id === 'number' && typeof spot.name === 'string')
      .map(spot => ({
        id: spot.id,
        name: spot.name.trim(),
        address_text: spot.address_text,
        taste: spot.taste,
        summary: spot.summary,
        distance_km: typeof spot.distance_km === 'number' ? spot.distance_km : undefined,
      }))

    const plan = await generatePlan({ intent, spots: cleaned })
    return Response.json(plan)
  } catch (error: unknown) {
    console.error('Error in AI plan:', error)
    const errorMessage = error instanceof Error ? error.message : 'AI planning failed'
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}

function normalizeUrl(value: string): string | null {
  try {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const url = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? new URL(trimmed)
      : new URL(`https://${trimmed}`);
    return url.toString();
  } catch {
    return null;
  }
}

function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.local')) {
      return false;
    }
    if (isPrivateIp(hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isPrivateIp(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4) {
    return false;
  }
  const octets = parts.map(part => Number(part));
  if (octets.some(value => Number.isNaN(value))) {
    return false;
  }
  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

async function fetchPageText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'GourmetLogBot/1.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();
  const clipped = html.slice(0, 20000);
  return extractPlainText(clipped);
}

function extractPlainText(html: string): string {
  const scriptPattern = new RegExp('<script[^>]*>[\\s\\S]*?<\\/script>', 'gi')
  const stylePattern = new RegExp('<style[^>]*>[\\s\\S]*?<\\/style>', 'gi')
  const tagPattern = new RegExp('<[^>]+>', 'g')
  const spacePattern = new RegExp('\\s+', 'g')

  const withoutScripts = html.replace(scriptPattern, ' ').replace(stylePattern, ' ')
  const withoutTags = withoutScripts.replace(tagPattern, ' ')
  return withoutTags.replace(spacePattern, ' ').trim().slice(0, 4000)
}

function parseShareText(text: string): { nameHint?: string; addressHint?: string } {
  if (!text || typeof text !== 'string') {
    return {};
  }
  const nameMatch = text.match(/【([^】]+)】/);
  const addressMatch = text.match(/地址[:：]\s*([^】\n\r@]+?)(?=】|@|电话|$)/);
  const nameHint = nameMatch ? nameMatch[1].trim() : undefined;
  const addressHint = addressMatch ? addressMatch[1].trim() : undefined;
  return { nameHint, addressHint };
}

function applyExtractionFallback(
  result: { name: string; address_text?: string; taste?: string; summary?: string },
  rawText?: string
): { name: string; address_text?: string; taste?: string; summary?: string } {
  const { nameHint, addressHint } = rawText ? parseShareText(rawText) : {};
  const name = result.name?.trim() || nameHint || '';
  const address_text = result.address_text?.trim() || addressHint || '';
  const taste =
    normalizeTaste(result.taste) ||
    inferTasteFromName(name) ||
    inferTasteFromText(rawText) ||
    '风格未知';
  const summary = ensureSummaryQuality(result.summary || '', taste, name, rawText);
  return { ...result, name, address_text, taste, summary };
}

function normalizeTaste(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === '风格未知' || trimmed === '未知') return null;
  return trimmed.length > 32 ? trimmed.slice(0, 32) : trimmed;
}

function inferTasteFromName(name: string): string | null {
  const keywords: Array<{ match: RegExp; taste: string }> = [
    { match: /(火锅|冒菜|串串|麻辣烫)/, taste: '麻辣鲜香（重辣）' },
    { match: /(烧烤|烤串|烤肉|烤鱼)/, taste: '炭烤香辣' },
    { match: /(羊肉|羊肉煲|砂锅|煲)/, taste: '咸香浓郁（微辣）' },
    { match: /(牛排|西餐|意面|披萨)/, taste: '奶香浓郁' },
    { match: /(日料|寿司|刺身|拉面)/, taste: '清爽鲜甜' },
    { match: /(粤菜|早茶|点心|港式)/, taste: '清淡鲜香' },
    { match: /(湘菜|川菜|麻辣|辣子)/, taste: '麻辣鲜香（重辣）' },
    { match: /(甜品|烘焙|蛋糕|奶茶|糖水)/, taste: '甜香浓郁' },
    { match: /(咖啡|咖啡馆)/, taste: '醇香微苦' },
    { match: /(小龙虾|虾|蟹煲|海鲜)/, taste: '鲜香浓郁' },
    { match: /(牛肉|羊肉|烤羊|炖)/, taste: '浓郁醇香' },
    { match: /(面馆|米线|粉|饺子|包子)/, taste: '鲜香暖胃' },
    { match: /(韩餐|韩式|部队锅|炸鸡)/, taste: '甜辣浓郁' },
    { match: /(东南亚|泰式|越南|咖喱)/, taste: '酸辣香浓' },
    { match: /(粤式烧腊|烧腊)/, taste: '咸香油润' },
  ];

  for (const rule of keywords) {
    if (rule.match.test(name)) {
      return rule.taste;
    }
  }
  return null;
}

function inferTasteFromText(text?: string): string | null {
  if (!text) return null;
  const tasteHints: Array<{ match: RegExp; taste: string }> = [
    { match: /(爆辣|重辣|特辣|超辣)/, taste: '麻辣鲜香（重辣）' },
    { match: /(麻辣|香辣|辣子)/, taste: '麻辣鲜香（中辣）' },
    { match: /(微辣|微麻)/, taste: '麻辣鲜香（微辣）' },
    { match: /(清淡|清爽|微甜|不腻|低脂|少油)/, taste: '清爽清淡（不辣）' },
    { match: /(咸鲜|鲜甜|鲜香|海味)/, taste: '咸鲜清爽' },
    { match: /(酥脆|外脆内嫩|焦香)/, taste: '焦香酥脆' },
    { match: /(浓郁|厚重|重口)/, taste: '浓郁醇香' },
    { match: /(酸辣|酸爽)/, taste: '酸辣开胃（中辣）' },
    { match: /(甜辣|蜜汁)/, taste: '甜辣浓郁' },
    { match: /(奶香|芝士|黄油)/, taste: '奶香浓郁' },
  ];
  for (const hint of tasteHints) {
    if (hint.match.test(text)) return hint.taste;
  }
  return null;
}

function inferDetailFromText(text?: string): string | null {
  if (!text) return null;
  const detailHints: Array<{ match: RegExp; detail: string }> = [
    { match: /(必点|招牌|推荐)/, detail: '招牌值得点' },
    { match: /(分量|超大份|量足)/, detail: '分量很足' },
    { match: /(排队|人多|等位)/, detail: '人气很高' },
    { match: /(性价比|划算|实惠)/, detail: '性价比高' },
    { match: /(环境|装修|氛围)/, detail: '环境舒适' },
    { match: /(服务|态度)/, detail: '服务在线' },
    { match: /(油而不腻|不油腻|清爽)/, detail: '口感不腻' },
  ];
  for (const hint of detailHints) {
    if (hint.match.test(text)) return hint.detail;
  }
  return null;
}

function buildFallbackSummary(taste: string, name: string, detail?: string | null): string {
  const base = taste && taste !== '风格未知' ? taste : '风格未知';
  const extra = detail ? `，${detail}` : '';
  if (/火锅|冒菜|串串|麻辣烫/.test(name)) return `${base}，热乎解馋`.slice(0, 24);
  if (/烧烤|烤串|烤肉|烤鱼/.test(name)) return `${base}，烤香浓郁`.slice(0, 24);
  if (/日料|寿司|刺身/.test(name)) return `${base}，食材新鲜`.slice(0, 24);
  if (/甜品|烘焙|蛋糕|奶茶/.test(name)) return `${base}，甜度适中`.slice(0, 24);
  if (/咖啡/.test(name)) return `${base}，适合小坐`.slice(0, 24);
  if (/面馆|米线|粉/.test(name)) return `${base}，口感扎实`.slice(0, 24);
  if (detail) return `${base}${extra}`.slice(0, 24);
  return `${base}，值得一试`;
}

function ensureSummaryQuality(
  summary: string,
  taste: string,
  name: string,
  text?: string
): string {
  const normalized = summary.trim();
  const hasTaste = normalized.includes(taste);
  const tooShort = normalized.length < 6;
  const tooGeneric = /值得一试|推荐尝试|风格未知/.test(normalized);
  if (normalized && hasTaste && !tooShort && !tooGeneric) {
    return normalized;
  }
  const detail = inferDetailFromText(text);
  return buildFallbackSummary(taste, name, detail);
}
