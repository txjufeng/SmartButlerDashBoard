/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Smartphone, 
  ConciergeBell, 
  User, 
  Wifi, 
  Sun, 
  MinusCircle,
  Plus,
  Minus,
  Lightbulb,
  Wind,
  Moon,
  Film,
  BookOpen,
  DoorOpen,
  LogOut,
  Package,
  Bell,
  Paintbrush,
  Gamepad2,
  Sparkles,
  ChevronRight,
  Headset,
  ReceiptText,
  Check,
  Mic,
  Tv,
  Power,
  Thermometer,
  Battery,
  Lock,
  Unlock,
  Zap,
  Settings2,
  Maximize2,
  Minimize2,
  Volume2,
  Layers,
  X,
  Map as MapIcon,
  AlertCircle,
  Globe,
  Clock,
  ChevronDown,
  UtensilsCrossed,
  Coffee,
  Car,
  MapPin,
  MessageSquare,
  Send,
  Bot,
  Phone,
  Fan
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from './lib/utils';
import { voiceService, VoiceCommandAction } from './services/voiceService';
import { chatService, ChatMessage } from './services/chatService';

// --- Types ---
type View = 'home' | 'devices' | 'services' | 'profile';

const OFFLINE_DEVICES = new Set([]);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring", 
      stiffness: 120, 
      damping: 20 
    }
  }
};

const viewVariants = {
  initial: { opacity: 0, scale: 0.99, filter: 'blur(4px)' },
  animate: { 
    opacity: 1, 
    scale: 1, 
    filter: 'blur(0px)',
    transition: { 
      duration: 0.4, 
      ease: [0.22, 1, 0.36, 1] 
    }
  },
  exit: { 
    opacity: 0, 
    scale: 1.01, 
    filter: 'blur(4px)',
    transition: { duration: 0.3 } 
  }
};

// --- Types ---

type DeviceType = 'light' | 'ac' | 'curtain' | 'tv' | 'socket' | 'dnd' | 'lock';

interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: 'online' | 'offline';
  state: any;
}

interface RoomGroup {
  id: string;
  name: string;
  devices: Device[];
}

// --- Components ---

const NexCoreLogo = ({ className, size = "md" }: { className?: string, size?: "sm" | "md" | "lg" }) => {
  const dimensions = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-20 h-20" : "w-14 h-14";
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className={cn("relative flex items-center justify-center shrink-0", dimensions)}>
        {/* Outer Ring */}
        <div className="absolute inset-0 border border-zinc-500/40 rounded-full shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] bg-slate-900/10" />
        
        <div className="relative w-[50%] h-[60%] flex items-center translate-x-[-10%]">
          {/* Light Behind Door */}
          <div className="absolute left-[35%] top-[5%] w-[15%] h-[95%] bg-orange-400 blur-[4px] z-0 shadow-[0_0_25px_rgba(251,146,60,0.9)]" />
          
          {/* Rays */}
          {[ -22, -14, -6, 2, 10, 18, 26 ].map((deg, i) => (
            <div 
              key={i}
              className="absolute left-[40%] w-[150%] h-[1px] bg-gradient-to-r from-orange-400/80 via-orange-400/30 to-transparent origin-left z-10"
              style={{ 
                top: `${12 + i * 12}%`,
                transform: `rotate(${deg}deg)`,
                boxShadow: '0 0 8px rgba(251,146,60,0.4)'
              }}
            />
          ))}

          {/* Door with Perspective */}
          <div 
            className="absolute left-0 top-0 w-[55%] h-full bg-zinc-800 border-l border-t border-zinc-600 rounded-sm z-20 shadow-2xl"
            style={{ 
              transform: 'perspective(150px) rotateY(-35deg)',
              transformOrigin: 'left',
              boxShadow: '6px 0 20px rgba(0,0,0,0.8)'
            }}
          >
            {/* Door Handle */}
            <div className="absolute right-[15%] top-[52%] w-[20%] h-[1px] bg-zinc-950 rounded-full" />
            <div className="absolute right-[15%] top-[55%] w-[3px] h-[3px] bg-zinc-950 rounded-full opacity-60" />
          </div>
        </div>
      </div>
      <div className="flex flex-col leading-none">
        <div className={cn("font-bold tracking-tight text-white flex items-center gap-1.5", size === "lg" ? "text-3xl" : "text-xl")}>
          <span className="text-orange-400 font-black">〇</span>
          <span>枢 AI</span>
        </div>
        <span className={cn("uppercase tracking-[0.4em] text-zinc-500 mt-1 font-medium", size === "lg" ? "text-xs" : "text-[8px]")}>NexCore</span>
      </div>
    </div>
  );
};

interface TopBarProps {
  isListening: boolean;
  startVoice: () => void;
  voiceText: string;
}

interface VoiceIslandProps {
  state: 'idle' | 'listening' | 'responding' | 'success' | 'error';
  message: string;
  onMicClick: () => void;
  messages: ChatMessage[];
  onChatSend: (text: string) => void;
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
}

const AssistantIsland = ({ 
  state, 
  message, 
  onMicClick, 
  messages, 
  onChatSend, 
  isExpanded, 
  setIsExpanded 
}: VoiceIslandProps) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isExpanded]);

  const handleSend = () => {
    if (!input.trim()) return;
    onChatSend(input);
    setInput('');
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex justify-center w-full max-w-[1280px] pointer-events-none px-4">
      <motion.div 
        layout
        initial={false}
        animate={{
          width: isExpanded ? "min(500px, 95vw)" : (state === 'idle' ? 220 : 380),
          height: isExpanded ? "min(600px, 80vh)" : (state === 'idle' ? 50 : 70),
          borderRadius: isExpanded ? 24 : 32,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "bg-black border pointer-events-auto flex flex-col overflow-hidden premium-shadow backdrop-blur-2xl",
          (state === 'idle' && !isExpanded)
            ? "border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-zinc-950/80" 
            : "border-cyan-500/30 bg-black",
          state === 'error' && "border-red-500/30"
        )}
      >
        {/* Header/Pill Area */}
        <div 
          className={cn(
            "flex items-center justify-between shrink-0 cursor-pointer transition-colors px-6",
            isExpanded ? "h-16 border-b border-white/5" : (state === 'idle' ? "h-full" : "h-20")
          )}
          onClick={() => !isExpanded && setIsExpanded(true)}
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="flex gap-1 items-center shrink-0" onClick={(e) => { 
              e.stopPropagation(); 
              voiceService.unlockAudio(); // Unlock audio on manual trigger
              onMicClick(); 
            }}>
              {state === 'listening' ? (
                <div className="flex items-center gap-1 h-8 px-2 relative">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-cyan-500/10 blur-xl rounded-full"
                  />
                  {[0, 1, 2, 3, 4, 5, 6].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ 
                        height: [8, 12 + Math.sin(i * 1.5) * 15 + Math.random() * 10, 8],
                        backgroundColor: i % 2 === 0 ? "#06b6d4" : "#22d3ee",
                        opacity: [0.6, 1, 0.6] 
                      }} 
                      transition={{ 
                        repeat: Infinity, 
                        duration: 0.4 + i * 0.05, 
                        ease: "easeInOut" 
                      }} 
                      className="w-1 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.4)]" 
                    />
                  ))}
                </div>
              ) : state === 'responding' ? (
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [0.4, 1, 0.4]
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1.2, 
                        delay: i * 0.3,
                        ease: "easeOut"
                      }}
                      className={cn(
                        "w-2 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-full", 
                        i === 1 ? "h-6 shadow-[0_0_12px_rgba(6,182,212,0.6)]" : "h-3"
                      )}
                    />
                  ))}
                </div>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Mic className={cn("w-5 h-5 transition-colors", state === 'idle' ? "text-cyan-500" : "text-zinc-500")} />
                </motion.div>
              )}
            </div>
            
            <AnimatePresence mode="wait">
              {!isExpanded && (
                <motion.span 
                  key="text"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-lg font-medium text-cyan-400 truncate"
                >
                  {state === 'idle' ? t('idle_msg') : (message || t(state))}
                </motion.span>
              )}
              {isExpanded && (
                <motion.span 
                  key="title"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-lg font-bold font-headline text-white"
                >
                  智能管家 小枢
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {isExpanded && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
              className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </motion.button>
          )}
        </div>

        {/* Chat Area */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <div 
                className="flex-1 overflow-y-auto px-6 py-6 space-y-4 no-scrollbar"
                ref={scrollRef}
              >
                {messages.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                     <Bot className="w-12 h-12 mb-4 opacity-20" />
                     <p className="text-sm">很高兴为您服务，请问有什么可以帮您的？</p>
                   </div>
                )}
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-cyan-600 text-white self-end rounded-tr-none" 
                        : "bg-zinc-800/50 text-zinc-200 self-start rounded-tl-none border border-white/5"
                    )}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>

              <div className="p-4 bg-zinc-900/50 border-t border-white/5 flex gap-3">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="说点什么..."
                  className="flex-1 bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-500/50 transition-colors"
                />
                <button 
                  onClick={handleSend}
                  className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center text-white shadow-lg shadow-cyan-900/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const TopBar = ({ 
  isListening, 
  startVoice, 
  islandState, 
  islandMessage,
  chatMessages,
  onChatSend,
  isAssistantOpen,
  setIsAssistantOpen
}: { 
  isListening: boolean, 
  startVoice: () => void, 
  islandState: any, 
  islandMessage: string,
  chatMessages: ChatMessage[],
  onChatSend: (t: string) => void,
  isAssistantOpen: boolean,
  setIsAssistantOpen: (v: boolean) => void
}) => {
  const { t } = useTranslation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 py-4 bg-zinc-950/85 backdrop-blur-xl shadow-lg border-b border-white/5">
      <div className="flex items-center gap-8">
        <NexCoreLogo size="sm" />
        <div className="w-[1px] h-8 bg-white/10 mx-2" />
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] text-zinc-500 font-bold tracking-wider">804 套房</span>
          <span className="text-sm font-bold text-white font-headline">张先生，下午好</span>
        </div>
      </div>
      
      {/* Assistant Island (Consolidated Voice + Chat) */}
      <AssistantIsland 
        state={islandState} 
        message={islandMessage} 
        onMicClick={startVoice}
        messages={chatMessages}
        onChatSend={onChatSend}
        isExpanded={isAssistantOpen}
        setIsExpanded={setIsAssistantOpen}
      />

      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-8">
          <div className="flex gap-5 text-zinc-400 items-center">
            <MinusCircle className="w-5 h-5 text-cyan-500" />
            <Wifi className="w-5 h-5" />
            <Sun className="w-5 h-5" />
          </div>
          <div className="flex gap-4 items-baseline">
            <span className="text-cyan-500 font-bold font-headline text-2xl uppercase leading-none">22°c</span>
            <span className="text-zinc-400 font-medium text-lg leading-none">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <p className="text-[#FB923C] font-semibold text-xs italic tracking-wide hidden lg:block opacity-90 text-right">
          {t('slogan')}
        </p>
      </div>
    </header>
  );
};

const BottomNav = ({ currentView, setView }: { currentView: View, setView: (v: View) => void }) => {
  const { t } = useTranslation();
  const navItems = [
    { id: 'home', label: '首页', icon: Home },
    { id: 'devices', label: '客房设备', icon: Smartphone },
    { id: 'services', label: '酒店服务', icon: ConciergeBell },
    { id: 'profile', label: '我的', icon: User },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-8 pb-6 pt-3 bg-zinc-900/80 backdrop-blur-2xl rounded-t-[2.5rem] shadow-2xl border-t border-white/5">
      {navItems.map((item) => {
        const isActive = currentView === item.id;
        return (
          <motion.button
            key={item.id}
            onClick={() => setView(item.id)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "flex flex-col items-center justify-center px-8 py-3 transition-colors duration-300 rounded-xl relative",
              isActive ? "text-white" : "text-zinc-500 hover:text-zinc-200"
            )}
          >
            {isActive && (
              <motion.div 
                layoutId="nav-active"
                className="absolute inset-0 bg-gradient-to-br from-cyan-900 to-cyan-700 rounded-xl shadow-lg shadow-cyan-900/20"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center">
              <item.icon className={cn("w-6 h-6 mb-1.5 transition-transform duration-300", isActive && "fill-current scale-110")} />
              <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
            </div>
          </motion.button>
        );
      })}
    </nav>
  );
};

// --- Views ---

interface HomeViewProps {
  temp: number;
  setTemp: (t: number | ((prev: number) => number)) => void;
  lightsOn: boolean;
  setLightsOn: (on: boolean) => void;
  curtainsOpen: boolean;
  setCurtainsOpen: (open: boolean) => void;
  activeScene: string | null;
  setActiveScene: (scene: string | null) => void;
  applyScene: (id: string | null) => void;
  highlighted: 'climate' | 'lights' | 'curtains' | 'scene' | null;
  
  // Granular States
  entranceLight: boolean;
  setEntranceLight: (v: boolean) => void;
  bedsideLight: boolean;
  setBedsideLight: (v: boolean) => void;
  bedroomLight: boolean;
  setBedroomLight: (v: boolean) => void;
  bathroomLight: boolean;
  setBathroomLight: (v: boolean) => void;
  mirrorLight: boolean;
  setMirrorLight: (v: boolean) => void;
  balconyLight: boolean;
  setBalconyLight: (v: boolean) => void;
  exhaustFan: boolean;
  setExhaustFan: (v: boolean) => void;
  projector: boolean;
  setProjector: (v: boolean) => void;
  gauzeCurtain: boolean;
  setGauzeCurtain: (v: boolean) => void;
  dndMode: boolean;
  setDndMode: (v: boolean) => void;
  updateDeviceState: (id: string, state: any) => void;
  rooms: any[];
  addToast: (type: 'error' | 'success' | 'info', title: string, message: string) => void;
}

const HomeView = ({ 
  temp, setTemp, 
  lightsOn, setLightsOn, 
  curtainsOpen, setCurtainsOpen, 
  activeScene, setActiveScene,
  applyScene,
  highlighted,
  entranceLight, setEntranceLight,
  bedsideLight, setBedsideLight,
  bedroomLight, setBedroomLight,
  bathroomLight, setBathroomLight,
  mirrorLight, setMirrorLight,
  balconyLight, setBalconyLight,
  exhaustFan, setExhaustFan,
  projector, setProjector,
  gauzeCurtain, setGauzeCurtain,
  dndMode, setDndMode,
  updateDeviceState,
  rooms,
  addToast
}: HomeViewProps & { key?: string }) => {

  const quickServices = [
    { label: '请勿打扰', sub: 'DND STATUS', icon: Bell, color: 'text-cyan-400' },
    { label: '打扫房间', sub: 'ROOM CLEANING', icon: Paintbrush, color: 'text-cyan-400' },
    { label: '送物服务', sub: 'DELIVERY SERVICE', icon: Package, color: 'text-cyan-400' },
    { label: '呼叫前台', sub: 'CALL FRONT DESK', icon: Headset, color: 'text-cyan-400' },
    { label: '退房申请', sub: 'EXPRESS CHECK-OUT', icon: LogOut, color: 'text-cyan-400' },
  ];

  const scenes = [
    { 
      id: 'morning', 
      label: '起床模式', 
      sub: 'Morning Mode', 
      desc: '早上好，缓慢开灯',
      icon: Sun, 
      img: 'https://images.unsplash.com/photo-1541411191165-f18b6f530797?auto=format&fit=crop&q=80&w=600'
    },
    { 
      id: 'sleep', 
      label: '晚安模式', 
      sub: 'Night Mode', 
      desc: '晚安，祝您安睡',
      icon: Moon, 
      img: 'https://images.unsplash.com/photo-1505301272343-353e7430121a?auto=format&fit=crop&q=80&w=600'
    },
    { 
      id: 'entertainment', 
      label: '娱乐模式', 
      sub: 'Entertainment Mode', 
      desc: '沉浸影音时光',
      icon: Film, 
      img: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=600'
    },
  ];

  return (
    <motion.div 
      variants={viewVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-[1200px] mx-auto w-full flex flex-col gap-6"
    >
      {/* Quick Services */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold">便捷服务</h2>
        </div>
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-5 gap-4"
        >
          {quickServices.map((service, i) => {
            const isDND = service.label === '请勿打扰';
            const isClean = service.label === '打扫房间';
            
            // For now, let's just use local states for highlight
            // We can derive 'isCleaning' if we had a state, or just use the device state
            const cleaningActive = rooms.find(r => r.id === 'bedroom')?.devices.find(d => d.id === 'b-dnd')?.state.clean;
            const isActive = isDND ? dndMode : (isClean ? cleaningActive : false);
            
            return (
              <motion.button
                key={i}
                variants={itemVariants}
                whileHover={{ scale: 1.02, backgroundColor: isActive ? 'rgba(6, 182, 212, 0.2)' : 'rgba(39, 39, 42, 0.6)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (isDND) {
                    const next = !dndMode;
                    setDndMode(next);
                    updateDeviceState('b-dnd', { dnd: next, clean: false });
                  } else if (isClean) {
                    const next = !cleaningActive;
                    updateDeviceState('b-dnd', { dnd: false, clean: next });
                    if (next) {
                        setDndMode(false);
                    }
                  } else {
                    addToast('info', '服务请求', `已为您提交${service.label}申请。`);
                  }
                }}
                className={cn(
                  "border p-6 rounded-2xl premium-shadow transition-all duration-300 group flex flex-col items-center text-center",
                  isActive 
                    ? "bg-cyan-500/20 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]" 
                    : "bg-zinc-900/40 border-white/5 hover:bg-zinc-800/50"
                )}
              >
                <service.icon className={cn(
                  "w-6 h-6 mb-3 group-hover:scale-110 transition-transform duration-300", 
                  isActive ? "text-cyan-400 fill-cyan-400/20" : service.color
                )} />
                <h3 className={cn("text-base font-bold mb-0.5", isActive ? "text-cyan-400" : "text-white")}>{service.label}</h3>
                <p className={isActive ? "text-cyan-600/60 text-[8px] tracking-widest uppercase font-bold" : "text-zinc-600 text-[8px] tracking-widest uppercase font-bold"}>
                  {isDND && dndMode ? 'DND ACTIVE' : (isClean && cleaningActive ? 'CLEANING REQUESTED' : service.sub)}
                </p>
              </motion.button>
            );
          })}
        </motion.div>
      </section>

      {/* Main Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-12 gap-6"
      >
        {/* Left Area (8 cols) */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          {/* Climate Control */}
          <div className={cn(
            "bg-zinc-900/40 rounded-[2.5rem] p-8 border border-white/5 premium-shadow relative overflow-hidden group transition-all duration-500",
            highlighted === 'climate' && "highlight-active scale-[1.01]"
          )}>
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <h3 className="text-lg font-bold font-headline">室内温控</h3>
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold mt-0.5">CLIMATE CONTROL</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-cyan-900/20 rounded-full border border-cyan-500/30">
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Active</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-12 relative z-10">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setTemp(t => t - 1)}
                className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-300 hover:bg-zinc-700 active:scale-95 transition-all shadow-xl border border-white/5"
              >
                <Minus className="w-8 h-8" />
              </motion.button>

              <div className="text-center">
                <div className="relative inline-block">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={temp}
                      initial={{ y: 20, opacity: 0, scale: 0.8 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: -20, opacity: 0, scale: 0.8 }}
                      className="text-[10rem] leading-none font-bold font-headline text-white tracking-tighter"
                    >
                      {temp}
                    </motion.span>
                  </AnimatePresence>
                  <span className="absolute top-8 -right-12 text-4xl font-light text-zinc-500">°C</span>
                </div>
                
                {/* Indicator bars */}
                <div className="flex justify-center gap-1 my-2">
                  {[1, 2, 3, 4, 5, 6].map(idx => (
                    <motion.div 
                      key={idx} 
                      animate={{ 
                        opacity: idx <= (temp - 18) ? 1 : 0.2,
                        backgroundColor: idx <= (temp - 18) ? '#06b6d4' : '#27272a'
                      }}
                      className="w-1.5 h-4 rounded-full" 
                    />
                  ))}
                </div>
                
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.2em] mt-3">(TARGET TEMPERATURE)</p>
              </div>

              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setTemp(t => t + 1)}
                className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-300 hover:bg-zinc-700 active:scale-95 transition-all shadow-xl border border-white/5"
              >
                <Plus className="w-8 h-8" />
              </motion.button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Granular Lights Control */}
            <motion.div 
              variants={itemVariants}
              className={cn(
                "p-6 rounded-[2.5rem] border transition-all duration-500 relative flex flex-col justify-between min-h-[14rem]",
                lightsOn ? "bg-zinc-900/60 border-cyan-500/30" : "bg-zinc-900/30 border-white/5",
                highlighted === 'lights' && "highlight-active scale-[1.02]"
              )}
            >
              <div className="flex justify-between items-start w-full mb-4">
                <div 
                  onClick={() => {
                    const newState = !lightsOn;
                    setLightsOn(newState);
                    setBedroomLight(newState);
                    setEntranceLight(newState);
                    setBedsideLight(newState);
                    setBathroomLight(newState);
                    setMirrorLight(newState);
                  }}
                  className="cursor-pointer group/icon"
                >
                  <Lightbulb className={cn("w-7 h-7 transition-all duration-500", lightsOn ? "text-amber-400 fill-amber-400/20 scale-110" : "text-zinc-600")} />
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end max-w-[70%]">
                  {[
                    { id: 'entrance', label: '玄关', state: entranceLight, set: setEntranceLight },
                    { id: 'balcony', label: '阳台', state: balconyLight, set: setBalconyLight },
                    { id: 'bedside', label: '床头', state: bedsideLight, set: setBedsideLight },
                    { id: 'bedroom', label: '卧室', state: bedroomLight, set: setBedroomLight },
                    { id: 'bathroom', label: '卫浴', state: bathroomLight, set: setBathroomLight }
                  ].map(zone => (
                    <button
                      key={zone.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = !zone.state;
                        zone.set(next);
                        if (zone.id === 'entrance') updateDeviceState('e-l1', { on: next });
                        if (zone.id === 'balcony') updateDeviceState('bl-l1', { on: next });
                        if (zone.id === 'bedside') updateDeviceState('b-l1', { on: next });
                        if (zone.id === 'bedroom') updateDeviceState('b-l2', { on: next });
                        if (zone.id === 'bathroom') updateDeviceState('ba-l1', { on: next });
                      }}
                      className={cn(
                        "text-[9px] px-2.5 py-1 rounded-full border transition-all font-bold",
                        zone.state 
                          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]" 
                          : "bg-zinc-800/50 text-zinc-600 border-white/5"
                      )}
                    >
                      {zone.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between items-end w-full">
                <div>
                  <h3 className="text-xl font-bold mb-0.5">智能灯光</h3>
                  <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest leading-none">
                    {lightsOn ? 'LIGHTS ACTIVE' : 'SYSTEM STANDBY'}
                  </p>
                </div>
                <div className={cn(
                  "w-12 h-6 rounded-full relative transition-colors duration-500 cursor-pointer",
                  lightsOn ? "bg-cyan-500" : "bg-zinc-800"
                )} onClick={() => {
                  const newState = !lightsOn;
                  setLightsOn(newState);
                  setBedroomLight(newState);
                  setEntranceLight(newState);
                  setBedsideLight(newState);
                  // Sync devices
                  updateDeviceState('e-l1', { on: newState });
                  updateDeviceState('b-l1', { on: newState });
                  updateDeviceState('b-l2', { on: newState });
                }}>
                  <motion.div 
                    animate={{ x: lightsOn ? 26 : 4 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md" 
                  />
                </div>
              </div>
            </motion.div>

            {/* Granular Curtains Control */}
            <motion.div 
              variants={itemVariants}
              className={cn(
                "p-6 rounded-[2.5rem] border transition-all duration-500 relative flex flex-col justify-between min-h-[14rem]",
                curtainsOpen ? "bg-zinc-900/60 border-cyan-500/30" : "bg-zinc-900/30 border-white/5",
                highlighted === 'curtains' && "highlight-active scale-[1.02]"
              )}
            >
              <div className="flex justify-between items-start w-full mb-4">
                <div 
                  onClick={() => {
                    const newState = !curtainsOpen;
                    setCurtainsOpen(newState);
                    setGauzeCurtain(newState);
                    updateDeviceState('b-c1', { pos: newState ? 0 : 100 });
                  }}
                  className="cursor-pointer"
                >
                  <Wind className={cn("w-7 h-7 transition-all duration-500", curtainsOpen ? "text-cyan-400 scale-110" : "text-zinc-600")} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const next = !curtainsOpen;
                      setCurtainsOpen(next);
                      updateDeviceState('b-c1', { pos: next ? 0 : 100 });
                    }}
                    className={cn(
                      "text-[9px] px-3 py-1.5 rounded-full border transition-all font-bold",
                      curtainsOpen ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" : "bg-zinc-800/50 text-zinc-600 border-white/5"
                    )}
                  >
                    主窗帘
                  </button>
                  <button
                    onClick={() => {
                      const next = !gauzeCurtain;
                      setGauzeCurtain(next);
                      updateDeviceState('bl-c1', { pos: next ? 0 : 100 });
                    }}
                    className={cn(
                      "text-[9px] px-3 py-1.5 rounded-full border transition-all font-bold",
                      gauzeCurtain ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" : "bg-zinc-800/50 text-zinc-600 border-white/5"
                    )}
                  >
                    窗纱
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-end w-full">
                <div>
                  <h3 className="text-xl font-bold mb-0.5">电动窗帘</h3>
                  <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest leading-none">
                    {curtainsOpen ? 'CURTAINS OPEN' : 'FULLY CLOSED'}
                  </p>
                </div>
                <div className={cn(
                  "w-12 h-6 rounded-full relative transition-colors duration-500 cursor-pointer",
                  curtainsOpen ? "bg-cyan-500" : "bg-zinc-800"
                )} onClick={() => {
                  const newState = !curtainsOpen;
                  setCurtainsOpen(newState);
                  setGauzeCurtain(newState);
                  updateDeviceState('b-c1', { pos: newState ? 0 : 100 });
                  updateDeviceState('bl-c1', { pos: newState ? 0 : 100 });
                }}>
                  <motion.div 
                    animate={{ x: curtainsOpen ? 26 : 4 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md" 
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Area: Scene Modes (4 cols) */}
        <motion.section 
          variants={containerVariants}
          className="col-span-12 lg:col-span-4 flex flex-col gap-4 h-full"
        >
          {scenes.map((scene) => {
            const isActive = activeScene === scene.id;

            const getDynamicDesc = () => {
              if (!isActive) return scene.desc;
              switch(scene.id) {
                case 'morning': return "早上好，已为您开启起床模式。";
                case 'sleep': return "晚安模式已启动，祝您安睡。";
                case 'entertainment': return "娱乐模式已启动，享受娱乐时光。";
                default: return "模式正在运行中...";
              }
            };

            return (
              <motion.button 
                key={scene.id}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                layout
                animate={{
                  scale: isActive ? 1.025 : 1,
                  boxShadow: isActive 
                    ? "0 0 40px 10px rgba(6, 182, 212, 0.2)" 
                    : "0 0 0px 0px rgba(0, 0, 0, 0)"
                }}
                onClick={() => applyScene(isActive ? null : scene.id)}
                className={cn(
                  "flex-1 relative rounded-[2rem] overflow-hidden group border transition-all duration-700",
                  isActive ? "border-cyan-500/60 bg-cyan-950/20 shadow-2xl" : "border-white/5 bg-zinc-900/30",
                  (highlighted === 'scene' && isActive) && "highlight-active"
                )}
              >
                {/* Immersive Entry Ripple */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.5, opacity: 0.1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8 }}
                      className="absolute inset-0 bg-cyan-400 rounded-full blur-3xl pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                <img 
                  src={scene.img} 
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover transition-all duration-1000",
                    isActive ? "opacity-35 scale-110 blur-[1px]" : "opacity-10 grayscale group-hover:opacity-20 group-hover:grayscale-0 group-hover:scale-105"
                  )} 
                  referrerPolicy="no-referrer"
                />
                <div className={cn(
                  "absolute inset-0 transition-opacity duration-700",
                  isActive ? "bg-gradient-to-r from-cyan-950/40 via-black/60 to-transparent" : "bg-gradient-to-r from-black via-black/40 to-transparent"
                )} />
                
                <div className="relative h-full flex items-center justify-between px-8">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      key={isActive ? 'active-icon' : 'idle-icon'}
                      initial={{ rotate: -10, opacity: 0 }}
                      animate={{ 
                        rotate: 0, 
                        opacity: 1,
                        scale: isActive ? [1, 1.05, 1] : 1
                      }}
                      transition={{ 
                        scale: { repeat: Infinity, duration: 4 },
                        opacity: { duration: 0.3 }
                      }}
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500",
                        isActive ? "bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.6)]" : "bg-white/5 text-zinc-500"
                      )}
                    >
                      <scene.icon className="w-6 h-6" />
                    </motion.div>
                    <div className="text-left">
                      <h4 className={cn("text-lg font-bold transition-colors duration-500", isActive ? "text-white" : "text-zinc-400")}>{scene.label}</h4>
                      <p className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] font-bold mt-0.5">{scene.sub}</p>
                      <AnimatePresence mode="wait">
                        <motion.p 
                          key={isActive ? 'active-desc' : 'idle-desc'}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className={cn(
                            "text-[10px] mt-2 transition-colors leading-tight font-bold tracking-tight",
                            isActive ? "text-cyan-400" : "text-zinc-600"
                          )}
                        >
                          {getDynamicDesc()}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "w-11 h-5.5 rounded-full relative transition-colors duration-500 shrink-0 ml-2 border",
                    isActive ? "bg-cyan-500 border-cyan-400" : "bg-zinc-800 border-white/5"
                  )}>
                    <motion.div 
                      animate={{ x: isActive ? 24 : 3 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="absolute top-0.5 w-[1.1rem] h-[1.1rem] bg-white rounded-full shadow-lg" 
                    />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.section>
      </motion.div>

    </motion.div>
  );
};

const DevicesView = ({ 
  mode, 
  setMode, 
  zoom, 
  setZoom,
  highlighted,
  addToast,
  rooms,
  updateDeviceState
}: { 
  mode: 'list' | 'map', 
  setMode: (m: 'list' | 'map') => void,
  zoom: number,
  setZoom: (z: number | ((prev: number) => number)) => void,
  highlighted: 'climate' | 'lights' | 'curtains' | 'scene' | null,
  addToast: (type: 'error' | 'success' | 'info', title: string, message: string) => void,
  rooms: RoomGroup[],
  updateDeviceState: (deviceId: string, newState: any) => void,
  key?: string
}) => {
  const [expandedRoom, setExpandedRoom] = useState<string | null>('bedroom');
  const [selectedMapDeviceId, setSelectedMapDeviceId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Handle Pinch and Wheel Zoom
  useEffect(() => {
    const el = mapRef.current;
    if (!el || mode !== 'map') return;

    let initialDist = 0;
    let initialZoom = 1;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDist = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        initialZoom = zoom;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        const scale = dist / initialDist;
        setZoom(Math.min(Math.max(initialZoom * scale, 0.5), 3));
      }
    };

    const onWheel = (e: WheelEvent) => {
      // Zoom on scroll when over the map
      e.preventDefault();
      const delta = -e.deltaY;
      const factor = 1.05;
      const newZoom = delta > 0 ? zoom * factor : zoom / factor;
      setZoom(Math.min(Math.max(newZoom, 0.5), 4));
    };

    el.addEventListener('touchstart', onTouchStart);
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('wheel', onWheel, { passive: false });
    
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('wheel', onWheel);
    };
  }, [mode, zoom, setZoom]);


  const handleDeviceClick = (device: Device) => {
    if (device.status === 'offline') {
      addToast('error', '设备离线 / DEVICE OFFLINE', `抱歉，${device.name}目前处于离线状态，暂时无法操作。`);
      return;
    }
    
    if (mode === 'map') {
      setSelectedMapDeviceId(device.id);
      return;
    }

    // Direct toggle logic for list view
    let newState = {};
    switch (device.type) {
      case 'lock':
        newState = { locked: !device.state.locked };
        break;
      case 'curtain':
        newState = { pos: device.state.pos === 0 ? 100 : 0 };
        break;
      case 'dnd':
        newState = { dnd: !device.state.dnd, clean: false };
        break;
      default:
        newState = { on: !device.state.on };
    }
    
    updateDeviceState(device.id, newState);
  };

  const getPrimaryStateDisplay = (device: Device) => {
    if (device.status === 'offline') return 'OFFLINE';
    switch (device.type) {
      case 'ac': return `${device.state.temp}°C`;
      case 'curtain': return `${device.state.pos}%`;
      case 'light': return device.state.on ? `${device.state.brightness}%` : 'OFF';
      case 'tv': return device.state.on ? 'PLAYING' : 'OFF';
      case 'socket': return device.state.on ? 'ACTIVE' : 'OFF';
      case 'lock': return device.state.locked ? 'LOCKED' : 'UNLOCKED';
      case 'dnd': return device.state.dnd ? 'DND' : 'CLEAN';
      default: return device.state.on ? 'ON' : 'OFF';
    }
  };

  const selectedDevice = rooms.flatMap(r => r.devices).find(d => d.id === selectedMapDeviceId);


  const getIcon = (type: DeviceType, state?: any) => {
    switch (type) {
      case 'light': return Lightbulb;
      case 'ac': return Wind;
      case 'curtain': return Layers;
      case 'tv': return Tv;
      case 'socket': return Zap;
      case 'dnd': return AlertCircle;
      case 'lock': return state?.locked ? Lock : Unlock;
      default: return Smartphone;
    }
  };

  return (
    <div className="relative w-full h-full min-h-[700px] max-w-[1200px] mx-auto px-4">
      {/* View Toggle */}
      <div className="absolute top-0 right-0 z-20 flex bg-zinc-900/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/5">
        <button 
          onClick={() => setMode('list')}
          className={cn("px-8 py-2.5 rounded-xl text-sm font-bold transition-all", mode === 'list' ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/20" : "text-zinc-500 hover:text-zinc-300")}
        >
          列表视图
        </button>
        <button 
          onClick={() => setMode('map')}
          className={cn("px-8 py-2.5 rounded-xl text-sm font-bold transition-all", mode === 'map' ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/20" : "text-zinc-500 hover:text-zinc-300")}
        >
          平面图
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'list' ? (
          <motion.div 
            key="list"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 gap-10 pt-16"
          >
            {rooms.map(room => (
              <motion.div key={room.id} variants={itemVariants} className="glass rounded-[2.5rem] overflow-hidden border border-white/5 premium-shadow">
                <button 
                  onClick={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
                  className="w-full px-10 py-8 flex items-center justify-between hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-6">
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="w-16 h-16 rounded-2xl bg-cyan-900/20 flex items-center justify-center"
                    >
                      <Home className="w-8 h-8 text-cyan-500" />
                    </motion.div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold font-headline">{room.name}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">{room.devices.length} Devices</p>
                        <div className="flex -space-x-2">
                          {room.devices.map((d, idx) => {
                            const Icon = getIcon(d.type, d.state);
                            return (
                              <motion.div 
                                key={idx} 
                                initial={{ x: -10, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center"
                              >
                                <Icon className="w-3.5 h-3.5 text-zinc-400" />
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  <motion.div animate={{ rotate: expandedRoom === room.id ? 180 : 0 }}>
                    <Plus className={cn("w-8 h-8 transition-colors", expandedRoom === room.id ? "text-cyan-500" : "text-zinc-500")} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {expandedRoom === room.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="px-10 pb-10 grid grid-cols-3 gap-8"
                      >
                        {room.devices.map(device => {
                          const Icon = getIcon(device.type, device.state);
                          const isActive = device.state.on || device.state.locked || (device.type === 'curtain' && device.state.pos === 0);
                          
                          const isHighlighted = (
                            (highlighted === 'lights' && device.type === 'light') ||
                            (highlighted === 'curtains' && device.type === 'curtain') ||
                            (highlighted === 'climate' && device.type === 'ac')
                          );
                          
                          return (
                            <motion.button 
                              key={device.id}
                              variants={itemVariants}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleDeviceClick(device)}
                              animate={device.status === 'offline' ? {
                                opacity: [0.5, 0.3, 0.5],
                              } : { opacity: 1 }}
                              transition={device.status === 'offline' ? {
                                opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                              } : {}}
                              className={cn(
                                "p-6 rounded-[1.5rem] border transition-all duration-500 group text-left relative overflow-hidden",
                                device.status === 'offline' 
                                  ? "bg-zinc-950/40 border-red-500/10 grayscale-[0.8] opacity-60 cursor-not-allowed" 
                                  : isActive 
                                    ? "bg-surface-container border-cyan-500/30 shadow-xl shadow-cyan-900/20" 
                                    : "bg-surface-container-low border-white/5",
                                isHighlighted && "highlight-active scale-[1.02]"
                              )}
                            >
                              {/* Offline Badge */}
                              {device.status === 'offline' && (
                                <div className="absolute top-0 right-0 px-3 py-1 bg-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest rounded-bl-xl border-b border-l border-red-500/20 z-20">
                                  Offline
                                </div>
                              )}
                              {/* Glow effect for active devices */}
                              {device.status === 'online' && isActive && (
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 0.08 }}
                                  className="absolute inset-0 bg-cyan-500 blur-3xl"
                                />
                              )}
                              
                              <div className="flex justify-between mb-8 relative z-10">
                                <motion.div
                                  animate={{ 
                                    scale: isActive && device.status === 'online' ? [1, 1.1, 1] : 1,
                                    rotate: isActive && device.status === 'online' ? [0, 5, -5, 0] : 0
                                  }}
                                  transition={{ duration: 0.5, repeat: isActive ? Infinity : 0, repeatDelay: 2 }}
                                >
                                  <Icon className={cn(
                                    "w-8 h-8 transition-colors duration-500", 
                                    isActive && device.status === 'online' ? "text-cyan-500" : "text-zinc-500"
                                  )} />
                                </motion.div>
                                
                                {device.status === 'offline' ? (
                                  <div className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                                    <span className="text-[10px] font-black text-red-500 tracking-tighter">OFFLINE</span>
                                  </div>
                                ) : (
                                  <div className={cn(
                                    "w-14 h-7 rounded-full relative transition-colors duration-500",
                                    isActive ? "bg-cyan-500" : "bg-zinc-700"
                                  )}>
                                    <motion.div 
                                      animate={{ x: isActive ? 28 : 4 }}
                                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                      className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm" 
                                    />
                                  </div>
                                )}
                              </div>
                              
                              <h4 className="text-xl font-bold mb-1 relative z-10">{device.name}</h4>
                              <p className={cn(
                                "text-sm uppercase tracking-tighter relative z-10 transition-colors duration-500 font-medium",
                                isActive ? "text-cyan-400" : "text-zinc-500"
                              )}>
                                {device.type === 'lock' 
                                  ? (device.state.locked ? 'Locked' : 'Unlocked') 
                                  : (device.state.on ? 'Active' : 'Standby')}
                              </p>
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-12 gap-10 pt-16 h-[700px]"
          >
            {/* Left: Interactive Map */}
            <div 
              onClick={() => setSelectedMapDeviceId(null)}
              className="col-span-8 relative bg-zinc-950 rounded-[3rem] overflow-hidden border border-white/5 cursor-crosshair premium-shadow"
            >
              {/* Legend & Nav */}
              <div className="absolute top-8 left-8 z-20 flex flex-col gap-4">
                <div className="glass px-4 py-3 rounded-2xl flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-zinc-700" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Standby</span>
                  </div>
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="absolute bottom-8 left-8 z-20 flex flex-col gap-2">
                <button 
                  onClick={() => setZoom(z => Math.min(z + 0.2, 3))} 
                  className="w-12 h-12 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-cyan-600 transition-all active:scale-90"
                >
                  <Plus className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} 
                  className="w-12 h-12 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-cyan-600 transition-all active:scale-90"
                >
                  <Minus className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setZoom(1)} 
                  className="w-12 h-12 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>

              <motion.div 
                ref={mapRef}
                drag={zoom > 1}
                dragConstraints={{ left: -300 * zoom, right: 300 * zoom, top: -200 * zoom, bottom: 200 * zoom }}
                animate={{ scale: zoom }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-none relative"
              >
                <img 
                  src="https://images.unsplash.com/photo-1613545325278-f24b0cae1224?auto=format&fit=crop&q=80&w=1200" 
                  className="max-w-full max-h-full object-contain opacity-30 select-none pointer-events-none invert brightness-150"
                  referrerPolicy="no-referrer"
                />
                
                {/* Simulated Device Hotspots on Map */}
                <div className="absolute inset-0 pointer-events-none">
                  {rooms.flatMap(r => r.devices).map((d, i) => {
                    const Icon = getIcon(d.type, d.state);
                    const isActive = d.state.on || d.state.locked;
                    const isOffline = d.status === 'offline';
                    const isSelected = selectedMapDeviceId === d.id;
                    
                    // Fixed positions for demo
                    const pos = [
                      { t: '22%', l: '28%' }, { t: '28%', l: '32%' }, { t: '12%', l: '38%' },
                      { t: '52%', l: '48%' }, { t: '58%', l: '52%' }, { t: '62%', l: '42%' }, { t: '42%', l: '58%' }, { t: '48%', l: '62%' },
                      { t: '82%', l: '18%' }, { t: '88%', l: '22%' },
                      { t: '72%', l: '78%' }, { t: '78%', l: '82%' }
                    ][i % 12];

                    return (
                      <motion.button
                        key={d.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeviceClick(d);
                        }}
                        animate={{ 
                          scale: isSelected ? (1.2 / Math.sqrt(zoom)) : (1 / Math.sqrt(zoom)),
                        }}
                        className={cn(
                          "absolute pointer-events-auto w-10 h-10 rounded-xl flex items-center justify-center shadow-2xl border transition-all",
                          isOffline 
                            ? "bg-red-950/60 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
                            : isSelected
                              ? "bg-cyan-500 border-white shadow-[0_0_20px_rgba(6,182,212,0.8)] z-10"
                              : isActive
                                ? "bg-cyan-600/90 border-cyan-400/40 hover:bg-cyan-500"
                                : "bg-zinc-800/90 border-white/10 hover:bg-zinc-700"
                        )}
                        style={{ top: pos.t, left: pos.l }}
                      >
                        {/* Status Pulses */}
                        {isOffline && (
                          <motion.div
                            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 rounded-xl border border-red-500 pointer-events-none"
                          />
                        )}
                        {!isOffline && isActive && (
                          <motion.div
                            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute inset-0 rounded-xl bg-cyan-400 blur-md pointer-events-none"
                          />
                        )}
                        
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0.5 }}
                            animate={{ scale: 2, opacity: 0 }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                            className="absolute inset-0 rounded-xl border-2 border-white pointer-events-none"
                          />
                        )}
                        <Icon className={cn("w-5 h-5", isOffline ? "text-red-400" : isSelected || isActive ? "text-white" : "text-zinc-500")} />

                        {/* Info Pop-up */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.8 }}
                              animate={{ opacity: 1, y: -60, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.8 }}
                              className="absolute z-50 pointer-events-auto"
                            >
                              <div className="glass px-4 py-3 rounded-2xl border border-white/10 shadow-2xl min-w-[140px] relative">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex flex-col text-left">
                                    <span className="text-[10px] font-black text-white/90 truncate max-w-[80px]">{d.name}</span>
                                    <div className="flex items-center gap-1.5">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", isOffline ? "bg-red-500" : "bg-emerald-500")} />
                                      <span className={cn("text-[8px] font-bold uppercase tracking-wider", isOffline ? "text-red-400" : "text-emerald-400")}>
                                        {isOffline ? 'Offline' : 'Online'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-cyan-400">{getPrimaryStateDisplay(d)}</span>
                                  </div>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMapDeviceId(null);
                                  }}
                                  className="absolute -top-2 -right-2 w-5 h-5 bg-zinc-800 rounded-full flex items-center justify-center border border-white/10 hover:bg-zinc-700 transition-colors"
                                >
                                  <X className="w-3 h-3 text-white" />
                                </button>
                                {/* Arrow */}
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-900 border-r border-b border-white/10 rotate-45" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </div>

            {/* Right: Control Sidebar */}
            <div className="col-span-4 glass rounded-[3rem] border border-white/5 p-8 flex flex-col premium-shadow overflow-hidden">
              <AnimatePresence mode="wait">
                {selectedDevice ? (
                  <motion.div 
                    key={selectedDevice.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col h-full"
                  >
                    <div className="flex items-center gap-6 mb-10">
                      <div className="w-16 h-16 rounded-2xl bg-cyan-900/20 flex items-center justify-center">
                        {(() => {
                          const Icon = getIcon(selectedDevice.type, selectedDevice.state);
                          return <Icon className="w-8 h-8 text-cyan-500" />;
                        })()}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold font-headline">{selectedDevice.name}</h3>
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">{selectedDevice.type} · ONLINE</p>
                      </div>
                    </div>

                    <div className="flex-grow space-y-10">
                      {/* Dynamic Controls */}
                      <div className="space-y-8">
                        <div className="flex items-center justify-between p-6 bg-zinc-800/30 rounded-2xl border border-white/5">
                          <span className="font-bold">电源开关</span>
                          <button 
                            onClick={() => updateDeviceState(selectedDevice.id, { on: !selectedDevice.state.on })}
                            className={cn(
                              "w-14 h-7 rounded-full relative transition-colors", 
                              selectedDevice.state.on ? "bg-cyan-500" : "bg-zinc-700"
                            )}
                          >
                            <motion.div 
                              animate={{ x: selectedDevice.state.on ? 28 : 4 }} 
                              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg" 
                            />
                          </button>
                        </div>

                        {selectedDevice.type === 'light' && (
                          <>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-zinc-400">亮度调节</span>
                                <span className="text-cyan-500 font-bold">{selectedDevice.state.brightness}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="0" max="100" 
                                value={selectedDevice.state.brightness}
                                onChange={(e) => updateDeviceState(selectedDevice.id, { brightness: parseInt(e.target.value) })}
                                className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                              />
                            </div>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-zinc-400">色温调节</span>
                                <span className="text-orange-400 font-bold">{selectedDevice.state.colorTemp}K</span>
                              </div>
                              <div className="relative h-10 rounded-xl bg-gradient-to-r from-orange-200 via-white to-cyan-200 flex items-center px-4">
                                <input 
                                  type="range" 
                                  min="2700" max="6500" 
                                  value={selectedDevice.state.colorTemp}
                                  onChange={(e) => updateDeviceState(selectedDevice.id, { colorTemp: parseInt(e.target.value) })}
                                  className="w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-zinc-900"
                                />
                              </div>
                            </div>
                          </>
                        )}

                        {selectedDevice.type === 'ac' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 glass p-6 rounded-2xl flex flex-col items-center gap-4">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">温度调节</span>
                              <div className="flex items-center gap-4">
                                <button onClick={() => updateDeviceState(selectedDevice.id, { temp: selectedDevice.state.temp - 1 })} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                                <span className="text-3xl font-bold font-headline">{selectedDevice.state.temp}°</span>
                                <button onClick={() => updateDeviceState(selectedDevice.id, { temp: selectedDevice.state.temp + 1 })} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                              </div>
                            </div>
                            {['cool', 'heat', 'fan', 'auto'].map(m => (
                              <button 
                                key={m}
                                onClick={() => updateDeviceState(selectedDevice.id, { mode: m })}
                                className={cn(
                                  "py-3 rounded-xl text-[10px] font-bold uppercase transition-all", 
                                  selectedDevice.state.mode === m ? "bg-cyan-600 text-white" : "bg-zinc-800 text-zinc-500"
                                )}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        )}

                        {selectedDevice.type === 'curtain' && (
                          <div className="space-y-6">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-zinc-400">开合百分比</span>
                              <span className="text-cyan-500 font-bold">{selectedDevice.state.pos}%</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" max="100" 
                              value={selectedDevice.state.pos}
                              onChange={(e) => updateDeviceState(selectedDevice.id, { pos: parseInt(e.target.value) })}
                              className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => updateDeviceState(selectedDevice.id, { pos: 0 })} className="flex-1 py-3 bg-zinc-800 rounded-xl text-xs font-bold hover:bg-zinc-700 transition-all">全开</button>
                              <button onClick={() => updateDeviceState(selectedDevice.id, { pos: 100 })} className="flex-1 py-3 bg-zinc-800 rounded-xl text-xs font-bold hover:bg-zinc-700 transition-all">全关</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto pt-8 border-t border-white/5">
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        <span className="text-cyan-500 font-bold">提示：</span>
                        状态实时同步。您在地图上选择不同设备，此面板将自动更新对应的控制项。
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                      <MapIcon className="w-8 h-8 text-zinc-700" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">选择设备</h3>
                    <p className="text-xs text-zinc-500 max-w-[180px]">在左侧平面图上点击设备图标以开启实时控制面板</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const serviceItemVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      type: "spring", 
      stiffness: 100, 
      damping: 15,
      mass: 0.8
    }
  }
};

const ServicesView = () => {
  const roomService = [
    {
      title: '晨曦早餐套餐',
      sub: 'Morning Breakfast Set',
      price: '128',
      desc: '新鲜烘焙面包、有机鸡蛋、时令水果与手冲咖啡。',
      img: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&q=80&w=800'
    },
    {
      title: '主厨特选晚餐',
      sub: "Chef's Special Dinner",
      price: '258',
      desc: '精选澳洲和牛配松露土豆泥，搭配主厨秘制酱汁。',
      img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800'
    }
  ];

  const afternoonTea = [
    {
      title: '经典英式下午茶',
      sub: 'Classic English Afternoon Tea',
      price: '188',
      desc: '三层点心架，包含司康、手指三明治及精选甜点。',
      img: 'https://images.unsplash.com/photo-1594631252845-29fc458632b6?auto=format&fit=crop&q=80&w=800'
    },
    {
      title: '特调鸡尾酒',
      sub: 'Specialty Cocktails',
      price: '88',
      desc: '以当地香草为灵感的创意调饮，开启微醺夜晚。',
      img: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=800'
    }
  ];

  const conciergeItems = [
    { label: '预约用车', sub: 'LUXURY CHAUFFEUR', icon: Car },
    { label: '周边向导', sub: 'LOCAL GUIDE', icon: MapPin },
    { label: '行李寄送', sub: 'LUGGAGE DELIVERY', icon: Clock },
    { label: '联系前台', sub: 'FRONT DESK', icon: Phone },
  ];

  return (
    <motion.div 
      variants={viewVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-[1240px] mx-auto w-full grid grid-cols-12 gap-8"
    >
      {/* Left Column: Food & Drinks */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="col-span-8 space-y-12">
        {/* Room Service */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <UtensilsCrossed className="w-6 h-6 text-cyan-500" />
            <h2 className="text-xl font-bold font-headline">客房餐饮 / Room Service</h2>
          </div>
          <div className="grid grid-cols-2 gap-8">
            {roomService.map((item, i) => (
              <motion.div 
                key={i} 
                variants={serviceItemVariants}
                whileHover={{ y: -5, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="glass rounded-[2rem] overflow-hidden group premium-shadow"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img src={item.img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-zinc-900 px-4 py-1.5 rounded-full font-bold text-sm shadow-xl">
                    ¥{item.price}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                  <p className="text-zinc-500 text-[10px] mb-3 uppercase tracking-widest font-medium">{item.sub}</p>
                  <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Afternoon Tea */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <Coffee className="w-6 h-6 text-cyan-500" />
            <h2 className="text-xl font-bold font-headline">下午茶与饮品 / Afternoon Tea</h2>
          </div>
          <div className="grid grid-cols-2 gap-8">
            {afternoonTea.map((item, i) => (
              <motion.div 
                key={i} 
                variants={serviceItemVariants}
                whileHover={{ y: -5, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="glass rounded-[2rem] overflow-hidden group premium-shadow"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img src={item.img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-zinc-900 px-4 py-1 rounded-full font-bold text-sm shadow-xl">
                    ¥{item.price}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                  <p className="text-zinc-500 text-[10px] mb-3 uppercase tracking-widest font-medium">{item.sub}</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </motion.div>

      {/* Right Column: Concierge & Events */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="col-span-4 space-y-10">
        {/* Concierge */}
        <motion.section variants={itemVariants} className="glass rounded-[2rem] p-6 premium-shadow">
          <h2 className="text-xl font-bold font-headline mb-6">礼宾服务 / Concierge</h2>
          <div className="space-y-6 mb-8">
            {conciergeItems.map((item, i) => (
              <motion.button 
                key={i} 
                variants={serviceItemVariants}
                whileHover={{ x: 5, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center group-hover:bg-cyan-900/30 transition-colors">
                    <item.icon className="w-5 h-5 text-zinc-400 group-hover:text-cyan-500 transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">{item.label}</p>
                    <p className="text-[10px] text-zinc-500 tracking-widest uppercase mt-0.5">{item.sub}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </motion.button>
            ))}
          </div>
          <motion.button 
            whileHover={{ scale: 1.02, backgroundColor: 'white' }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 bg-zinc-100 text-zinc-900 font-bold rounded-2xl transition-colors text-sm uppercase tracking-[0.2em] shadow-xl"
          >
            呼叫礼宾 / CALL CONCIERGE
          </motion.button>
        </motion.section>

        {/* Special Events */}
        <motion.section variants={itemVariants} className="bg-[#3a3d2e] rounded-[2rem] p-8 premium-shadow relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl font-bold font-headline mb-6 text-white">特别活动 / Special Events</h2>
            <p className="text-zinc-200 text-sm leading-relaxed mb-8">
              今晚 <span className="text-white font-bold text-base">20:00</span> 在顶层露台将举行“星空下的爵士乐”主题酒会，诚邀您的光临。
            </p>
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.2)' }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white transition-all tracking-widest"
            >
              了解详情 / DETAILS
            </motion.button>
          </div>
          {/* Decorative element */}
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        </motion.section>
      </motion.div>
    </motion.div>
  );
};

const ProfileView = ({ brightness, setBrightness }: { brightness: number, setBrightness: (b: number) => void, key?: string }) => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <motion.div 
      variants={viewVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-[1240px] mx-auto w-full grid grid-cols-12 gap-8 items-stretch"
    >
      {/* Left Column: User Profile & Settings */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="col-span-5 flex flex-col gap-6">
        {/* User Card */}
        <motion.section variants={itemVariants} className="glass p-8 rounded-[2rem] flex flex-col gap-8 premium-shadow">
          <div className="flex items-center gap-6">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-24 h-24 rounded-full overflow-hidden border-4 border-cyan-900/30 shadow-2xl shrink-0 cursor-pointer"
            >
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                alt="Avatar"
              />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-cyan-500 mb-0.5">{t('welcome')}</span>
              <h1 className="text-3xl font-bold font-headline text-white">张先生</h1>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <motion.div whileHover={{ y: -3 }} className="bg-zinc-800/40 p-4 rounded-xl border border-white/5 transition-colors hover:bg-zinc-800/60">
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mb-1">{t('stay_days')}</span>
              <span className="text-lg font-bold text-white">3 {t('days')}</span>
            </motion.div>
            <motion.div whileHover={{ y: -3 }} className="bg-zinc-800/40 p-4 rounded-xl border border-white/5 transition-colors hover:bg-zinc-800/60">
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mb-1">{t('room_type')}</span>
              <span className="text-lg font-bold text-white">{t('suite')}</span>
            </motion.div>
          </div>
        </motion.section>

        {/* Settings Card (Moved to Left) */}
        <motion.section variants={itemVariants} className="glass p-8 rounded-[2rem] flex flex-col gap-8 premium-shadow flex-grow">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Sun className="w-5 h-5 text-zinc-300" />
                <h3 className="text-base font-bold text-white font-headline">{t('brightness')}</h3>
              </div>
              <span className="text-xl font-bold text-cyan-100 opacity-90">{brightness}%</span>
            </div>
            <div className="px-2">
              <div className="relative h-3 bg-zinc-800 rounded-full group">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${brightness}%` }}
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-400/50 to-cyan-300 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.3)]" 
                />
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute left-[85%] top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl border border-white flex items-center justify-center cursor-pointer z-10 transition-transform"
                >
                  <div className="w-0.5 h-3 bg-zinc-100 rounded-full" />
                </motion.div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Globe className="w-5 h-5 text-zinc-300" />
              <h3 className="text-base font-bold text-white font-headline">{t('language')} Language</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'zh', label: '简体中文' },
                { id: 'en', label: 'English' },
                { id: 'jp', label: '日本語' },
                { id: 'kr', label: '한국어' },
                { id: 'fr', label: 'Français' },
                { id: 'de', label: 'Deutsch' },
                { id: 'es', label: 'Español' }
              ].map((lang) => (
                <motion.button 
                  key={lang.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => changeLanguage(lang.id)}
                  className={cn(
                    "py-3 rounded-xl font-bold transition-all text-xs",
                    i18n.language === lang.id 
                      ? "bg-cyan-900/60 text-white border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                      : "bg-zinc-800/40 text-zinc-500 hover:bg-zinc-800/60 hover:text-white"
                  )}
                >
                  {lang.label}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="mt-auto flex justify-center items-center gap-6 opacity-20 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <Lock className="w-3 h-3" />
              <span className="text-[10px] font-bold tracking-widest text-zinc-300">清洁模式密码</span>
            </div>
            <button className="text-[10px] font-bold tracking-widest text-zinc-200">清洁模式</button>
          </div>
        </motion.section>
      </motion.div>

      {/* Right Column: Billing (Moved to Right) */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="col-span-12 lg:col-span-7 h-full">
        <motion.section variants={itemVariants} className="glass p-12 rounded-[3.5rem] flex flex-col h-full premium-shadow">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold font-headline text-white underline decoration-cyan-500/20 underline-offset-8">{t('billing')}</h2>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mt-2">{t('billing')}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-cyan-900/20 flex items-center justify-center border border-cyan-500/10">
              <ReceiptText className="w-7 h-7 text-cyan-500" />
            </div>
          </div>
          
          <div className="space-y-6 flex-grow">
            {[
              { label: '巴黎气泡水 (Mini Bar)', price: '¥45.00', date: '04/15', category: 'F&B' },
              { label: '美式咖啡 (客房送餐)', price: '¥68.00', date: '04/15', category: 'F&B' },
              { label: '干洗衣物 (3件)', price: '¥180.00', date: '04/14', category: 'LAUNDRY' },
              { label: '行政酒廊服务', price: '¥0.00', date: '04/14', category: 'CONCIERGE' },
            ].map((item, i) => (
              <motion.div 
                key={i} 
                variants={itemVariants}
                whileHover={{ x: 10, backgroundColor: 'rgba(255,255,255,0.02)' }}
                className="flex justify-between items-center py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors rounded-xl px-4 -mx-4 group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-1 h-8 bg-cyan-500/20 rounded-full group-hover:bg-cyan-500 transition-colors" />
                  <div className="flex flex-col">
                    <span className="text-white text-lg font-medium">{item.label}</span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-bold text-cyan-500/60 tracking-wider font-headline">{item.category}</span>
                      <span className="text-[10px] text-zinc-500">{item.date}</span>
                    </div>
                  </div>
                </div>
                <span className="text-white text-xl font-bold font-headline">{item.price}</span>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-16 p-10 rounded-[2.5rem] bg-zinc-900/40 border border-white/5 flex justify-between items-end relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[50px] -mr-10 -mt-10" />
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-zinc-400 font-bold mb-3 block">TOTAL OUTSTANDING</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl text-zinc-500 font-medium">¥</span>
                <span className="text-6xl font-bold text-cyan-400 font-headline tracking-tight">293.00</span>
              </div>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: 'rgb(8, 145, 178)' }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-5 bg-cyan-600 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-cyan-900/20 active:scale-95"
            >
              {t('checkout')}
            </motion.button>
          </div>
        </motion.section>
      </motion.div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  
  const { t } = useTranslation();
  const [view, setView] = useState<View>('home');
  const [devicesMode, setDevicesMode] = useState<'list' | 'map'>('list');
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(85);

  // Mock Data (Lifted for Global Access)
  const [rooms, setRooms] = useState<RoomGroup[]>([
    {
      id: 'entrance',
      name: '玄关',
      devices: [
        { id: 'e-l1', name: '玄关灯', type: 'light', status: 'online', state: { on: true, brightness: 80, colorTemp: 4000 } },
        { id: 'e-s1', name: '智能插座', type: 'socket', status: 'online', state: { on: false } },
        { id: 'e-lock', name: '智能门锁', type: 'lock', status: 'online', state: { battery: 85, locked: true } },
      ]
    },
    {
      id: 'bedroom',
      name: '卧室',
      devices: [
        { id: 'b-l1', name: '主灯', type: 'light', status: 'online', state: { on: true, brightness: 100, colorTemp: 3000 } },
        { id: 'b-ac', name: '空调', type: 'ac', status: 'online', state: { on: true, temp: 24, mode: 'cool', fan: 'auto' } },
        { id: 'b-tv', name: '电视', type: 'tv', status: 'offline', state: { on: false, vol: 20, channel: 1, source: 'HDMI1' } },
        { id: 'b-dnd', name: '勿扰/清理', type: 'dnd', status: 'online', state: { dnd: false, clean: false } },
      ]
    },
    {
      id: 'bathroom',
      name: '卫生间',
      devices: [
        { id: 'ba-l1', name: '镜前灯', type: 'light', status: 'online', state: { on: false, brightness: 50, colorTemp: 5000 } },
        { id: 'ba-s1', name: '吹风机插座', type: 'socket', status: 'online', state: { on: true } },
      ]
    },
    {
      id: 'balcony',
      name: '阳台',
      devices: [
        { id: 'bl-l1', name: '阳台灯', type: 'light', status: 'online', state: { on: false, brightness: 100, colorTemp: 4000 } },
        { id: 'b-c1', name: '电动主窗帘', type: 'curtain', status: 'online', state: { pos: 0 } },
        { id: 'bl-c1', name: '电动窗纱', type: 'curtain', status: 'online', state: { pos: 100 } },
      ]
    }
  ]);

  const updateDeviceState = (deviceId: string, newState: any) => {
    setRooms(prev => prev.map(room => ({
      ...room,
      devices: room.devices.map(d => d.id === deviceId ? { ...d, state: { ...d.state, ...newState } } : d)
    })));

    // Synchronize independent states for HomeView consistency
    if (newState.on !== undefined) {
      if (deviceId === 'e-l1') setEntranceLight(newState.on);
      if (deviceId === 'b-l1') setBedsideLight(newState.on);
      if (deviceId === 'b-l2') setBedroomLight(newState.on);
      if (deviceId === 'ba-l1') setBathroomLight(newState.on);
      if (deviceId === 'ba-l2') setMirrorLight(newState.on);
      if (deviceId === 'bl-l1') setBalconyLight(newState.on);
    }
    if (newState.pos !== undefined && deviceId === 'b-c1') {
      setCurtainsOpen(newState.pos === 0);
    }
    if (newState.pos !== undefined && deviceId === 'bl-c1') {
      setGauzeCurtain(newState.pos === 0);
    }
    if (newState.temp !== undefined && deviceId === 'b-ac') {
      setTemp(newState.temp);
    }
    if (newState.dnd !== undefined && deviceId === 'b-dnd') {
      setDndMode(newState.dnd);
      if (newState.dnd) {
        addToast('info', '请勿打扰已开启 / DND ACTIVE', '系统已为您屏蔽非紧急通知，灯光亮度已自动调优。');
        if (lightsOn) {
          updateDeviceState('b-l1', { brightness: 30 }); 
          updateDeviceState('b-l2', { brightness: 20 }); 
        }
      } else {
        addToast('success', '请勿打扰已关闭 / DND OFF', '通知提示音已恢复正常。');
      }
    }
    if (newState.clean !== undefined && deviceId === 'b-dnd') {
      if (newState.clean) {
        setDndMode(false);
        addToast('success', '打扫请求已发送 / CLEANING REQUESTED', '服务人员将尽快为您安排清扫。');
      }
    }

    // Real control via external API for Entrance Light (e-l1)
    if (deviceId === 'e-l1' && newState.on !== undefined) {
      console.log(`[Hardware] Triggering ${newState.on ? 'OPEN' : 'CLOSE'} via device update`);
      fetch(`/api/hardware/switch/${newState.on ? 'open' : 'close'}`)
        .then(res => res.json())
        .then(data => {
             // Removed debug logging
        })
        .catch(console.error);
    }

    // Real control via external API for Main Curtains (b-c1)
    if (deviceId === 'b-c1' && newState.pos !== undefined) {
      const isOpening = newState.pos === 0;
      console.log(`[Hardware] Triggering Curtain ${isOpening ? 'OPEN' : 'CLOSE'} via device update`);
      fetch(`/api/hardware/curtain/${isOpening ? 'open' : 'close'}`)
        .then(res => res.json())
        .catch(console.error);
    }

    // Simulate timeout
    if (Math.random() > 0.98) {
      addToast('error', '操作失败 / ACTION FAILED', '指令发送超时，请检查控制网关或联系前台。');
    }
  };
  
  // Room State (Lifted for Voice Control)
  const [temp, setTemp] = useState(24);
  const [lightsOn, setLightsOn] = useState(true);
  const [curtainsOpen, setCurtainsOpen] = useState(false);
  const [activeScene, setActiveScene] = useState<string | null>('entertainment');

  // Granular Devices
  const [entranceLight, setEntranceLight] = useState(false);
  const [bedsideLight, setBedsideLight] = useState(false);
  const [bedroomLight, setBedroomLight] = useState(false);
  const [bathroomLight, setBathroomLight] = useState(false);
  const [mirrorLight, setMirrorLight] = useState(false);
  const [balconyLight, setBalconyLight] = useState(false);
  const [exhaustFan, setExhaustFan] = useState(false);
  const [projector, setProjector] = useState(false);
  const [gauzeCurtain, setGauzeCurtain] = useState(false);
  const [dndMode, setDndMode] = useState(false);

  const roomContext = {
    temperature: `${temp}°C`,
    lights: lightsOn ? 'ON' : 'OFF',
    curtains: curtainsOpen ? 'OPEN' : 'CLOSED',
    activeScene: activeScene || 'None',
    offlineDevices: Array.from(OFFLINE_DEVICES),
    brightness: `${brightness}%`,
    roomNumber: "8808",
    guestName: "张先生",
    stayDays: 3,
    roomType: "尊贵大床房",
    currentView: view,
    hotelName: "NexCore Smart Hotel",
    granularDevices: {
      entranceLight: entranceLight ? 'ON' : 'OFF',
      bedsideLight: bedsideLight ? 'ON' : 'OFF',
      bedroomLight: bedroomLight ? 'ON' : 'OFF',
      bathroomLight: bathroomLight ? 'ON' : 'OFF',
      mirrorLight: mirrorLight ? 'ON' : 'OFF',
      balconyLight: balconyLight ? 'ON' : 'OFF',
      exhaustFan: exhaustFan ? 'ON' : 'OFF',
      projector: projector ? 'ON' : 'OFF',
      gauzeCurtain: gauzeCurtain ? 'OPEN' : 'CLOSED',
      dndMode: dndMode ? 'ON' : 'OFF'
    }
  };

  // Audio Unlock Logic for Browser Policies (Ensures Speech Synthesis works in iframes/mobile)
  useEffect(() => {
    const handleFirstInteraction = () => {
      voiceService.unlockAudio();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Voice Control State
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [islandState, setIslandState] = useState<'idle' | 'listening' | 'responding' | 'success' | 'error'>('idle');
  const [islandMessage, setIslandMessage] = useState<string>("");

  const handleChatSend = async (content: string) => {
    const userMsg = content.trim();
    if (!userMsg) return;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIslandState('responding');
    setIslandMessage("正在思考...");

    try {
      const result = await chatService.sendMessage(userMsg, roomContext);
      if (result.text) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: result.text }]);
        setIslandMessage(result.text);
      }
      
      if (result.actions && result.actions.length > 0) {
        result.actions.forEach((call: any) => {
          const typeMap: Record<string, VoiceCommandAction['type']> = {
            'controlClimate': 'CLIMATE',
            'toggleLight': 'LIGHTS',
            'toggleCurtains': 'CURTAINS',
            'requestService': 'SERVICE'
          };
          handleVoiceAction({
            type: typeMap[call.name] || 'QUERY',
            payload: call.args,
            response: result.text
          });
        });
      } else {
        setIslandState('idle');
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '抱歉，系统繁忙，请稍后再试。' }]);
      setIslandState('error');
      setIslandMessage("系统繁忙");
      setTimeout(() => setIslandState('idle'), 3000);
    }
  };
  const [highlightedDevice, setHighlightedDevice] = useState<'climate' | 'lights' | 'curtains' | 'scene' | null>(null);
  const [toasts, setToasts] = useState<Array<{id: string, type: 'error' | 'success' | 'info', title: string, message: string}>>([]);

  const addToast = (type: 'error' | 'success' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  };

  // Mock Offline State for demonstration

  const initVoice = () => {
    const roomContext = {
      temperature: `${temp}°C`,
      lights: lightsOn ? 'ON' : 'OFF',
      curtains: curtainsOpen ? 'OPEN' : 'CLOSED',
      activeScene: activeScene || 'None',
      offlineDevices: Array.from(OFFLINE_DEVICES)
    };

    voiceService.start(
      (text) => {
        setVoiceText(text);
        setIslandMessage(text);
        // Keep state as 'listening' to show the plasma wave during recognition
        setIslandState('listening');
      },
      (action) => {
        handleVoiceAction(action);
      },
      (err) => {
        setVoiceError(err);
        setIslandState('error');
        setIslandMessage(err);
        
        // Comprehensive error notification via toasts
        if (err.includes('权限')) {
          addToast('error', '麦克风权限已禁用 / MIC DISABLED', '请点击浏览器地址栏旁边的锁头图标，允许系统访问麦克风。');
        } else {
          addToast('error', '语音助手错误 / ASSISTANT ERROR', err);
        }
        
        setTimeout(() => setIslandState('idle'), 4000);
      },
      () => {
        setIslandState('listening');
        setIslandMessage("我在，请说...");
        console.log('[App] System awakened by voice.');
      },
      () => {
        // onSpeechEnd callback
        // 自动延时清理：在一次指令处理并播报完反馈语后的 2.5 秒，灵动岛状态恢复
        setTimeout(() => {
          setIslandState('idle');
          setIslandMessage('继续收音');
          setVoiceText(''); 
          setHighlightedDevice(null);
        }, 2500);
      },
      roomContext
    );
  };

  useEffect(() => {
    // Attempt auto-start (might be blocked by browser without interaction)
    initVoice();
  }, []);

  // Update voice context when state changes
  useEffect(() => {
    voiceService.updateContext({
      temperature: `${temp}°C`,
      lights: lightsOn ? 'ON' : 'OFF',
      curtains: curtainsOpen ? 'OPEN' : 'CLOSED',
      activeScene: activeScene || 'None',
      offlineDevices: Array.from(OFFLINE_DEVICES)
    });
  }, [temp, lightsOn, curtainsOpen, activeScene]);

  const applyScene = (sId: string | null) => {
    setActiveScene(sId);
    if (!sId) return;

    if (sId === 'morning') {
      setLightsOn(true);
      setEntranceLight(true);
      // Synchronize hardware and state
      updateDeviceState('e-l1', { on: true });
      updateDeviceState('b-l1', { on: true });
      updateDeviceState('b-l2', { on: true });
      
      setBedsideLight(true);
      setBedroomLight(true);
      setCurtainsOpen(true);
      setGauzeCurtain(true);
      updateDeviceState('b-c1', { pos: 0 });
      updateDeviceState('bl-c1', { pos: 0 });
      setTemp(24);
      updateDeviceState('b-ac', { on: true, temp: 24 });
      
      addToast('success', '起床模式已开启 / MORNING MODE', '窗帘已打开，灯光渐入，空调设定至舒适的24°C。');
    } else if (sId === 'sleep') {
      setLightsOn(false);
      setEntranceLight(false);
      // Synchronize hardware and state
      updateDeviceState('e-l1', { on: false });
      updateDeviceState('b-l1', { on: false });
      updateDeviceState('b-l2', { on: false });
      updateDeviceState('ba-l1', { on: false });
      updateDeviceState('ba-l2', { on: false });

      setBedsideLight(false);
      setBedroomLight(false);
      setBathroomLight(false);
      setMirrorLight(false);
      setCurtainsOpen(false);
      setGauzeCurtain(false);
      updateDeviceState('b-c1', { pos: 100 });
      updateDeviceState('bl-c1', { pos: 100 });
      setTemp(25);
      updateDeviceState('b-ac', { on: true, temp: 25 });
      setDndMode(true);
      updateDeviceState('b-dnd', { dnd: true, clean: false });
      
      addToast('success', '睡眠模式已开启 / SLEEP MODE', '所有灯光已关闭，窗帘完全遮蔽，空调进入25°C静音运行。');
    } else if (sId === 'entertainment' || sId === 'cinema') {
      setCurtainsOpen(false);
      setGauzeCurtain(false);
      setLightsOn(false);
      setBedroomLight(false);
      setProjector(true);
      updateDeviceState('b-c1', { pos: 100 });
      updateDeviceState('bl-c1', { pos: 100 });
      updateDeviceState('b-l1', { on: false });
      
      addToast('success', '影院模式已开启 / CINEMA MODE', '窗帘已关闭，灯光调至最暗，投影设备已就绪。');
    } else if (sId === 'relax') {
      setLightsOn(true);
      setBedroomLight(true);
      setBedsideLight(true);
      setTemp(23);
      updateDeviceState('b-l1', { on: true, brightness: 50 });
      updateDeviceState('b-l2', { on: true, brightness: 30 });
      updateDeviceState('b-ac', { on: true, temp: 23 });
      
      addToast('success', '放松模式已开启 / RELAX MODE', '灯光调至温馨暖色，室内温度调节至23°C。');
    } else if (sId === 'read') {
      setLightsOn(true);
      setBedsideLight(true);
      updateDeviceState('b-l2', { on: true, brightness: 100 });
      
      addToast('success', '阅读模式已开启 / READING MODE', '床头灯光已调至最佳阅读亮度。');
    }
  };

  const handleVoiceAction = (action: VoiceCommandAction) => {
    // 0. 指令冲突 (Simulated - if two different actions of same type happen too fast)
    // Actually handled simply if needed, but Scenario 15/7 are similar.
    
    // 16. 夜间静音模式 (Volume check)
    const hour = new Date().getHours();
    const isNight = hour >= 23 || hour < 7;
    if (isNight && (dndMode || activeScene === 'sleep')) {
       // Feedback could be quieter or just text (we adjust TTS volume indirectly in brain)
       // But user said: (语音反馈极低音量或仅屏幕提示)
       // We can just skip speak for some things or set a lower rate
    }

    // 1. Offline Check Logic for Voice Commands
    const deviceTypeMap = {
      'CLIMATE': 'climate',
      'LIGHTS': 'lights',
      'CURTAINS': 'curtains',
    } as const;

    const deviceNameMap = {
      'CLIMATE': '空调/温控系统',
      'LIGHTS': '灯光系统',
      'CURTAINS': '窗帘系统',
    };

    const typeKey = action.type as keyof typeof deviceTypeMap;
    if (deviceTypeMap[typeKey] && OFFLINE_DEVICES.has(deviceTypeMap[typeKey])) {
      const errorMsg = `抱歉，${deviceNameMap[typeKey]}当前不在线，请稍后再试。`;
      setIslandState('error');
      setIslandMessage(`${deviceNameMap[typeKey]}离线`);
      voiceService.speak(errorMsg);
      addToast('error', '设备离线警告', errorMsg);
      setTimeout(() => setIslandState('idle'), 5000);
      return;
    }

    // 2. Clear & Wake logic
    if (action.type === 'WAKE') {
      if (action.payload.action === 'clear') {
        setVoiceText('');
        setIslandMessage('');
      } else if (action.payload.action === 'ready') {
        setIslandState('idle');
        setIslandMessage(action.response || '继续收音');
        setVoiceText(''); // Clear bottom text as requested for "2.5s auto clear"
      }
      return;
    }

    // 3. Normal Action Handling
    switch (action.type) {
      case 'CLIMATE':
        const targetTemp = action.payload.targetTemp || (temp + (action.payload.adjust || 0));
        setTemp(targetTemp);
        // Sync with device list
        updateDeviceState('b-ac', { temp: targetTemp, on: true });
        setIslandState('success');
        setHighlightedDevice('climate');
        break;
      case 'LIGHTS':
        const { state: lightState, area } = action.payload;
        if (area === 'all') {
            setLightsOn(lightState);
            setEntranceLight(lightState);
            // Synchronize with device list
            updateDeviceState('e-l1', { on: lightState });
            updateDeviceState('b-l1', { on: lightState });
            updateDeviceState('b-l2', { on: lightState });
        }
        else if (area === 'entrance') {
            setEntranceLight(lightState);
            updateDeviceState('e-l1', { on: lightState });
        }
        else if (area === 'balcony') {
            setBalconyLight(lightState);
            updateDeviceState('bl-l1', { on: lightState });
        }
        else if (area === 'bedside') {
            setBedsideLight(lightState);
            updateDeviceState('b-l1', { on: lightState });
        }
        else if (area === 'bedroom') {
            setBedroomLight(lightState);
            updateDeviceState('b-l2', { on: lightState });
        }
        else if (area === 'bathroom') {
            setBathroomLight(lightState);
            updateDeviceState('ba-l1', { on: lightState });
        }
        else if (area === 'mirror') {
            setMirrorLight(lightState);
            updateDeviceState('ba-l2', { on: lightState });
        }
        setIslandState('success');
        setHighlightedDevice('lights');
        break;
      case 'CURTAINS':
        const curtainState = action.payload.state;
        const curtainType = action.payload.type || 'main';
        if (curtainType === 'main') {
            setCurtainsOpen(curtainState);
            updateDeviceState('b-c1', { pos: curtainState ? 0 : 100 });
        } else {
            setGauzeCurtain(curtainState);
            updateDeviceState('bl-c1', { pos: curtainState ? 0 : 100 });
        }
        setIslandState('success');
        setHighlightedDevice('curtains');
        break;
      case 'SCENE':
        const sId = action.payload.sceneId;
        // 10. 场景执行全部失败 (Simulation)
        if (sId === 'morning' && OFFLINE_DEVICES.has('lights')) {
             const errorMsg = `抱歉，无法执行起床模式，请检查网络或稍后再试。`;
             setIslandState('error');
             voiceService.speak(errorMsg);
             return;
        }
        // 9. 场景执行部分失败 (Simulation)
        if (sId === 'entertainment' && Math.random() < 0.3) {
             const partialMsg = "已为您关闭卧室主灯，但窗帘控制失败，您可以手动操作。";
             setIslandState('warning' as any);
             voiceService.speak(partialMsg);
             addToast('info', '场景部分失败', partialMsg);
             // Still apply what we can
             applyScene('entertainment');
             return;
        }
        applyScene(sId);
        setIslandState('success');
        setHighlightedDevice('scene');
        break;
      case 'NAVIGATION':
        if (action.payload.view) setView(action.payload.view as View);
        setIslandState('success');
        break;
      case 'SERVICE':
        if (action.payload.device === 'fan') setExhaustFan(action.payload.state);
        if (action.payload.device === 'projector') setProjector(action.payload.state);
        if (action.payload.action === 'dnd') setDndMode(action.payload.state);
        
        // 11. 服务请求发送失败 (Simulation for delivery only)
        if (action.payload.action === 'delivery' && Math.random() < 0.1) {
            const errorMsg = "服务请求发送失败，请稍后再试或按0联系前台。";
            setIslandState('error');
            voiceService.speak(errorMsg);
            addToast('error', '发送失败', errorMsg);
            return;
        }

        setIslandState('success');
        break;
      case 'QUERY':
        setIslandState('success');
        break;
      case 'CHECKOUT':
        if (action.payload.confirm) {
          setIslandState('success');
          voiceService.clearLogs();
          localStorage.clear();
          sessionStorage.clear();
          setTimeout(() => window.location.reload(), 5000); 
        } else {
          setIslandState('listening'); 
        }
        break;
    }

    // Auto-clear highlight after animation duration
    if (action.type !== 'NAVIGATION') {
      setTimeout(() => setHighlightedDevice(null), 3000);
    }
    
    if (action.response && action.type !== 'CHECKOUT') {
        setIslandMessage(action.response);
        setIslandState('responding');
    }

    // "引导您进行下一步指令" -> Show "继续收音" after processing
    // If there's a response, the onSpeechEnd callback handles the cleanup timer
    if ((action.type !== 'CHECKOUT' || action.payload.confirm) && !action.response) {
        // UI 文本实时清理：仅针对无语音反馈的操作使用即时延时
        setTimeout(() => {
          setIslandState('idle');
          setIslandMessage('继续收音');
          setVoiceText(''); 
          setHighlightedDevice(null);
        }, 1500);
    }
  };

  const startVoiceControl = () => {
    // 停止与连续交互：再次点击停止或开始
    if (voiceService.isListening) {
      voiceService.stop();
      return;
    }

    // 语音清理：开启新的会话时，自动清除上一次状态
    setVoiceText('');
    setIslandMessage('');
    setVoiceError(null);
    
    // 唤醒与开启确认
    setIslandState('listening');
    setIslandMessage("语音服务已开启");
    
    initVoice();
  };

  return (
    <div className="min-h-screen bg-surface text-white font-sans selection:bg-cyan-900/50 flex flex-col">
      <TopBar 
        isListening={isListening} 
        startVoice={startVoiceControl} 
        islandState={islandState}
        islandMessage={islandMessage}
        chatMessages={chatMessages}
        onChatSend={handleChatSend}
        isAssistantOpen={isAssistantOpen}
        setIsAssistantOpen={setIsAssistantOpen}
      />
      
      <main className="flex-1 pt-20 pb-24 px-8 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <HomeView 
              key="home" 
              temp={temp} setTemp={setTemp}
              lightsOn={lightsOn} setLightsOn={setLightsOn}
              curtainsOpen={curtainsOpen} setCurtainsOpen={setCurtainsOpen}
              activeScene={activeScene} setActiveScene={setActiveScene}
              applyScene={applyScene}
              highlighted={highlightedDevice as any}
              entranceLight={entranceLight} setEntranceLight={setEntranceLight}
              bedsideLight={bedsideLight} setBedsideLight={setBedsideLight}
              bedroomLight={bedroomLight} setBedroomLight={setBedroomLight}
              bathroomLight={bathroomLight} setBathroomLight={setBathroomLight}
              mirrorLight={mirrorLight} setMirrorLight={setMirrorLight}
              balconyLight={balconyLight} setBalconyLight={setBalconyLight}
              exhaustFan={exhaustFan} setExhaustFan={setExhaustFan}
              projector={projector} setProjector={setProjector}
              gauzeCurtain={gauzeCurtain} setGauzeCurtain={setGauzeCurtain}
              dndMode={dndMode} setDndMode={setDndMode}
              updateDeviceState={updateDeviceState}
              rooms={rooms}
              addToast={addToast}
            />
          )}
          {view === 'devices' && (
            <DevicesView 
              key="devices" 
              mode={devicesMode} 
              setMode={setDevicesMode} 
              zoom={zoom} 
              setZoom={setZoom} 
              highlighted={highlightedDevice as any}
              addToast={addToast}
              rooms={rooms}
              updateDeviceState={updateDeviceState}
            />
          )}
          {view === 'services' && <ServicesView key="services" />}
          {view === 'profile' && <ProfileView key="profile" brightness={brightness} setBrightness={setBrightness} />}
        </AnimatePresence>
      </main>

      {/* Voice Status Toast */}
      <AnimatePresence>
        {(isListening || voiceText || voiceError) && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          >
            <div className={cn(
              "px-6 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-4",
              voiceError ? "bg-red-900/40 border-red-500/50" : "bg-zinc-900/80 border-white/10"
            )}>
              <div className="flex gap-1.5 items-center">
                {isListening ? (
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }} 
                    transition={{ repeat: Infinity }} 
                    className="w-2 h-2 bg-cyan-500 rounded-full" 
                  />
                ) : voiceError ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <Check className="w-4 h-4 text-cyan-500" />
                )}
              </div>
              <span className="text-sm font-medium">
                {isListening ? t('listening') : voiceError ? voiceError : `“ ${voiceText} ”`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <BottomNav currentView={view} setView={setView} />
      
      <ToastContainer toasts={toasts} onRemove={(id: string) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
}

// --- UI Feedback Components ---

const Toast = ({ type, title, message, onRemove }: { type: 'error' | 'success', title: string, message: string, onRemove: () => void }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ x: 100, opacity: 0, scale: 0.9 }}
      animate={{ 
        x: 0, 
        opacity: 1, 
        scale: 1,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 25
        }
      }}
      exit={{ x: 100, opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "w-85 p-6 rounded-[2.2rem] glass border shadow-2xl shadow-black/50 backdrop-blur-3xl flex flex-col gap-3 relative overflow-hidden pointer-events-auto",
        type === 'error' ? "border-red-500/50 bg-red-950/20 shadow-red-900/10" : "border-cyan-500/50 bg-cyan-950/20 shadow-cyan-900/10"
      )}
    >
      <div className={cn(
        "absolute top-0 left-0 w-1.5 h-full",
        type === 'error' ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
      )} />
      
      <div className="flex items-center gap-5">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
          type === 'error' ? "bg-red-500/20" : "bg-cyan-500/20"
        )}>
          {type === 'error' ? (
            <AlertCircle className="w-6 h-6 text-red-500" />
          ) : (
            <Sparkles className="w-6 h-6 text-cyan-500" />
          )}
        </div>
        <div className="flex-grow">
          <div className="flex justify-between items-center mb-1">
            <h4 className={cn("text-[11px] font-black tracking-[0.2em] uppercase", type === 'error' ? "text-red-400" : "text-cyan-400")}>
              {title}
            </h4>
            <button onClick={onRemove} className="text-zinc-600 hover:text-white transition-colors">
              <Plus className="w-5 h-5 rotate-45" />
            </button>
          </div>
          <p className="text-[13px] font-bold text-white leading-tight">
            {message}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const ToastContainer = ({ toasts, onRemove }: { toasts: any[], onRemove: (id: string) => void }) => {
  return (
    <div className="fixed bottom-32 right-8 z-[100] flex flex-col gap-4 pointer-events-none">
      <AnimatePresence>
        {[...toasts].reverse().map((toast: any) => (
          <Toast key={toast.id} {...toast} onRemove={() => onRemove(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};
