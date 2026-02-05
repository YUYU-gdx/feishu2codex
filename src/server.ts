import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建 Express 应用
const app = express();
const PORT = process.env.WEB_PORT || 3000;

app.use(cors());
app.use(express.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, '../web/public')));
app.use('/src', express.static(path.join(__dirname, '../web/src')));

// 全局状态
let globalStats = {
    status: 'running',
    sessions: 0,
    messages: 0,
    uptime: 0,
    startTime: Date.now()
};

let globalLogs: Array<{timestamp: number, level: string, message: string}> = [];
const MAX_LOGS = 500;

// API 路由
app.get('/api/stats', (req, res) => {
    globalStats.uptime = Math.floor((Date.now() - globalStats.startTime) / 1000);
    res.json(globalStats);
});

app.get('/api/logs', (req, res) => {
    res.json(globalLogs);
});

// 导出函数供机器人调用
export function updateStats(updates: Partial<typeof globalStats>) {
    Object.assign(globalStats, updates);
}

export function addLog(level: string, message: string) {
    globalLogs.push({
        timestamp: Date.now(),
        level,
        message
    });

    // 限制日志数量
    if (globalLogs.length > MAX_LOGS) {
        globalLogs = globalLogs.slice(-MAX_LOGS);
    }
}

export function startWebServer() {
    app.listen(PORT, () => {
        console.log(`[Web控制台] 已启动，访问 http://localhost:${PORT}`);
        addLog('info', `Web控制台已启动，端口: ${PORT}`);
    });
}
