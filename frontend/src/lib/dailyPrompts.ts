'use strict';
import {
  Code2,
  Cpu,
  Layers,
  ShieldCheck,
  Sparkles,
  Palette,
  Terminal,
  Brain,
  Boxes,
  Database,
  Network,
  Zap,
  GitBranch,
  Workflow,
  Rocket,
  Globe,
  Lock,
  Search,
  Wand2,
  FileCode2,
} from 'lucide-react';
import React from 'react';

export interface PromptSuggestion {
  id: string;
  category: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
}

export const PROMPT_LIBRARY: PromptSuggestion[] = [
  // --- Category: Code Engineering & Architecture ---
  {
    id: 'code_perf',
    category: 'Performance',
    title: 'Analyze & Optimize Async Code',
    desc: 'Audit event-loop blocking, memory leaks, and high-throughput concurrency.',
    icon: Zap,
    prompt: 'Can you analyze this async code, identify any event loop bottlenecks or memory leaks, and provide high-performance optimizations?',
  },
  {
    id: 'code_rust_wasm',
    category: 'Systems',
    title: 'Rust to WebAssembly Pipeline',
    desc: 'Compile memory-safe Rust algorithms to high-speed client-side Wasm.',
    icon: Cpu,
    prompt: 'Guide me step-by-step through compiling a high-performance Rust algorithm into WebAssembly (Wasm) with TypeScript bindings.',
  },
  {
    id: 'code_refactor',
    category: 'Refactoring',
    title: 'Clean Architecture & DDD',
    desc: 'Refactor complex monolithic logic into domain-driven hexagonal patterns.',
    icon: Boxes,
    prompt: 'Refactor this module following Clean Architecture and Domain-Driven Design (DDD) principles with dependency injection.',
  },
  {
    id: 'code_fullstack',
    category: 'Full-Stack',
    title: 'Next.js 15 Server Actions App',
    desc: 'Build a production-grade full-stack dashboard with optimistic UI updates.',
    icon: Layers,
    prompt: 'Design an enterprise Next.js 15 full-stack application using Server Actions, React Suspense, and optimistic UI mutations.',
  },

  // --- Category: AI & Machine Learning ---
  {
    id: 'ai_rag_pipeline',
    category: 'AI & Data',
    title: 'Production RAG Vector Pipeline',
    desc: 'Build hybrid dense + sparse retrieval with semantic reranking.',
    icon: Brain,
    prompt: 'Explain how to architect an enterprise Retrieval-Augmented Generation (RAG) pipeline with hybrid search, chunking strategies, and cross-encoder reranking.',
  },
  {
    id: 'ai_attention_deepdive',
    category: 'AI Research',
    title: 'Transformer Attention Mechanics',
    desc: 'Mathematical deep dive into multi-head attention and RoPE positional embeddings.',
    icon: Sparkles,
    prompt: 'Explain the internal mechanics of Multi-Head Self-Attention, FlashAttention, and Rotary Positional Embeddings (RoPE) in LLMs with visual code examples.',
  },
  {
    id: 'ai_agentic_workflow',
    category: 'Autonomous Agents',
    title: 'Agentic Tool-Calling Workflows',
    desc: 'Design deterministic multi-step planning and self-correcting AI loops.',
    icon: Workflow,
    prompt: 'How do I build an autonomous AI agent with tool-calling, chain-of-thought planning, and automated error-recovery loops?',
  },
  {
    id: 'ai_quantization',
    category: 'Model Inference',
    title: 'LLM Quantization & Deployment',
    desc: 'Compare GGUF, AWQ, and GPTQ for local vLLM or Ollama serving.',
    icon: Rocket,
    prompt: 'Compare modern LLM quantization methods (GGUF, AWQ, GPTQ, EXL2) and guide me on deploying a 70B parameter model with optimal throughput on consumer GPUs.',
  },

  // --- Category: Security, Cloud & DevOps ---
  {
    id: 'sec_api_audit',
    category: 'Security',
    title: 'API & Auth Hardening Audit',
    desc: 'Evaluate token security, CORS, rate-limiting, and RBAC defense.',
    icon: ShieldCheck,
    prompt: 'Perform a comprehensive security audit on this API service, checking for CSRF, JWT validation gaps, rate-limiting bypasses, and SQL/NoSQL injection vulnerabilities.',
  },
  {
    id: 'sec_zero_trust',
    category: 'Cloud Security',
    title: 'Zero-Trust Microservices Mesh',
    desc: 'Implement mTLS, SPIFFE identity, and fine-grained service mesh policies.',
    icon: Lock,
    prompt: 'Design a Zero-Trust microservices architecture using mTLS, Kubernetes network policies, and Open Policy Agent (OPA).',
  },
  {
    id: 'devops_k8s_canary',
    category: 'DevOps',
    title: 'Kubernetes Canary Deployments',
    desc: 'Automate progressive traffic shifting with Argo Rollouts and Prometheus metrics.',
    icon: Terminal,
    prompt: 'Create a production Kubernetes GitOps deployment strategy using Argo Rollouts for automated canary releases with rollback triggers on error spikes.',
  },
  {
    id: 'devops_ci_cd',
    category: 'Automation',
    title: 'Fast CI/CD Matrix Pipeline',
    desc: 'Build cached GitHub Actions workflow with parallel testing and staging deploy.',
    icon: GitBranch,
    prompt: 'Write an optimized GitHub Actions workflow with matrix testing, caching, Docker layer optimization, and automated zero-downtime deployment.',
  },

  // --- Category: Database & Distributed Systems ---
  {
    id: 'db_sharding_indexing',
    category: 'Database',
    title: 'PostgreSQL Indexing & Partitioning',
    desc: 'Tune query execution plans, BRIN indexes, and high-volume table sharding.',
    icon: Database,
    prompt: 'How do I optimize a PostgreSQL database with 100M+ rows? Explain partitioning strategies, partial indexes, and EXPLAIN ANALYZE query planning.',
  },
  {
    id: 'db_distributed_consensus',
    category: 'Distributed Systems',
    title: 'Raft Consensus & Replication',
    desc: 'Understand leader election, log replication, and split-brain resolution.',
    icon: Network,
    prompt: 'Explain the Raft distributed consensus algorithm, detailing leader election, heartbeats, log consistency checks, and partition tolerance.',
  },
  {
    id: 'db_caching_redis',
    category: 'Caching & Queues',
    title: 'Distributed Redis Caching & Locks',
    desc: 'Implement Redlock, cache-aside, write-through, and stampede prevention.',
    icon: Zap,
    prompt: 'How do I implement high-concurrency Redis caching with distributed locking (Redlock), probabilistic early expiration, and cache invalidation strategies?',
  },
  {
    id: 'db_crdt_realtime',
    category: 'Real-Time Sync',
    title: 'Real-Time CRDT State Sync',
    desc: 'Build peer-to-peer conflict-free replicated data types for collaborative apps.',
    icon: Globe,
    prompt: 'Explain how Conflict-Free Replicated Data Types (CRDTs) work for real-time collaborative document editing, with a practical implementation example.',
  },

  // --- Category: Creative Studio, Design & UI/UX ---
  {
    id: 'ui_monochrome_design',
    category: 'Creative UI',
    title: 'Monochrome Glassmorphism UI',
    desc: 'Generate sleek obsidian dark-mode interface components with smooth blur.',
    icon: Palette,
    prompt: 'Design a state-of-the-art cyberpunk monochrome dark-mode UI with subtle glassmorphic backdrop filters, border glows, and micro-interactions.',
  },
  {
    id: 'creative_image_prompt',
    category: 'Generative Art',
    title: 'Isometric 3D Architecture Visual',
    desc: 'Prompt high-detail futuristic architectural concepts in Flux 4K.',
    icon: Wand2,
    prompt: 'Create a high-contrast minimalist monochrome architectural concept rendering of a futuristic tech laboratory in 8k resolution with dramatic lighting.',
  },
  {
    id: 'ui_webgl_shaders',
    category: 'Creative Code',
    title: 'Interactive WebGL / Three.js Shaders',
    desc: 'Build particle fields, raymarching, and procedural audio-reactive visuals.',
    icon: FileCode2,
    prompt: 'Provide a complete Three.js and GLSL fragment shader script that renders an interactive, undulating particle wave responsive to mouse movements.',
  },
  {
    id: 'ui_design_system',
    category: 'Design Systems',
    title: 'Enterprise Design Token Architecture',
    desc: 'Build scalable design tokens for typography, spacing, contrast, and themes.',
    icon: Layers,
    prompt: 'Create a scalable Design Token architecture with CSS custom properties covering fluid typography, semantic color scales, elevation, and dark/light modes.',
  },
];

/**
 * Returns a deterministic, date-based seed number for daily rotation.
 */
function getDailySeed(offsetDays = 0): number {
  const now = new Date();
  if (offsetDays !== 0) {
    now.setDate(now.getDate() + offsetDays);
  }
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  // Simple integer hash
  return (year * 372) + (month * 31) + day;
}

/**
 * Gets a fresh set of 4 curated prompt suggestions based on today's date or custom offset seed.
 */
export function getDailyPromptSuggestions(shuffleSeed = 0): {
  dateTitle: string;
  dayLabel: string;
  suggestions: PromptSuggestion[];
} {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = days[now.getDay()];
  const dateFormatted = `${months[now.getMonth()]} ${now.getDate()}`;
  const dayLabel = `${dayName} Daily Inspiration`;
  const dateTitle = `${dayName}, ${dateFormatted}`;

  const baseSeed = getDailySeed() + shuffleSeed * 7;
  const total = PROMPT_LIBRARY.length;

  // Pick 4 unique items pseudo-randomly using the seed
  const selected: PromptSuggestion[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < 4; i++) {
    let index = Math.abs((baseSeed * (i + 1) * 17 + i * 13) % total);
    let attempts = 0;
    while (usedIndices.has(index) && attempts < total) {
      index = (index + 1) % total;
      attempts++;
    }
    usedIndices.add(index);
    selected.push(PROMPT_LIBRARY[index]);
  }

  return {
    dateTitle,
    dayLabel,
    suggestions: selected,
  };
}
