export type Role = 'user' | 'model' | 'system';

export interface ChatPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64
  };
}

export interface ChatMessage {
  id: string;
  role: Role;
  parts: ChatPart[];
  timestamp?: string;
  type?: 'text' | 'image' | 'code';
  db_id?: string;
  typing?: boolean;
  searchMetadata?: {
    enabled?: boolean;
    query?: string;
    citations?: Array<{
      title: string;
      snippet: string;
      url: string;
    }>;
  };
}

export interface ChatSession {
  session_id: string;
  title: string;
  is_pinned?: boolean;
  last_updated?: string;
  created_at?: string;
}

export type SubscriptionTier = 'free' | 'plus' | 'pro';

export interface PlanDetail {
  id: SubscriptionTier;
  name: string;
  price: string;
  period: string;
  badge: string;
  daily_messages: number;
  daily_compilations: number;
  image_generation_daily: number;
  max_image_res: string;
  cloud_storage: string;
  speed: string;
  features: string[];
}

export interface InvoiceItem {
  id: string;
  plan: string;
  amount: string;
  status: string;
  date: string;
}

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  plan: PlanDetail;
  all_plans: Record<SubscriptionTier, PlanDetail>;
  usage: {
    messages_today: number;
    messages_limit: number;
    compilations_today: number;
    compilations_limit: number;
    is_unlimited: boolean;
  };
  invoices: InvoiceItem[];
  status: string;
}

export interface UserProfile {
  authenticated: boolean;
  user: {
    displayName: string;
    email: string;
    pictureUrl?: string | null;
    theme?: string;
    language?: string;
    voice?: string;
    subscription_tier?: SubscriptionTier;
  };
}

export interface UserSettings {
  theme: string;
  language: string;
  voice: string;
  autoSpeak?: boolean;
}

export interface SystemStatus {
  status: string;
  system: {
    os: string;
    python_version: string;
    pymongo_version: string;
    mongo_status: string;
    active_providers: string[];
    timestamp: string;
  };
}

export interface HubMetrics {
  metrics: {
    rate_limiter_rpm: number;
    tokens_available: number;
    providers: {
      gemini: boolean;
      openrouter: boolean;
      openai: boolean;
      huggingface: boolean;
    };
    mongo_connected: boolean;
    server_port: number;
  };
}

export interface SecurityLogs {
  security: {
    cors_enabled: boolean;
    proxy_fix_applied: boolean;
    session_cookie_name: string;
    tls_validation_bypassed: boolean;
    google_oauth_configured: boolean;
    audit_timestamp: string;
  };
}

export interface CodeExecutionResult {
  stdout?: string;
  stderr?: string;
  output?: string;
  error?: string;
  exit_code?: number;
  commands?: string[];
  command?: string;
  clear?: boolean;
  requires_confirmation?: boolean;
  warning?: string;
  danger_level?: 'low' | 'medium' | 'high';
  normalized_command?: string;
  modified_files?: Record<string, string>;
}

export interface TerminalEntry {
  id: string;
  type: 'command' | 'stdout' | 'stderr' | 'system' | 'ai-suggestion' | 'ai-fix';
  text: string;
  timestamp?: string;
  command?: string;
  exitCode?: number;
  explanation?: string;
  fixCommand?: string;
}

export interface TerminalTab {
  id: string;
  name: string;
  entries: TerminalEntry[];
  history: string[];
  historyIndex: number;
  isExecuting: boolean;
  currentInput: string;
  cwd: string;
}

export interface TerminalAIAssistResponse {
  success?: boolean;
  action?: string;
  result?: {
    command?: string;
    explanation?: string;
    root_cause?: string;
    suggested_fix?: string;
    is_destructive?: boolean;
    safety_warning?: string | null;
  };
  error?: string;
}

export interface PortStatus {
  port: number;
  service: string;
  protocol: string;
  status: 'active' | 'idle';
  url?: string | null;
}

export interface AIActionResponse {
  success?: boolean;
  action?: string;
  result?: {
    explanation?: string;
    fixed_code?: string;
    optimized_code?: string;
    summary?: string;
    key_functions?: string[];
    time_complexity?: string;
    space_complexity?: string;
    test_cases?: Array<{
      name: string;
      input: string;
      expected: string;
      description: string;
    }>;
    issues?: string[];
    suggestions?: string[];
  };
  raw_response?: string;
  error?: string;
}

export interface ImageGenResult {
  success: boolean;
  image_url: string;
  original_prompt: string;
  enhanced_prompt: string;
  session_id?: string;
}

