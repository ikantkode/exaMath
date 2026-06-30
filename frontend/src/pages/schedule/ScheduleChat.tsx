import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { useScheduleStore, type ChatMessage } from '@/store/scheduleStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, Bot } from 'lucide-react';

export default function ScheduleChat() {
  const { activeSession, sendChat, fetchChat } = useScheduleStore();
  const [message, setMessage] = useState('');
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
      await sendChat(activeSession.id, message.trim());
      setMessage('');
    } catch (e: any) {
      console.error('Failed to send chat:', e);
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col rounded-lg border">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No messages yet. Start the conversation.
            </div>
          )}

          {messages.map((msg) => {
            const isCurrentUser = msg.userId === localStorage.getItem('userId');
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                    isCurrentUser ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  {isCurrentUser ? (
                    <User className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isCurrentUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{msg.userName}</span>
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
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
