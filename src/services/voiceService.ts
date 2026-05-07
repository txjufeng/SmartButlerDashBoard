import { GoogleGenAI, Type } from "@google/genai";
import { FunasrService } from './funasrService';

let aiInstance: any = null;
const getAI = () => {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'undefined') {
      throw new Error('Gemini API key is not configured.');
    }
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
};

export interface VoiceCommandAction {
  type: 'CLIMATE' | 'LIGHTS' | 'CURTAINS' | 'SCENE' | 'NAVIGATION' | 'SERVICE' | 'QUERY' | 'CHECKOUT' | 'WAKE';
  payload: any;
  response?: string;
}

const INFO_QUERY_DATABASE: Record<string, string> = {
  '早餐': '酒店早餐在2楼西餐厅，开放时间为早上 6:30 到 10:30。',
  '健身房': '健身房和恒温泳池位于3楼，24小时凭房卡进入。',
  '泳池': '健身房和恒温泳池位于3楼，24小时凭房卡进入。',
  '游泳池': '健身房和恒温泳池位于3楼，24小时凭房卡进入。',
  '餐厅': '中餐厅在2楼，西餐厅在1楼，营业时间请查询房内指南。',
  '酒吧': '大堂吧位于1楼，开放时间为下午2点至晚上11点。',
  '停车场': '停车场在地下一层，住客免费停车，离场前请到前台登记车牌。',
  '地下车库': '停车场在地下一层，住客免费停车，离场前请到前台登记车牌。',
  '洗衣房': '自助洗衣房在5楼，24小时开放，提供免费洗衣液。',
  '自助洗衣': '自助洗衣房在5楼，24小时开放，提供免费洗衣液。',
  '商务中心': '商务中心在2楼，提供打印、复印服务，开放时间为8:00-20:00。',
  '退房时间': '标准退房时间为中午 12:00。如需延迟，请联系前台。',
  '入住时间': '入住时间为下午14:00之后，如有空房可提前安排。',
  '续住': '续住请致电前台，将根据房态为您安排。',
  '无线网': '连接名为 SmartHotel 的无线网络，免密码，跳转页面后输入房间号和姓氏即可。',
  'Wi-Fi': '连接名为 SmartHotel 的无线网络，免密码，跳转页面后输入房间号和姓氏即可。',
  '密码': '连接名为 SmartHotel 的无线网络，免密码，跳转页面后输入房间号和姓氏即可。',
  '天气': '今天上海天气晴朗，气温 22 到 28 度，非常适合外出。',
  '时间': `现在是北京时间 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}。`,
  '叫醒': '请说"早上7点叫醒我"，我会为您设置叫醒服务。',
  '充电器': '充电器和转换插头可联系客房服务借用，免押金。',
  '转换插头': '充电器和转换插头可联系客房服务借用，免押金。',
  '婴儿床': '婴儿床免费提供，加床需额外收费，请致电前台确认。',
  '紧急出口': '紧急出口位于走廊两端，请按照绿色指示灯方向撤离。',
  '安全通道': '紧急出口位于走廊两端，请按照绿色指示灯方向撤离。',
  '最近医院': '最近的医院是市第一人民医院，距离酒店3公里，车程约10分钟。'
};

const functionDeclarations = [
  {
    name: "controlClimate",
    description: "Adjust the room temperature.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        targetTemp: {
          type: Type.NUMBER,
          description: "The target temperature in Celsius (16-30).",
        },
      },
      required: ["targetTemp"],
    },
  },
  {
    name: "toggleLight",
    description: "Turn lights on or off.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        state: {
          type: Type.BOOLEAN,
          description: "True for on, false for off.",
        },
      },
      required: ["state"],
    },
  },
  {
    name: "toggleCurtains",
    description: "Open or close the curtains.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        state: {
          type: Type.BOOLEAN,
          description: "True for open, false for closed.",
        },
      },
      required: ["state"],
    },
  },
  {
    name: "setScene",
    description: "Set a specific room scene mode.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        sceneId: {
          type: Type.STRING,
          enum: ["relax", "cinema", "read", "morning", "sleep"],
          description: "The ID of the scene to activate.",
        },
      },
      required: ["sceneId"],
    },
  },
  {
    name: "requestService",
    description: "Request hotel services like water, towels, or maintenance.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        item: {
          type: Type.STRING,
          description: "The item or service requested (e.g., 'water', 'towels').",
        },
      },
      required: ["item"],
    },
  },
  {
    name: "queryInfo",
    description: "Ask for hotel information like breakfast times or facilities.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: {
          type: Type.STRING,
          description: "The topic being asked about.",
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "navigate",
    description: "Navigate to a different view in the app.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        view: {
          type: Type.STRING,
          enum: ["home", "devices", "services", "profile"],
          description: "The view to navigate to.",
        },
      },
      required: ["view"],
    },
  },
];

export class VoiceService {
  public funasrService = new FunasrService();
  public isListening = false;
  public isSpeaking = false;
  private lastCommand = "";
  private lastCommandTime = 0;
  private onResultCallback: (text: string) => void = () => {};
  private onActionCallback: (action: VoiceCommandAction) => void = () => {};
  private onErrorCallback: (error: string) => void = () => {};
  private onWakeCallback: () => void = () => {};
  private onSpeechEndCallback: () => void = () => {};
  private activeCheckoutSession = false;
  private audioCtx: AudioContext | null = null;
  private conversationHistory: { role: 'user' | 'model', parts: { text: string }[] }[] = [];
  private _interimText = "";

  constructor() {
    // FunasrService handles ASR (initialized as class property above).
    // Audio will be unlocked on first user interaction via unlockAudio().
  }

  private _activeUtterance: SpeechSynthesisUtterance | null = null;
  private _keepAliveTimer: any = null;

  speak(text: string) {
    if (typeof window === 'undefined' || !text) return;

    // 强制取消之前的播报，通过先 resume 再 cancel 解决部分浏览器卡死状态
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();

    if (this._keepAliveTimer) {
      clearInterval(this._keepAliveTimer);
      this._keepAliveTimer = null;
    }

    // 解决部分浏览器（如 Chrome）中长语音被垃圾回收导致中断的问题
    this._activeUtterance = new SpeechSynthesisUtterance(text);
    const utterance = this._activeUtterance;

    utterance.lang = 'zh-CN';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.includes('zh-CN') && v.name.includes('Google')) ||
                    voices.find(v => v.lang.includes('zh-CN')) ||
                    voices.find(v => v.lang.includes('zh'));

    if (zhVoice) {
      utterance.voice = zhVoice;
    }

    // 针对 Chrome 的长语音存活优化
    utterance.onstart = () => {
      this.isSpeaking = true;
      // 停止收音，避免自言自语（反馈语音时需等语音反馈完再继续接收）
      if (this.funasrService.isListening) {
        this.funasrService.stop();
      }

      // 每隔 10 秒调用一次 pause/resume 是解决 Chrome 语音截断的玄学有效方案
      this._keepAliveTimer = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);
    };

    const cleanup = () => {
      this.isSpeaking = false;
      this._activeUtterance = null;
      if (this._keepAliveTimer) {
        clearInterval(this._keepAliveTimer);
        this._keepAliveTimer = null;
      }

      this.onSpeechEndCallback();

      // 语音反馈完后再继续接收语音指令
      if (this.isListening && !this.funasrService.isListening) {
        setTimeout(() => {
          try {
            this.funasrService.start();
          } catch(e) {}
        }, 300);
      }
    };

    utterance.onend = cleanup;
    utterance.onerror = (e) => {
      console.error('[VoiceService] Speech synthesis error:', e);
      cleanup();
    };

    window.speechSynthesis.speak(utterance);
  }

  // Warm up the speech synthesis (call this on first user interaction)
  unlockAudio() {
    if (typeof window === 'undefined') return;

    // Initialize AudioContext for beeps
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const utterance = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(utterance);
    console.log('[VoiceService] Audio unlocked');
  }

  private playBeep(type: 'start' | 'success' | 'error' | 'think') {
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    const now = this.audioCtx.currentTime;

    switch(type) {
      case 'start':
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 'success':
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.1);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'think':
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'error':
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(220, now + 0.2);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
    }
  }

  async processCommand(text: string, context?: any) {
    const cleanText = text.trim();
    if (!cleanText) return;

    // 15. 重复指令短时间内 (5秒内相同指令)
    const now = Date.now();
    if (cleanText === this.lastCommand && (now - this.lastCommandTime < 5000)) {
      let feedback = "指令已执行。";
      if (cleanText.includes('开灯')) feedback = "灯光已经打开了。";
      else if (cleanText.includes('关灯')) feedback = "灯光已经关闭了。";
      this.speak(feedback);
      this.onResultCallback(feedback);
      return;
    }
    this.lastCommand = cleanText;
    this.lastCommandTime = now;

    // 7. 指令冲突 (Simulated: if command contains both contradictory action keywords for the same context)
    // 排除"玄关"和"开关"中的字干扰
    const safeText = cleanText.replace(/玄关/g, '').replace(/开关/g, '');
    if ((safeText.includes('打开') || safeText.includes('开启')) && (safeText.includes('关闭') || safeText.includes('关掉') || safeText.includes('熄灭'))) {
        const response = "指令冲突，请稍后再试。";
        this.speak(response);
        this.onResultCallback(response);
        return;
    }

    // 17. 音量调节超出范围 (Simulated)
    if (cleanText.includes('音量') && (cleanText.includes('最大') || cleanText.includes('最小') || cleanText.includes('满'))) {
        const isMax = cleanText.includes('最大') || cleanText.includes('满');
        const response = isMax ? "音量已经最大了。" : "音量已经最小了。";
        this.speak(response);
        this.onResultCallback(response);
        return;
    }

    // 2. 设备无响应 (Simulated: random failure)
    if (Math.random() < 0.05 && (cleanText.includes('开') || cleanText.includes('关'))) {
        let device = "设备";
        if (cleanText.includes('灯')) device = "灯光";
        else if (cleanText.includes('窗')) device = "窗帘";
        const response = `${device}没有响应，您可以手动操作或稍后重试。`;
        this.speak(response);
        this.onResultCallback(response);
        return;
    }

    // 3. 网络中断（模拟侦测）
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (cleanText.includes('天气') || cleanText.includes('新闻') || cleanText.includes('上网')) {
            const response = "网络暂时不可用，但客房设备控制仍可正常使用。";
            this.speak(response);
            this.onResultCallback(response);
            return;
        }
    }

    // 1. Local Rule Check (Privacy & Near-Instant Response for common commands)
    if (this.activeCheckoutSession) {
      if (cleanText.includes('确认') || cleanText.includes('好的') || cleanText.includes('是的')) {
        this.activeCheckoutSession = false;
        const response = "已为您通知前台办理退房，请确认账单后离开。祝您旅途愉快！";
        this.speak(response);
        this.onActionCallback({ type: 'CHECKOUT', payload: { confirm: true }, response });
        return;
      } else if (cleanText.includes('取消') || cleanText.includes('不退了')) {
        this.activeCheckoutSession = false;
        const response = "已为您取消退房。";
        this.speak(response);
        this.onActionCallback({ type: 'CHECKOUT', payload: { confirm: false }, response });
        return;
      }
    }

    if (cleanText.includes('退房') || cleanText.includes('我要退房')) {
      this.activeCheckoutSession = true;
      const response = "您确定要退房吗？确认后房间电源将关闭。";
      this.speak(response);
      this.onActionCallback({ type: 'CHECKOUT', payload: { confirm: false }, response });
      return;
    }

    // High-frequency local command matching (Bypasses AI latency & saves quota)
    // 3.2.2.1. 核心设备控制 (本地/即时响应)

    // LIGHTS
    const openLightRegex = /(开启|打开|亮|开|把).*(灯|照明|所有灯)/;
    const closeLightRegex = /(关闭|关掉|熄|关|把|关上|关了).*(灯|照明|所有灯)/;

    if (openLightRegex.test(cleanText)) {
      let area = 'all';
      let response = "好的，灯已为您开启。";
      if (cleanText.includes('玄关')) { area = 'entrance'; response = "好的，玄关灯已为您打开。"; }
      else if (cleanText.includes('阳台')) { area = 'balcony'; response = "好的，阳台灯已为您打开。"; }
      else if (cleanText.includes('床头')) { area = 'bedside'; response = "好的，床头灯已为您打开。"; }
      else if (cleanText.includes('卧室')) { area = 'bedroom'; response = "好的，卧室灯已为您打开。"; }
      else if (cleanText.includes('卫生间') || cleanText.includes('洗手间') || cleanText.includes('厕所')) { area = 'bathroom'; response = "卫生间灯已打开。"; }
      else if (cleanText.includes('镜前')) { area = 'mirror'; response = "镜前灯已打开。"; }

      this.speak(response);
      this.onActionCallback({ type: 'LIGHTS', payload: { state: true, area }, response });
      return;
    }
    if (closeLightRegex.test(cleanText)) {
      let area = 'all';
      let response = "好的，灯已为您关闭。";
      if (cleanText.includes('玄关')) { area = 'entrance'; response = "好的，玄关灯已为您关闭。"; }
      else if (cleanText.includes('阳台')) { area = 'balcony'; response = "好的，阳台灯已为您关闭。"; }
      else if (cleanText.includes('床头')) { area = 'bedside'; response = "好的，床头灯已为您关闭。"; }
      else if (cleanText.includes('卧室')) { area = 'bedroom'; response = "好的，卧室灯已为您关闭。"; }
      else if (cleanText.includes('卫生间') || cleanText.includes('洗手间') || cleanText.includes('厕所')) { area = 'bathroom'; response = "卫生间灯已关闭。"; }
      else if (cleanText.includes('镜前')) { area = 'mirror'; response = "镜前灯已关闭。"; }

      this.speak(response);
      this.onActionCallback({ type: 'LIGHTS', payload: { state: false, area }, response });
      return;
    }

    // CURTAINS
    const openCurtainRegex = /(拉开|打开|开启|打开窗纱|拉开窗纱)/;
    const closeCurtainRegex = /(关闭|合上|拉上|关|关上窗纱|关闭窗纱)/;

    if (openCurtainRegex.test(cleanText) && (cleanText.includes('窗帘') || cleanText.includes('窗纱'))) {
      let type = 'main';
      let response = "好的，窗帘已为您拉开。";
      if (cleanText.includes('纱')) { type = 'gauze'; response = "好的，窗纱已为您打开。"; }

      this.speak(response);
      this.onActionCallback({ type: 'CURTAINS', payload: { state: true, type }, response });
      return;
    }
    if (closeCurtainRegex.test(cleanText) && (cleanText.includes('窗帘') || cleanText.includes('窗纱'))) {
      let type = 'main';
      let response = "好的，窗帘已为您关闭。";
      if (cleanText.includes('纱')) { type = 'gauze'; response = "好的，窗纱已为您关闭。"; }

      this.speak(response);
      this.onActionCallback({ type: 'CURTAINS', payload: { state: false, type }, response });
      return;
    }

    // AC
    const openACRegex = /(开启|打开|启动|开).*(空调|温控)/;
    const closeACRegex = /(关闭|关掉|停掉|关).*(空调|温控)/;

    if (openACRegex.test(cleanText)) {
      const response = "空调已开启，温度设定为26度。";
      this.speak(response);
      this.onActionCallback({ type: 'CLIMATE', payload: { state: true, targetTemp: 26 }, response });
      return;
    }
    if (closeACRegex.test(cleanText)) {
      const response = "空调已关闭。";
      this.speak(response);
      this.onActionCallback({ type: 'CLIMATE', payload: { state: false }, response });
      return;
    }

    // Explicit Temp Set
    const tempMatch = cleanText.match(/(\d+)度/);
    if (tempMatch && (cleanText.includes('空调') || cleanText.includes('温度') || cleanText.includes('调到'))) {
       const t = parseInt(tempMatch[1]);
       if (t >= 16 && t <= 30) {
         const response = `空调温度已设定为${t}度。`;
         this.speak(response);
         this.onActionCallback({ type: 'CLIMATE', payload: { targetTemp: t }, response });
         return;
       } else {
         // 18. 温度调节超出范围
         const target = t < 16 ? 16 : 30;
         const limitText = t < 16 ? '低' : '高';
         const response = `温度范围是16到30度，已为您设置为最${limitText}温度。`;
         this.speak(response);
         this.onActionCallback({ type: 'CLIMATE', payload: { targetTemp: target }, response });
         return;
       }
    }

    // Fuzzy Temperature Logic
    const tooColdRegex = /(冷|冻|凉|加温|调高|太冷了)/;
    const tooHotRegex = /(热|闷|调低|降低|有点热)/;

    if (tooColdRegex.test(cleanText) && (cleanText.includes('空调') || cleanText.includes('度') || cleanText.includes('调') || cleanText.includes('点') || cleanText.includes('冷'))) {
       const response = "好的，已为您将温度调高2度。";
       this.speak(response);
       this.onActionCallback({ type: 'CLIMATE', payload: { adjust: 2 }, response });
       return;
    }
    if (tooHotRegex.test(cleanText) && (cleanText.includes('空调') || cleanText.includes('度') || cleanText.includes('调') || cleanText.includes('点') || cleanText.includes('热'))) {
       const response = "好的，已为您将温度调低2度。";
       this.speak(response);
       this.onActionCallback({ type: 'CLIMATE', payload: { adjust: -2 }, response });
       return;
    }

    // BATH & CINEMA
    if (cleanText.includes('排风扇')) {
      const response = cleanText.includes('开') ? "排风扇已开启。" : "排风扇已关闭。";
      this.speak(response);
      this.onActionCallback({ type: 'SERVICE', payload: { device: 'fan', state: cleanText.includes('开') }, response });
      return;
    }
    if (cleanText.includes('投影仪')) {
      const response = cleanText.includes('开') ? "投影仪已打开。" : "投影仪已关闭。";
      this.speak(response);
      this.onActionCallback({ type: 'SERVICE', payload: { device: 'projector', state: cleanText.includes('开') }, response });
      return;
    }

    // SCENES
    if (cleanText.includes('起床模式') || cleanText.includes('早上好')) {
      const response = "早上好，已为您开启起床模式。";
      this.speak(response);
      this.onActionCallback({ type: 'SCENE', payload: { sceneId: 'morning' }, response });
      return;
    }
    if (cleanText.includes('晚安模式') || cleanText.match(/晚安/)) {
      const response = "晚安模式已启动，祝您安睡。";
      this.speak(response);
      this.onActionCallback({ type: 'SCENE', payload: { sceneId: 'sleep' }, response });
      return;
    }
    if (cleanText.includes('影院模式') || cleanText.includes('看电影') || cleanText.includes('娱乐模式')) {
      const response = "娱乐模式已启动，享受专属于您的娱乐时光。";
      this.speak(response);
      this.onActionCallback({ type: 'SCENE', payload: { sceneId: 'entertainment' }, response });
      return;
    }

    // 13. 叫醒服务重复设置 (Simulated)
    if (cleanText.includes('叫醒') || cleanText.includes('闹钟')) {
        if (cleanText.includes('修改') || (this as any)._hasWakeupSet) {
           const response = "您已设置过叫醒服务，需要修改时间吗？";
           this.speak(response);
           this.onResultCallback(response);
           return;
        }
        (this as any)._hasWakeupSet = true;
        const response = "好的，已为您设置叫醒服务。";
        this.speak(response);
        this.onResultCallback(response);
        return;
    }

    // SERVICES
    if (cleanText.includes('呼叫前台')) {
      const response = "正在为您转接前台，请稍后。";
      this.speak(response);
      this.onActionCallback({ type: 'SERVICE', payload: { action: 'call_front_desk' }, response });
      return;
    }
    if (cleanText.includes('SOS') || cleanText.includes('紧急求助')) {
      const response = "紧急求助信号已发出，酒店安保将立即前往您的房间。";
      this.speak(response);
      this.onActionCallback({ type: 'SERVICE', payload: { action: 'sos' }, response });
      return;
    }
    if (cleanText.includes('请勿打扰模式') || cleanText.includes('开启免打扰')) {
      const response = "已为您开启请勿打扰模式。";
      this.speak(response);
      this.onActionCallback({ type: 'SERVICE', payload: { action: 'dnd', state: true }, response });
      return;
    }
    if (cleanText.includes('打扫房间') || cleanText.includes('请打扫')) {
      const response = "已为您预约房间打扫，服务员将尽快到达。";
      this.speak(response);
      this.onActionCallback({ type: 'SERVICE', payload: { action: 'cleaning' }, response });
      return;
    }
    if (cleanText.includes('水') || cleanText.includes('牙刷') || cleanText.includes('拖鞋')) {
       const response = "好的，马上为您送一瓶矿泉水。";
       this.speak(response);
       this.onActionCallback({ type: 'SERVICE', payload: { action: 'delivery', item: '矿泉水' }, response });
       return;
    }
    if (cleanText.includes('温度') && (cleanText.includes('多少') || cleanText.includes('几度'))) {
      const currentTemp = context?.temperature || '24°C';
      const response = `当前客房温度为 ${currentTemp}。`;
      this.speak(response);
      this.onActionCallback({ type: 'QUERY', payload: { topic: 'temperature' }, response });
      return;
    }

    for (const [key, val] of Object.entries(INFO_QUERY_DATABASE)) {
      if (cleanText.includes(key)) {
        this.speak(val);
        this.onActionCallback({ type: 'QUERY', payload: { topic: key }, response: val });
        return;
      }
    }

    // 19. 未登录/未识别客人 (Simulated)
    if (cleanText.includes('入住') || cleanText.includes('身份')) {
      const response = "欢迎光临，请先到前台办理入住手续。";
      this.speak(response);
      this.onResultCallback(response);
      return;
    }

    // 20. 系统维护中 (Simulated)
    if (cleanText.includes('维护') || cleanText.includes('升级')) {
      const response = "系统正在维护中，部分功能暂不可用，预计2小时后恢复。";
      this.speak(response);
      this.onResultCallback(response);
      return;
    }

    // 6. 权限不足 (Simulated check)
    if (cleanText.includes('隔壁') || cleanText.includes('走廊') || cleanText.includes('大厅')) {
        const response = "抱歉，您没有权限控制这个设备。";
        this.speak(response);
        this.onResultCallback(response);
        return;
    }

    // 8. 设备不可控 / 不配备
    if (cleanText.includes('冰箱') || cleanText.includes('洗衣机') || cleanText.includes('路由器')) {
        const response = cleanText.includes('冰箱') ? "冰箱暂不支持语音控制。" : "抱歉，这个房间没有该设备。";
        this.speak(response);
        this.onResultCallback(response);
        return;
    }

    // 2. Intelligent AI Processing for complex intent (Optimized with concise output requirement)
    try {
      // Basic client-side debounce and circuit-breaker for quota
      const now = Date.now();

      // Check if we are in a cooldown period after a 429 error
      if ((this as any)._aiCooldownUntil && now < (this as any)._aiCooldownUntil) {
        const remaining = Math.ceil(((this as any)._aiCooldownUntil - now) / 1000);
        console.warn(`[VoiceService] AI in cooldown for ${remaining}s...`);
        const cooldownMsg = "抱歉，由于交互过于频繁，语音助手正在休息中，请稍后再试。";
        this.speak(cooldownMsg);
        this.onErrorCallback(cooldownMsg);
        return;
      }

      if ((this as any)._lastAiCall && (now - (this as any)._lastAiCall < 1500)) { // Increased to 1.5s
        console.warn('[VoiceService] Skipping AI call due to rapid triggering');
        return;
      }
      (this as any)._lastAiCall = now;

        const contextStr = context ? `Current State: ${JSON.stringify(context)}` : '';

        // Mantain simple conversation history
        const userTurn = { role: 'user' as const, parts: [{ text: `${contextStr}\nUser Command: ${cleanText}` }] };
        const history = [...this.conversationHistory, userTurn].slice(-6); // Keep last 3 turns

        this.playBeep('think');

        const ai = getAI();
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: history,
          config: {
            tools: [{ functionDeclarations }],
            systemInstruction: `你是一个优雅、专业的五星级酒店智能管家'小枢'。说话风格要温柔、得体且高效。
                你会收到包含房间状态（温度、灯光、窗帘、屏幕亮度、房号、客姓名、入住天数等）的详细上下文。
                请根据用户意图返回函数调用。如果设备在上下文中标记为 'OFFLINE'，请告知用户。
                如果你认为用户只是在闲聊，请直接简短回复。
                回复必须极其简练，不要说废话。如果是函数调用，verbal message也必须简练（例如：'好的，为您开灯'）。
                如果用户是想询问酒店信息，请基于上下文回复。
                你是 NexCore 系统的核心，代表着酒店的高科技与人性化结合。`,
            temperature: 0.1,
            maxOutputTokens: 150,
          }
        });

        const calls = response.functionCalls;
        const textResponse = response.text;

        // Update history
        this.conversationHistory = [...history, {
          role: 'model' as const,
          parts: [{ text: textResponse || (calls && calls.length > 0 ? `[Function Call: ${calls[0].name}]` : "...") }]
        }].slice(-6);

        if (calls && calls.length > 0) {
          this.playBeep('success');
        const call = calls[0];
        let action: VoiceCommandAction | null = null;
        let verbalMsg = "";

        switch (call.name) {
          case 'controlClimate':
            const temp = call.args.targetTemp;
            verbalMsg = `空调已为您设为 ${temp} 度。`;
            action = { type: 'CLIMATE', payload: call.args, response: verbalMsg };
            break;
          case 'toggleLight':
            const lState = call.args.state;
            verbalMsg = lState ? "好的，灯光已打开。" : "好的，灯光已为您关闭。";
            action = { type: 'LIGHTS', payload: call.args, response: verbalMsg };
            break;
          case 'toggleCurtains':
            const cState = call.args.state;
            verbalMsg = cState ? "窗帘已为您拉开。" : "好的，窗帘已关闭。";
            action = { type: 'CURTAINS', payload: call.args, response: verbalMsg };
            break;
          case 'setScene':
            const scene = call.args.sceneId;
            if (scene === 'sleep' || cleanText.includes('睡')) {
              verbalMsg = "晚安，已为您开启睡眠模式。";
            } else {
              verbalMsg = `好的，场景已切换。`;
            }
            action = { type: 'SCENE', payload: call.args, response: verbalMsg };
            break;
          case 'requestService':
            const item = call.args.item;
            verbalMsg = `已通知服务员为您送 ${item}，请稍等。`;
            action = { type: 'SERVICE', payload: call.args, response: verbalMsg };
            break;
          case 'navigate':
            verbalMsg = "好的。";
            action = { type: 'NAVIGATION', payload: call.args, response: verbalMsg };
            break;
        }

        if (action) {
          if (verbalMsg) this.speak(verbalMsg);
          this.onActionCallback(action);
        }
      } else {
        // Fallback for general conversation or unrecognized commands
        if (textResponse) {
          this.speak(textResponse);
          // Use onActionCallback for consistency so UI can show 'responding' state
          this.onActionCallback({ type: 'QUERY', payload: { text: textResponse }, response: textResponse });
        } else {
          // 5. 意图理解失败
          const response = "我不太明白您的意思，您可以试试说'打开窗帘'或'我要喝水'。";
          this.speak(response);
          this.onResultCallback(response);
        }
      }
    } catch (error: any) {
      console.error('Gemini Voice Processing Error:', error);

      // 5. 意图理解失败 / 系统忙
      let errorMsg = "我不太明白您的意思，您可以试试说'打开窗帘'或'我要喝水'。";
      const errorStr = typeof error === 'string' ? error : JSON.stringify(error);

      // Extensive check for Quota/Rate Limit/429
      const isQuotaError =
        error?.error?.code === 429 ||
        error?.status === "RESOURCE_EXHAUSTED" ||
        errorStr.includes('429') ||
        errorStr.toLowerCase().includes('quota') ||
        errorStr.toLowerCase().includes('limit');

      if (isQuotaError) {
        errorMsg = "抱歉，由于交互过于频繁，语音助手暂时需要休息一下。请稍后重试或使用屏幕控制。";
        console.warn('[VoiceService] Gemini Quota/Rate Limit Exceeded. Entering 120s cooldown.');
        (this as any)._aiCooldownUntil = Date.now() + 120000;
      }

      this.speak(errorMsg);
      this.onErrorCallback(errorMsg);
    }
  }

  start(onResult: (text: string) => void, onAction: (action: VoiceCommandAction) => void, onError: (err: string) => void, onWake: () => void, onSpeechEnd: () => void, context?: any) {
    this.onResultCallback = onResult;
    this.onActionCallback = onAction;
    this.onErrorCallback = onError;
    this.onWakeCallback = onWake;
    this.onSpeechEndCallback = onSpeechEnd;
    (this as any)._lastContext = context;
    this._interimText = ""; // 强制重置临时文本缓冲区

    this.playBeep('start');

    // 唤醒与开启确认：立即进入收音状态并显示
    this.onResultCallback("语音服务已开启");

    if (this.isListening) return;

    // 设置 FunasrService 回调
    this.funasrService.onresult = (text: string, isFinal: boolean) => {
      if (!text.trim()) return;

      // Interrupt AI if user starts speaking
      if (isFinal && text.length > 1 && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        console.log('[VoiceService] Interrupted AI speech because user started talking.');
      }

      // 临时文本：更新 UI
      if (!isFinal) {
        this._interimText = text;
        this.onResultCallback(text);
        return;
      }

      // 最终结果
      this.onResultCallback(text);

      // 唤醒词检测
      const wakeWords = ['小枢', '小述', '小书', '小梳', '你好小枢', 'hi 小枢', 'hey 小枢', '消暑', '小舒'];
      const wakeReg = new RegExp(`(${wakeWords.join('|')})`, 'i');
      const matchedWakeWord = text.match(wakeReg);

      if (matchedWakeWord) {
        const parts = text.split(wakeReg);
        const command = parts[parts.length - 1]?.trim();

        if (!(this as any)._lastWakeTime || (Date.now() - (this as any)._lastWakeTime > 3000)) {
          this.playBeep('start');
          (this as any)._lastWakeTime = Date.now();
        }

        this.onWakeCallback();

        if (command && command.length >= 2) {
          // High-frequency commands: process immediately
          const highFreqRegex = /(开灯|关灯|开窗帘|关窗帘|退房)/;
          if (highFreqRegex.test(command)) {
            this.processCommand(command, (this as any)._lastContext);
            return;
          }
        }

        this.processCommand(command || text, (this as any)._lastContext);
        return;
      }

      // 无唤醒词：直接处理
      this.processCommand(text, (this as any)._lastContext);
    };

    this.funasrService.onerror = (err: string) => {
      console.error('[VoiceService] FunasrService error:', err);
      this.onErrorCallback(err);
    };

    this.funasrService.onend = () => {
      // 自动重启（FunasrService 内部已处理自动重连，这里用于兜底）
      if (this.isListening && !this.isSpeaking) {
        setTimeout(() => {
          try {
            if (this.isListening && !this.isSpeaking && !this.funasrService.isListening) {
              this.funasrService.start();
            }
          } catch (e) {
            // ignore
          }
        }, 300);
      }
    };

    try {
      this.funasrService.start();
      this.isListening = true;
    } catch (e) {
      console.error('Error starting funasr service:', e);
      onError('麦克风启动失败');
    }
  }

  updateContext(context: any) {
    (this as any)._lastContext = context;
  }

  stop() {
    // 停止与连续交互：再次点击时停止收音并立即解析
    if (this.isListening && this._interimText && this._interimText.trim().length > 0) {
      console.log('[VoiceService] Manual stop, processing interim text:', this._interimText);
      this.processCommand(this._interimText, (this as any)._lastContext);
    }

    this.isListening = false;
    this.funasrService.stop();

    // 处理完成后/停止后：切换至就绪状态
    this._interimText = "";
    this.onActionCallback({ type: 'WAKE', payload: { action: 'ready' }, response: '继续收音' });
  }

  clearLogs() {
    console.log('[VoiceService] Clearing local session logs and transcript history.');
    this.conversationHistory = [];
    this.activeCheckoutSession = false;
    this._interimText = "";
    this.onResultCallback("");
    // Signal UI to clear display
    this.onActionCallback({ type: 'WAKE', payload: { action: 'clear' }, response: '' });
  }
}

export const voiceService = new VoiceService();
