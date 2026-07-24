import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { useScheduleStore, type ChatMessage, type ChatSession } from '@/store/scheduleStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Send,
  User,
  Plus,
  Trash2,
  MoreVertical,
  Loader2,
  Sparkles,
  MessageSquare,
  Edit2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ScheduleChat() {
  const {
    activeSession,
    sendAIChat,
    sendAIChatWithSession,
    fetchChat,
    fetchChatSessions,
    createChatSession,
    renameChatSession,
    deleteChatSession,
    setActiveChatSession,
    chatSessions,
    activeChatSession,
  } = useScheduleStore();

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = activeChatSession?.messages || [];

  useEffect(() => {
    if (activeSession) {
      fetchChatSessions(activeSession.id);
    }
  }, [activeSession]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!message.trim() || !activeSession || isLoading) return;

    if (activeChatSession) {
      setIsLoading(true);
      try {
        await sendAIChatWithSession(activeSession.id, message.trim(), activeChatSession.id);
        setMessage('');
      } catch (e: any) {
        console.error('Failed to send AI chat:', e);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        const result = await sendAIChat(activeSession.id, message.trim());
        setMessage('');
        // If no session was selected, create one and add messages
        if (!activeChatSession) {
          await fetchChatSessions(activeSession.id);
        }
      } catch (e: any) {
        console.error('Failed to send AI chat:', e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleNewSession = async () => {
    if (!activeSession) return;
    try {
      await createChatSession(activeSession.id, newSessionName || undefined);
      setNewSessionName('');
      setShowNewSessionDialog(false);
    } catch (e: any) {
      console.error('Failed to create session:', e);
    }
  };

  const handleRename = async () => {
    if (!activeSession || !renamingSessionId) return;
    try {
      await renameChatSession(activeSession.id, renamingSessionId, renameValue);
      setShowRenameDialog(false);
    } catch (e: any) {
      console.error('Failed to rename session:', e);
    }
  };

  const handleDelete = async () => {
    if (!activeSession || !deletingSessionId) return;
    try {
      await deleteChatSession(activeSession.id, deletingSessionId);
      setShowDeleteDialog(false);
    } catch (e: any) {
      console.error('Failed to delete session:', e);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeSession) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center rounded-lg border">
        <p className="text-muted-foreground">Select a schedule to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Session Sidebar */}
      <div
        className={`flex flex-col rounded-lg border transition-all duration-200 ${
          sidebarOpen ? 'w-64' : 'w-12'
        }`}
      >
        <div className="flex items-center justify-between border-b p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Chat Sessions</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {chatSessions.length}
              </span>
            </div>
          ) : (
            <MessageSquare className="h-4 w-4 text-muted-foreground mx-auto" />
          )}
        </div>

        {sidebarOpen && (
          <>
            <ScrollArea className="flex-1 p-2">
              {chatSessions.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No chat sessions yet
                </p>
              )}
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
                    activeChatSession?.id === session.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <button
                    className="flex flex-1 items-center gap-2 overflow-hidden text-left"
                    onClick={() => setActiveChatSession(session)}
                  >
                    <MessageSquare
                      className={`h-3.5 w-3.5 flex-shrink-0 ${
                        activeChatSession?.id === session.id ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                    <span className="truncate">{session.name}</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setRenamingSessionId(session.id);
                          setRenameValue(session.name);
                          setShowRenameDialog(true);
                        }}
                      >
                        <Edit2 className="mr-2 h-3.5 w-3.5" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setDeletingSessionId(session.id);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </ScrollArea>
            <div className="border-t p-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs"
                onClick={() => setShowNewSessionDialog(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                New Session
              </Button>
            </div>
          </>
        )}

        {!sidebarOpen && (
          <div className="p-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1 text-xs"
              onClick={() => setSidebarOpen(true)}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col rounded-lg border">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setSidebarOpen(true)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <h3 className="text-sm font-medium">AI Assistant</h3>
              <p className="text-xs text-muted-foreground">
                {activeChatSession
                  ? `Chat session: ${activeChatSession.name}`
                  : 'Ask about your schedule'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {messages.length} messages
            </Badge>
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setSidebarOpen(true)}
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="py-12 text-center">
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <p className="mb-1 text-sm font-medium">AI Assistant is ready</p>
                <p className="text-xs text-muted-foreground">
                  Ask me about your schedule tasks, dates, status, or critical path.
                </p>
              </div>
            )}

            {messages.map((msg, index) => {
              const isAI = msg.isAI;
              const isUser = !isAI;
              const showAvatar =
                index === 0 || messages[index - 1].isAI !== isAI;

              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  {showAvatar && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback
                        className={`text-xs ${
                          isAI
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted-foreground/20 text-muted-foreground'
                        }`}
                      >
                        {isAI ? 'AI' : getInitials(msg.userName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {!showAvatar && <div className="w-8 flex-shrink-0" />}

                  {/* Message Bubble */}
                  <div className="max-w-[75%]">
                    {showAvatar && (
                      <p
                        className={`mb-1 text-xs ${
                          isAI ? 'text-muted-foreground' : 'text-right'
                        }`}
                      >
                        {isAI ? 'AI Assistant' : msg.userName}
                      </p>
                    )}
                    <div
                      className={`rounded-lg px-4 py-2.5 text-sm ${
                        isAI
                          ? 'bg-primary/10 text-foreground border border-primary/20'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    </div>
                    <p
                      className={`mt-1 text-[10px] text-muted-foreground ${
                        isUser ? 'text-right' : ''
                      }`}
                    >
                      {format(new Date(msg.createdAt), 'h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    AI
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1 rounded-lg bg-primary/10 px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Textarea
              placeholder={
                activeChatSession
                  ? `Reply to ${activeChatSession.name}...`
                  : 'Ask about your schedule...'
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[44px] flex-1 resize-none text-sm"
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !message.trim()}
              className="h-11 w-11 flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* New Session Dialog */}
      <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Chat Session</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Session name (optional)"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewSessionDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleNewSession}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Session</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRenameDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat session and all its messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
