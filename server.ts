import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import fs from "fs";
import nodeFetch from "node-fetch";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket as WebSocketClient } from "ws";

// Load .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- 日志文件 ----------
const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
const logStream = fs.createWriteStream(path.join(LOG_DIR, 'proxy.log'), { flags: 'a' });
function asrLog(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  logStream.write(line + '\n');
  console.log(msg);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Add basic logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Proxy route for hardware (Lights)
  app.get("/api/hardware/switch/:state", async (req, res) => {
    const { state } = req.params;
    const targetUrl = `http://112.80.221.107:58089/switch/${state}`;

    console.log(`[Hardware Proxy: Lights] Received request for state: ${state}`);
    console.log(`[Hardware Proxy: Lights] Forwarding to: ${targetUrl}`);

    try {
      const response = await nodeFetch(targetUrl, {
        method: 'GET',
        timeout: 5000
      });

      console.log(`[Hardware Proxy: Lights] Hardware responded with status: ${response.status}`);

      if (response.ok) {
        const data = await response.text();
        res.json({ success: true, data });
      } else {
        const errorText = await response.text();
        res.status(response.status).json({ success: false, error: 'Hardware responded with error', detail: errorText });
      }
    } catch (error: any) {
      console.error(`[Hardware Proxy: Lights] Fetch failed: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Proxy route for hardware (Curtains)
  app.get("/api/hardware/curtain/:state", async (req, res) => {
    const { state } = req.params;
    // state should be 'open' or 'close'
    const targetUrl = `http://112.80.221.107:58089/curtain/${state}`;

    console.log(`[Hardware Proxy: Curtains] Received request for state: ${state}`);
    console.log(`[Hardware Proxy: Curtains] Forwarding to: ${targetUrl}`);

    try {
      const response = await nodeFetch(targetUrl, {
        method: 'GET',
        timeout: 5000
      });

      console.log(`[Hardware Proxy: Curtains] Hardware responded with status: ${response.status}`);

      if (response.ok) {
        const data = await response.text();
        res.json({ success: true, data });
      } else {
        const errorText = await response.text();
        res.status(response.status).json({ success: false, error: 'Hardware responded with error', detail: errorText });
      }
    } catch (error: any) {
      console.error(`[Hardware Proxy: Curtains] Fetch failed: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ---------- WebSocket proxy for fun-asr-realtime ----------
  const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';
  if (!DASHSCOPE_API_KEY) {
    asrLog('[ASR Proxy] ⚠️ DASHSCOPE_API_KEY 未配置，fun-asr-realtime 无法使用');
  }

  const dsProxyWss = new WebSocketServer({ noServer: true });

  dsProxyWss.on('connection', (browserWs, req) => {
    const clientIp = req.socket.remoteAddress;
    asrLog(`[ASR Proxy] 浏览器已连接 (IP: ${clientIp})，正在连接 DashScope...`);

    const targetUrl = `wss://dashscope.aliyuncs.com/api-ws/v1/inference`;

    const dsWs = new WebSocketClient(targetUrl, {
      headers: {
        'Authorization': `bearer ${DASHSCOPE_API_KEY}`,
      },
    });

    // 消息队列：暂存在 DashScope 就绪前浏览器发出的消息
    const pendingQueue: (string | Buffer)[] = [];

    // 立即注册浏览器消息监听（不等待 DashScope 连接）
    browserWs.on('message', (data) => {
      // 浏览器发的文本帧可能以 Buffer 送达（ws库行为），需统一处理
      const asString = typeof data === 'string' ? data : Buffer.from(data).toString('utf-8');
      const isTextFrame = typeof data === 'string' || asString.startsWith('{');

      if (isTextFrame) {
        // 文本（JSON 指令）：确保以文本帧转发给 DashScope
        asrLog(`[ASR Proxy] 浏览器→DashScope (${asString.length}B): ${asString.substring(0, 100)}`);
        if (dsWs.readyState === WebSocketClient.OPEN) {
          dsWs.send(asString);
        } else {
          pendingQueue.push(asString);
        }
      } else {
        // 二进制音频数据：透传
        if (dsWs.readyState === WebSocketClient.OPEN) {
          dsWs.send(data);
        } else {
          pendingQueue.push(data);
        }
      }
    });

    const timeout = setTimeout(() => {
      asrLog('[ASR Proxy] ❌ 连接 DashScope 超时');
      browserWs.close(1011, 'DashScope connection timeout');
    }, 10000);

    dsWs.on('open', () => {
      clearTimeout(timeout);
      asrLog('[ASR Proxy] ✅ DashScope 已连接');

      // 重放缓存消息（加小延迟确保连接完全就绪）
      if (pendingQueue.length > 0) {
        asrLog(`[ASR Proxy] 🔄 重放 ${pendingQueue.length} 条缓存消息`);
        setTimeout(() => {
          for (const msg of pendingQueue) {
            asrLog(`[ASR Proxy] 发送到 DashScope: ${typeof msg === 'string' ? msg.substring(0, 100) : '[二进制 ' + msg.length + ' 字节]'}`);
            dsWs.send(msg);
          }
          pendingQueue.length = 0;
        }, 200);
      }
    });

    // DashScope → 浏览器
    dsWs.on('message', (data) => {
      const isBinary = typeof data !== 'string';
      const preview = isBinary ? `[二进制 ${data.length} 字节]` : data.substring(0, 300);
      asrLog(`[ASR Proxy] DashScope→浏览器: ${preview}`);
      if (browserWs.readyState === browserWs.OPEN) {
        browserWs.send(data);
      } else {
        asrLog(`[ASR Proxy] ⚠️ 浏览器不在 OPEN 状态 (state=${browserWs.readyState})，无法转发`);
      }
    });

    dsWs.on('close', (code, reason) => {
      const reasonStr = reason?.toString() || '无';
      asrLog(`[ASR Proxy] ❌ DashScope 断开 (code=${code}, reason=${reasonStr})`);
      browserWs.close(code || 1011, reasonStr);
    });

    dsWs.on('error', (err) => {
      asrLog(`[ASR Proxy] ❌ DashScope 错误: ${err.message}`);
      browserWs.close(1011, err.message);
    });

    browserWs.on('close', (code, reason) => {
      const reasonStr = reason?.toString() || '无';
      asrLog(`[ASR Proxy] 浏览器断开 (code=${code}, reason=${reasonStr})`);
      dsWs.close();
    });

    browserWs.on('error', (err) => {
      asrLog(`[ASR Proxy] 浏览器错误: ${err.message}`);
      dsWs.close();
    });
  });

  // 显式创建 HTTP 服务器（而非 app.listen），以便控制 upgrade 事件
  const server = http.createServer(app);

  // 先注册 WebSocket 代理的 upgrade 处理，再启动监听
  server.on('upgrade', (req, socket, head) => {
    if (req.url === '/api/asr-proxy') {
      dsProxyWss.handleUpgrade(req, socket, head, (ws) => {
        dsProxyWss.emit('connection', ws, req);
      });
    }
    // 非 /api/asr-proxy 的 upgrade（如 Vite HMR）不处理，让其他处理器接管
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
