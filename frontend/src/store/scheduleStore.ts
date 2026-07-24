import { create } from 'zustand';
import { api } from '../utils/api';

export type ScheduleFormat = 'MSPDI' | 'PMXML';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'WAITING' | 'ON_HOLD';

export interface ScheduleTask {
  id: string;
  sessionId: string;
  activityId: string;
  name: string;
  startDate: string | null;
  finishDate: string | null;
  actualStart: string | null;
  actualFinish: string | null;
  remainingDuration: number;
  physicalPercentComplete: number;
  status: TaskStatus;
  isCritical: boolean;
}

export interface ScheduleSession {
  id: string;
  name: string;
  format: ScheduleFormat;
  projectId: string | null;
  parsedTasks: ScheduleTask[];
  chatMessages?: ChatMessage[];
  chatSessions?: ChatSession[];
  versions?: ScheduleVersion[];
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleVersion {
  id: string;
  sessionId: string;
  versionNumber: number;
  description: string | null;
  taskSnapshot: string;
  createdById: string;
  createdBy: { name: string };
  createdAt: string;
}

export interface ChatSession {
  id: string;
  name: string;
  scheduleSessionId: string;
  createdBy: string;
  createdByUser: { name: string };
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string | null;
  userName: string;
  message: string;
  taskIds: string | null;
  createdAt: string;
  isAI?: boolean;
  chatSessionId?: string | null;
}

export interface AIChatResponse {
  message: string;
  reasoning: string | null;
  chatId: string;
  iterations: number;
}

interface ScheduleState {
  sessions: ScheduleSession[];
  activeSession: ScheduleSession | null;
  chatMessages: ChatMessage[];
  chatSessions: ChatSession[];
  activeChatSession: ChatSession | null;
  loading: boolean;
  error: string | null;
  selectedTaskId: string | null;

  // Actions
  fetchSessions: (projectId?: string) => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  uploadSchedule: (file: File, name?: string, projectId?: string) => Promise<void>;
  renameSession: (id: string, name: string) => Promise<void>;
  importNewXml: (id: string, file: File) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<ScheduleTask>) => Promise<void>;
  updateTasksBatch: (updates: ({ id: string } & Partial<ScheduleTask>)[]) => Promise<void>;
  exportSchedule: (sessionId: string) => Promise<void>;
  sendChat: (sessionId: string, message: string, taskIds?: string[]) => Promise<void>;
  sendAIChat: (sessionId: string, message: string, history?: any[]) => Promise<string>;
  sendAIChatWithSession: (sessionId: string, message: string, chatSessionId: string) => Promise<string>;
  fetchChat: (sessionId: string) => Promise<void>;
  fetchChatSessions: (sessionId: string) => Promise<void>;
  createChatSession: (sessionId: string, name?: string) => Promise<ChatSession>;
  renameChatSession: (sessionId: string, chatSessionId: string, name: string) => Promise<void>;
  deleteChatSession: (sessionId: string, chatSessionId: string) => Promise<void>;
  setActiveChatSession: (session: ChatSession | null) => void;
  deleteSession: (id: string) => Promise<void>;
  setSelectedTask: (id: string | null) => void;
  clearError: () => void;
  fetchVersions: (sessionId: string) => Promise<void>;
  createVersion: (sessionId: string, description?: string) => Promise<void>;
  restoreVersion: (sessionId: string, versionNumber: number) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  sessions: [],
  activeSession: null,
  chatMessages: [],
  chatSessions: [],
  activeChatSession: null,
  loading: false,
  error: null,
  selectedTaskId: null,

  fetchSessions: async (projectId?: string) => {
    set({ loading: true, error: null });
    try {
      const url = projectId ? `/schedules?projectId=${projectId}` : '/schedules';
      const sessions = await api.get<ScheduleSession[]>(url);
      const normalized = sessions.map((s) => ({ ...s, parsedTasks: s.parsedTasks || [] }));
      set({ sessions: normalized, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  loadSession: async (id: string) => {
    set({ loading: true, error: null, selectedTaskId: null });
    try {
      const session = await api.get<ScheduleSession & { chatMessages: ChatMessage[] }>(`/schedules/${id}`);
      set({ activeSession: session ? { ...session, parsedTasks: session.parsedTasks || [] } : null, chatMessages: session?.chatMessages || [], loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  renameSession: async (id: string, name: string) => {
    set({ loading: true, error: null });
    try {
      const updated = await api.patch<ScheduleSession>(`/schedules/${id}`, { name });
      set({
        sessions: get().sessions.map((s) => (s.id === id ? { ...s, name } : s)),
        activeSession: get().activeSession?.id === id ? { ...get().activeSession!, name } : get().activeSession,
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  importNewXml: async (id: string, file: File) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await api.post<ScheduleSession>(`/schedules/${id}/import`, formData);
      set({
        sessions: get().sessions.map((s) => (s.id === id ? result : s)),
        activeSession: get().activeSession?.id === id ? result : get().activeSession,
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  uploadSchedule: async (file: File, name?: string, projectId?: string) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (name) formData.append('name', name);
      if (projectId) formData.append('projectId', projectId);

      const session = await api.upload('/schedules/upload', formData);
      await get().loadSession(session.id);
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  updateTask: async (taskId: string, updates: Partial<ScheduleTask>) => {
    set({ loading: true, error: null });
    try {
      const updated = await api.put<ScheduleTask>(`/schedules/${get().activeSession!.id}/tasks/${taskId}`, updates);
      const session = get().activeSession;
      if (session) {
        const tasks = session.parsedTasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
        set({
          activeSession: { ...session, parsedTasks: tasks },
          sessions: get().sessions.map((s) =>
            s.id === session.id ? { ...s, parsedTasks: tasks } : s
          ),
          loading: false,
        });
      }
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  updateTasksBatch: async (updates: ({ id: string } & Partial<ScheduleTask>)[]) => {
    set({ loading: true, error: null });
    try {
      const results = await api.put<ScheduleTask[]>(
        `/schedules/${get().activeSession!.id}/tasks/batch`,
        { updates }
      );
      const session = get().activeSession;
      if (session) {
        const tasks = session.parsedTasks.map((t) => {
          const update = updates.find((u) => u.id === t.id);
          return update ? { ...t, ...update } : t;
        });
        set({
          activeSession: { ...session, parsedTasks: tasks },
          sessions: get().sessions.map((s) =>
            s.id === session.id ? { ...s, parsedTasks: tasks } : s
          ),
          loading: false,
        });
      }
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  exportSchedule: async (sessionId: string) => {
    set({ loading: true, error: null });
    try {
      const session = get().activeSession || get().sessions.find((s) => s.id === sessionId);
      const filename = `${(session?.name || 'schedule').replace(/[^a-z0-9]/gi, '_')}_updated.${session?.format === 'MSPDI' ? 'mpp' : 'xml'}`;
      await api.download(`/schedules/${sessionId}/export`, filename);
      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  sendChat: async (sessionId: string, message: string, taskIds?: string[]) => {
    try {
      const chat = await api.post<ChatMessage>(`/schedules/${sessionId}/chat`, { message, taskIds });
      set((state) => ({ chatMessages: [...state.chatMessages, chat] }));
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  sendAIChat: async (sessionId: string, message: string, history?: any[]) => {
    set({ loading: true });
    try {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sessionId,
        userId: localStorage.getItem('userId') || null,
        userName: localStorage.getItem('userName') || 'You',
        message,
        taskIds: null,
        createdAt: new Date().toISOString(),
        isAI: false,
      };
      set((state) => ({ chatMessages: [...state.chatMessages, userMsg] }));

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sessionId,
        userId: null,
        userName: 'AI Assistant',
        message: '',
        taskIds: null,
        createdAt: new Date().toISOString(),
        isAI: true,
      };
      set((state) => ({ chatMessages: [...state.chatMessages, aiMsg] }));

      const response = await api.post<AIChatResponse>(`/schedules/${sessionId}/ai-chat`, {
        message,
        history: history || get().chatMessages.map((m) => ({ role: m.isAI ? 'assistant' : 'user', content: m.message })),
      });

      set((state) => ({
        chatMessages: state.chatMessages.map((m) =>
          m.id === aiMsg.id ? { ...m, message: response.message } : m
        ),
        loading: false,
      }));

      return response.message;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  sendAIChatWithSession: async (sessionId: string, message: string, chatSessionId: string) => {
    set({ loading: true });
    try {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sessionId,
        userId: localStorage.getItem('userId') || null,
        userName: localStorage.getItem('userName') || 'You',
        message,
        taskIds: null,
        createdAt: new Date().toISOString(),
        isAI: false,
        chatSessionId,
      };

      // Optimistically add user message
      const currentState = get();
      const session = currentState.chatSessions.find((s) => s.id === chatSessionId);
      if (session) {
        const updatedMessages = [...session.messages, userMsg];
        set({
          chatSessions: currentState.chatSessions.map((s) =>
            s.id === chatSessionId ? { ...s, messages: updatedMessages } : s
          ),
          activeChatSession: session ? { ...session, messages: updatedMessages } : null,
        });
      }

      // Connect to SSE stream
      const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
      const url = `${apiBaseUrl}/schedules/${sessionId}/ai-chat`;
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': localStorage.getItem('tenantId') || '',
        },
        body: JSON.stringify({
          message,
          chatSessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream not available');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === 'chunk') {
            fullContent = data.content;
            // Update the active session's last message with the streamed content
            const currentState = get();
            const currentSession = currentState.chatSessions.find((s) => s.id === chatSessionId);
            if (currentSession && currentSession.messages.length > 0) {
              const lastMsg = currentSession.messages[currentSession.messages.length - 1];
              if (lastMsg.userName === 'AI Assistant') {
                const updatedMessages = [...currentSession.messages];
                updatedMessages[updatedMessages.length - 1] = {
                  ...lastMsg,
                  message: fullContent,
                };
                set({
                  chatSessions: currentState.chatSessions.map((s) =>
                    s.id === chatSessionId ? { ...s, messages: updatedMessages } : s
                  ),
                  activeChatSession: currentSession ? { ...currentSession, messages: updatedMessages } : null,
                });
              }
            }
          } else if (data.type === 'done') {
            // Ensure final state is saved to server
            const currentState = get();
            const currentSession = currentState.chatSessions.find((s) => s.id === chatSessionId);
            if (currentSession && currentSession.messages.length > 0) {
              const lastMsg = currentSession.messages[currentSession.messages.length - 1];
              if (lastMsg.userName === 'AI Assistant') {
                const updatedMessages = [...currentSession.messages];
                updatedMessages[updatedMessages.length - 1] = {
                  ...lastMsg,
                  id: data.chatId,
                };
                set({
                  chatSessions: currentState.chatSessions.map((s) =>
                    s.id === chatSessionId ? { ...s, messages: updatedMessages } : s
                  ),
                  activeChatSession: currentSession ? { ...currentSession, messages: updatedMessages } : null,
                });
              }
            }
          } else if (data.type === 'error') {
            throw new Error(data.message || 'Streaming error');
          }
        }
      }

      set({ loading: false });
      return fullContent;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  fetchChat: async (sessionId: string) => {
    const messages = await api.get<ChatMessage[]>(`/schedules/${sessionId}/chat`);
    set({ chatMessages: messages });
  },

  fetchChatSessions: async (sessionId: string) => {
    try {
      const sessions = await api.get<ChatSession[]>(`/schedules/${sessionId}/chat-sessions`);
      const normalized = sessions.map((s: any) => ({
        ...s,
        createdByUser: s.createdByUser || { name: 'Unknown' },
        messages: (s.messages || []).map((m: any) => ({
          ...m,
          userName: m.userName || m.user?.name || 'Unknown',
        })),
      }));
      set({ chatSessions: normalized, activeChatSession: normalized[0] || null });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  createChatSession: async (sessionId: string, name?: string) => {
    try {
      const session = await api.post<ChatSession>(`/schedules/${sessionId}/chat-sessions`, { name });
      set((state) => ({
        chatSessions: [session, ...state.chatSessions],
        activeChatSession: session,
      }));
      return session;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  renameChatSession: async (sessionId: string, chatSessionId: string, name: string) => {
    try {
      const updated = await api.patch<ChatSession>(`/schedules/${sessionId}/chat-sessions/${chatSessionId}`, { name });
      set({
        chatSessions: get().chatSessions.map((s) =>
          s.id === chatSessionId ? { ...s, name: updated.name } : s
        ),
        activeChatSession: get().activeChatSession?.id === chatSessionId ? { ...get().activeChatSession!, name: updated.name } : get().activeChatSession,
      });
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  deleteChatSession: async (sessionId: string, chatSessionId: string) => {
    try {
      await api.delete(`/schedules/${sessionId}/chat-sessions/${chatSessionId}`);
      set({
        chatSessions: get().chatSessions.filter((s) => s.id !== chatSessionId),
        activeChatSession: get().activeChatSession?.id === chatSessionId ? null : get().activeChatSession,
      });
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  setActiveChatSession: (session: ChatSession | null) => set({ activeChatSession: session }),

  deleteSession: async (id: string) => {
    await api.delete(`/schedules/${id}`);
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      activeSession: state.activeSession?.id === id ? null : state.activeSession,
    }));
  },

  setSelectedTask: (id: string | null) => set({ selectedTaskId: id }),
  clearError: () => set({ error: null }),

  fetchVersions: async (sessionId: string) => {
    try {
      const versions = await api.get<ScheduleVersion[]>(`/schedules/${sessionId}/versions`);
      const session = get().sessions.find((s) => s.id === sessionId);
      if (session) {
        set({
          sessions: get().sessions.map((s) =>
            s.id === sessionId ? { ...s, versions } : s
          ),
        });
      }
      if (get().activeSession?.id === sessionId) {
        set({
          activeSession: { ...get().activeSession!, versions },
        });
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  createVersion: async (sessionId: string, description?: string) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/schedules/${sessionId}/versions`, { description });
      await get().fetchVersions(sessionId);
      const session = get().activeSession;
      if (session?.id === sessionId) {
        await get().loadSession(sessionId);
      }
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  restoreVersion: async (sessionId: string, versionNumber: number) => {
    set({ loading: true, error: null });
    try {
      const restored = await api.post<ScheduleSession>(
        `/schedules/${sessionId}/versions/${versionNumber}/restore`,
        {}
      );
      set({
        activeSession: restored ? { ...restored, parsedTasks: restored.parsedTasks || [] } : null,
        sessions: get().sessions.map((s) =>
          s.id === sessionId ? { ...s, parsedTasks: restored?.parsedTasks || [] } : s
        ),
      });
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },
}));
