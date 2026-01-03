# GourmetLog (个人美食外脑)

记录你吃过的餐厅，支持文本/截图 AI 识别与自动地理编码，适合个人长期积累。

## 快速开始

```bash
bun install

# 前端
bun run dev

# 后端
bun run server:dev
```

## 配置说明（个人使用）

- 设置页可保存 API Key/模型/地图配置。
- 保存后会写入 `.env.local`，需要重启后端才能生效。
- 本地数据库默认路径：`./data/gourmetlog.db`

## 目录结构

```
app/                # Next.js App Router
components/         # React 组件
lib/                # 类型、API 客户端、工具
server/             # Bun API 服务
public/             # 静态资源（含 PWA 配置）
```

## 技术栈

- Next.js 14 + React 18 + TypeScript
- Tailwind CSS
- Bun + SQLite

## 许可

ISC
