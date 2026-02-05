# Feishu + Codex Integrated Bot

A powerful bot integration that connects [Feishu/Lark](https://www.larksuite.com/) with OpenAI's [Codex SDK](https://github.com/openai/codex-sdk), enabling an autonomous agent capable of using tools via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/).

## Features

- **Feishu/Lark Integration**: Uses WebSocket long connection (no public IP required).
- **Codex Agent**: Powered by OpenAI Codex SDK with autonomous capabilities.
- **MCP Support**: Extensible tool usage through Model Context Protocol.
    - **Context7**: Documentation search and retrieval.
    - **Playwright**: Browser automation and web scraping.
    - **GitHub**: Repository management.
- **Session Persistence**: Maintains conversation context across restarts.
- **Message Deduplication**: Robust handling of event retries.

## Prerequisites

- Node.js >= 18
- A Feishu/Lark Application (Self-built App)
- Relevant API Keys (Feishu App ID/Secret, GitHub Token)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/feishu-codex-bot.git
   cd feishu-codex-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your credentials:
   - `FEISHU_APP_ID` & `FEISHU_APP_SECRET`: Found in Feishu Developer Console.
   - `GITHUB_PERSONAL_ACCESS_TOKEN`: Required for GitHub MCP tools.

## Usage

### Development
Build and run the bot:
```bash
npm run dev
```

### Production
Build the TypeScript code and run the compiled JavaScript:
```bash
npm run build
npm start
```

## Architecture

- **`src/index.ts`**: Entry point. Initializes Feishu WSClient and Codex SDK.
- **MCP Configuration**: Tools are configured programmatically in the Codex initialization.
- **Session Management**: Sessions are stored locally in `bot_sessions.json`.

## Documentation

- [Agent Tools Guide](docs/AGENTS.md): Instructions for the AI agent on tool usage priority.

## License

MIT
