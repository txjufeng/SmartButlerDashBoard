# 智能客房控制系统 (Smart Butler Dashboard)

这是一个全栈智能客房控制应用，集成了语音控制、设备管理和硬件代理服务。

## 如何本地运行 (How to run locally)

### 1. 准备环境
确保你的电脑已安装 [Node.js](https://nodejs.org/) (推荐 v18+)。

### 2. 获取代码
如果你是从 Google AI Studio 导出的，请解压压缩包到你的本地目录。

### 3. 安装依赖
打开终端或命令行，进入项目根目录，运行：
```bash
npm install
```

### 4. 配置环境变量
在项目根目录创建一个 `.env` 文件（可以参考 `.env.example`），并填入你的 Gemini API Key：
```env
GEMINI_API_KEY="你的_GEMINI_API_KEY"
```
*注意：你可以从 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取 API Key。*

### 5. 启动开发服务器
运行以下命令启动项目：
```bash
npm run dev
```
项目启动后，通常可以在浏览器访问 `http://localhost:3000`。

## 主要功能
- **全栈架构**：使用 Express + Vite 搭建，解决了前端跨域控制硬件的问题。
- **语音控制**：内置智能语音助手，支持多种语言和指令。
- **硬件代理**：通过服务器端代理（`/api/hardware/...`）控制真实的物联网设备。
- **调试面板**：内置硬件调试工具，方便验证指令传输。

## 技术栈
- **前端**: React, Tailwind CSS, Framer Motion, Lucide Icons, i18next
- **后端**: Node.js, Express, tsx
- **语音/AI**: Google Gemini API, Web Speech API
