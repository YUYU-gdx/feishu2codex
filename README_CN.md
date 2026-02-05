# 飞书 + Codex 智能机器人

一个强大的集成机器人，连接[飞书/Lark](https://www.larksuite.com/)与 OpenAI 的 [Codex SDK](https://github.com/openai/codex-sdk)，通过[模型上下文协议 (MCP)](https://modelcontextprotocol.io/) 实现自主 AI 代理能力。

## ✨ 特性

- **飞书/Lark 集成**: 使用 WebSocket 长连接（无需公网 IP）
- **Codex 智能体**: 基于 OpenAI Codex SDK 的自主 AI 能力
- **MCP 工具支持**: 通过模型上下文协议实现可扩展的工具调用
    - **Context7**: 文档搜索与检索
    - **Playwright**: 浏览器自动化和网页抓取
    - **GitHub**: 仓库管理
- **会话持久化**: 跨重启保持对话上下文
- **消息去重**: 可靠处理事件重试

## 📋 前置要求

- Node.js >= 18
- 飞书/Lark 应用（自建应用）
- 相关 API 密钥（飞书 App ID/Secret、GitHub Token）

## 🚀 安装

1. **克隆仓库**
   ```bash
   git clone https://github.com/YUYU-gdx/feishu2codex.git
   cd feishu2codex
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**

   复制示例环境文件：
   ```bash
   cp .env.example .env
   ```

   编辑 `.env` 文件并填入您的凭证：
   - `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`: 在飞书开发者后台获取
   - `GITHUB_PERSONAL_ACCESS_TOKEN`: GitHub MCP 工具所需（可选）

## 💻 使用方法

### 开发模式
构建并运行机器人：
```bash
npm run dev
```

### 生产模式
编译 TypeScript 代码并运行编译后的 JavaScript：
```bash
npm run build
npm start
```

## 📁 项目结构

```
feishu2codex/
├── src/
│   └── index.ts        # 入口文件，初始化飞书 WSClient 和 Codex SDK
├── docs/
│   └── AGENTS.md       # AI 代理工具使用优先级指南
├── .codex/
│   └── config.toml     # MCP 工具配置文件
├── .env                # 环境变量配置（本地，不会提交到 Git）
├── .env.example        # 环境变量配置模板
├── .gitignore          # Git 忽略规则
├── LICENSE             # MIT 开源协议
├── README.md           # 英文说明文档
├── README_CN.md        # 中文说明文档
├── package.json        # 项目依赖和脚本
└── tsconfig.json       # TypeScript 配置
```

## 🔧 架构说明

- **`src/index.ts`**: 主入口文件，负责初始化飞书 WebSocket 客户端和 Codex SDK（含 MCP 配置）
- **MCP 配置**: 通过环境变量 `CODEX_CONFIG_DIR` 指向 `.codex/` 目录，由 Codex CLI 自动加载配置
- **会话管理**: 会话映射关系存储在本地的 `bot_sessions.json` 文件中
- **消息处理流程**:
  1. 飞书 WebSocket 接收用户消息
  2. 检查消息去重和时间戳有效性
  3. 根据 `chat_id` 获取或创建 Codex Thread
  4. 将用户消息发送给 Codex 进行处理
  5. 将 Codex 的回复发送回飞书

## 🛠️ 配置说明

### 飞书应用配置

1. 在[飞书开放平台](https://open.feishu.cn/)创建自建应用
2. 获取 `App ID` 和 `App Secret`
3. 配置应用权限：
   - `im:message` - 接收消息
   - `im:message:send_as_bot` - 发送消息
4. 启用事件订阅，订阅 `im.message.receive_v1` 事件

### MCP 工具配置

编辑 `.codex/config.toml` 文件来添加或修改 MCP 工具：

```toml
# 实时文档搜索
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]

# 浏览器自动化
[mcp_servers.playwright]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-playwright"]

# GitHub 仓库管理
[mcp_servers.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
[mcp_servers.github.env]
GITHUB_PERSONAL_ACCESS_TOKEN = "YOUR_GITHUB_TOKEN_HERE"
```

## 📖 文档

- [Agent 工具指南](docs/AGENTS.md): AI 代理工具使用优先级说明

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 开源协议

本项目采用 MIT 协议开源 - 详见 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- [飞书开放平台](https://open.feishu.cn/)
- [OpenAI Codex SDK](https://github.com/openai/codex-sdk)
- [模型上下文协议 (MCP)](https://modelcontextprotocol.io/)

---

⭐ 如果这个项目对您有帮助，欢迎给个 Star！
