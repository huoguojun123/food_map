# Technology Stack - GourmetLog

## Project Type
**Web Application (静态前端 + 轻量后端 API)**

GourmetLog 是一个个人美食记录和推荐系统，采用静态化前端 + 轻量级后端 API 架构，旨在低资源环境（100MB 内存）下运行。

## Core Technologies

### Primary Language(s)
- **TypeScript**: 5.4+ (strict mode)
- **JavaScript/TS**: 主要开发语言，用于前端和后端

### Runtimes
- **Bun**: 1.0+ (轻量级 JavaScript 运行时，用于后端 API 服务器)
- **Node.js**: 用于前端构建（通过 Next.js）

### Key Dependencies/Libraries

#### 前端
- **Next.js 14.2+**: React 框架（Static Export 模式）
- **React 18.3+**: UI 库
- **Tailwind CSS 3.4+**: CSS 框架
- **Shadcn/ui**: Radix UI 组件库（Nuxt UI 风格）
- **Lucide React**: 图标库

#### 后端 (Bun)
- **Builtin**: Bun 内置的 HTTP 服务器
- **better-sqlite3**: SQLite 数据库驱动（或 bun:sqlite）
- **OpenAI SDK**: LLM API 客户端（或直接 fetch）

### Application Architecture
**客户端-服务器分离 + 静态导出**

```
┌─────────────────────────────────────────┐
│         Browser / Mobile App          │
│  (Static Next.js build + React)     │
└────────────┬────────────────────────┘
             │ HTTP/REST
             ↓
┌─────────────────────────────────────────┐
│      Nginx (Reverse Proxy)          │
│  /api → Bun Server                 │
│  / → Static Files                  │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│        Bun API Server                │
│  - Database Operations              │
│  - AI API Calls                  │
│  - Geocoding (AMap)             │
│  - R2 Upload                    │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│      SQLite / Cloudflare D1        │
│  - food_spots                   │
│  - collections                  │
│  - system_config                │
└─────────────────────────────────────────┘
```

### Data Storage

#### Primary Storage
**双模式支持**:
1. **本地 SQLite**: 推荐用于部署在 2H2C 服务器
   - 文件位置: `/var/www/food_map_api/data/gourmetlog.db`
   - 使用 `better-sqlite3` 或 `bun:sqlite`
   - 优势：零延迟，无额外成本

2. **Cloudflare D1** (可选): 云端 SQLite
   - 通过 REST API 访问
   - 优势：异地备份，易于扩展

#### Object Storage
- **Cloudflare R2**: 存储截图和美食照片
  - 与 S3 兼容的 API
  - 支持大文件上传
  - 设置 CORS 允许前端访问

#### Data Formats
- **JSON**: API 请求/响应、配置存储
- **SQLite**: 结构化数据存储
- **Base64**: 图片上传（临时）
- **TEXT/MD**: 用户笔记、AI 摘要

### External Integrations

#### APIs
- **OpenAI Compatible API**: AI 视觉识别和推理
  - 支持模型: GPT-4o, Claude 3.5 Sonnet, DeepSeek 等
  - 用户可配置 Base URL 和 API Key
  - 模式: Vision (图像解析) + Text (推荐推理)

- **高德地图 Web API**: 地理编码
  - 接口: Geocoding API v3
  - 用途: 地址文本 → 经纬度坐标
  - 备用: 百度地图 API

- **Cloudflare API** (可选):
  - R2: 对象存储操作
  - D1: 数据库 REST API

#### Protocols
- **HTTP/REST**: 主要通信协议
- **WebSocket**: 未来可能用于实时更新（暂不实现）

#### Authentication
- **API Keys**: AI 服务、地图服务
- **无用户认证**: 单人使用，无需登录系统
- **本地配置**: 所有敏感信息存储在服务器环境变量

### Monitoring & Dashboard Technologies
- **日志**: Bun 控制台日志 + PM2 日志
- **错误追踪**: 未来集成 Sentry（可选）
- **性能监控**: Nginx access logs

## Development Environment

### Build & Development Tools

#### Frontend
```bash
# 开发服务器
bun run dev          # Next.js dev server (localhost:3000)

# 构建静态文件
bun run build        # Next.js static export (out/ directory)

# 类型检查
bun run type-check    # TypeScript compiler check

# 代码检查
bun run lint          # ESLint
```

#### Backend
```bash
# 开发服务器（热重载）
bun run server:dev    # Bun with --watch

# 生产服务器
bun run server        # Bun API server (localhost:3001)
```

### Package Management
- **Bun**: 包管理器和运行时
  - 快速安装依赖
  - 统一前端和后端依赖

### Code Quality Tools
- **TypeScript**: 静态类型检查（strict mode）
- **ESLint**: 代码规范检查（Next.js preset）
- **Prettier** (可选): 代码格式化

### Testing Framework
- **暂未配置**: 初期优先功能实现
- **未来计划**: Vitest (单元测试) + Playwright (E2E 测试)

### Version Control & Collaboration
- **Git**: 版本控制
- **GitHub**: 代码托管
- **分支策略**: Trunk-based Development
  - `master`: 主分支，始终可部署
  - 功能直接提交到 `master`（单人项目）
  - 使用 git commits 作为功能记录

### Dashboard Development
- **无独立 Dashboard**: 应用本身即是 UI
- **热重载**: Next.js 开发模式支持
- **端口管理**:
  - 前端开发: localhost:3000
  - 后端开发: localhost:3001
  - 生产: Nginx + Bun (配置端口)

## Deployment & Distribution

### Target Platform(s)
- **生产环境**: 新加坡 2H2C 服务器
  - OS: Linux (Ubuntu/Debian)
  - 内存: 100MB 限制
  - 存储: 本地磁盘 + Cloudflare R2

### Distribution Method
- **自托管部署**: 通过 Git 同步到服务器
- **无 SaaS**: 完全私有化部署
- **开源准备**: 代码结构清晰，易于开源

### Installation Requirements

#### Server Prerequisites
```bash
# 安装 Bun
curl -fsSL https://bun.sh/install | bash

# 安装 Nginx
apt install nginx

# 安装 PM2
npm install -g pm2

# 克隆仓库
git clone https://github.com/huoguojun123/food_map.git
cd food_map

# 安装依赖
bun install

# 构建静态文件
bun run build
```

#### 配置步骤
1. **环境变量**: 复制 `.env.example` 到 `.env`，填写配置
2. **Nginx 配置**: 反向代理 `/api` 到 Bun 服务器
3. **启动服务**: `pm2 start ecosystem.config.cjs`

### Update Mechanism
- **Git Pull**: 更新代码
- **Bun Install**: 更新依赖
- **Build + Deploy**: 重新构建并部署

## Technical Requirements & Constraints

### Performance Requirements
- **前端响应**: <100ms (静态文件)
- **API 响应**:
  - AI 提取: <5秒
  - 推荐查询: <3秒
  - 数据库操作: <500ms
  - 地理编码: <2秒
- **内存占用**: ~100MB (Nginx + Bun + SQLite)
- **启动时间**: Bun 服务器 <2秒

### Compatibility Requirements

#### Platform Support
- **开发环境**:
  - Windows 11
  - macOS
  - Linux

- **生产环境**: Linux (Ubuntu 20.04+ / Debian 11+)

#### Browser Support
- **Chrome/Edge**: 90+
- **Safari**: 14+
- **Firefox**: 88+
- **Mobile**: iOS Safari 14+, Chrome Mobile

#### Dependency Versions
- **Bun**: 1.0+
- **Node.js**: 18+ (仅用于构建)
- **TypeScript**: 5.4+

### Standards Compliance
- **HTTP/1.1**: 标准 REST API
- **TLS 1.2+**: HTTPS 加密（生产环境）
- **OpenAI API Compatibility**: 标准 API 格式

### Security & Compliance
- **API Keys**: 存储在服务器环境变量，不暴露给客户端
- **CORS**: 严格配置 R2 跨域规则
- **SQL Injection**: 使用参数化查询
- **XSS**: React 默认转义，额外使用 DOMPurify（如需）
- **日志脱敏**: 不记录 API Key 和敏感信息

#### Threat Model
- **单人使用**: 无多人协作攻击面
- **外部 API**: 依赖第三方服务（OpenAI、高德、Cloudflare）
- **数据泄露风险**: 环境变量文件管理

### Scalability & Reliability

#### Expected Load
- **用户数**: 1 人
- **请求数**: 低频（个人使用）
- **数据量**: 预估 <10,000 条记录

#### Availability Requirements
- **目标**: 95% 可用性（个人使用，无 SLA）
- **故障恢复**: PM2 自动重启，Nginx 健康检查
- **备份**: 定期备份 SQLite 数据库

#### Growth Projections
- **数据增长**: 100-500 条记录/年
- **存储需求**: SQLite <100MB, R2 <1GB
- **性能需求**: 长期无需优化

## Technical Decisions & Rationale

### Decision Log

#### 1. Static Export + Bun Backend
**选择理由**:
- 100MB 内存限制，Next.js SSR 不可行
- Bun 比 Node.js 内存占用更低
- 静态文件由 Nginx 提供，性能最优

**替代方案**:
- ❌ Next.js Edge Runtime: Vercel 绑定，不适合自托管
- ❌ 纯 Bun + Elysia: 开发效率低，组件生态弱
- ❌ SvelteKit: 学习成本高

#### 2. SQLite vs Cloudflare D1
**选择**: 默认 SQLite，D1 作为可选

**理由**:
- 本地 SQLite 零延迟，适合单人使用
- D1 需要 API 调用，增加延迟
- SQLite 文件易于备份和迁移

#### 3. No Vector Database
**选择**: 不使用向量数据库，全量数据投喂

**理由**:
- 数据量小（<10,000 条），向量查询不划算
- LLM 长上下文窗口支持足够（GPT-4o: 128K tokens）
- 保持逻辑透明，易于调试
- 减少技术栈复杂度

#### 4. Bounding Box 地理筛选
**选择**: SQLite 范围查询 + LLM 推荐

**理由**:
- 轻量级，无需 GIS 扩展
- 预筛选减少数据量，优化 LLM 调用
- 适合"附近 10km"这种粗粒度查询

**公式**:
```sql
-- 简化版（不考虑地球曲率，10km 范围内误差可接受）
WHERE lat BETWEEN ? AND ?
  AND lng BETWEEN ? AND ?
```

#### 5. Next.js Static Export
**选择**: 静态导出而非 SSG/SSR

**理由**:
- 零运行时内存（前端）
- Nginx 直接提供静态文件
- 适合低资源服务器
- SEO 非关键（单人使用）

#### 6. Tailwind CSS + Shadcn/ui
**选择理由**:
- Tailwind: 快速样式开发，无额外运行时
- Shadcn/ui: 高质量组件，基于 Radix（可访问性）
- 无需额外 CSS 文件

#### 7. OpenAI API Compatible
**选择**: 支持任意 OpenAI 兼容 API

**理由**:
- 用户可自选模型（GPT-4o, Claude, DeepSeek）
- 灵活切换，避免厂商锁定
- 标准化接口，易于维护

## Known Limitations

### 当前限制
1. **单用户架构**:
   - 影响: 无法支持多人协作
   - 解决方案: 未来可添加用户表和认证系统

2. **无实时更新**:
   - 影响: 需要手动刷新页面查看最新数据
   - 解决方案: 未来可添加 WebSocket 或 Server-Sent Events

3. **地理编码依赖**:
   - 影响: 高德 API Key 失效或限流时无法新增记录
   - 解决方案: 用户可手动输入经纬度

4. **AI 调用成本**:
   - 影响: 频繁使用会产生 API 费用
   - 解决方案: 添加使用统计和费用预估

5. **无测试覆盖**:
   - 影响: 重构和优化风险较高
   - 解决方案: 添加 Vitest 单元测试

### 技术债务
1. **前端 fetch API 直接调用**:
   - 当前: 组件中直接调用 `/api/*`
   - 未来: 封装 API Client 类，统一错误处理

2. **无日志系统**:
   - 当前: 仅 console.log
   - 未来: 集成 Winston 或 Pino

3. **无错误追踪**:
   - 当前: 无线上错误监控
   - 未来: 集成 Sentry

4. **类型定义不完整**:
   - 当前: 部分 API 响应使用 `any`
   - 未来: 完善 TypeScript 类型

### 何时解决
- **短期 (1-2 个月)**: 添加单元测试、API Client 封装
- **中期 (3-6 个月)**: 日志系统、错误追踪
- **长期 (6-12 个月)**: 多用户支持、实时更新
