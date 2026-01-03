# Project Structure - GourmetLog

## Directory Organization

```
gourmetlog/
├── app/                          # Next.js App Router (前端)
│   ├── layout.tsx                 # 根布局（全局样式、Meta）
│   ├── page.tsx                   # 首页（时间线视图）
│   ├── globals.css                 # 全局样式（Tailwind）
│   │
│   ├── (routes)/                  # 路由组
│   │   ├── spots/                # 餐厅详情页
│   │   │   └── [id]/page.tsx
│   │   ├── collections/            # 收藏集管理
│   │   │   ├── page.tsx          # 列表
│   │   │   └── [id]/page.tsx    # 详情
│   │   └── settings/             # 设置页面
│   │       └── page.tsx
│   │
│   └── api/                     # API 路由（客户端调用）
│       └── health/route.ts        # 健康检查
│
├── components/                   # React 组件
│   ├── ui/                     # 基础 UI 组件（Shadcn/ui）
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   │
│   ├── layout/                  # 布局组件
│   │   ├── omnibar.tsx          # 底部输入栏
│   │   ├── header.tsx            # 顶部导航
│   │   └── container.tsx         # 容器
│   │
│   ├── features/                # 功能组件
│   │   ├── spot-card.tsx        # 餐厅卡片
│   │   ├── collection-card.tsx   # 收藏集卡片
│   │   ├── recommendation-card.tsx # 推荐卡片
│   │   └── image-upload.tsx      # 图片上传
│   │
│   └── forms/                  # 表单组件
│       ├── spot-form.tsx         # 餐厅录入表单
│       └── collection-form.tsx    # 收藏集表单
│
├── lib/                        # 共享工具和类型
│   ├── api/                    # API 客户端
│   │   ├── client.ts            # 统一 API 调用封装
│   │   ├── spots.ts            # 餐厅相关 API
│   │   ├── collections.ts       # 收藏集相关 API
│   │   └── ai.ts              # AI API 调用
│   │
│   ├── db/                     # 数据库工具（前端辅助）
│   │   └── schema.ts          # 数据库类型定义
│   │
│   ├── utils/                  # 工具函数
│   │   ├── geo.ts             # 地理计算（Bounding Box）
│   │   ├── format.ts          # 格式化工具
│   │   └── validation.ts      # 数据验证
│   │
│   └── types/                  # TypeScript 类型
│       ├── spot.ts
│       ├── collection.ts
│       └── api.ts
│
├── server/                     # Bun API 服务器（后端）
│   ├── index.ts                # 主服务器入口
│   ├── app.ts                 # Bun 应用实例
│   │
│   ├── api/                    # API 路由处理器
│   │   ├── spots.ts            # 餐厅 CRUD
│   │   ├── collections.ts       # 收藏集 CRUD
│   │   ├── ai.ts              # AI 调用（提取、推荐）
│   │   ├── geocode.ts         # 地理编码（高德）
│   │   └── upload.ts          # R2 文件上传
│   │
│   ├── db/                     # 数据库操作
│   │   ├── connection.ts       # SQLite 连接
│   │   ├── schema.sql          # 数据库建表脚本
│   │   └── queries.ts         # SQL 查询封装
│   │
│   ├── middleware/             # 中间件
│   │   ├── logger.ts          # 日志中间件
│   │   ├── error.ts           # 错误处理
│   │   └── cors.ts            # CORS 配置
│   │
│   └── services/               # 业务服务
│       ├── openai.ts          # OpenAI API 封装
│       ├── amap.ts            # 高德地图 API
│       └── r2.ts              # Cloudflare R2 操作
│
├── public/                     # 静态资源
│   ├── favicon.ico
│   ├── logo.svg
│   └── images/
│
├── data/                       # 数据文件（仅开发环境）
│   └── gourmetlog.db          # SQLite 数据库（开发用）
│
├── config/                     # 配置文件
│   ├── nginx.conf             # Nginx 配置示例
│   ├── ecosystem.config.cjs     # PM2 配置
│   └── next.config.ts         # Next.js 配置（根目录）
│
├── .spec-workflow/            # 规格文档系统
│   ├── steering/             # 项目指导文档
│   │   ├── product.md        # 产品愿景 ✓
│   │   ├── tech.md           # 技术架构 ✓
│   │   └── structure.md      # 代码结构 ✓
│   ├── templates/            # 规格模板
│   └── specs/               # 功能规格（开发中）
│
├── .env.example             # 环境变量示例
├── .gitignore               # Git 忽略配置
├── package.json             # 项目依赖
├── tsconfig.json            # TypeScript 配置
├── tailwind.config.ts       # Tailwind 配置
├── postcss.config.js        # PostCSS 配置
├── next.config.ts           # Next.js 配置
├── bun.lockb               # Bun 锁定文件
├── CLAUDE.md               # AI 开发指南
└── README.md               # 项目说明
```

## Naming Conventions

### Files
- **React 组件**: `PascalCase` (e.g., `SpotCard.tsx`, `Omnibar.tsx`)
- **API 路由**: `kebab-case` (e.g., `spots/route.ts`, `collections/route.ts`)
- **工具函数**: `kebab-case` (e.g., `geo.ts`, `format.ts`)
- **类型文件**: 与功能同名 (e.g., `spot.ts`, `collection.ts`)
- **配置文件**: 根据工具约定 (e.g., `tailwind.config.ts`, `nginx.conf`)

### Code
- **React 组件**: `PascalCase` (e.g., `SpotCard`, `Omnibar`)
- **React Hooks**: `useCamelCase` (e.g., `useSpots`, `useGeolocation`)
- **函数**: `camelCase` (e.g., `calculateDistance`, `formatAddress`)
- **常量**: `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`, `DEFAULT_RADIUS`)
- **类型/接口**: `PascalCase` (e.g., `Spot`, `Collection`, `ApiError`)
- **枚举**: `PascalCase` (e.g., `SpotType`, `AiModel`)

### Database
- **表名**: `snake_case` (e.g., `food_spots`, `collections`, `system_config`)
- **字段名**: `snake_case` (e.g., `spot_id`, `created_at`)
- **JSON 字段**: 如 `tags` 存储为 JSON 字符串

## Import Patterns

### Import Order
```typescript
// 1. External dependencies
import React from 'react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

// 2. Internal modules
import { Button } from '@/components/ui/button'
import { SpotCard } from '@/components/features/spot-card'
import { type Spot } from '@/lib/types/spot'

// 3. Relative imports
import { formatSummary } from './utils'

// 4. Style imports (if using CSS Modules)
import styles from './SpotCard.module.css'
```

### Module/Package Organization
- **绝对导入**: 从根目录使用 `@/*` 别名（在 `tsconfig.json` 中配置）
- **相对导入**: 仅在同级或下级文件中使用（如 `./utils`, `./types`）
- **跨层级导入**: 优先使用绝对导入 `@/lib/...`

#### tsconfig.json paths 配置
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## Code Structure Patterns

### File Organization (标准模板)
```typescript
// 1. Imports (按顺序分组）
import React from 'react'
import { type Spot } from '@/lib/types/spot'

// 2. Constants (如果使用）
const MAX_SUMMARY_LENGTH = 20

// 3. Type definitions (本地类型）
interface Props {
  spot: Spot
  onSelect?: (spot: Spot) => void
}

// 4. Component/Function definition
export function SpotCard({ spot, onSelect }: Props) {
  // 5. Hooks
  const [expanded, setExpanded] = useState(false)

  // 6. Event handlers
  const handleSelect = () => {
    onSelect?.(spot)
    setExpanded(true)
  }

  // 7. Helper functions (内部）
  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m`
    return `${(meters / 1000).toFixed(1)}km`
  }

  // 8. Render
  return (
    <div onClick={handleSelect}>
      {/* JSX */}
    </div>
  )
}
```

### Bun API Server 文件结构
```typescript
// server/api/spots.ts

// 1. Imports
import { type BunRequest } from 'bun'
import { db } from '../db/connection'
import { type Spot } from '../../lib/types/spot'

// 2. Constants
const MAX_LIMIT = 50

// 3. Validation functions
function validateSpot(data: any): data is Spot {
  // validation logic
  return true
}

// 4. Route handlers
export async function GET(req: BunRequest) {
  // implementation
}

export async function POST(req: BunRequest) {
  // implementation
}

export async function PUT(req: BunRequest) {
  // implementation
}

export async function DELETE(req: BunRequest) {
  // implementation
}
```

### File Organization Principles
1. **单一职责**: 每个文件只做一件事（如 `spot-card.tsx` 只负责渲染餐厅卡片）
2. **相关功能聚合**: 功能相关代码放在一起（如 `components/features/`）
3. **公共 API 显式**: 组件导出使用 `export { }` 明确导出内容
4. **实现细节隐藏**: 内部函数不导出，仅暴露公共接口

## Code Organization Principles

1. **Single Responsibility (单一职责)**: 每个文件/函数只负责一件事
2. **Modularity (模块化)**: 代码组织成可复用的模块
3. **Testability (可测试性)**: 结构化代码便于测试（纯函数优先）
4. **Consistency (一致性)**: 遵循代码库中建立的模式

### 具体原则
- **组件按功能分组**: 而非按类型分组
- **API 客户端统一封装**: 避免在组件中直接 `fetch`
- **错误处理集中化**: 在 `lib/api/client.ts` 中统一处理 API 错误
- **类型定义集中化**: 所有共享类型放在 `lib/types/`

## Module Boundaries

### 前后端分离
```
┌─────────────────────────────────────────┐
│        Frontend (Next.js)          │
│  - Components                    │
│  - API Client (lib/api/)          │
└────────────┬────────────────────────┘
             │ HTTP/REST (仅调用 /api)
             ↓
┌─────────────────────────────────────────┐
│        Backend (Bun)              │
│  - API Routes                    │
│  - Database Operations            │
│  - External API Calls            │
└─────────────────────────────────────────┘
```

### 边界规则
1. **前端不直接访问数据库**: 所有数据操作通过 API
2. **前端不直接调用外部 API**:
   - ❌ 直接调用 OpenAI API
   - ✅ 通过 `/api/ai/` 间接调用
3. **后端不依赖前端组件**: 后端独立运行，无需前端
4. **类型共享**: 通过 `lib/types/` 共享类型定义（前后端都使用）

### 公共 API vs 内部实现
- **公共 API**:
  - `components/ui/`: Shadcn/ui 基础组件
  - `lib/api/`: 前端 API 调用接口
  - `server/api/`: 后端 API 路由
- **内部实现**:
  - 组件内部函数、工具函数
  - 数据库查询细节

## Code Size Guidelines

### 文件大小
- **React 组件**: <300 行（超出则拆分）
- **API 路由**: <200 行（超出则拆分服务）
- **工具函数文件**: <200 行
- **类型文件**: <150 行

### 函数/方法大小
- **React 组件函数**: 主 render + 最多 3 个辅助函数
- **业务逻辑函数**: <50 行
- **工具函数**: <30 行

### 复杂度
- **嵌套深度**: 最多 3 层
- **函数参数**: 最多 4 个（超出则使用对象参数）
- **if/else 分支**: 最多 3 层

## API Client Structure

### 统一 API 调用封装
```typescript
// lib/api/client.ts
class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async get<T>(endpoint: string): Promise<T>
  async post<T>(endpoint: string, data: any): Promise<T>
  async put<T>(endpoint: string, data: any): Promise<T>
  async delete(endpoint: string): Promise<void>

  private async request<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<T>
}

// lib/api/spots.ts
const api = new ApiClient('/api')

export async function getSpots(filters?: SpotFilters): Promise<Spot[]> {
  return api.get<Spot[]>('/spots', { params: filters })
}

export async function createSpot(data: CreateSpotDto): Promise<Spot> {
  return api.post<Spot>('/spots', data)
}
```

## Code Organization by Layer

### 前端分层
```
Components (UI Layer)
    ↓ use hooks / event handlers
API Client (Service Layer)
    ↓ HTTP requests
Bun Server (API Layer)
    ↓ validation / business logic
Database (Data Layer)
```

### 示例流程
```typescript
// Component (features/spot-card.tsx)
export function SpotCard({ spot }: Props) {
  const { deleteSpot } = useSpots()  // Hook

  const handleDelete = async () => {
    await deleteSpot(spot.id)  // 调用 API Client
  }
}

// API Client (lib/api/spots.ts)
export async function deleteSpot(id: number): Promise<void> {
  await api.delete(`/spots/${id}`)  // HTTP DELETE
}

// Server API (server/api/spots.ts)
export async function DELETE(req: BunRequest) {
  const id = getRouteParam(req, 'id')

  // Business logic
  await db.delete('DELETE FROM food_spots WHERE id = ?', [id])

  return new Response(null, { status: 204 })
}
```

## Documentation Standards

### 代码注释
- **公共 API**: 必须有 JSDoc 注释
- **复杂逻辑**: 使用行内注释解释"为什么"而非"是什么"
- **TODO/FIXME**: 标记待办和已知问题

### 示例
```typescript
/**
 * 计算两点间距离（Haversine 公式）
 * @param lat1 - 起点纬度
 * @param lng1 - 起点经度
 * @param lat2 - 终点纬度
 * @param lng2 - 终点经度
 * @returns 距离（米）
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // 使用 Haversine 公式而非欧氏距离，因为地球是球体
  const R = 6371000 // 地球半径（米）
  // ... implementation
}

// TODO: 考虑地球椭球体模型，提高精度
// FIXME: 极地地区计算不准确
```

### README 规则
- **主要模块**: 应有 README 说明用途和使用方法
- **配置文件**: 注释解释每个配置项
- **环境变量**: `.env.example` 中详细说明

## File-Naming Quick Reference

| 类型 | 命名约定 | 示例 |
|------|----------|------|
| React 组件 | `PascalCase.tsx` | `SpotCard.tsx` |
| API 路由 | `kebab-case.ts` | `spots.ts` |
| 工具函数 | `kebab-case.ts` | `format.ts` |
| 类型文件 | `name.ts` | `spot.ts` |
| 常量文件 | `constants.ts` | `api.ts` |
| 配置文件 | 按工具约定 | `tailwind.config.ts` |
| 数据库脚本 | `schema.sql` | `schema.sql` |
```
