import React, { useState } from 'react';
import { useChatbot } from '../../hooks/useChatbot';

interface ChatbotPanelProps {
    userId: string;
    chronotype: string;
    onTaskCreated: () => void;
}

export const ChatbotPanel: React.FC<ChatbotPanelProps> = ({ userId, chronotype, onTaskCreated }) => {
    const {
        messages,
        isLoading,
        handleSendMessage,
        handleAcceptProposal,
        handleRejectProposal,
        handleClearChat
    } = useChatbot();

    const [input, setInput] = useState('');

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        handleSendMessage(input, userId, chronotype);
        setInput('');
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl w-80 shrink-0">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <h2 className="font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    Asistente IA
                </h2>
                <button onClick={handleClearChat} className="text-xs text-slate-300 hover:text-white underline">
                    Limpiar
                </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-gray-50/50">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3 rounded-lg max-w-[90%] text-sm shadow-sm ${msg.sender === 'user'
                            ? 'bg-slate-800 text-white rounded-br-none'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                            }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>

                        {msg.isProposal && (
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => handleAcceptProposal(onTaskCreated)}
                                    disabled={isLoading}
                                    className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded hover:bg-emerald-600 transition-colors shadow-sm"
                                >
                                    ✓ Sí, agendar
                                </button>
                                <button
                                    onClick={handleRejectProposal}
                                    disabled={isLoading}
                                    className="px-3 py-1.5 bg-rose-500 text-white text-xs font-medium rounded hover:bg-rose-600 transition-colors shadow-sm"
                                >
                                    ✕ Buscar otra
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="self-start p-3 bg-gray-100 text-gray-500 rounded-lg text-sm italic border border-gray-200">
                        <span className="animate-pulse">Analizando calendario...</span>
                    </div>
                )}
            </div>

            <form onSubmit={onSubmit} className="p-4 border-t border-gray-200 bg-white flex flex-col gap-3">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ej: Quiero ir al gimnasio 1h, 3 días/semana..."
                    className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="w-full px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                    Enviar
                </button>
            </form>
        </div>
    );
};