'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { sound } from '@/lib/sound';
import {
  Sparkles, X, Send, Bot, MessageSquare, ArrowUpRight,
  ShieldCheck, RefreshCw, HelpCircle, ChevronRight, Minimize2,
  Terminal, Gavel, Wallet, Activity
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'oracle' | 'user';
  text: string;
  timestamp: string;
  actions?: { label: string; href: string }[];
}

const QUICK_PROMPTS = [
  'How does the 120% resale cap work?',
  'Explain Dutch Auction drops',
  'What is SIM trader activity?',
  'How does ledger settlement work?',
  'Which assets can I trade?',
];

const KNOWLEDGE_BASE: { keywords: string[]; response: string; actions?: { label: string; href: string }[] }[] = [
  {
    keywords: ['120%', 'resale cap', 'ceiling', 'anti-scalping', 'cap', 'scalp'],
    response:
      'The 120% Resale Cap (Rule R3) is mathematically hardcoded into the Darkhold Exchange matching engine. Resale prices can never exceed 1.2× the original face value. Any ask, bid, or auction placement above this limit is automatically rejected by the circuit breakers to eliminate ticket scalping.',
    actions: [{ label: 'View Assets & Ceilings', href: '/market' }],
  },
  {
    keywords: ['dutch', 'auction', 'drop', 'decay', 'gavel'],
    response:
      'Dutch Auctions on Darkhold start at an initial ceiling price and dynamically decay at calibrated intervals until reaching the reserve floor. Traders can claim items instantly at the current clearing price, settling directly to the cryptographic ledger.',
    actions: [{ label: 'Live Dutch Auctions', href: '/auctions' }],
  },
  {
    keywords: ['sim', 'bot', 'trader', 'simulation', 'mock'],
    response:
      'SIM traders are automated market-maker bots deployed to maintain continuous liquidity and order book depth. All SIM trades are labeled with a "SIM" badge and adhere strictly to exchange rules, face-value ceilings, and ledger invariants.',
    actions: [{ label: 'Inspect Demo Console', href: '/admin/demo' }],
  },
  {
    keywords: ['settle', 'settlement', 'ledger', 'balance', 'reserve', 'double-entry'],
    response:
      'Every transaction follows a strict 3-phase invariant: Reserve → Match → Settle. Funds are held in escrow, verified against double-entry ledger balances, and committed atomically to prevent double-spending or partial allocation failures.',
    actions: [{ label: 'Check Portfolio & Ledger', href: '/portfolio' }],
  },
  {
    keywords: ['asset', 'pass', 'merch', 'what can i trade', 'festival', 'hoodie', 'moonrise'],
    response:
      'Currently active passes & merch include:\n• Darkhold Fest Weekend Pass (Face: $120, Cap: $144)\n• Moonrise GA Pass (Face: $85, Cap: $102)\n• Darkhold Hoodie Limited (Face: $75, Cap: $90)\n• Sigil Collector Pin (Available via Dutch Auction)',
    actions: [
      { label: 'Trade DFEST-WKD', href: '/trade/dfest-wkd' },
      { label: 'Trade MOON-GA', href: '/trade/moon-ga' },
    ],
  },
  {
    keywords: ['trade', 'order', 'buy', 'sell', 'terminal'],
    response:
      'To trade, navigate to the Trading Terminal. Select your asset, choose Limit or Market order, specify quantity and price (under the 120% cap), and click Buy or Sell. The order book updates in real-time via WebSocket feeds.',
    actions: [{ label: 'Open Terminal', href: '/trade/dfest-wkd' }],
  },
];

export function ChatbotWidget() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'oracle',
      text: 'Greetings, Trader. I am the Darkhold Oracle, your simulated exchange intelligence. Ask me anything about anti-scalp price ceilings, Dutch drops, or order lifecycles.',
      timestamp: 'Just now',
      actions: [
        { label: 'Live Market', href: '/market' },
        { label: 'Auctions', href: '/auctions' },
      ],
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
    }
  }, [isOpen, messages, isTyping]);

  const handleToggle = () => {
    sound.playClick();
    setIsOpen((prev) => !prev);
  };

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query) return;

    sound.playClick();
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Formulate answer based on knowledge base
    const lower = query.toLowerCase();
    const matched = KNOWLEDGE_BASE.find((k) => k.keywords.some((w) => lower.includes(w)));

    setTimeout(() => {
      let responseText = matched
        ? matched.response
        : "I can assist you with understanding Darkhold Exchange's 120% resale price ceiling, Dutch auction drops, double-entry ledger settlement, and trading terminal operations. Feel free to select any prompt below.";
      let actions = matched?.actions || [
        { label: 'Explore Market', href: '/market' },
        { label: 'Trading Desk', href: '/trade/dfest-wkd' },
      ];

      const oracleMsg: ChatMessage = {
        id: `oracle-${Date.now()}`,
        sender: 'oracle',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions,
      };

      setMessages((prev) => [...prev, oracleMsg]);
      setIsTyping(false);
      sound.playChime(720);
    }, 600);
  };

  const handleReset = () => {
    sound.playClick();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'oracle',
        text: 'Session reset. What can I help you simulate today?',
        timestamp: 'Just now',
        actions: [
          { label: 'View Dashboard', href: '/market' },
          { label: 'Terminal', href: '/trade/dfest-wkd' },
        ],
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none">
      {/* ── Pop-up Chat Window ───────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.82, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 18 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            style={{ transformOrigin: 'bottom right' }}
            className="fixed bottom-24 right-6 w-[380px] max-w-[calc(100vw-36px)] h-[540px] max-h-[calc(100vh-120px)] rounded-3xl bg-[linear-gradient(165deg,rgba(18,16,28,0.96)_0%,rgba(10,8,18,0.98)_100%)] border border-[rgba(185,167,255,0.24)] shadow-[0_0_36px_-4px_rgba(123,47,247,0.30),0_24px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl flex flex-col overflow-hidden z-50"
          >
            {/* Header Strip */}
            <div className="p-4 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-[linear-gradient(135deg,#7B2FF7,#B9A7FF)] p-0.5 shadow-md shadow-[rgba(185,167,255,0.25)] flex items-center justify-center">
                    <div className="w-full h-full rounded-[10px] bg-[#120F24] flex items-center justify-center text-[var(--lav)]">
                      <Sparkles size={16} />
                    </div>
                  </div>
                  {/* Status dot */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--buy)] border-2 border-[#120F24] shadow-sm animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-display font-bold text-sm text-white tracking-tight">
                      Darkhold Oracle
                    </h4>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[rgba(185,167,255,0.14)] text-[var(--lav)] border border-[rgba(185,167,255,0.2)]">
                      AI COPILOT
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--muted)] block leading-tight">
                    Simulated Market Intelligence
                  </span>
                </div>
              </div>

              {/* Action Buttons: Reset & Close */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reset Conversation"
                  aria-label="Reset Conversation"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors cursor-pointer"
                >
                  <RefreshCw size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleToggle}
                  title="Close Oracle"
                  aria-label="Close Oracle"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-reveal`}
                  >
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? 'bg-[var(--lav)] text-[#15102A] font-medium shadow-md shadow-[rgba(185,167,255,0.2)] rounded-tr-sm'
                          : 'bg-[rgba(255,255,255,0.04)] text-[var(--text)] border border-[rgba(255,255,255,0.08)] shadow-sm rounded-tl-sm backdrop-blur-md'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.text}</p>
                    </div>

                    {/* Quick navigation action pills */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        {msg.actions.map((act, i) => (
                          <Link
                            key={i}
                            href={act.href}
                            onClick={() => {
                              sound.playClick();
                              setIsOpen(false);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold bg-[rgba(185,167,255,0.12)] text-[var(--lav)] hover:bg-[rgba(185,167,255,0.22)] border border-[rgba(185,167,255,0.25)] flex items-center gap-1 transition-all"
                          >
                            <span>{act.label}</span>
                            <ArrowUpRight size={11} />
                          </Link>
                        ))}
                      </div>
                    )}

                    <span className="text-[9px] font-mono text-[var(--muted)] mt-1 px-1 opacity-70">
                      {msg.timestamp}
                    </span>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] w-20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--lav)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--lav)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--lav)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Carousel */}
            <div className="px-3 pt-2 pb-1 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)]">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-mono text-[var(--muted)] hover:text-white bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(185,167,255,0.15)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(185,167,255,0.3)] whitespace-nowrap transition-all cursor-pointer shrink-0"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Box Footer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 border-t border-[rgba(255,255,255,0.08)] bg-[rgba(10,10,16,0.9)] flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask Oracle about ceilings, drops, rules…"
                className="flex-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] focus:border-[var(--lav)] rounded-xl px-3 py-2 text-xs text-white placeholder-[var(--muted)] outline-none transition-all font-mono"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                title="Send Message"
                aria-label="Send Message"
                className="w-9 h-9 rounded-xl bg-[var(--lav)] text-[#15102A] flex items-center justify-center hover:bg-[#d0c4ff] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer shadow-md shadow-[rgba(185,167,255,0.25)]"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Launcher Trigger Button ──────────────────── */}
      <motion.button
        type="button"
        onClick={handleToggle}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        title="Darkhold Oracle Copilot"
        aria-label="Toggle Darkhold Oracle Chatbot"
        className="w-14 h-14 rounded-2xl bg-[linear-gradient(135deg,#7B2FF7_0%,#B9A7FF_100%)] p-[1.5px] shadow-[0_0_24px_-2px_rgba(123,47,247,0.5),0_8px_30px_rgba(0,0,0,0.7)] cursor-pointer relative group"
      >
        <div className="w-full h-full rounded-[14px] bg-[#120F24] flex items-center justify-center relative overflow-hidden transition-colors group-hover:bg-[#181432]">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(185,167,255,0.35),transparent_70%)] pointer-events-none" />

          {/* Icon with smooth rotation morph between Sparkles/Bot and X */}
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="text-[var(--lav)]"
              >
                <X size={22} />
              </motion.div>
            ) : (
              <motion.div
                key="bot"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="text-[var(--lav)]"
              >
                <Sparkles size={22} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Unread Ping Dot */}
          {!isOpen && hasUnread && (
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--buy)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--buy)] border border-[#120F24]" />
            </span>
          )}
        </div>
      </motion.button>
    </div>
  );
}
