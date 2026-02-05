import * as lark from '@larksuiteoapi/node-sdk';
import { Codex, Thread } from "@openai/codex-sdk";
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { startWebServer, updateStats, addLog } from './server.js';
import { getUptime } from './utils.js';

// 加载环境变量
dotenv.config();

// 启动 Web 控制台
startWebServer();

// 会话持久化文件路径
const SESSION_FILE = path.join(process.cwd(), 'bot_sessions.json');
let sessionMap: Record<string, string> = {};

// 统计信息
let messageCount = 0;

// 加载历史会话记录
try {
    if (fs.existsSync(SESSION_FILE)) {
        sessionMap = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
        const sessionCount = Object.keys(sessionMap).length;
        console.log(`[系统] 已加载 ${sessionCount} 个历史会话记录`);
        addLog('info', `已加载 ${sessionCount} 个历史会话记录`);
        updateStats({ sessions: sessionCount });
    }
} catch (e) {
    console.error('[系统] 加载会话记录失败:', e);
    addLog('error', `加载会话记录失败: ${e}`);
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
                const { message_id, chat_id, content, message_type, create_time, mentions, chat_type } = data.message;

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
                        addLog('info', `收到消息: ${userText.substring(0, 50)}...`);

                        messageCount++;
                        updateStats({ messages: messageCount });

                        // 群聊场景：仅响应 @ 机器人的消息
                        // 私聊场景：chat_type 为 'p2p'，直接响应
                        if (chat_type === 'group') {
                            // 检查 mentions 数组，如果没有 @ 任何人或者没有 @ 机器人，则忽略
                            if (!mentions || mentions.length === 0) {
                                console.log(`[忽略群聊消息] 未 @ 机器人`);
                                return;
                            }
                            // 注意：mentions 中包含了所有被 @ 的用户，机器人通常会出现在列表中
                            // 飞书会自动识别机器人被 @，所以如果收到消息且 mentions 不为空，说明机器人被 @ 了
                            console.log(`[群聊] 检测到 @ 机器人，准备回复`);
                            addLog('info', '群聊中检测到 @机器人');
                        }

                        // 处理内置命令
                        if (userText.startsWith('/')) {
                            const command = userText.trim().toLowerCase();
                            if (command === '/status') {
                                const statusMsg = `📊 机器人状态报告\n\n` +
                                    `🟢 状态: 运行中\n` +
                                    `💬 活跃会话: ${Object.keys(sessionMap).length}\n` +
                                    `📨 处理消息: ${messageCount}\n` +
                                    `⏱️ 运行时间: ${getUptime()}\n` +
                                    `🔧 Codex SDK: 已连接\n` +
                                    `📡 飞书WebSocket: 已连接`;
                                await replyMessage(message_id, statusMsg);
                                addLog('info', '执行 /status 命令');
                                return;
                            } else if (command === '/help') {
                                const helpMsg = `🤖 机器人帮助\n\n` +
                                    `可用命令:\n` +
                                    `/status - 查看机器人运行状态\n` +
                                    `/help - 显示此帮助信息\n` +
                                    `/clear - 清除当前会话上下文\n\n` +
                                    `💡 提示:\n` +
                                    `- 群聊中需要 @ 机器人才会回复\n` +
                                    `- 私聊直接发送消息即可\n` +
                                    `- 机器人会记住对话历史`;
                                await replyMessage(message_id, helpMsg);
                                addLog('info', '执行 /help 命令');
                                return;
                            } else if (command === '/clear') {
                                // 清除当前会话
                                if (sessionMap[chat_id]) {
                                    delete sessionMap[chat_id];
                                    threadMap.delete(chat_id);
                                    saveSessions();
                                    await replyMessage(message_id, '✅ 已清除当前会话上下文，重新开始对话');
                                    addLog('info', `清除会话: ${chat_id}`);
                                    updateStats({ sessions: Object.keys(sessionMap).length });
                                } else {
                                    await replyMessage(message_id, 'ℹ️ 当前没有活跃会话');
                                }
                                return;
                            }
                        }

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
                            addLog('info', `新会话绑定: ${chat_id}`);
                            updateStats({ sessions: Object.keys(sessionMap).length });
                        }

                        // 提取回复文本
                        const replyText = result.finalResponse || "Codex 没有返回内容";
                        console.log(`[Codex 回复] ${replyText.substring(0, 50)}...`);

                        // 4. 回复飞书
                        await replyMessage(message_id, replyText);

                    } catch (err) {
                        console.error('处理消息出错:', err);
                        addLog('error', `处理消息出错: ${err instanceof Error ? err.message : String(err)}`);
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
