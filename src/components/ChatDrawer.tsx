import React, { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  currentUserId,
  onSendMessage
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <aside
      id="chat-drawer"
      className="w-full sm:w-80 md:w-96 h-full bg-slate-900 border-l border-slate-800 flex flex-col z-40 transition-all duration-200 shadow-2xl flex-shrink-0"
    >
      {/* Header */}
      <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Chat de la reunión</h2>
          <p className="text-xs text-slate-400">Los mensajes son visibles para todos</p>
        </div>
        <button
          id="btn-close-chat"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          title="Cerrar chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Feed */}
      <div
        id="chat-messages-container"
        className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
            <span>No hay mensajes en la clase todavía.</span>
            <span className="mt-1">Inicia la conversación enviando un mensaje.</span>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div
                  key={msg.id}
                  className="w-full flex justify-center my-1"
                >
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full text-center border border-slate-700/60 max-w-xs">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isMe = msg.senderId === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Sender name & timestamp */}
                <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">
                    {isMe ? 'Tú' : msg.senderName}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Bubble */}
                <div
                  className={`px-3.5 py-2 rounded-2xl max-w-[85%] text-xs md:text-sm leading-relaxed break-words shadow-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : 'bg-slate-800 text-slate-100 rounded-tl-xs border border-slate-700/60'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        id="chat-form"
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2"
      >
        <input
          id="chat-input-text"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribe un mensaje..."
          maxLength={1000}
          className="flex-1 bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-400 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 transition"
        />
        <button
          id="btn-send-chat"
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white transition cursor-pointer flex-shrink-0 shadow-sm"
          title="Enviar mensaje"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
};
