import { GoogleGenAI, Type } from "@google/genai";

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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const functionDeclarations = [
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
];

export class ChatService {
  private chatHistory: { role: 'user' | 'model', parts: { text: string }[] }[] = [];

  async sendMessage(message: string, context?: any) {
    try {
      const ai = getAI();
      const contextStr = context ? `Current state: ${JSON.stringify(context)}` : '';
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...this.chatHistory,
          { role: 'user', parts: [{ text: `${contextStr}\nUser: ${message}` }] }
        ],
        config: {
          tools: [{ functionDeclarations }],
          systemInstruction: "你是一个优雅、专业的五星级酒店智能管家'小枢'。你的回复要体贴且高效。你会收到包含房间状态（温度、灯光、窗帘、屏幕亮度、房号、客姓名、入住天数等）的上下文。你可以回答关于酒店的问题，协助用户控制房间，或者请求额外服务。如果你发现用户想调整的设备（如灯光、空调、窗帘）在上下文中标记为 'OFFLINE'，请礼貌地告知用户该设备目前离线并建议手动操作。你的回答如果是文本，请保持温馨且专业。",
          temperature: 0.7,
        }
      });
      
      const textResponse = response.text || "";
      const functionCalls = response.functionCalls;

      // Update history
      this.chatHistory.push({ role: 'user', parts: [{ text: message }] });
      if (textResponse) {
        this.chatHistory.push({ role: 'model', parts: [{ text: textResponse }] });
      }

      return {
        text: textResponse,
        actions: functionCalls || []
      };
    } catch (error) {
      console.error('[ChatService] Error:', error);
      throw error;
    }
  }

  clearHistory() {
    this.chatHistory = [];
  }
}

export const chatService = new ChatService();
