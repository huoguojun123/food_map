# Requirements Document - AI Semantic Recommendation

## Introduction

该功能为 GourmetLog 提供“语义检索与智能推荐”，用户通过自然语言描述偏好与场景，系统在不使用地图 UI 与向量数据库的前提下，结合当前位置与历史记录给出 3-5 家可解释的推荐结果。

## Alignment with Product Vision

- **AI First**：用户只需描述需求，AI 负责理解与推荐。
- **无地图化**：不渲染地图，只输出文本与可跳转外部地图链接。
- **非向量化**：采用 Bounding Box 预筛 + LLM 推理，不引入向量数据库。
- **个人使用**：无登录、无多人协作，所有配置本地化。

## Requirements

### Requirement 1 - 语义检索输入

**User Story:** 作为个人用户，我希望用自然语言描述用餐需求，以便快速获得匹配的餐厅推荐。

#### Acceptance Criteria

1. WHEN 用户在推荐入口提交自然语言问题 THEN 系统 SHALL 解析并进入推荐流程
2. IF 用户未提供位置 THEN 系统 SHALL 使用最近一次定位或提示用户补充
3. WHEN 输入为空或过短 THEN 系统 SHALL 提示用户补充有效描述

### Requirement 2 - 位置感知与范围预筛

**User Story:** 作为用户，我希望推荐结果结合当前位置与距离范围，以便结果更实用。

#### Acceptance Criteria

1. WHEN 获得用户位置 THEN 系统 SHALL 采用 Bounding Box 进行粗筛选
2. IF 预筛结果为空 THEN 系统 SHALL 提示扩大范围或放宽条件
3. WHEN 预筛结果过多 THEN 系统 SHALL 限制候选数量并保持相关性排序

### Requirement 3 - AI 推荐与解释

**User Story:** 作为用户，我希望系统给出可解释的推荐理由，以便快速做决定。

#### Acceptance Criteria

1. WHEN 预筛候选集准备完毕 THEN 系统 SHALL 调用 AI 生成 3-5 条推荐
2. WHEN 返回推荐结果 THEN 系统 SHALL 为每条推荐提供简短理由
3. IF AI 调用失败 THEN 系统 SHALL 退化为基于标签/评分的简单排序

### Requirement 4 - 无地图 UI 展示

**User Story:** 作为用户，我希望在不查看地图的情况下理解位置与距离。

#### Acceptance Criteria

1. WHEN 展示推荐列表 THEN 系统 SHALL 仅以文本显示距离与位置摘要
2. WHEN 用户点击位置 THEN 系统 SHALL 提供外部地图应用跳转链接

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 推荐逻辑、位置预筛、AI 调用分别封装
- **Modular Design**: 前端推荐 UI 与后端推荐 API 分离
- **Dependency Management**: 不引入向量数据库或重型 ORM
- **Clear Interfaces**: 推荐接口返回结构需稳定、可扩展

### Performance
- 推荐生成时间 < 3 秒（不含外部 API 超时）
- 预筛数据库查询 < 500ms

### Security
- AI 与地图 API Key 仅在服务端使用
- 不记录或回传用户敏感位置历史

### Reliability
- AI 失败时可降级为规则排序
- 失败需记录日志并给出明确提示

### Usability
- 输入框支持自然语言描述
- 推荐结果展示简洁、可快速点击外部地图

---
**Status**: ✅ Approved
**Approved At**: 2026-01-03T02:45:00Z
