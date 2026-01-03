# Requirements Document - Spot Ingestion Feature

## Introduction

餐厅录入功能是 GourmetLog 的核心功能之一，允许用户通过截图或文本快速记录餐厅信息。该功能利用 AI Vision 自动识别餐厅详情，并通过地图 API 进行地理编码，将非结构化数据转换为结构化的数据库记录。

## Alignment with Product Vision

该功能直接支持产品愿景中的"极简收录系统（零点击录入）"目标：

- **AI 自动提取**：自动识别截图或文本中的餐厅信息（店名、地址、评分、价格、菜品）
- **智能地理编码**：自动将地址转换为经纬度坐标
- **自动化总结**：生成 <20 字的个性化短评
- **零点击录入**：用户只需上传或粘贴内容，AI 自动完成剩余工作

## Requirements

### Requirement 1 - 截图上传与识别

**User Story:** 作为美食爱好者，我希望上传餐厅截图（如美团、大众点评、小红书），系统能够自动提取餐厅信息，这样我就不需要手动输入了。

#### Acceptance Criteria

1. WHEN 用户点击 Omnibar 中的图片上传按钮 THEN 系统 SHALL 打开文件选择器
2. WHEN 用户选择图片文件 THEN 系统 SHALL 预览图片并上传到服务器
3. WHEN 图片上传完成 THEN 系统 SHALL 调用 AI Vision API 进行识别
4. WHEN AI 识别返回结果 THEN 系统 SHALL 解析并显示提取的信息（店名、地址、评分、价格、菜品、氛围）
5. IF AI 识别失败 THEN 系统 SHALL 允许用户手动编辑提取的信息

### Requirement 2 - 文本粘贴与解析

**User Story:** 作为美食爱好者，我希望粘贴从外卖/点评 APP 复制的分享文本，系统能够自动解析并提取餐厅信息。

#### Acceptance Criteria

1. WHEN 用户在 Omnibar 中粘贴文本 THEN 系统 SHALL 立即识别输入类型
2. WHEN 检测到文本输入 THEN 系统 SHALL 调用 AI API 进行文本解析
3. WHEN AI 解析完成 THEN 系统 SHALL 提取有效信息并展示给用户确认
4. IF 提取的信息不完整 THEN 系统 SHALL 高亮缺失字段并提示用户补充

### Requirement 3 - 地理编码

**User Story:** 作为系统用户，我希望系统能够将餐厅地址文本转换为经纬度坐标，这样推荐功能才能正常工作。

#### Acceptance Criteria

1. WHEN 系统获得餐厅地址（从 AI 提取或用户输入）THEN 系统 SHALL 调用高德地图 Geocoding API
2. WHEN 地理编码成功 THEN 系统 SHALL 存储 `lat` 和 `lng` 坐标到数据库
3. WHEN 地理编码失败 THEN 系统 SHALL 提示用户手动输入或编辑坐标
4. IF 无地址信息 THEN 系统 SHALL 使用店名作为地理编码的备选方案

### Requirement 4 - 用户确认与编辑

**User Story:** 作为美食爱好者，我希望在 AI 提取信息后能够确认和编辑，确保数据准确性。

#### Acceptance Criteria

1. WHEN AI 提取完成 THEN 系统 SHALL 显示预览表单，包含所有提取字段
2. WHEN 用户编辑任何字段 THEN 系统 SHALL 实时更新预览
3. WHEN 用户点击"保存"按钮 THEN 系统 SHALL 验证必填字段（店名、坐标）
4. WHEN 数据验证通过 THEN 系统 SHALL 保存到数据库并显示成功提示
5. WHEN 数据验证失败 THEN 系统 SHALL 显示错误信息并阻止保存

### Requirement 5 - 个性化总结生成

**User Story:** 作为美食爱好者，我希望系统能够为每条餐厅记录生成简短、个性化的总结，方便我快速回忆。

#### Acceptance Criteria

1. WHEN 保存餐厅记录时 THEN 系统 SHALL 调用 AI API 生成 <20 字的总结
2. WHEN AI 生成总结 THEN 系统 SHALL 存储到 `food_spots.summary` 字段
3. WHEN 用户不满意自动总结 THEN 系统 SHALL 允许手动编辑总结
4. WHEN 手动编辑总结时 THEN 系统 SHALL 限制最大长度为 20 字符

### Requirement 6 - 图片存储

**User Story:** 作为用户，我希望上传的截图能够被妥善存储，并在查看餐厅记录时显示。

#### Acceptance Criteria

1. WHEN 用户上传图片 THEN 系统 SHALL 将图片上传到 Cloudflare R2
2. WHEN 图片上传成功 THEN 系统 SHALL 获取 R2 键值并存储到数据库
3. WHEN 查看餐厅记录 THEN 系统 SHALL 从 R2 加载图片
4. IF R2 上传失败 THEN 系统 SHALL 降级到 Base64 存储（本地开发）

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility Principle**: 录入逻辑、AI 调用、地理编码应分离为独立的服务
- **Modular Design**: 前端组件（Omnibar、ImageUpload、SpotForm）应独立且可复用
- **Clear Interfaces**: API 调用应通过统一的 `ApiClient` 封装

### Performance

- **AI 识别响应时间**: <5 秒（从用户提交到 AI 返回结果）
- **地理编码响应时间**: <2 秒（高德 API 调用）
- **图片上传时间**: <3 秒（取决于网络和文件大小）
- **数据库写入时间**: <500ms（单条记录插入）

### Security

- **API Key 保护**: AI 和地图 API Key 仅存储在服务器端，不暴露给客户端
- **输入验证**: 所有用户输入必须进行验证和清理，防止注入攻击
- **图片类型限制**: 仅允许上传图片格式（JPG、PNG、WEBP）

### Reliability

- **降级策略**: AI 失败时允许手动录入，地理编码失败时提示用户输入坐标
- **重试机制**: API 调用失败时最多重试 2 次（指数退避）
- **错误日志**: 所有 API 失败和异常必须记录到日志

### Usability

- **即时反馈**: 用户提交后立即显示加载状态
- **错误提示**: 清晰的错误消息，指导用户如何修正
- **键盘友好**: Omnibar 输入框应支持 Ctrl/Cmd+V 快捷粘贴
- **移动端优化**: 图片上传按钮应易于触摸操作

## Success Criteria

- **功能完整性**: 用户能够通过截图或文本录入至少 10 条餐厅记录
- **AI 提取准确率**: 关键信息（店名、地址）提取准确率 >90%
- **地理编码成功率**: >95%
- **用户体验**: 从截图上传到保存完成的平均时间 <30 秒

---
**Status**: ✅ Approved
**Approved At**: 2026-01-03T00:45:00Z
