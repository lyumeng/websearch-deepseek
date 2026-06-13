# websearch-deepseek

**通用 MCP Server** — 基于 DeepSeek 原生联网搜索 API 的 Web Search 工具。

适用于 **Claude Code**、**Cursor**、**Continue**、**OpenCode**、**pi** 等任何支持 MCP 协议的 AI 编程助手。

## 特性

- 🔍 **DeepSeek 原生搜索** — 使用服务端 `web_search_20250305` 工具，非第三方搜索 API
- 📝 **AI 生成答案** — 返回基于完整网页内容生成的详细回答，而非仅 URL 列表
- 🔗 **附带来源链接** — 每条回答下附原文 URL，可追溯验证
- ⚙️ **灵活配置** — 支持选择模型、开关思考模式、调整 token 上限
- 🌐 **MCP 协议** — 标准 JSON-RPC over stdio，兼容所有 MCP 客户端

## 工作原理

```
用户提问 → DeepSeek 模型
                ↓
        服务端执行 web_search（抓取网页）
                ↓
        加密网页内容 → 服务端解密 → 喂给模型
                ↓
        模型基于完整内容生成详细回答
                ↓
返回：AI 生成的答案 + 来源 URL 列表
```

**一次 MCP 工具调用 = 一次 DeepSeek API 请求**，搜索、解密、回答全在服务端完成。

## 快速开始

### 1. 获取 DeepSeek API Key

前往 [DeepSeek Platform](https://platform.deepseek.com/) 注册并获取 API Key。

### 2. 安装

```bash
npm install -g websearch-deepseek
```

### 3. 配置你的 AI 编程助手

在对应助手的 MCP 配置文件中添加：

#### Claude Code

编辑 `~/.claude/claude_desktop_config.json` 或项目中的 `.mcp.json`：

```json
{
  "mcpServers": {
    "websearch-deepseek": {
      "command": "npx",
      "args": ["websearch-deepseek"],
      "env": {
        "DEEPSEEK_API_KEY": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "WEBSEARCH_MODEL": "deepseek-v4-flash",
        "WEBSEARCH_THINKING": "enabled"
      }
    }
  }
}
```

#### Cursor

编辑 `~/.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "websearch-deepseek": {
      "command": "npx",
      "args": ["websearch-deepseek"],
      "env": {
        "DEEPSEEK_API_KEY": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

#### Continue (VS Code)

编辑 `~/.continue/config.json`，在 `mcpServers` 中添加：

```json
{
  "mcpServers": [
    {
      "name": "websearch-deepseek",
      "command": "npx",
      "args": ["websearch-deepseek"],
      "env": {
        "DEEPSEEK_API_KEY": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  ]
}
```

#### pi

编辑 `~/.pi/agent/settings.json`，在 `mcp` 中添加：

```json
{
  "mcp": {
    "websearch-deepseek": {
      "command": "npx",
      "args": ["websearch-deepseek"],
      "env": {
        "DEEPSEEK_API_KEY": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### 4. 开始使用

重启你的 AI 编程助手后，直接提问即可。当需要实时信息时，助手会自动调用 `web_search` 工具。

例如：
- "帮我查一下 React 19 有哪些新特性"
- "搜索 Python 3.13 的发布时间和主要更新"
- "最近的 AI 行业有什么重大新闻"

## 环境变量配置

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DEEPSEEK_API_KEY` | ✅ 是 | - | DeepSeek API Key |
| `WEBSEARCH_API_KEY` | ❌ 否 | - | API Key 备选变量名 |
| `WEBSEARCH_MODEL` | ❌ 否 | `deepseek-v4-flash` | 模型：`deepseek-v4-flash`（快）或 `deepseek-v4-pro`（强） |
| `WEBSEARCH_THINKING` | ❌ 否 | `enabled` | 思考模式：`enabled` / `disabled` |
| `WEBSEARCH_MAX_TOKENS` | ❌ 否 | `8192` | 回复最大 token 数 |

### 模型选择建议

| 场景 | 推荐模型 | 说明 |
|------|----------|------|
| 日常搜索（默认） | `deepseek-v4-flash` | 速度快、成本低，回答质量足够好 |
| 深度研究 | `deepseek-v4-pro` | 更详细、更准确的回答，但稍慢 |

### 思考模式

- **enabled**（默认）：模型会先思考再回答，答案质量更高，但消耗更多 token
- **disabled**：跳过思考步骤，速度更快，适合简单查询

## 命令行使用

也可以直接在终端中使用：

```bash
# 设置 API Key
export DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx

# 搜索
npx websearch-deepseek search "Node.js LTS 版本"

# JSON 输出
npx websearch-deepseek search --json "TypeScript 5.8"

# 指定模型和关闭思考
npx websearch-deepseek search --model deepseek-v4-pro --no-thinking "Rust 最新版本"
```

## 输出示例

```
## Node.js 最新 LTS 版本

截至目前（2025 年 7 月），Node.js 最新的 Active LTS 版本是 Node.js 24.x...

| 版本 | 状态 | 首发日期 | 支持至 |
|------|------|----------|--------|
| 24.x | Active LTS | 2025-05-06 | 2028-04 |
| 22.x | Maintenance | 2024-10 | 2027-04 |

### 建议
- 新项目：推荐使用 Node.js 24 LTS
- 现有项目：Node.js 22 仍可继续使用

---

### Sources (10):
1. [Node.js 24.0 is available...](https://...)
2. [Node.js — Node.js Releases](https://...)
...
```

## 费用说明

本工具使用 DeepSeek API，按 token 计费。一次搜索大约消耗：

| 项目 | 估计 token |
|------|-----------|
| 搜索 + 思考 | ~5,000-8,000 |
| 生成回答 | ~1,000-3,000 |
| **单次总计** | **约 8,000-15,000 token** |

DeepSeek API 价格请参考 [官方定价](https://api-docs.deepseek.com/quick_start/pricing)。

## 开发

```bash
git clone https://github.com/your-username/websearch-deepseek.git
cd websearch-deepseek
npm install

# 类型检查
npm run check

# 命令行测试
npm run search "Node.js latest LTS"

# 代码格式化
npm run format
```

## License

MIT
