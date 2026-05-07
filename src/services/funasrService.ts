/**
 * FunasrService — 阿里云百炼 fun-asr-realtime 语音识别客户端
 *
 * 使用 Run-Task 协议（非 Omni 协议）：
 * run-task → task-started → [binary audio frames] → result-generated → finish-task → task-finished
 *
 * 音频采集：getUserMedia → AudioContext (16kHz) → Float32→Int16 → 二进制 WebSocket 帧
 */

const SAMPLE_RATE = 16000;
const CHUNK_SIZE = 4096;

// 生成唯一 task_id
function genTaskId(): string {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
}

export class FunasrService {
  public onresult: ((text: string, isFinal: boolean) => void) | null = null;
  public onerror: ((error: string) => void) | null = null;
  public onend: (() => void) | null = null;
  public isListening = false;

  private ws: WebSocket | null = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _shouldRestart = false;
  private _currentTaskId = '';
  private _taskActive = false;
  private _reconnectAttempt = 0;
  /** 统计已发送的音频数据块数量 */
  private _audioChunkCount = 0;
  /** 等待 task-started 后才开始发音频 */
  private _taskReady = false;

  /**
   * 启动麦克风采集和 WebSocket 连接
   */
  start() {
    if (this.isListening) {
      console.log('%c[Funasr] 已在监听中，忽略重复启动', 'color:orange');
      return;
    }
    console.log('%c[Funasr] === 启动语音识别 ===', 'color:green;font-weight:bold');
    this.isListening = true;
    this._shouldRestart = true;
    this._startCapture();
  }

  /**
   * 停止麦克风采集并断开 WebSocket
   */
  stop() {
    console.log('%c[Funasr] === 停止语音识别 ===', 'color:red;font-weight:bold');
    this.isListening = false;
    this._shouldRestart = false;
    this._cleanup();
  }

  // ==================== 音频采集 ====================

  private async _startCapture() {
    try {
      console.log('[Funasr] 正在请求麦克风权限...');
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[Funasr] ✅ 麦克风权限已获取，音频轨道数:', this.stream.getAudioTracks().length);

      console.log(`[Funasr] 创建 AudioContext，采样率: ${SAMPLE_RATE}Hz`);
      this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      console.log('[Funasr] AudioContext 初始状态:', this.audioContext.state);

      if (this.audioContext.state === 'suspended') {
        console.log('[Funasr] AudioContext 已暂停，正在恢复...');
        await this.audioContext.resume();
        console.log('[Funasr] AudioContext 恢复后状态:', this.audioContext.state);
      }

      this.source = this.audioContext.createMediaStreamSource(this.stream!);

      this.processor = this.audioContext.createScriptProcessor(CHUNK_SIZE, 1, 1);
      console.log(`[Funasr] ✅ 音频管道已就绪（缓冲区: ${CHUNK_SIZE}, 每块约 ${CHUNK_SIZE / SAMPLE_RATE * 1000}ms）`);

      this.processor.onaudioprocess = (e) => {
        if (!this._taskReady || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Float32 (-1~1) → PCM16 (Int16)
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // 以二进制帧发送裸 PCM 数据
        this.ws!.send(pcm16.buffer);

        this._audioChunkCount++;
        if (this._audioChunkCount % 10 === 1 || this._audioChunkCount <= 3) {
          console.log(`[Funasr] 🔊 已发送 ${this._audioChunkCount} 块音频数据`);
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // 建立 WebSocket 连接
      this._connectWs();

    } catch (err: any) {
      console.error('[Funasr] ❌ 启动采集失败:', err);
      const msg = err.name === 'NotAllowedError'
        ? '麦克风权限被拒绝，请在浏览器设置中允许麦克风访问'
        : `麦克风启动失败: ${err.message}`;
      this.onerror?.(msg);
      this.isListening = false;
    }
  }

  // ==================== WebSocket 建连 ====================

  private _connectWs() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    try {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${location.host}/api/asr-proxy`;

      console.log(`[Funasr] 正在连接 WebSocket: ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);
      // 声明接受二进制数据（默认 Blob，设为 ArrayBuffer 方便处理）
      this.ws.binaryType = 'arraybuffer';
      this._taskReady = false;
      this._taskActive = false;

      this.ws.onopen = () => {
        console.log('[Funasr] ✅ WebSocket 连接已建立');
        this._startNewTask();
      };

      this.ws.onmessage = (event) => {
        // 记录收到的原始消息类型和大小
        const dataType = typeof event.data;
        const dataSize = event.data instanceof ArrayBuffer ? event.data.byteLength :
                         event.data instanceof Blob ? event.data.size :
                         (event.data || '').length;
        console.log(`[Funasr] ← 收到消息 (type=${dataType}, size=${dataSize})`);

        try {
          // DashScope 的 JSON 响应是通过二进制帧发送的（不是文本帧）
          let text: string;
          if (event.data instanceof ArrayBuffer) {
            text = new TextDecoder().decode(event.data);
            console.log('[Funasr] ← 二进制帧解码为文本:', text.substring(0, 200));
          } else if (typeof event.data === 'string') {
            text = event.data;
            console.log('[Funasr] ← 文本帧:', text.substring(0, 200));
          } else {
            console.warn('[Funasr] ← 未知数据类型:', dataType);
            return;
          }
          const msg = JSON.parse(text);
          this._handleMessage(msg);
        } catch (e) {
          console.warn('[Funasr] 解析服务端消息失败:', e);
        }
      };

      this.ws.onerror = () => {
        console.error('[Funasr] ❌ WebSocket 连接发生错误');
      };

      this.ws.onclose = (event) => {
        console.log(`[Funasr] WebSocket 已关闭 (code=${event.code})`);
        this._taskActive = false;
        this._taskReady = false;

        if (this._shouldRestart) {
          const delay = Math.min(1000 * Math.pow(2, this._reconnectAttempt), 30000);
          this._reconnectAttempt++;
          console.log(`[Funasr] 将在 ${delay}ms 后重连（第 ${this._reconnectAttempt} 次）`);
          this.reconnectTimer = setTimeout(() => this._connectWs(), delay);
        }
      };

    } catch (err) {
      console.error('[Funasr] ❌ 创建 WebSocket 失败:', err);
      this.onerror?.('语音识别服务连接失败');
    }
  }

  // ==================== Run-Task 协议 ====================

  /**
   * 发送 run-task 启动新任务
   */
  private _startNewTask() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this._currentTaskId = genTaskId();
    this._taskReady = false;
    this._taskActive = true;
    this._audioChunkCount = 0;

    const runTaskMsg = {
      header: {
        action: 'run-task',
        task_id: this._currentTaskId,
        streaming: 'duplex',
      },
      payload: {
        model: 'fun-asr-realtime',
        task: 'asr',
        task_group: 'audio',
        function: 'recognition',
        input: {},
        parameters: {
          format: 'pcm',
          sample_rate: SAMPLE_RATE,
        },
      },
    };

    console.log('[Funasr] 发送 run-task:', JSON.stringify(runTaskMsg, null, 2));
    this.ws.send(JSON.stringify(runTaskMsg));
  }

  /**
   * 处理服务端消息
   */
  private _handleMessage(msg: any) {
    // 服务端使用 header.event（不是 header.action）
    const event = msg.header?.event;

    switch (event) {
      case 'task-started':
        console.log('[Funasr] ✅ 任务已启动，开始发送音频数据');
        this._taskReady = true;
        this._reconnectAttempt = 0;
        break;

      case 'result-generated': {
        const sentence = msg.payload?.output?.sentence || {};
        const text = sentence.text || '';
        const isFinal = sentence.sentence_end === true;
        const isHeartbeat = sentence.heartbeat === true;

        // heartbeat 信号，跳过处理
        if (isHeartbeat) break;

        if (text) {
          if (isFinal) {
            console.log(`%c[Funasr] ✅ 最终结果: "${text}"`, 'color:green;font-weight:bold');
            this.onresult?.(text, true);
            // 一句话结束，结束当前任务并开启新任务
            this._finishAndRestart();
          } else {
            console.log(`[Funasr] 📝 中间结果: "${text}"`);
            this.onresult?.(text, false);
          }
        }
        break;
      }

      case 'task-finished':
        console.log('[Funasr] 任务已结束');
        this._taskActive = false;
        this._taskReady = false;

        // 如果仍在监听，开启新任务
        if (this._shouldRestart) {
          console.log('[Funasr] 🔄 开启新任务（持续监听）...');
          setTimeout(() => this._startNewTask(), 200);
        }
        break;

      case 'task-failed': {
        const errMsg = msg.header?.error_message || JSON.stringify(msg);
        console.error('[Funasr] ❌ 服务端错误:', errMsg);
        this.onerror?.(`语音识别错误: ${errMsg}`);
        break;
      }

      default:
        if (event) {
          console.log('[Funasr] 收到未知事件:', event, JSON.stringify(msg).substring(0, 200));
        }
        break;
    }
  }

  /**
   * 发送 finish-task 结束当前任务
   */
  private _sendFinishTask() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const finishMsg = {
      header: {
        action: 'finish-task',
        task_id: this._currentTaskId,
        streaming: 'duplex',
      },
      payload: {
        input: {},
      },
    };

    console.log('[Funasr] 发送 finish-task');
    this._taskReady = false;
    this.ws.send(JSON.stringify(finishMsg));
  }

  /**
   * 结束当前任务并开启新任务
   */
  private _finishAndRestart() {
    this._taskReady = false;
    this._sendFinishTask();
    // task-finished 回调后会调用 _startNewTask 开启新任务
  }

  // ==================== 资源清理 ====================

  private _cleanup() {
    console.log('[Funasr] 🧹 清理资源...');
    this._taskReady = false;
    this._taskActive = false;
    this._reconnectAttempt = 0;
    this._audioChunkCount = 0;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        try {
          this._sendFinishTask();
        } catch (_) {}
      }
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }

    if (this.stream) {
      console.log('[Funasr] 释放麦克风...');
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }

    if (this.processor && this.source) {
      try {
        this.source.disconnect(this.processor);
        this.processor.disconnect(this.audioContext!.destination);
      } catch (_) {}
    }
    this.processor = null;
    this.source = null;

    if (this.audioContext && this.audioContext.state !== 'closed') {
      console.log('[Funasr] 关闭 AudioContext...');
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    console.log('[Funasr] ✅ 资源已全部清理');
  }
}
