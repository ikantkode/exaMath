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
  versions?: ScheduleVersion[];
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

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  message: string;
  taskIds: string | null;
  createdAt: string;
}

interface ScheduleState {
  sessions: ScheduleSession[];
  activeSession: ScheduleSession | null;
  chatMessages: ChatMessage[];
  loading: boolean;
  error: string | null;
  selectedTaskId: string | null;

  // Actions
  fetchSessions: () => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  uploadSchedule: (file: File, name?: string, projectId?: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<ScheduleTask>) => Promise<void>;
  updateTasksBatch: (updates: ({ id: string } & Partial<ScheduleTask>)[]) => Promise<void>;
  exportSchedule: (sessionId: string) => Promise<void>;
  sendChat: (sessionId: string, message: string, taskIds?: string[]) => Promise<void>;
  fetchChat: (sessionId: string) => Promise<void>;
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
  loading: false,
  error: null,
  selectedTaskId: null,

  fetchSessions: async () => {
    set({ loading: true, error: null });
    try {
      const sessions = await api.get<ScheduleSession[]>('/schedules');
      set({ sessions, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  loadSession: async (id: string) => {
    set({ loading: true, error: null, selectedTaskId: null });
    try {
      const session = await api.get<ScheduleSession & { chatMessages: ChatMessage[] }>(`/schedules/${id}`);
      set({ activeSession: session, chatMessages: session.chatMessages || [], loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
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

  fetchChat: async (sessionId: string) => {
    const messages = await api.get<ChatMessage[]>(`/schedules/${sessionId}/chat`);
    set({ chatMessages: messages });
  },

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
        activeSession: restored,
        sessions: get().sessions.map((s) =>
          s.id === sessionId ? { ...s, parsedTasks: restored.parsedTasks } : s
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
