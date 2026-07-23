import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { useScheduleStore, type ChatMessage } from '@/store/scheduleStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, Bot, Sparkles } from 'lucide-react';

export default function ScheduleChat() {
  const { activeSession, sendChat, sendAIChat, fetchChat } = useScheduleStore();
  const [message, setMessage] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages: ChatMessage[] = activeSession?.chatMessages || [];

  useEffect(() => {
    if (activeSession) {
      fetchChat(activeSession.id);
    }
  }, [activeSession]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeSession) return;
    try {
      if (aiMode) {
        await sendAIChat(activeSession.id, message.trim());
      } else {
        await sendChat(activeSession.id, message.trim());
      }
      setMessage('');
    } catch (e: any) {
      console.error('Failed to send chat:', e);
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col rounded-lg border">
      {/* Mode toggle */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${aiMode ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            Regular Chat
          </span>
          <button
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              aiMode ? 'bg-primary' : 'bg-muted'
            }`}
            onClick={() => setAiMode(!aiMode)}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                aiMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm ${aiMode ? 'text-muted-foreground' : 'text-primary font-medium'}`}>
            AI Assistant
          </span>
          {aiMode && <Sparkles className="h-4 w-4 text-primary ml-1" />}
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {aiMode
                ? 'AI Assistant is ready. Ask me about your schedule tasks, dates, status, or critical path.'
                : 'No messages yet. Start the conversation.'}
            </div>
          )}

          {messages.map((msg) => {
            const isAI = msg.isAI;
            const isUser = !isAI && msg.userId !== 'ai';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                    isAI ? 'bg-primary' : isUser ? 'bg-muted' : 'bg-muted'
                  }`}
                >
                  {isAI ? (
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  ) : isUser ? (
                    <User className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isAI
                      ? 'bg-primary text-primary-foreground'
                      : isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {isAI ? 'AI Assistant' : msg.userName}
                    </span>
                    <span className="text-[10px] opacity-60">
                      {format(new Date(msg.createdAt), 'h:mm a')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <form onSubmit={handleSend} className="border-t p-3 flex gap-2">
        <Input
          placeholder={aiMode ? 'Ask about your schedule...' : 'Type a message...'}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={messages.length > 0 && messages[messages.length - 1].id?.startsWith('ai-') && messages[messages.length - 1].message === ''}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
