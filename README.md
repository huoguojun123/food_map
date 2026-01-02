# GourmetLog (私人美食外脑)

> "只记位置，不看地图；全靠 AI，决策食物。"

个人美食记录和 AI 智能推荐系统。

## 快速开始

### 开发环境

```bash
# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 运行 API 服务器
bun run server

# 类型检查
bun run type-check

# 代码检查
bun run lint
```

### 生产部署

**目标环境**：新加坡 2H2C 服务器，内存限制 100MB

```bash
# 1. 构建静态文件
bun run build

# 2. 部署到服务器
scp -r out/* user@server:/var/www/food_map/
scp server/* user@server:/var/www/food_map_api/

# 3. 配置 Nginx
# - /api 代理到 Bun 服务器
# - / 提供静态文件

# 4. 启动服务
pm2 start ecosystem.config.cjs
```

## 项目结构

```
gourmetlog/
├── app/                 # Next.js App Router
├── components/           # React 组件
├── server/              # Bun API 服务器
│   ├── index.ts         # 主服务器入口
│   ├── api/            # API 路由
│   └── db/             # 数据库操作
├── public/             # 静态资源
├── .spec-workflow/     # 规格文档系统
│   ├── specs/          # 功能规格
│   └── steering/       # 项目指导文档
│       ├── product.md   # 产品愿景
│       ├── tech.md      # 技术架构
│       └── structure.md # 代码结构
└── CLAUDE.md          # 开发指南
```

## 技术栈

### 前端
- Next.js 14+ (Static Export)
- React 18
- TypeScript (strict mode)
- Tailwind CSS
- Shadcn/ui

### 后端
- Bun (轻量级运行时)
- SQLite / Cloudflare D1
- Better-SQLite3

### 第三方服务
- AI: OpenAI 兼容 API
- 地图: 高德地图 Web API
- 存储: Cloudflare R2

## 内存预算 (100MB)

| 组件 | 内存 |
|------|------|
| Nginx | ~5MB |
| Bun 服务器 | ~60MB |
| SQLite | ~10MB |
| 缓冲区 | ~25MB |

## 核心功能

1. **AI 智能摄取** - 截图/文本自动识别并提取餐厅信息
2. **语义推荐** - 自然语言查询，AI 理解上下文和偏好
3. **收藏管理** - 创建主题清单，规划美食路线
4. **无地图化** - 时间线视图，文字化位置提示

## 许可证

ISC
