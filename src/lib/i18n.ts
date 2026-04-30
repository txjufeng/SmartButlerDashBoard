import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  zh: {
    translation: {
      "welcome": "欢迎回来",
      "concierge": "礼宾服务",
      "billing": "查看账单",
      "settings": "设置",
      "brightness": "屏幕亮度",
      "language": "语言设置",
      "stay_days": "入住天数",
      "room_type": "房型",
      "checkout": "立即结算",
      "listening": "小枢正在倾听...",
      "responding": "小枢正在思考...",
      "idle_msg": "点击开启语音服务",
      "hi_xiaoshu": "Hi 小枢",
      "days": "天",
      "suite": "总统套房",
      "slogan": "每一扇门的背后，都有一个〇枢在思考，小枢全天候为您服务！",
      "chat": "AI 聊天",
      "chat_placeholder": "问我关于酒店的问题...",
      "send": "发送"
    }
  },
  en: {
    translation: {
      "welcome": "WELCOME BACK",
      "concierge": "Concierge",
      "billing": "BILLING",
      "settings": "Settings",
      "brightness": "Brightness",
      "language": "Language",
      "stay_days": "Stay Days",
      "room_type": "Room Type",
      "checkout": "QUICK CHECKOUT",
      "listening": "Listening...",
      "responding": "Responding...",
      "idle_msg": "Tap to enable Voice",
      "hi_xiaoshu": "Hi NexCore",
      "days": "Days",
      "suite": "Presidential Suite",
      "slogan": "Behind every door, there's a NexCore thinking, at your service 24/7!",
      "chat": "AI Chat",
      "chat_placeholder": "Ask me anything about the hotel...",
      "send": "Send"
    }
  },
  jp: {
    translation: {
      "welcome": "お帰りなさい",
      "concierge": "コンシェルジュ",
      "billing": "請求書",
      "settings": "設定",
      "brightness": "明るさ",
      "language": "言語設定",
      "stay_days": "滞在日数",
      "room_type": "部屋タイプ",
      "checkout": "チェックアウト",
      "listening": "聞いています...",
      "responding": "応答中...",
      "idle_msg": "タップして音声を有効にする",
      "hi_xiaoshu": "こんにちは",
      "days": "日",
      "suite": "プレジデンシャルスイート",
      "slogan": "すべてのドアの向こうには思考するNexCoreがあり、24時間365日あなたをお手伝いします！"
    }
  },
  kr: {
    translation: {
      "welcome": "환영합니다",
      "concierge": "컨시어지",
      "billing": "청구서",
      "settings": "설정",
      "brightness": "밝기",
      "language": "언어 설정",
      "stay_days": "숙박 일수",
      "room_type": "객실 유형",
      "checkout": "체크아웃",
      "listening": "듣는 중...",
      "responding": "응답 중...",
      "idle_msg": "터치하여 음성 활성화",
      "hi_xiaoshu": "안녕하세요",
      "days": "일",
      "suite": "프레지덴셜 스위트",
      "slogan": "모든 문 뒤에는 생각하는 NexCore가 있으며 24시간 내내 서비스를 제공합니다!"
    }
  },
  fr: {
    translation: {
      "welcome": "BIENVENUE",
      "concierge": "Conciergerie",
      "billing": "FACTURATION",
      "settings": "Paramètres",
      "brightness": "Luminosité",
      "language": "Langue",
      "stay_days": "Jours de séjour",
      "room_type": "Type de chambre",
      "checkout": "PAIEMENT RAPIDE",
      "listening": "Écoute...",
      "responding": "Réponse...",
      "idle_msg": "Appuyez pour activer la voix",
      "hi_xiaoshu": "Bonjour",
      "days": "Jours",
      "suite": "Suite Présidentielle",
      "slogan": "Derrière chaque porte, il y a un NexCore qui pense, à votre service 24/7 !"
    }
  },
  de: {
    translation: {
      "welcome": "WILLKOMMEN",
      "concierge": "Concierge",
      "billing": "ABRECHNUNG",
      "settings": "Einstellungen",
      "brightness": "Helligkeit",
      "language": "Sprache",
      "stay_days": "Aufenthaltstage",
      "room_type": "Zimmertyp",
      "checkout": "SCHNELLER CHECKOUT",
      "listening": "Zuhören...",
      "responding": "Antworten...",
      "idle_msg": "Tippen, um Stimme zu aktivieren",
      "hi_xiaoshu": "Hallo",
      "days": "Tage",
      "suite": "Präsidentensuite",
      "slogan": "Hinter jeder Tür denkt ein NexCore, 24/7 für Sie da!"
    }
  },
  es: {
    translation: {
      "welcome": "BIENVENIDO",
      "concierge": "Conserjería",
      "billing": "FACTURACIÓN",
      "settings": "Ajustes",
      "brightness": "Brillo",
      "language": "Idioma",
      "stay_days": "Días de estancia",
      "room_type": "Tipo de habitación",
      "checkout": "PAGO RÁPIDO",
      "listening": "Escuchando...",
      "responding": "Respondiendo...",
      "idle_msg": "Toca para activar voz",
      "hi_xiaoshu": "Hola",
      "days": "Días",
      "suite": "Suite Presidencial",
      "slogan": "Detrás de cada puerta hay un NexCore pensando, ¡a su servicio las 24 horas, los 7 días de la semana!"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
