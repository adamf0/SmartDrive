import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, MessageSquare, HelpCircle } from 'lucide-react';
import type { AnalysisResult, ChatMessage } from '../types/vision';

interface MultimodalChatPanelProps {
  analysis: AnalysisResult;
}

export const MultimodalChatPanel: React.FC<MultimodalChatPanelProps> = ({ analysis }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: `Halo! Saya asisten Multimodal Vision AI. Gambar **"${analysis.imageName}"** telah berhasil di-analisis. Anda dapat mengajukan pertanyaan apapun terkait konteks objek, teks OCR, jenis dokumen, atau palet warna gambar ini!`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'Deskripsikan gambar ini secara lengkap untuk tunanetra',
    'Berapa total nilai/nominal atau data penting pada gambar ini?',
    'Apa saja objek utama dan bagaimana posisinya?',
    'Apa warna dominan dan nuansa (vibe) dari foto ini?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (queryToSend?: string) => {
    const text = queryToSend || inputQuery.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryToSend) setInputQuery('');

    // Generate intelligent AI answer
    setTimeout(() => {
      const aiResponseText = answerMultimodalQuery(text, analysis);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 600);
  };

  return (
    <div className="space-y-4 flex flex-col h-full min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Interactive Visual Q&A (Multimodal Chat)
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Tanya Apapun Tentang Gambar
        </span>
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="text-xs font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-3 py-1.5 rounded-xl text-left transition-colors flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Message Chat Container */}
      <div className="flex-1 glass-panel rounded-2xl p-4 overflow-y-auto space-y-4 max-h-[380px] border border-slate-800">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-2xl p-3.5 text-xs sm:text-sm space-y-1 ${
                msg.sender === 'user'
                  ? 'bg-cyan-600 text-white rounded-br-none'
                  : 'bg-slate-900/90 text-slate-100 border border-slate-800 rounded-bl-none'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] opacity-75 font-mono">
                <span>{msg.sender === 'user' ? 'Anda' : 'MultiVision AI'}</span>
                <span>{msg.timestamp}</span>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-cyan-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Tanyakan sesuatu tentang gambar ini (misal: 'Berapa totalnya?', 'Apa objek di kanan?')..."
          className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputQuery.trim()}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all"
        >
          <span>Kirim</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};

function answerMultimodalQuery(query: string, analysis: AnalysisResult): string {
  const q = query.toLowerCase();

  if (q.includes('tunanetra') || q.includes('alt-text') || q.includes('deskripsi')) {
    return `**Deskripsi Aksesibilitas Tunanetra (Alt-Text):**\n\n"${analysis.captions.detailedId}"`;
  }

  if (q.includes('total') || q.includes('nominal') || q.includes('harga') || q.includes('uang')) {
    if (analysis.ocr.hasText) {
      const totalKv = analysis.ocr.keyValuePairs.find((kv) => kv.key.toLowerCase().includes('total'));
      if (totalKv) {
        return `Berdasarkan ekstraksi OCR pada gambar, **${totalKv.key}** adalah **${totalKv.value}**.`;
      }
      return `Teks yang terekstrak dari dokumen ini meliputi:\n\n${analysis.ocr.rawText}`;
    }
    return `Gambar ini didominasi oleh subjek visual tanpa nominal angka transaksi yang menonjol.`;
  }

  if (q.includes('objek') || q.includes('posisi') || q.includes('benda')) {
    const listObj = analysis.detectedObjects.map((o) => `- **${o.labelId}** (${o.category})`).join('\n');
    return `Objek-objek utama yang terdeteksi pada gambar ini antara lain:\n\n${listObj}`;
  }

  if (q.includes('warna') || q.includes('vibe') || q.includes('suasana') || q.includes('mood')) {
    const topColors = analysis.colorPalette.slice(0, 3).map((c) => `${c.name} (${c.hex})`).join(', ');
    return `Warna dominan pada gambar ini adalah **${topColors}** dengan suasana/vibe **"${analysis.sceneContext.moodVibe}"** pada lingkungan **${analysis.sceneContext.indoorOutdoor}**.`;
  }

  return `Berdasarkan analisis visual multimodal:\n- **Kategori Scene:** ${analysis.sceneContext.sceneType}\n- **Deskripsi:** ${analysis.captions.shortId}\n- **Warna Dominan:** ${analysis.colorPalette[0]?.name || 'N/A'}\n- **Engine:** ${analysis.engineUsed}`;
}
