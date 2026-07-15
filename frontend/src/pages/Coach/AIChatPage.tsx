import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import type { CoachingConversation, CoachingMessage } from '../../types';

export default function AIChatPage() {
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery<{ conversations: CoachingConversation[] }>({
    queryKey: ['coaching-conversations'],
    queryFn: async () => (await api.get('/coaching/conversations')).data,
  });

  const chatMutation = useMutation({
    mutationFn: async (data: { content: string; conversationId?: string }) => {
      return (await api.post('/coaching/chat', data)).data;
    },
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      if (data.suggestions) setSuggestions(data.suggestions);
    },
  });

  const loadConversation = async (convId: string) => {
    try {
      const result = await api.get(`/coaching/conversations/${convId}/messages`);
      setMessages(result.data.messages.map((m: CoachingMessage) => ({ role: m.role, content: m.content })));
      setConversationId(convId);
      setSuggestions([]);
    } catch {
      // Error loading conversation
    }
  };

  const handleSend = (text?: string) => {
    const content = text || message;
    if (!content.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content }]);
    setMessage('');
    setSuggestions([]);
    chatMutation.mutate({ content, conversationId: conversationId || undefined });
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setSuggestions([
      'Check my glucose levels',
      'What should I eat today?',
      'Start a breathing session',
      'How is my health this week?',
    ]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setSuggestions([
        'Check my glucose levels',
        'What should I eat today?',
        'Start a breathing session',
        'How is my health this week?',
      ]);
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex gap-4">
      {/* Conversation List (desktop) */}
      <div className="hidden md:flex flex-col w-64 glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-700">
          <button onClick={startNewChat} className="btn-primary w-full text-sm">+ New Chat</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations?.conversations?.map((conv) => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`w-full text-left p-3 rounded-xl text-sm transition-all
                ${conversationId === conv.id 
                  ? 'bg-brand-500/15 text-brand-400' 
                  : 'text-text-secondary hover:bg-surface-700'
                }`}
            >
              <p className="truncate font-medium">{conv.title || 'Chat'}</p>
              <p className="text-xs text-text-muted mt-0.5">
                {new Date(conv.last_message_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col glass-card overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-surface-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-health-500 flex items-center justify-center">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <h2 className="font-semibold text-text-primary">VitalLoop AI Coach</h2>
            <p className="text-xs text-health-400">Online · Ready to help</p>
          </div>
          <button onClick={startNewChat} className="ml-auto md:hidden btn-secondary text-xs">New Chat</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <span className="text-5xl mb-4">🫀</span>
              <h3 className="text-xl font-bold text-text-primary mb-2">Hello! I'm your AI Health Coach</h3>
              <p className="text-text-secondary max-w-md">
                I can help you with glucose management, nutrition advice, breathing exercises, 
                weight management, and general health guidance.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user' 
                  ? 'bg-brand-500 text-white rounded-br-md' 
                  : 'bg-surface-700 text-text-primary rounded-bl-md'
              }`}>
                <div className="text-sm whitespace-pre-wrap leading-relaxed" 
                  dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}
                />
              </div>
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-surface-700 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && !chatMutation.isPending && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors border border-brand-500/20"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-surface-700">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input-field flex-1"
              placeholder="Ask your health coach anything..."
              disabled={chatMutation.isPending}
            />
            <button 
              type="submit" 
              disabled={!message.trim() || chatMutation.isPending}
              className="btn-primary px-5"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
