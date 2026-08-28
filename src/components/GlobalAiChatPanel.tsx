import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  User,
  Send,
  Sparkles,
  X,
  Search,
  ArrowRight,
  FileText,
  Folder,
  Loader2,
  Plus,
  History,
  Trash2,
  ChevronLeft,
  ShieldAlert,
  ShieldCheck,
  CornerDownRight,
  Presentation,
  FileSpreadsheet,
} from 'lucide-react';
import type { DriveItem } from '../services/driveDatabase';
import { parseAndRepairJson } from '../utils/geminiVisionApi';

function getFileBadgeStyle(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['ppt', 'pptx'].includes(ext)) {
    return { label: 'PPTX', color: 'bg-amber-500/10 text-amber-600 border-amber-200/80', icon: Presentation };
  }
  if (['pdf'].includes(ext)) {
    return { label: 'PDF', color: 'bg-rose-500/10 text-rose-600 border-rose-200/80', icon: FileText };
  }
  if (['doc', 'docx', 'odt'].includes(ext)) {
    return { label: 'DOCX', color: 'bg-blue-500/10 text-blue-600 border-blue-200/80', icon: FileText };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return { label: 'EXCEL', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200/80', icon: FileSpreadsheet };
  }
  return { label: ext.toUpperCase() || 'FILE', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200/80', icon: FileText };
}

interface GlobalAiChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  allItems: DriveItem[];
  onSelectFile: (file: DriveItem) => void;
  onOpenFolder: (folderUuid: string) => void;
  autoRefFile?: DriveItem | null;
  onClearAutoRefFile?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  matchedFiles?: DriveItem[];
  attachedFiles?: DriveItem[];
  quotedText?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const STORAGE_KEY = 'luminous_ai_chat_sessions_v1';

const PROFANITY_SAFETY_REGEX = /\b(anjing|babi|kontol|memek|bangsat|tai|pantat|goblok|tolol|bajingan|fuck|shit|pantek|kampret|biadab|lonte|hack|exploit|attack|inject)\b/i;

/**
 * Generate 100% Gemini-Style Concise Topic Title or Guardian Title
 */
function generateGeminiStyleTitle(userText: string): string {
  if (PROFANITY_SAFETY_REGEX.test(userText)) {
    return '🛡️ Peringatan Guardian AI';
  }

  // Strip common filler prompt phrases
  let clean = userText
    .replace(/^(tolong|bisakah|dapatkah|mohon|saya\s+ingin|saya\s+mau|cari|carikan|tampilkan|apa\s+isi|bagaimana|mana|di\s+mana)\s+/i, '')
    .trim();

  if (!clean) clean = userText;

  // Take first 2-5 core topic words and capitalize
  const words = clean.split(/\s+/).filter(Boolean).slice(0, 5);
  let title = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  if (title.length > 35) {
    title = title.slice(0, 32) + '...';
  }

  return title || 'Obrolan Baru';
}

export const GlobalAiChatPanel: React.FC<GlobalAiChatPanelProps> = ({
  isOpen,
  onClose,
  allItems,
  onSelectFile,
  onOpenFolder,
  autoRefFile,
  onClearAutoRefFile,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sanitize existing saved titles to ensure profanity is replaced with Guardian title
          return parsed.map((s: ChatSession) => {
            const firstUserMsg = s.messages.find((m) => m.sender === 'user');
            if (PROFANITY_SAFETY_REGEX.test(s.title) || (firstUserMsg && PROFANITY_SAFETY_REGEX.test(firstUserMsg.text))) {
              const allUserMsgs = s.messages.filter((m) => m.sender === 'user');
              const isAllProfane = allUserMsgs.length > 0 && allUserMsgs.every((m) => PROFANITY_SAFETY_REGEX.test(m.text));
              return {
                ...s,
                title: isAllProfane ? '🛡️ Peringatan Guardian AI' : generateGeminiStyleTitle(firstUserMsg?.text || 'Obrolan Baru'),
              };
            }
            return s;
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load chat sessions:', e);
    }
    const defaultId = `session-${Date.now()}`;
    return [
      {
        id: defaultId,
        title: 'Chat Baru',
        updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        messages: [
          {
            id: 'welcome-1',
            sender: 'ai',
            text: 'Halo! Saya **SmartDrive AI Assistant** (Powered by Gemini AI). Anda dapat menanyakan isi konteks dokumen/foto di Drive Anda, atau meminta saya mencarikan berkas yang relevan secara cerdas!',
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id || `session-${Date.now()}`);
  const [showHistoryView, setShowHistoryView] = useState<boolean>(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync active messages
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  // Persist sessions to localStorage whenever they update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Failed to save chat sessions:', e);
    }
  }, [sessions]);

  const quickPrompts = [
    'Cari berkas kuesioner atau evaluasi saya',
    'Mana dokumen pertemuan bilateral Indonesia - Tiongkok?',
    'Cari foto aksi mahasiswa atau posko bencana',
    'Tampilkan dokumen bertema akademik atau penelitian',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const msgCount = messages.length;
  useEffect(() => {
    if (isOpen && !showHistoryView) {
      scrollToBottom();
    }
  }, [msgCount, isOpen, isLoading, showHistoryView]);

  const [attachedRefFiles, setAttachedRefFiles] = useState<DriveItem[]>([]);
  const [quotedText, setQuotedText] = useState<string | null>(null);
  const [selectedTextPopup, setSelectedTextPopup] = useState<{ text: string; x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Text selection handler in chat log (Gambar 1)
  const handleChatTextSelection = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const text = selection.toString().trim();
      if (text.length > 3) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectedTextPopup({
          text,
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        });
        return;
      }
    }
    setSelectedTextPopup(null);
  };

  // Auto attach file when user clicks Ref AI Sparkles icon on a file row (Gambar 2)
  useEffect(() => {
    if (isOpen && autoRefFile) {
      setShowHistoryView(false);
      setAttachedRefFiles((prev) => {
        if (prev.some((f) => f.uuid === autoRefFile.uuid)) return prev;
        return [...prev, autoRefFile];
      });
      if (onClearAutoRefFile) onClearAutoRefFile();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, autoRefFile]);

  // Create a brand new Chat Session (+ Chat Baru)
  const handleCreateNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'Chat Baru',
      updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      messages: [
        {
          id: `welcome-${Date.now()}`,
          sender: 'ai',
          text: 'Halo! Ada yang bisa saya bantu terkait isi konteks atau pencarian berkas di Drive Anda?',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setShowHistoryView(false);
    setInputQuery('');
    setAttachedRefFiles([]);
    setQuotedText(null);
    setSelectedTextPopup(null);
  };

  // Switch to a previous session from history
  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setShowHistoryView(false);
    setSelectedTextPopup(null);
  };

  // Delete a chat session from history
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (filtered.length === 0) {
        const freshId = `session-${Date.now()}`;
        const freshSession: ChatSession = {
          id: freshId,
          title: 'Chat Baru',
          updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          messages: [
            {
              id: 'welcome-init',
              sender: 'ai',
              text: 'Halo! Ada yang bisa saya bantu terkait isi berkas Drive Anda?',
              timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        };
        setActiveSessionId(freshId);
        return [freshSession];
      }
      if (activeSessionId === sessionId) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  // Send message in current active session
  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isLoading) return;

    const currentAttached = [...attachedRefFiles];
    const currentQuoted = quotedText || undefined;
    const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp,
      attachedFiles: currentAttached.length > 0 ? currentAttached : undefined,
      quotedText: currentQuoted,
    };

    // Clear attached files & quoted text input bar after sending
    setAttachedRefFiles([]);
    setQuotedText(null);
    setSelectedTextPopup(null);

    // Update active session with user message & set Gemini-style session title
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const userMsgs = [...s.messages.filter((m) => m.sender === 'user'), userMsg];
          const isAllProfane = userMsgs.every((m) => PROFANITY_SAFETY_REGEX.test(m.text));
          
          let title = s.title;
          if (isAllProfane) {
            title = '🛡️ Peringatan Guardian AI';
          } else if (s.title === 'Chat Baru' || s.title === 'Obrolan Baru' || PROFANITY_SAFETY_REGEX.test(s.title)) {
            const firstPoliteMsg = userMsgs.find((m) => !PROFANITY_SAFETY_REGEX.test(m.text));
            title = firstPoliteMsg ? generateGeminiStyleTitle(firstPoliteMsg.text) : '🛡️ Peringatan Guardian AI';
          }

          return {
            ...s,
            title,
            updatedAt: timestamp,
            messages: [...s.messages, userMsg],
          };
        }
        return s;
      })
    );

    if (!queryText) setInputQuery('');
    setIsLoading(true);

    try {
      const apiKey = localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';

      // Build RAG query text with quoted text snippet if present
      let ragQuery = q;
      if (currentQuoted) {
        ragQuery = `[KUTIPAN TEKS/KODE YANG DIRUJUK PENGGUNA]:\n"${currentQuoted}"\n\nPERTANYAAN PENGGUNA:\n${q}`;
      }

      // Collect chat history and all session-attached files to maintain context continuity
      const activeSession = sessions.find((s) => s.id === activeSessionId);
      const previousMessages = (activeSession?.messages || [])
        .filter((m) => m.id !== 'welcome-1')
        .map((m) => ({
          sender: m.sender === 'user' ? 'Pengguna' : 'AI Assistant',
          text: m.text,
          attachedFiles: m.matchedFiles?.map((f) => f.name) || [],
        }));

      const allSessionAttached = [
        ...(activeSession?.messages || []).flatMap((m) => m.matchedFiles || []),
        ...currentAttached,
      ];
      const sessionAttachedMap = new Map<string, DriveItem>();
      allSessionAttached.forEach((f) => {
        if (f && f.uuid) sessionAttachedMap.set(f.uuid, f);
      });
      const effectiveAttached = Array.from(sessionAttachedMap.values());

      const { answer, matchedFiles } = await askGeminiDriveAssistant(
        ragQuery,
        effectiveAttached,
        allItems,
        apiKey,
        previousMessages
      );

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: answer,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        matchedFiles: matchedFiles.length > 0 ? matchedFiles : (currentAttached.length > 0 ? currentAttached : undefined),
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              messages: [...s.messages, aiMsg],
            };
          }
          return s;
        })
      );
    } catch (err: any) {
      console.error('Gemini Drive Assistant Error:', err);
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: `Maaf, terjadi kendala saat menghubungi Gemini AI: ${err.message || 'Gagal memproses permintaan'}.`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...s.messages, errorMsg],
            };
          }
          return s;
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white border-l border-slate-200 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right">
      {/* Header Panel */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white shadow-md">
        <div className="flex items-center gap-2.5">
          {showHistoryView ? (
            <button
              onClick={() => setShowHistoryView(false)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-indigo-200 hover:text-white transition-colors cursor-pointer"
              title="Kembali ke Chat"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-indigo-600/80 border border-indigo-400/40 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
          )}

          <div>
            <h3 className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
              <span>{showHistoryView ? 'Riwayat Chat Gemini' : activeSession?.title || 'SmartDrive AI Chat'}</span>
            </h3>
            <p className="text-[10px] text-indigo-200/90 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400 inline" />
              <span>{showHistoryView ? `${sessions.length} Sesi Tersimpan` : 'Gemini AI Guardian Protected'}</span>
            </p>
          </div>
        </div>

        {/* Action Controls: [+ Chat Baru], [Riwayat History], [Close X] */}
        <div className="flex items-center gap-1.5">
          {!showHistoryView && (
            <button
              onClick={handleCreateNewChat}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1 border border-white/20 transition-all cursor-pointer"
              title="Mulai Chat Baru"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>Chat Baru</span>
            </button>
          )}

          <button
            onClick={() => setShowHistoryView(!showHistoryView)}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              showHistoryView
                ? 'bg-indigo-600 text-white'
                : 'hover:bg-white/10 text-indigo-200 hover:text-white'
            }`}
            title="Lihat Riwayat Chat Gemini"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-indigo-200 hover:text-white transition-colors cursor-pointer"
            title="Tutup Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main View Switcher: HISTORY DRAWER vs ACTIVE CHAT */}
      {showHistoryView ? (
        /* Gemini Style Chat History List View */
        <div className="flex-1 flex flex-col p-4 bg-slate-50 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Daftar Sesi Chat Sebelumnya
            </span>
            <button
              onClick={handleCreateNewChat}
              className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Sesi Baru</span>
            </button>
          </div>

          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const lastMsg = session.messages[session.messages.length - 1]?.text || 'Kosong';

            return (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 group ${
                  isActive
                    ? 'bg-indigo-50/90 border-indigo-300 shadow-sm'
                    : 'bg-white hover:bg-slate-100/70 border-slate-200/80 shadow-2xs'
                }`}
              >
                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <History className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <h4 className={`text-xs font-bold truncate ${isActive ? 'text-indigo-900' : 'text-slate-800'}`}>
                      {session.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate line-clamp-1">{lastMsg}</p>
                  <span className="text-[10px] text-slate-400 font-mono block pt-0.5">{session.updatedAt}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                  title="Hapus Sesi Chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* Active Chat Conversation View */
        <>
          {/* Quick Suggestions Chips */}
          <div className="p-3 bg-slate-50 border-b border-slate-200/60 overflow-x-auto scrollbar-none">
            <div className="flex gap-2">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  disabled={isLoading}
                  className="text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200/80 px-2.5 py-1 rounded-xl whitespace-nowrap transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Search className="w-3 h-3 text-indigo-500" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Log with Text Selection Listener (Gambar 1) */}
          <div
            onMouseUp={handleChatTextSelection}
            className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 relative"
          >
            {/* Floating Contextual Popup when User Selects Text in Chat Log (Gambar 1) */}
            {selectedTextPopup && (
              <div
                style={{
                  position: 'fixed',
                  left: `${selectedTextPopup.x}px`,
                  top: `${selectedTextPopup.y}px`,
                  transform: 'translate(-50%, -100%)',
                }}
                className="z-50 bg-slate-900 text-white rounded-2xl p-1.5 shadow-2xl flex items-center gap-1 border border-slate-700 animate-in fade-in zoom-in-95"
              >
                <button
                  type="button"
                  onClick={() => {
                    setQuotedText(selectedTextPopup.text);
                    setSelectedTextPopup(null);
                    setTimeout(() => inputRef.current?.focus(), 100);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Kutip ke AI Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTextPopup(null)}
                  className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md ${
                      msg.text.includes('🛡️') ? 'bg-amber-600 border border-amber-400/50' : 'bg-indigo-600'
                    }`}
                  >
                    {msg.text.includes('🛡️') ? <ShieldAlert className="w-4 h-4 text-amber-100" /> : <Bot className="w-4 h-4" />}
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm space-y-2.5 ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-75 font-mono">
                    <span>{msg.sender === 'user' ? 'Anda' : 'Gemini AI Assistant'}</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Quoted Text Snippet inside User Message Bubble (Gambar 1) */}
                  {msg.quotedText && (
                    <div className="p-2.5 rounded-xl bg-indigo-700/60 border border-indigo-400/40 text-[11px] font-mono leading-relaxed flex items-start gap-2">
                      <CornerDownRight className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                      <span className="line-clamp-3 text-indigo-100 italic">
                        "{msg.quotedText}"
                      </span>
                    </div>
                  )}

                  {/* Clean Reference File Cards in User Message Bubble (Fix Gambar 2 UI/UX) */}
                  {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
                      {msg.attachedFiles.map((file: DriveItem) => {
                        const isRealImage = Boolean(
                          file.fileDataUrl?.startsWith('data:image') ||
                          (file.filePath && /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file.filePath))
                        );
                        const imgSrc = file.fileDataUrl || (file.filePath ? `http://localhost:3001/${file.filePath}` : '');
                        const badge = getFileBadgeStyle(file.name);
                        const IconComp = badge.icon;

                        return (
                          <div
                            key={file.uuid}
                            onClick={() => {
                              if (!file.isFolder) onSelectFile(file);
                            }}
                            className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/20 border border-white/30 text-white cursor-pointer hover:bg-white/30 transition-all"
                          >
                            {isRealImage && imgSrc ? (
                              <img
                                src={imgSrc}
                                alt={file.name}
                                className="w-6 h-6 rounded-lg object-cover border border-white/40 shrink-0"
                              />
                            ) : (
                              <IconComp className="w-4 h-4 text-amber-200 shrink-0" />
                            )}
                            <span className="text-xs font-semibold truncate max-w-[120px]">
                              {file.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>

                  {/* Matched Files Attachments */}
                  {msg.matchedFiles && msg.matchedFiles.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 space-y-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 block">
                        📌 Berkas Relevan Terdeteksi ({msg.matchedFiles.length}):
                      </span>
                      <div className="space-y-1.5">
                        {msg.matchedFiles.map((file) => (
                          <div
                            key={file.uuid}
                            onClick={() => {
                              if (file.isFolder) {
                                onOpenFolder(file.uuid);
                              } else {
                                onSelectFile(file);
                              }
                              onClose();
                            }}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              {file.isFolder ? (
                                <Folder className="w-4 h-4 text-indigo-600 fill-indigo-600 shrink-0" />
                              ) : (
                                <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                              )}
                              <div className="overflow-hidden">
                                <h5 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600">
                                  {file.name}
                                </h5>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {file.analysisResult?.captions?.shortId || file.categoryName || 'File'}
                                </p>
                              </div>
                            </div>

                            <span className="text-xs font-bold text-indigo-600 flex items-center gap-0.5 shrink-0 pl-2">
                              <span>Buka</span>
                              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-500 flex items-center gap-2 shadow-sm">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span>Gemini AI sedang menganalisis berkas drive Anda...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Clean Sleek Reference Attachment Bar (Fix Gambar 2 UI/UX) */}
          {attachedRefFiles.length > 0 && (
            <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{attachedRefFiles.length} Berkas Dirujuk ke AI Chat</span>
                </span>
                <button
                  type="button"
                  onClick={() => setAttachedRefFiles([])}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                >
                  Hapus Semua
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {attachedRefFiles.map((file) => {
                  const isRealImage = Boolean(
                    file.fileDataUrl?.startsWith('data:image') ||
                    (file.filePath && /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file.filePath))
                  );
                  const imgSrc = file.fileDataUrl || (file.filePath ? `http://localhost:3001/${file.filePath}` : '');
                  const badge = getFileBadgeStyle(file.name);
                  const IconComp = badge.icon;

                  return (
                    <div
                      key={file.uuid}
                      className="group relative shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all"
                    >
                      {isRealImage && imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={file.name}
                          className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${badge.color}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                      )}

                      <div className="overflow-hidden max-w-[130px] sm:max-w-[160px]">
                        <h6 className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                          {file.name}
                        </h6>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {badge.label}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setAttachedRefFiles((prev) => prev.filter((f) => f.uuid !== file.uuid))
                        }
                        className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ml-1"
                        title="Hapus referensi ini"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quoted Text Snippet Pill above Input Box (Gambar 1) */}
          {quotedText && (
            <div className="px-4 py-2 bg-indigo-50/90 border-t border-indigo-200 flex items-center justify-between gap-3 text-xs text-indigo-950 animate-in fade-in">
              <div className="flex items-center gap-2 overflow-hidden">
                <CornerDownRight className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-mono text-[11px] text-indigo-900 truncate">
                  Kutipan: "{quotedText}"
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQuotedText(null)}
                className="p-1 rounded-full hover:bg-indigo-200/80 text-indigo-700 transition-colors cursor-pointer shrink-0"
                title="Hapus kutipan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isLoading}
              placeholder={
                attachedRefFiles.length > 0
                  ? `Tanyakan tentang ${attachedRefFiles.length} berkas yang dirujuk...`
                  : 'Tanyakan konteks berkas ke Gemini AI...'
              }
              className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600/30 transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={(!inputQuery.trim() && attachedRefFiles.length === 0) || isLoading}
              className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </>
      )}
    </aside>
  );
};

/**
 * Local Instant Guardian Safety Pre-filter (Layer 1)
 */
function checkLocalGuardianPreFilter(query: string): string | null {
  const q = query.toLowerCase().trim();

  // 1. Malicious Hacking / Injection / Penetration Attempts
  if (/hack|exploit|sql injection|union select|drop database|<script|eval\(|bypass password|crawling server|port scan/i.test(q)) {
    return '🛡️ **Guardian Security Alert**: Permintaan peretasan (hacking), penetration testing, manipulasi SQL/script, atau crawling server luar dilarang keras demi keamanan platform SmartDrive.';
  }

  // 2. Profanity / Inappropriate Content
  if (/\b(anjing|babi|kontol|memek|bangsat|tai|pantat|goblok)\b/i.test(q)) {
    return '🛡️ **Guardian Safety Notice**: Harap gunakan bahasa yang sopan dan profesional saat berkomunikasi dengan SmartDrive AI Assistant.';
  }

  return null;
}

/**
 * 100% Dynamic Gemini AI Assistant & Guardian Engine
 * Direct RAG prompt sent to Google Gemini 3.5 Flash API with Safety & Resource Scope Enforcement.
 */
async function askGeminiDriveAssistant(
  userQuery: string,
  attachedRefFiles: DriveItem[] = [],
  allItems: DriveItem[],
  apiKey: string,
  chatHistory: { sender: string; text: string; attachedFiles?: string[] }[] = []
): Promise<{ answer: string; matchedFiles: DriveItem[] }> {
  // Layer 1: Instant Local Guardian Pre-filter
  const localCheck = checkLocalGuardianPreFilter(userQuery);
  if (localCheck) {
    return {
      answer: localCheck,
      matchedFiles: [],
    };
  }

  // Full representation of attached reference files with complete OCR & AI analysis
  const attachedDetails = attachedRefFiles.map((item) => ({
    uuid: item.uuid,
    name: item.name,
    fileType: item.fileType,
    category: item.categoryName || item.category,
    detectedDocumentType: item.analysisResult?.sceneContext?.sceneType || item.analysisResult?.captions?.shortId || 'Dokumen',
    primaryDomain: item.analysisResult?.sceneContext?.primaryDomain || 'Umum',
    shortSummary: item.analysisResult?.captions?.shortId || '',
    detailedContext: item.analysisResult?.captions?.detailedId || '',
    hashtags: item.analysisResult?.captions?.hashtags || item.tags || [],
    tagCategories: item.analysisResult?.tagCategories || [],
    detectedObjects: item.analysisResult?.detectedObjects || [],
    keyValuePairs: item.analysisResult?.ocr?.keyValuePairs || [],
    ocrFullText: (item.analysisResult?.ocr?.rawText || '').slice(0, 15000),
  }));

  // Compact representation of all files in user's drive with AI analysis details
  const filesCatalog = allItems.map((item) => {
    return {
      uuid: item.uuid,
      id: item.id,
      name: item.name,
      isFolder: item.isFolder,
      category: item.categoryName || item.category,
      documentType: item.analysisResult?.sceneContext?.sceneType || '',
      shortSummary: item.analysisResult?.captions?.shortId || '',
      detailedContext: item.analysisResult?.captions?.detailedId || '',
      hashtags: item.analysisResult?.captions?.hashtags || item.tags || [],
      ocrSnippet: (item.analysisResult?.ocr?.rawText || '').slice(0, 1500),
    };
  });

  const attachedSection =
    attachedDetails.length > 0
      ? `\n📌 BERKAS REFERENSI UTAMA YANG DILAMPIRKAN OLEH PENGGUNA:\n${JSON.stringify(attachedDetails, null, 2)}\nFokuskan analisis, penalaran, dan jawaban Anda secara mendalam pada berkas referensi utama di atas!\n`
      : '';

  const historySection =
    chatHistory.length > 0
      ? `\n📜 RIWAYAT PERCAKAPAN SEBELUMNYA DALAM SESI CHAT INI (WAKTU PENTING UNTUK KONTINUITAS KONTEKS):\n${JSON.stringify(chatHistory, null, 2)}\n`
      : '';

  const promptText = `Anda adalah SmartDrive AI Guardian & Assistant, sistem kecerdasan buatan terdepan dan penjaga keamanan platform Cloud Drive pengguna.

KEBIJAKAN KESELAMATAN & AI GUARDIAN RULES:
1. ATURAN PENOLAKAN KONTEN TIDAK PANTAS:
   TOLAK dengan sopan jika pertanyaan mengandung kata-kata kasar, ucapan tidak pantas, SARA, pornografi, atau pelecehan.

2. ATURAN KEAMANAN & ANTI-HACKING:
   TOLAK dengan tegas jika pengguna meminta peretasan (hacking), penetration testing, SQL injection, crawling server luar yang ilegal, bypass password/keamanan, atau pencurian data.

3. ATURAN SCOPING RESOURCE SYSTEM & AKADEMIK:
   - DIPERBOLEHKAN: Pertanyaan tentang berkas/dokumen di Drive, isi konteks AI, OCR, ringkasan, pencarian berkas, serta pertanyaan akademik/penelitian terdahulu yang relevan dengan konteks berkas di Drive.
   - DITOLAK (OUT OF SCOPE): Pertanyaan umum yang sama sekali TIDAK BERKAITAN dengan berkas Drive maupun data sistem/dokumen (Contoh: "Berapa harga BTC?", "Siapa pemenang piala dunia?", "Cara membuat bom", "Gosip selebriti"). Jelaskan bahwa sistem ini khusus melayani pengelolaan dokumen & kecerdasan Drive.

PETUNJUK JAWABAN & KONTINUITAS KONTEKS CHAT:
1. FOKUS 100% PADA SPESIFIKASI PERTANYAAN PENGGUNA:
   - Jika pengguna HANYA menanyakan jenis/klasifikasi dokumen (contoh: "ini dokumen jenis apa?"), JAWAB LANGSUNG nama spesifik jenis dokumennya secara padat dan faktual. DILARANG KERAS membuat daftar poin berulang (seperti poin 1, 2, 3, 4, 5) atau menyajikan informasi panjang lebar yang tidak diminta!
   - Jika pengguna menanyakan perhitungan/biaya, JAWAB FOKUS pada rincian angka dan kalkulasinya.
   - Jika pengguna menanyakan pihak terkait atau nama orang (misal: "namanya siapa?"), JAWAB FOKUS pada daftar nama/pihak terkait dari berkas yang sedang dibahas.
   - Jika pengguna meminta analisis lengkap/ringkasan, barulah berikan ulasan komprehensif.

2. ATURAN KONTINUITAS PERCAKAPAN (CHATHISTORY REASONING):
   - Perhatikan RIWAYAT PERCAKAPAN SEBELUMNYA di bawah ini.
   - Jika pengguna mengajukan pertanyaan lanjutan (seperti "namanya siapa?", "berapa harganya?", "siapa pengirimnya?", "apa tujuannya?"), PERTANYAAN TERSEBUT MERUJUK KEPADA BERKAS/SUBJEK DOKUMEN YANG SEDANG DIBAHAS PADA PERCAKAPAN SEBELUMNYA (misalnya berkas case1.pdf jika sebelumnya membahas case1.pdf)!
   - JANGAN MEMBAHAS BERKAS LAIN DI DRIVE (seperti case2.pdf) kecuali jika pengguna secara eksplisit meminta membandingkan berkas tersebut!

3. KAPABILITAS INTERNAL AI (GUNAKAN SESUAI KEBUTUHAN PERTANYAAN):
   Anda memiliki kapabilitas internal penuh untuk:
   - Mengidentifikasi nama spesifik jenis dokumen secara murni/organik dari teks & struktur visual.
   - Menganalisis konteks semantik, klausul, dan isi faktual.
   - Menghitung nominal angka, tarif, volume, dan matematika data.
   - Memberikan penalaran nalar (reasoning) tinggi terhadap esensi dokumen.
   Selalu gunakan kapabilitas di atas secara cerdas untuk menjawab pertanyaan pengguna secara langsung, alami, dan bebas dari format template kaku.

${historySection}
${attachedSection}
Daftar Berkas & Analisis Konteks AI di Drive Pengguna:
\`\`\`json
${JSON.stringify(filesCatalog, null, 2)}
\`\`\`

Pertanyaan Pengguna:
"${userQuery}"

Format Output JSON MURNI:
{
  "isRejected": false,
  "answer": "Jawaban naratif Bahasa Indonesia yang langsung, fokus, dan relevan 100% pada apa yang ditanyakan pengguna tanpa menyajikan poin-poin template yang tidak diminta.",
  "relevantUuids": ["uuid-berkas-1"]
}`;

  // Build multimodal content parts array (supports sending inline PDF & Image base64 data to Gemini)
  const parts: any[] = [{ text: promptText }];
  for (const item of attachedRefFiles) {
    if (item.fileDataUrl && item.fileDataUrl.startsWith('data:')) {
      const match = item.fileDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }
  }

  const models = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite'];
  let resultJson: any = null;

  for (const modelName of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (response.ok) {
        resultJson = await response.json();
        break;
      }
    } catch (e) {
      console.warn(`Gemini Assistant model ${modelName} failed, retrying...`, e);
    }
  }

  if (!resultJson) {
    throw new Error('Gagal menghubungi Gemini AI.');
  }

  const rawText = resultJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const parsed = parseAndRepairJson(rawText);

  const relevantUuids: string[] = parsed.relevantUuids || [];
  const rawMatched = allItems.filter(
    (item) => relevantUuids.includes(item.uuid) || relevantUuids.includes(String(item.id))
  );

  // Deduplicate matched files by file name to ensure unique list
  const seenNames = new Set<string>();
  const matchedFiles: DriveItem[] = [];
  for (const f of rawMatched) {
    if (!seenNames.has(f.name)) {
      seenNames.add(f.name);
      matchedFiles.push(f);
    }
  }

  return {
    answer: parsed.answer || 'Teraplikasi analisis AI secara dinamis.',
    matchedFiles,
  };
}
