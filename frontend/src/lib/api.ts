import {
  ChatSession,
  ChatMessage,
  UserProfile,
  UserSettings,
  SystemStatus,
  HubMetrics,
  SecurityLogs,
  CodeExecutionResult,
  AIActionResponse,
  ImageGenResult,
  TerminalAIAssistResponse,
  PortStatus,
} from '@/types';

const API_BASE = ''; // Uses Next.js rewrites to proxy to Flask /api

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Ensure session cookies are passed
  });

  if (options.method === 'DELETE' && response.ok) {
    return { success: true } as unknown as T;
  }

  if (!response.ok) {
    let errDetail = 'Request failed';
    try {
      const errJson = await response.json();
      errDetail = errJson.error?.message || errJson.error || errDetail;
    } catch {
      errDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errDetail);
  }

  return response.json();
}

export const api = {
  // Session & Chat Management
  getAllSessions: async (): Promise<{ sessions: ChatSession[] }> => {
    return request<{ sessions: ChatSession[] }>('/api/all_sessions');
  },

  getSessionHistory: async (
    sessionId: string
  ): Promise<{ history: any[]; session_id: string; title: string }> => {
    return request<{ history: any[]; session_id: string; title: string }>(
      `/api/history/${sessionId}`
    );
  },

  startNewChat: async (): Promise<{ session_id: string; message: string }> => {
    return request<{ session_id: string; message: string }>('/api/new_chat_session', {
      method: 'POST',
    });
  },

  renameSession: async (
    sessionId: string,
    title: string
  ): Promise<{ message: string; new_title: string }> => {
    return request<{ message: string; new_title: string }>(`/api/session/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
  },

  deleteSession: async (sessionId: string): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>(`/api/session/${sessionId}`, {
      method: 'DELETE',
    });
  },

  togglePinSession: async (
    sessionId: string,
    isPinned?: boolean
  ): Promise<{ message: string; session_id: string; is_pinned: boolean }> => {
    return request<{ message: string; session_id: string; is_pinned: boolean }>(
      `/api/session/${sessionId}/pin`,
      {
        method: 'POST',
        body: JSON.stringify({ is_pinned: isPinned }),
      }
    );
  },

  // Subscription & Billing Management
  getSubscription: async (): Promise<any> => {
    return request<any>('/api/user/subscription');
  },

  upgradeSubscription: async (tier: string, paymentInfo?: any): Promise<any> => {
    return request<any>('/api/user/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify({ tier, ...paymentInfo }),
    });
  },

  cancelSubscription: async (): Promise<any> => {
    return request<any>('/api/user/subscription/cancel', {
      method: 'POST',
    });
  },

  // Scheduled Tasks API
  getScheduledTasks: async (): Promise<{ tasks: any[] }> => {
    return request<{ tasks: any[] }>('/api/scheduled/tasks');
  },

  saveScheduledTask: async (task: any): Promise<{ success: boolean; task_id: string }> => {
    return request<{ success: boolean; task_id: string }>('/api/scheduled/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  deleteScheduledTask: async (taskId: string): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>(`/api/scheduled/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  // Developer Plugins API
  getPlugins: async (): Promise<{ plugins: Record<string, boolean> }> => {
    return request<{ plugins: Record<string, boolean> }>('/api/plugins');
  },

  savePlugins: async (plugins: Record<string, boolean>): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>('/api/plugins', {
      method: 'PUT',
      body: JSON.stringify(plugins),
    });
  },

  directWebSearch: async (query: string): Promise<any> => {
    return request<any>('/api/plugins/web_search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },

  sendMessage: async (payload: {
    contents: any[];
    session_id?: string | null;
    language_name?: string;
    plugins?: Record<string, boolean>;
  }) => {
    return request<any>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Streaming AI completions via Server-Sent Events (SSE)
  streamChat: async (
    payload: {
      contents: any[];
      session_id?: string | null;
      language_name?: string;
      plugins?: Record<string, boolean>;
    },
    onChunk: (chunk: string, sessionId?: string, sessionTitle?: string) => void,
    onDone: (sessionId?: string, sessionTitle?: string, searchMetadata?: any) => void,
    onError: (err: string) => void,
    onSearchMetadata?: (metadata: any) => void
  ) => {
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!response.ok || !response.body) {
        // Fallback to standard /api/chat if stream fails
        const standardResp = await api.sendMessage(payload);
        const text =
          standardResp?.candidates?.[0]?.content?.parts?.[0]?.text ||
          standardResp?.error?.message ||
          'Could not retrieve answer.';
        onChunk(text);
        onDone(payload.session_id || undefined, standardResp?.session_title);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let activeSessionId = payload.session_id || undefined;
      let activeSessionTitle: string | undefined = undefined;
      let activeSearchMetadata: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.session_id) activeSessionId = data.session_id;
              if (data.session_title) activeSessionTitle = data.session_title;
              if (data.search_metadata) {
                activeSearchMetadata = data.search_metadata;
                onSearchMetadata?.(data.search_metadata);
              }
              if (data.chunk) {
                onChunk(data.chunk, activeSessionId, activeSessionTitle);
              }
              if (data.done) {
                onDone(activeSessionId, activeSessionTitle, activeSearchMetadata);
              }
            } catch (jsonErr) {
              console.warn('SSE parsing error', jsonErr);
            }
          }
        }
      }
      onDone(activeSessionId, activeSessionTitle, activeSearchMetadata);
    } catch (e: any) {
      onError(e.message || 'Stream connection error');
    }
  },

  // Image Generation
  generateImage: async (
    prompt: string,
    sessionId?: string
  ): Promise<ImageGenResult> => {
    return request<ImageGenResult>('/api/generate_image', {
      method: 'POST',
      body: JSON.stringify({ prompt, session_id: sessionId }),
    });
  },

  // Multi-Language Code IDE Compiler
  runCode: async (
    code: string,
    language: string,
    filename: string,
    stdin?: string,
    files?: Record<string, string>
  ): Promise<CodeExecutionResult> => {
    return request<CodeExecutionResult>('/api/run_code', {
      method: 'POST',
      body: JSON.stringify({ code, language, filename, stdin, files }),
    });
  },

  compileCode: async (params: {
    code: string;
    language: string;
    filename?: string;
    stdin?: string;
    files?: Record<string, string>;
  }): Promise<CodeExecutionResult> => {
    return request<CodeExecutionResult>('/api/run_code', {
      method: 'POST',
      body: JSON.stringify({
        code: params.code,
        language: params.language,
        filename: params.filename || `main.${params.language === 'python' ? 'py' : params.language === 'javascript' ? 'js' : params.language === 'typescript' ? 'ts' : params.language === 'cpp' ? 'cpp' : params.language === 'rust' ? 'rs' : 'txt'}`,
        stdin: params.stdin,
        files: params.files,
      }),
    });
  },

  stopCode: async (): Promise<{ success: boolean; message: string }> => {
    return request<{ success: boolean; message: string }>('/api/stop_code', {
      method: 'POST',
    });
  },

  terminalExec: async (
    command: string,
    files?: Record<string, string>,
    stdin?: string,
    tabId?: string,
    confirmed?: boolean
  ): Promise<CodeExecutionResult> => {
    return request<CodeExecutionResult>('/api/terminal/exec', {
      method: 'POST',
      body: JSON.stringify({ command, files, stdin, tab_id: tabId, confirmed }),
    });
  },

  terminalKill: async (tabId?: string): Promise<{ success: boolean; message: string }> => {
    return request<{ success: boolean; message: string }>('/api/terminal/kill', {
      method: 'POST',
      body: JSON.stringify({ tab_id: tabId }),
    });
  },

  terminalAIAssist: async (params: {
    action: 'natural_command' | 'explain_error' | 'explain_command' | 'suggest_fix';
    query?: string;
    command?: string;
    stderr?: string;
    stdout?: string;
    exit_code?: number;
    files?: string[] | Record<string, string>;
  }): Promise<TerminalAIAssistResponse> => {
    return request<TerminalAIAssistResponse>('/api/terminal/ai_assist', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  getTerminalPorts: async (): Promise<{ ports: PortStatus[]; timestamp: string }> => {
    return request<{ ports: PortStatus[]; timestamp: string }>('/api/terminal/ports', {
      method: 'GET',
    });
  },

  compilerAIAction: async (
    action: 'fix' | 'explain' | 'optimize' | 'generate_tests' | 'analyze',
    code: string,
    language: string,
    filename: string,
    errorMessage?: string,
    question?: string
  ): Promise<AIActionResponse> => {
    return request<AIActionResponse>('/api/compiler/ai_action', {
      method: 'POST',
      body: JSON.stringify({
        action,
        code,
        language,
        filename,
        error_message: errorMessage,
        question,
      }),
    });
  },

  fixCode: async (code: string, errorMessage?: string): Promise<AIActionResponse> => {
    return request<AIActionResponse>('/api/compiler/ai_action', {
      method: 'POST',
      body: JSON.stringify({
        action: 'fix',
        code,
        language: 'generic',
        filename: 'source',
        error_message: errorMessage,
      }),
    });
  },

  explainCode: async (code: string): Promise<AIActionResponse> => {
    return request<AIActionResponse>('/api/compiler/ai_action', {
      method: 'POST',
      body: JSON.stringify({
        action: 'explain',
        code,
        language: 'generic',
        filename: 'source',
      }),
    });
  },

  optimizeCode: async (code: string): Promise<AIActionResponse> => {
    return request<AIActionResponse>('/api/compiler/ai_action', {
      method: 'POST',
      body: JSON.stringify({
        action: 'optimize',
        code,
        language: 'generic',
        filename: 'source',
      }),
    });
  },


  // Dashboard & Dev Tools Metrics
  getDevOSStatus: async (): Promise<SystemStatus> => {
    return request<SystemStatus>('/api/dev_os/status');
  },

  getDevHubMetrics: async (): Promise<HubMetrics> => {
    return request<HubMetrics>('/api/dev_hub/metrics');
  },

  getSecurityLogs: async (): Promise<SecurityLogs> => {
    return request<SecurityLogs>('/api/security_layer/logs');
  },

  // User Profile & Authentication
  getUserProfile: async (): Promise<UserProfile> => {
    return request<UserProfile>('/api/user/profile');
  },

  updateProfile: async (data: {
    displayName?: string;
    email?: string;
    theme?: string;
    language?: string;
    voice?: string;
  }): Promise<any> => {
    return request<any>('/api/update_profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateSettings: async (settings: Partial<UserSettings>): Promise<any> => {
    return request<any>('/api/user/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  login: async (username: string, password: string): Promise<any> => {
    return request<any>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  register: async (displayName: string, username: string, password: string): Promise<any> => {
    return request<any>('/api/register', {
      method: 'POST',
      body: JSON.stringify({ displayName, username, password }),
    });
  },

  // Project Management API
  getProjects: async (): Promise<{ projects: Array<{ id: string; name: string; template: string; created_at: string; last_updated: string }> }> => {
    return request<{ projects: any[] }>('/api/projects');
  },

  saveProject: async (payload: { id?: string; name: string; template?: string; files: Record<string, any> }): Promise<{ success: boolean; project_id: string; name: string }> => {
    return request<{ success: boolean; project_id: string; name: string }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getProject: async (projectId: string): Promise<{ project: { id: string; name: string; template: string; files: Record<string, any>; created_at: string; last_updated: string } }> => {
    return request<{ project: any }>(`/api/projects/${projectId}`);
  },

  deleteProject: async (projectId: string): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
  },
};
