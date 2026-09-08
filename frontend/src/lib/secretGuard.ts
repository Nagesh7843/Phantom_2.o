/**
 * Phantom AI 2.0 - Real-Time Secret & Sensitive Data Guard
 * Scans user input/paste for API keys, passwords, database credentials,
 * private keys, and tokens to prevent accidental exposure to LLM endpoints.
 */

export interface DetectedSecret {
  id: string;
  type: string;
  label: string;
  matchedText: string;
  maskedText: string;
  startIndex: number;
  endIndex: number;
  severity: 'critical' | 'high' | 'medium';
  recommendation: string;
}

export interface SecretScanResult {
  hasSecrets: boolean;
  secrets: DetectedSecret[];
  summary: string;
  criticalCount: number;
}

interface SecretPattern {
  id: string;
  label: string;
  severity: 'critical' | 'high' | 'medium';
  regex: RegExp;
  recommendation: string;
  maskExtractor?: (match: RegExpExecArray) => { matched: string; start: number; end: number };
}

const SECRET_PATTERNS: SecretPattern[] = [
  // 1. Private RSA / SSH / PGP / EC Keys
  {
    id: 'private_key',
    label: 'Private Cryptographic Key (RSA/SSH/PGP)',
    severity: 'critical',
    regex: /-----BEGIN[ A-Z0-9_-]*PRIVATE KEY-----[\s\S]*?-----END[ A-Z0-9_-]*PRIVATE KEY-----/gi,
    recommendation: 'Never share private cryptographic keys with AI services.',
  },

  // 2. OpenAI API Keys (legacy & modern project keys)
  {
    id: 'openai_key',
    label: 'OpenAI API Key',
    severity: 'critical',
    regex: /\b(sk-(?:proj-|live-|test-|admin-)?[a-zA-Z0-9_\-]{20,80})\b/g,
    recommendation: 'Redact your OpenAI secret key to prevent unauthorized API billing.',
  },

  // 3. Anthropic Claude API Keys
  {
    id: 'anthropic_key',
    label: 'Anthropic Claude API Key',
    severity: 'critical',
    regex: /\b(sk-ant-(?:api[0-9]{2}-)?[a-zA-Z0-9_\-]{30,100})\b/g,
    recommendation: 'Redact your Anthropic API key to secure your AI account.',
  },

  // 4. Google Cloud / Gemini API Keys
  {
    id: 'google_key',
    label: 'Google Cloud / Gemini API Key',
    severity: 'critical',
    regex: /\b(AIza[0-9A-Za-z\-_]{35})\b/g,
    recommendation: 'Redact Google API keys before sending prompts.',
  },

  // 5. AWS Access Key ID
  {
    id: 'aws_access_key',
    label: 'AWS Access Key ID',
    severity: 'high',
    regex: /\b((?:AKIA|ASIA)[0-9A-Z]{16})\b/g,
    recommendation: 'AWS credentials should remain private and never be shared.',
  },

  // 6. AWS Secret Access Key
  {
    id: 'aws_secret_key',
    label: 'AWS Secret Access Key',
    severity: 'critical',
    regex: /(?:aws_secret_access_key|aws_secret|secret_access_key)\s*[:=]\s*['"]?([a-zA-Z0-9\/+=]{40})['"]?/gi,
    recommendation: 'Redact your AWS secret key to prevent unauthorized cloud access.',
  },

  // 7. GitHub Personal Access Tokens & OAuth
  {
    id: 'github_token',
    label: 'GitHub Access Token',
    severity: 'critical',
    regex: /\b((?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,255}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})\b/g,
    recommendation: 'GitHub tokens grant repo access. Mask or revoke if leaked.',
  },

  // 8. HuggingFace API Token
  {
    id: 'huggingface_token',
    label: 'Hugging Face API Token',
    severity: 'high',
    regex: /\b(hf_[a-zA-Z0-9]{34,40})\b/g,
    recommendation: 'Redact Hugging Face tokens before submitting.',
  },

  // 9. Stripe API Keys (Live & Test)
  {
    id: 'stripe_key',
    label: 'Stripe API Secret / Publishable Key',
    severity: 'critical',
    regex: /\b((?:sk|pk|rk)_(?:live|test)_[0-9a-zA-Z]{24,100})\b/g,
    recommendation: 'Stripe secret keys give access to payment data. Redact immediately.',
  },

  // 10. Slack Tokens
  {
    id: 'slack_token',
    label: 'Slack App / Bot Token',
    severity: 'high',
    regex: /\b(xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9\-]*)\b/g,
    recommendation: 'Redact Slack authentication tokens.',
  },

  // 11. Database Connection Strings with Passwords
  {
    id: 'db_connection_uri',
    label: 'Database Connection URI with Credentials',
    severity: 'critical',
    regex: /\b(?:postgres|postgresql|mysql|mongodb|mongodb\+srv|redis):\/\/[a-zA-Z0-9_\-\.%]+:([^@\s]+)@[a-zA-Z0-9_\-\.:]+/gi,
    recommendation: 'Database connection strings contain live passwords. Redact credentials.',
  },

  // 12. Generic JWT / Bearer Tokens
  {
    id: 'jwt_token',
    label: 'JSON Web Token (JWT) / Auth Bearer',
    severity: 'medium',
    regex: /\b(?:bearer\s+)?(eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})\b/gi,
    recommendation: 'JWT tokens may contain active session authentication and user claims.',
  },

  // 13. Explicit Password / Secret Variable Assignments
  {
    id: 'explicit_password',
    label: 'Password / Secret Variable Assignment',
    severity: 'high',
    regex: /(?:password|passwd|pwd|api_secret|client_secret|auth_secret|private_token)\s*[:=]\s*['"]([^'"\n\r]{6,100})['"]/gi,
    recommendation: 'Mask inline hardcoded passwords or secrets.',
  },
];

/**
 * Creates a masked preview of a secret string (e.g., sk-proj-••••••••••9a)
 */
export function maskSecretString(secret: string): string {
  if (!secret) return '••••••••';
  const len = secret.length;
  if (len <= 8) {
    return '••••••••';
  }
  const prefixLen = Math.min(6, Math.floor(len / 4));
  const suffixLen = Math.min(4, Math.floor(len / 6));
  const prefix = secret.slice(0, prefixLen);
  const suffix = secret.slice(-suffixLen);
  const maskedMiddle = '•'.repeat(Math.max(6, Math.min(16, len - prefixLen - suffixLen)));
  return `${prefix}${maskedMiddle}${suffix}`;
}

/**
 * Scans a text string for sensitive credentials, API keys, passwords, and tokens.
 */
export function scanForSecrets(text: string): SecretScanResult {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      hasSecrets: false,
      secrets: [],
      summary: '',
      criticalCount: 0,
    };
  }

  const detected: DetectedSecret[] = [];
  const coveredRanges: Array<[number, number]> = [];

  const isOverlapping = (start: number, end: number) => {
    return coveredRanges.some(([rStart, rEnd]) => {
      return (start >= rStart && start < rEnd) || (end > rStart && end <= rEnd) || (start <= rStart && end >= rEnd);
    });
  };

  for (const pattern of SECRET_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const fullMatch = match[0];
      const matchedSecret = match[1] || fullMatch;
      const startIndex = match.index + (fullMatch.indexOf(matchedSecret));
      const endIndex = startIndex + matchedSecret.length;

      // Skip if this range is already covered by a higher/more specific rule
      if (isOverlapping(startIndex, endIndex)) {
        continue;
      }

      // Filter out obvious false positives like example placeholders
      const lower = matchedSecret.toLowerCase();
      if (
        lower.includes('your_api_key') ||
        lower.includes('placeholder') ||
        lower.includes('example_') ||
        lower.includes('xxx') ||
        lower.includes('test_token_here') ||
        lower === 'password' ||
        lower === 'secret'
      ) {
        continue;
      }

      coveredRanges.push([startIndex, endIndex]);

      detected.push({
        id: `${pattern.id}_${detected.length + 1}`,
        type: pattern.id,
        label: pattern.label,
        matchedText: matchedSecret,
        maskedText: maskSecretString(matchedSecret),
        startIndex,
        endIndex,
        severity: pattern.severity,
        recommendation: pattern.recommendation,
      });
    }
  }

  const criticalCount = detected.filter((s) => s.severity === 'critical').length;
  let summary = '';
  if (detected.length > 0) {
    const labels = Array.from(new Set(detected.map((d) => d.label)));
    summary = `${detected.length} sensitive credential${detected.length > 1 ? 's' : ''} detected (${labels.join(', ')})`;
  }

  return {
    hasSecrets: detected.length > 0,
    secrets: detected,
    summary,
    criticalCount,
  };
}

/**
 * Automatically redacts all detected secrets in the input text with standard placeholders.
 */
export function redactSecrets(text: string, secrets: DetectedSecret[]): string {
  if (!text || secrets.length === 0) return text;

  // Sort secrets in reverse order of start index so indices remain valid during replacement
  const sorted = [...secrets].sort((a, b) => b.startIndex - a.startIndex);
  let result = text;

  for (const secret of sorted) {
    const placeholder = `[REDACTED_${secret.type.toUpperCase()}]`;
    const before = result.slice(0, secret.startIndex);
    const after = result.slice(secret.endIndex);
    result = before + placeholder + after;
  }

  return result;
}
