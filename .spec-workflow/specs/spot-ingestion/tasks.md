# Tasks Document - Spot Ingestion Feature

## Overview

将餐厅录入功能分解为 15 个可执行的开发任务，按照从后端到前端的顺序实现。

---

## Task 1: 数据库连接初始化

**File**: `server/db/connection.ts`

**Status**: [x] Completed

**_Leverage**: `lib/db/schema.ts` (数据库建表 SQL)

**_Requirements**: 2.1, 2.2, 2.3

**Description**:
- 创建 SQLite 数据库连接
- 初始化数据库表结构（food_spots, collections, system_config）
- 实现数据库初始化函数

**_Prompt**: Implement the task for spec spot-ingestion, first run spec-workflow-guide to get the workflow guide then implement the task:
Role: Backend Developer specializing in Bun runtime and SQLite database setup
Task: Create database connection module for SQLite using better-sqlite3, initialize tables on startup, and export database connection for use across server API routes
Restrictions:
- Use better-sqlite3 for Bun compatibility
- Do not use ORMs, stick to raw SQL queries
- Follows existing schema from lib/db/schema.ts
_Leverage:
- lib/db/schema.ts for table creation SQL
- lib/types/index.ts for TypeScript interfaces
_Requirements: 2.1, 2.2, 2.3
Success:
- Database connection module created at server/db/connection.ts
- Database initializes tables correctly on startup
- Exported db connection can be imported by API routes
- Tables (food_spots, collections, system_config) are created successfully

---

## Task 2: Bun 服务器基础架构

**File**: `server/app.ts`

**Status**: [x] Completed

**_Leverage**: `server/index.ts` (现有入口)

**_Requirements**: 技术指导文档中的 Bun 服务器架构

**Description**:
- 创建 Bun 应用实例
- 配置 CORS 中间件
- 添加错误处理中间件
- 整合 API 路由

**_Prompt**: Implement the task for spec spot-ingestion, first run spec-workflow-guide to get the workflow guide then implement the task:
Role: Backend Developer specializing in Bun web server architecture
Task: Create Bun application instance with CORS middleware, error handling, and logging support, integrated with API route handlers
Restrictions:
- Must work with Bun runtime (not Express)
- Keep middleware lightweight for 100MB memory limit
- Follow project structure from structure.md
_Leverage:
- server/index.ts for existing entry point
- server/middleware/ for error and CORS handling
_Requirements: 技术指导
Success:
- server/app.ts creates Bun application instance
- CORS middleware configured for cross-origin requests
- Error handling middleware captures and logs errors
- API routes can be registered to the app

---

## Task 3: AI 服务封装

**File**: `server/services/openai.ts`

**Status**: [x] Completed

**_Leverage**: 无（从零创建）

**_Requirements**: 1.1, 5.1, 技术指导中的 AI 配置

**Description**:
- 创建 OpenAI API 客户端封装
- 实现 Vision API 调用（图片识别）
- 实现 Text API 调用（文本解析）
- 添加重试机制和错误处理
- 使用环境变量中的 API Key

**_Prompt**: Implement the task for spec spot-ingestion, first run spec-workflow-guide to get the workflow guide then implement the task:
Role: Backend Developer specializing in AI API integration and OpenAI-compatible services
Task: Create OpenAI API client service supporting both Vision (image recognition) and Text API calls, with retry logic, error handling, and environment variable configuration for API keys
Restrictions:
- Use fetch API directly (no SDK dependencies to save memory)
- Follow OpenAI API format for compatibility
- Do not expose API keys to client-side
_Leverage:
- server/index.ts for environment variables
- lib/types/index.ts for AiExtractionResult interface
_Requirements: 1.1, 5.1, 技术指导
Success:
- server/services/openai.ts created with extractFromImage and extractFromText functions
- Functions handle API errors and implement retry logic (2 retries with exponential backoff)
- API keys are read from environment variables (OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL)
- Returns AiExtractionResult matching requirements

---

## Task 4: 高德地图服务封装

**File**: `server/services/amap.ts`

**Status**: [x] Completed

**_Leverage**: 无（从零创建）

**_Requirements**: 1.3, 技术指导中的地图 API 配置

**Description**:
- 创建高德地图 Geocoding API 客户端
- 实现地址到坐标的转换
- 添加缓存机制（24小时）
- 添加错误处理

**_Prompt**: Implement the task for spec spot-ingestion, first run spec-workflow-guide to get the workflow guide then implement the task:
Role: Backend Developer specializing in map APIs and geocoding services
Task: Create AMap (高德地图) Geocoding API service that converts address text to latitude/longitude coordinates, with caching (24h TTL) and error handling
Restrictions:
- Use fetch API for HTTP requests
- Follow AMap API v3 geocoding endpoint specification
- Store API key in environment variables (AMAP_KEY)
_Leverage:
- lib/types/index.ts for GeocodingResult interface
- server/index.ts for environment variables
_Requirements: 1.3, 技术指导
Success:
- server/services/amap.ts created with geocode function
- Geocoding converts address text to {lat, lng} coordinates
- In-memory cache with 24-hour expiration implemented
- API key read from AMAP_KEY environment variable

---

## Task 5: Cloudflare R2 存储服务

**File**: `server/services/r2.ts`

**Status**: [x] Completed

**_Leverage**: 无（从零创建）

**_Requirements**: 1.6, 技术指导中的存储配置

**Description**:
- 创建 R2 S3 兼容 API 客户端
- 实现图片上传功能
- 使用环境变量中的 R2 凭证
- 添加错误处理和降级策略

**_Prompt**: Implement the task for spec spot-ingestion, first run spec-workflow-guide to get the workflow guide then implement the task:
Role: Backend Developer specializing in object storage services (S3-compatible)
Task: Create Cloudflare R2 service for image upload using S3-compatible API, with environment variable configuration and fallback strategy for when R2 is not configured
Restrictions:
- Use fetch API with AWS S3 signature format
- Read credentials from environment variables (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)
- Support graceful degradation when R2 is not available
_Leverage:
- server/index.ts for environment variables
- lib/types/index.ts for types
_Requirements: 1.6, 技术指导
Success:
- server/services/r2.ts created with uploadImage function
- Images uploaded to R2 bucket and return {key, url}
- Fallback to Base64 storage implemented when R2 is not configured
- Environment variables read from R2_* prefix

---

## Task 6: 后端 API 路由 - 餐厅 CRUD

**File**: `server/api/spots.ts`

**Status**: [x] Completed

**_Leverage**: `server/db/connection.ts` (Task 1), `server/services/openai.ts` (Task 3), `server/services/amap.ts` (Task 4), `server/services/r2.ts` (Task 5)

**_Requirements**: 2.4, 2.5, 2.6

**Description**:
- 实现 POST /api/spots 端点（创建餐厅）
- 实现输入验证（name, lat, lng 必填）
- 集成 AI 提取、地理编码、图片上传
- 实现错误处理和验证

**_Prompt**: Implement the task for spec spot-ingestion, first run spec-workflow-guide to get the workflow guide then implement the task:
Role: Backend Developer specializing in API endpoint implementation
Task: Implement POST /api/spots endpoint that creates food spot records, integrating AI extraction (Task 3), geocoding (Task 4), and R2 upload (Task 5), with input validation and error handling
Restrictions:
- Use Bun's Request/Response objects
- Validate required fields (name, lat, lng) before saving
- Do not expose API keys in responses
_Leverage:
- server/db/connection.ts for database operations
- server/services/openai.ts for AI extraction
- server/services/amap.ts for geocoding
- server/services/r2.ts for image upload
- lib/types/index.ts for FoodSpot and CreateSpotDto interfaces
_Requirements: 2.4, 2.5, 2.6
Success:
- POST /api/spots endpoint implemented at server/api/spots.ts
- Accepts CreateSpotDto in request body
- Validates name, lat, lng are present
- Calls AI extraction, geocoding, and R2 upload as needed
- Returns created FoodSpot record with id
- Handles errors gracefully (400/500 responses)

---

## Task 7: 后端 API 路由 - AI 提取

**File**: `server/api/ai.ts`

**Status**: [x] Completed

**_Leverage**: `server/services/openai.ts` (Task 3)

**_Requirements**: 1.1, 1.2, 技术指导文档中的 AI 配置

**Description**:
- 实现 POST /api/ai/extract 端点
- 支持图片和文本输入类型
- 调用 AI Vision 或 Text API
- 返回提取的餐厅信息

**_Prompt**: Implement the task for spec spot-ingestion, first run spec-workflow-guide to get the workflow guide then implement the task:
Role: Backend Developer specializing in AI API endpoints
Task: Implement POST /api/ai/extract endpoint that calls OpenAI Vision API for images or Text API for text, returning extracted restaurant information
Restrictions:
- Accept image as Base64 string or text input
- Call AI service from server/services/openai.ts
- 10 second timeout for AI API calls
_Leverage:
- server/services/openai.ts for AI API calls
- lib/types/index.ts for AiExtractionResult interface
_Requirements: 1.1, 1.2, 技术指导
Success:
- POST /api/ai/extract endpoint implemented
- Accepts {type: 'image'|'text', image?, text?} in request body
- Calls appropriate AI API based on input type
- Returns {success, data, error} response
- Timeout after 10 seconds

---

## Task 8: 后端 API 路由 - 地理编码

**File**: `server/api/geocode.ts`

**Status**: [x] Completed

**_Leverage**: `server/services/amap.ts` (Task 4)

**_Requirements**: 1.3, 5.1, 技术指导文档中的地图 API 配置

**Description**:
- 实现 POST /api/ai/geocode 端点
- 接收地址文本
- 调用高德地图服务
- 返回经纬度坐标

**_Prompt**: Implement the task for spec spot-ingestion, first run spec-workflow-guide to get the workflow guide then implement the task:
Role: Backend Developer specializing in geocoding API endpoints
Task: Implement POST /api/ai/geocode endpoint that converts address text to coordinates using AMap service
Restrictions:
- Use address query parameter from request
- Call geocoding service from server/services/amap.ts
- 5 second timeout for geocoding API calls
_Leverage:
- server/services/amap.ts for geocoding
- lib/types/index.ts for GeocodingResult interface
_Requirements: 1.3, 5.1, 技术指导
Success:
- POST /api/ai/geocode endpoint implemented
- Accepts {address, city?} in request body
- Returns {success, data, error} response with {lat, lng}
- Timeout after 5 seconds

---

## Task 9: 后端 API 路由 - 图片上传

**File**: `server/api/upload.ts`

**Status**: [x] Completed

**_Leverage**: `server/services/r2.ts` (Task 5)

**_Requirements**: 1.6, 技术指导文档中的图片上传要求

**Description**:
- 实现 POST /api/upload/r2 端点
- 接收 multipart/form-data 图片文件
- 调用 R2 上传服务
- 返回 R2 键值和 URL

**_Prompt**: Implement the task for spec spot-ingestion, first run spec-workflow-guide to get the workflow guide then implement the task:
Role: Backend Developer specializing in file upload handling and object storage
Task: Implement POST /api/upload/r2 endpoint that accepts image file uploads via multipart/form-data and uploads to Cloudflare R2
Restrictions:
- Accept max file size 5MB
- Support image/jpeg, image/png, image/webp
- Call R2 service from server/services/r2.ts
_Leverage:
- server/services/r2.ts for R2 upload
- lib/types/index.ts for types
_Requirements: 1.6, 技术指导
Success:
- POST /api/upload/r2 endpoint implemented
- Accepts file upload via multipart/form-data
- Validates file type and size
- Returns {success, data} response with {key, url}
- 5MB size limit enforced

---

## Task 10: 前端 API 客户端封装

**File**: `lib/api/client.ts`

**Status**: [x] Completed

**_Leverage**: 无（从零创建）

**_Requirements**: 技术指导文档中的 API 客户端模式

**Description**:
- 创建统一的 API 客户端类
- 实现通用请求方法（GET, POST, PUT, DELETE）
- 实现错误处理和重试逻辑
- 提供类型安全的 API 调用

**_Prompt**: Implement the task for spec spot-ingestion, first run spec-workflow-guide to get the workflow guide then implement the task:
Role: Frontend Developer specializing in API client architecture and TypeScript
Task: Create unified API client class with typed methods for HTTP requests (GET, POST, PUT, DELETE), error handling, and retry logic
Restrictions:
- Use fetch API directly (no axios/fetch dependencies)
- Provide generic type parameters
- Handle errors centrally
_Leverage:
- lib/types/index.ts for TypeScript interfaces
_Requirements: 技术指导
Success:
- lib/api/client.ts created with ApiClient class
- Implements get<T>, post<T>, put<T>, delete() methods
- Centralized error handling with retry logic
- Type-safe with generic type parameters

---

## Task 11: 餐厅 API 客户端封装

**File**: `lib/api/spots.ts`

**Status**: [x] Completed

**_Leverage**: `lib/api/client.ts` (Task 10), `lib/types/index.ts` (类型定义)

**_Requirements**: 技术指导文档中的 API 客户端模式

**Description**:
- 创建餐厅相关的 API 调用函数
- 实现 createSpot 函数
- 实现 extractSpotInfo 函数
- 实现 geocodeAddress 函数
- 实现 uploadImageToR2 函数

**_Prompt**: Implement the task for spec spot-ingestion, first run spec-workflow-guide to get the workflow guide then implement the task:
Role: Frontend Developer specializing in spot-related API integration
Task: Create spot-specific API client functions using ApiClient from Task 10, including createSpot, extractSpotInfo, geocodeAddress, and uploadImageToR2 with proper TypeScript types
Restrictions:
- Use ApiClient for all HTTP requests
- Follow lib/types/index.ts interfaces
_Leverage:
- lib/api/client.ts (Task 10)
- lib/types/index.ts for CreateSpotDto, AiExtractionResult, FoodSpot interfaces
_Requirements: 技术指导
Success:
- lib/api/spots.ts created with all required functions
- createSpot(extract: {type, image?, text?}): Promise<AiExtractionResult>
- createSpot(data: CreateSpotDto): Promise<FoodSpot>
- geocodeAddress(address, city?): Promise<{lat, lng}>
- uploadImageToR2(file: File): Promise<{key, url}>
- All functions are properly typed and use ApiClient

---

## Task 12: ImageUpload 组件

**File**: `components/features/image-upload.tsx`

**Status**: [x] Completed

**_Leverage**: `lib/api/client.ts` (Task 11), Tailwind CSS 样式

**_Requirements**: 2.1, 4.3, 5.2, 技术指导文档中的组件规范

**Description**:
- 创建图片上传组件
- 支持文件选择和预览
- 支持拖拽上传
- 显示上传进度
- 调用 API 客户端上传

**_Prompt**: Implement the task for spec spot-ingestion, first run spec-workflow-guide to get the workflow guide then implement the task:
Role: React Developer specializing in UI components
Task: Create ImageUpload component with file selection, preview, drag-and-drop support, upload progress, and API client integration using uploadImageToR2 from Task 11
Restrictions:
- Use 'use client' directive
- Follow Tailwind CSS classes from design doc
- Max file size 5MB
_Leverage:
- lib/api/spots.ts for uploadImageToR2
- Tailwind CSS classes from structure.md
_Requirements: 2.1, 4.3, 5.2, 技术指导
Success:
- components/features/image-upload.tsx created
- Supports file selection via click and drag-and-drop
- Shows image preview after selection
- Displays upload progress indicator
- Calls uploadImageToR2 and shows success/error
- Tailwind styling applied (rounded-2xl, border-zinc-200)

---

## Task 13: SpotForm 表单组件

**File**: `components/forms/spot-form.tsx`

**Status**: [x] Completed

**_Leverage**: `lib/api/client.ts` (Task 11), `lib/types/index.ts` (类型定义)

**_Requirements**: 2.4, 4.3, 5.1, 技术指导文档中的表单组件规范

**Description**:
- 创建餐厅编辑/确认表单组件
- 显示 AI 提取的数据
- 支持手动编辑所有字段
- 实现表单验证（必填字段）
- 调用 createSpot API 保存

**_Prompt**: Implement the task for spec spot-ingestion, first run spec-workflow-guide to get the workflow guide then implement the task:
Role: React Developer specializing in form components
Task: Create SpotForm component that displays extracted restaurant data from AI, allows manual editing of all fields, validates required fields (name, lat, lng), and calls createSpot API from Task 11
Restrictions:
- Use 'use client' directive
- Validate required fields on client-side
- Show inline error messages
_Leverage:
- lib/api/spots.ts for createSpot
- lib/types/index.ts for CreateSpotDto, FoodSpot interfaces
_Requirements: 2.4, 4.3, 5.1, 技术指导
Success:
- components/forms/spot-form.tsx created
- Displays all form fields (name, address, city, summary, notes, tags, rating, price)
- Validates name, lat, lng as required (shows red border)
- Supports manual editing of all fields
- Calls createSpot API on submit
- Shows loading state during save

---

## Task 14: Omnibar 输入栏组件

**File**: `components/layout/omnibar.tsx`

**Status**: [x] Completed

**_Leverage**: `ImageUpload` (Task 12), `SpotForm` (Task 13), `lib/api/ai.ts` (Task 11)

**_Requirements**: 1.1, 1.2, 2.1, 5.1, 技术指导文档中的输入栏规范

**Description**:
- 创建全能输入栏组件
- 集成 ImageUpload 和 SpotForm
- 自动识别输入类型（图片/文本）
- 调用相应的 AI 提取 API
- 管理加载和错误状态

**_Prompt**: Implement the task for spec spot-ingestion, first run spec-workflow-guide to get the workflow guide then implement the task:
Role: React Developer specializing in layout components
Task: Create Omnibar component that integrates ImageUpload (Task 12) and SpotForm (Task 13), automatically detects input type (image vs text), calls appropriate AI extraction API, and manages loading and error states
Restrictions:
- Use 'use client' directive
- Follow mobile-first design principles
- Stick to bottom of screen (fixed positioning)
_Leverage:
- ImageUpload component from Task 12
- SpotForm component from Task 13
- lib/api/spots.ts for extractSpotInfo
_Requirements: 1.1, 1.2, 2.1, 5.1, 技术指导
Success:
- components/layout/omnibar.tsx created
- Integrates ImageUpload and SpotForm components
- Detects image file selection vs text paste
- Calls extractSpotInfo API for appropriate input type
- Shows loading indicator and error messages
- Fixed at bottom of screen with backdrop-blur

---

## Task 15: 更新首页集成 Omnibar

**File**: `app/page.tsx` (更新现有)

**Status**: [x] Completed

**_Leverage**: `Omnibar` (Task 14), `app/layout.tsx` (现有布局), `lib/api/client.ts` (Task 11)

**_Requirements**: 技术指导文档中的 UI 集成

**Description**:
- 更新首页集成 Omnibar 组件
- 添加餐厅列表显示（时间线视图）
- 处理 API 错误和加载状态

**_Prompt**: Implement the task for spec spot-ingestion, first run spec-workflow-guide to get the workflow guide then implement the task:
Role: Full-stack Developer integrating frontend and backend
Task: Update app/page.tsx to integrate Omnibar component (Task 14), add timeline view for displaying saved spots, and handle loading/error states from API calls
Restrictions:
- Follow existing layout structure
- Maintain static export compatibility
- Show loading states and errors gracefully
_Leverage:
- Omnibar component from Task 14
- app/layout.tsx for existing layout
- lib/api/client.ts for API calls
_Requirements: 技术指导
Success:
- app/page.tsx updated with Omnibar integration
- Spot cards displayed in timeline view (chronological)
- Loading states shown during API calls
- Error messages displayed for failed operations
- Maintains mobile-first design

---

## Implementation Notes

### 任务顺序

1. **Backend First** (Tasks 1-9): 先完成后端基础设施和服务
2. **API Client** (Task 10-11): 然后创建前端 API 客户端
3. **Frontend Components** (Tasks 12-14): 最后创建 React 组件并集成

### 更新 tasks.md 的状态

在开始每个任务时，将状态从 `[ ]` 改为 `[-]`
完成后，将 `[-]` 改为 `[x]`

### 完成后使用 log-implementation 工具

每个任务完成后，必须使用 `mcp__spec-workflow__log-implementation` 工具记录实现详情，包括：
- 修改/创建的文件
- 代码行数（新增/删除）
- 详细的实现描述
- artifacts（API 端点、组件、函数等）

---
**Status**: ✅ Approved
**Approved At**: 2026-01-03T03:00:00Z
