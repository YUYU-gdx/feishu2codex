import * as lark from '@larksuiteoapi/node-sdk';
import { Codex, Thread } from "@openai/codex-sdk";
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// 加载环境变量
dotenv.config();

// 会话持久化文件路径
const SESSION_FILE = path.join(process.cwd(), 'bot_sessions.json');
let sessionMap: Record<string, string> = {};

// 加载历史会话记录
try {
    if (fs.existsSync(SESSION_FILE)) {
        sessionMap = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
        console.log(`[系统] 已加载 ${Object.keys(sessionMap).length} 个历史会话记录`);
    }
} catch (e) {
    console.error('[系统] 加载会话记录失败:', e);
}

// 保存会话记录到磁盘
function saveSessions() {
    try {
        fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionMap, null, 2));
    } catch (e) {
        console.error('[系统] 保存会话记录失败:', e);
    }
}

// 检查环境变量
if (!process.env.FEISHU_APP_ID || !process.env.FEISHU_APP_SECRET) {
    console.error('错误: 请在 .env 文件中填写正确的 FEISHU_APP_ID 和 FEISHU_APP_SECRET');
    process.exit(1);
}

// 1. 初始化飞书客户端
const client = new lark.Client({
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
});

// 2. 初始化 Codex
console.log("正在初始化 Codex...");

// 通过环境变量指定配置目录，让 Codex CLI 自动加载 .codex/config.toml
const codex = new Codex({
    env: {
        ...process.env,
        // 显式指定配置目录 (根据用户要求)
        CODEX_CONFIG_DIR: path.join(process.cwd(), '.codex')
    }
});

// 用于存储当前活跃的内存对象: Map<chat_id, Thread>
const threadMap = new Map<string, Thread>();

// 消息去重：记录最近处理过的消息 ID (使用 Set，保留最近 1000 条)
const processedMessages = new Set<string>();
const MAX_PROCESSED_MESSAGES = 1000;

// 辅助函数: 解析布尔值
const getBool = (key: string, defaultVal: boolean) => {
    const val = process.env[key];
    if (!val) return defaultVal;
    return val.toLowerCase() === 'true';
};

async function getOrCreateThread(chatId: string): Promise<Thread> {
    // 1. 如果内存中已有，直接返回
    if (threadMap.has(chatId)) {
        return threadMap.get(chatId)!;
    }

    let thread: Thread;
    const existingThreadId = sessionMap[chatId];

    // Codex 线程配置
    const threadOptions = {
        skipGitRepoCheck: getBool('CODEX_SKIP_GIT_CHECK', true),
        sandboxMode: (process.env.CODEX_SANDBOX_MODE || 'workspace-write') as any,
        approvalPolicy: (process.env.CODEX_APPROVAL_POLICY || 'never') as any,
        modelReasoningEffort: (process.env.CODEX_REASONING_EFFORT || 'medium') as any,
        webSearchEnabled: getBool('CODEX_WEB_SEARCH_ENABLED', true),
        workingDirectory: process.env.CODEX_WORKING_DIRECTORY || undefined
    };

    // 2. 尝试从磁盘记录恢复
    if (existingThreadId) {
        try {
            console.log(`[会话 ${chatId}] 尝试恢复历史线程: ${existingThreadId}`);
            thread = codex.resumeThread(existingThreadId, threadOptions);
        } catch (e) {
            console.warn(`[会话 ${chatId}] 恢复失败，将创建新线程: ${e}`);
            thread = codex.startThread(threadOptions);
        }
    } else {
        // 3. 创建新线程
        console.log(`[会话 ${chatId}] 创建全新线程...`);
        thread = codex.startThread(threadOptions);
    }

    threadMap.set(chatId, thread);
    return thread;
}

// 3. 创建 WebSocket 客户端
const wsClient = new lark.WSClient({
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    loggerLevel: lark.LoggerLevel.info
});

// 4. 启动监听
wsClient.start({
    eventDispatcher: new lark.EventDispatcher({})
        .register({
            'im.message.receive_v1': async (data) => {
                const { message_id, chat_id, content, message_type, create_time } = data.message;

                // 消息去重：如果已处理过，直接忽略
                if (processedMessages.has(message_id)) {
                    console.warn(`[忽略重复消息] ID: ${message_id}`);
                    return;
                }

                // 检查消息时间戳，防止处理历史消息 (超过 60 秒则忽略)
                const msgTime = parseInt(create_time, 10);
                const now = Date.now();
                if (!isNaN(msgTime) && (now - msgTime) > 60 * 1000) {
                    console.warn(`[忽略过期消息] ID: ${message_id}, 延迟: ${(now - msgTime) / 1000}秒`);
                    return;
                }

                // 标记为已处理
                processedMessages.add(message_id);
                // 限制 Set 大小，删除最早的记录
                if (processedMessages.size > MAX_PROCESSED_MESSAGES) {
                    const firstItem = processedMessages.values().next().value;
                    processedMessages.delete(firstItem);
                }

                // 只处理文本消息
                if (message_type === 'text') {
                    try {
                        const userText = JSON.parse(content).text;
                        console.log(`[收到消息] ${userText}`);

                        // 1. 获取 Codex 线程
                        // 注意: chat_id 在飞书中即代表“会话ID”。
                        // - 私聊场景: chat_id 唯一对应你和机器人
                        // - 群聊场景: chat_id 唯一对应那个群
                        // 因此直接用 chat_id 即可完美兼容群聊，群里所有人共享同一个上下文。
                        const thread = await getOrCreateThread(chat_id);

                        // 2. 发送给 Codex
                        console.log(`正在请求 Codex...`);

                        // 调用 Codex SDK
                        const result = await thread.run(userText);

                        // 3. 持久化保存 (如果线程ID是新的)
                        if (thread.id && sessionMap[chat_id] !== thread.id) {
                            sessionMap[chat_id] = thread.id;
                            saveSessions();
                            console.log(`[系统] 会话 ${chat_id} 已绑定到线程 ${thread.id} 并保存`);
                        }

                        // 提取回复文本
                        const replyText = result.finalResponse || "Codex 没有返回内容";
                        console.log(`[Codex 回复] ${replyText.substring(0, 50)}...`);

                        // 4. 回复飞书
                        await replyMessage(message_id, replyText);

                    } catch (err) {
                        console.error('处理消息出错:', err);
                        await replyMessage(message_id, `发生错误: ${err instanceof Error ? err.message : String(err)}`);
                    }
                }
            }
        })
});

// 辅助函数：回复飞书消息
async function replyMessage(messageId: string, text: string) {
    try {
        await client.im.message.reply({
            path: {
                message_id: messageId
            },
            data: {
                content: JSON.stringify({
                    text: text
                }),
                msg_type: 'text',
            }
        });
    } catch (e) {
        console.error('回复飞书失败:', e);
    }
}

console.log('飞书 + Codex 集成机器人正在启动...');
