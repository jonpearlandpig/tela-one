import registry from '@/data/pigpen-v5.2.json';

export interface Operator {
  id: string;
  name: string;
  title: string;
  tier: number;
  weight: number;
  runtime_class: string;
  authority: string;
  allowed_actions: string[];
  restricted: string[];
  cognitive_identity: {
    thinking_style: string;
    core_instinct: string;
  };
  domain_note: string | null;
}

export interface RoutingResult {
  constitutional: Operator[];
  active: Operator[];
  all: Operator[];
}

// Deterministic domain → operator ID routing table
const DOMAIN_ROUTING: Array<{ patterns: string[]; operator_ids: string[] }> = [
  {
    patterns: ['ai', 'model', 'llm', 'embedding', 'routing', 'inference', 'openai', 'anthropic', 'token', 'prompt', 'vector', 'retrieval'],
    operator_ids: ['FP-AI-048'],
  },
  {
    patterns: ['product', 'platform', 'architecture', 'roadmap', 'system', 'integration', 'scalab', 'api design', 'feature'],
    operator_ids: ['FP-MO-014'],
  },
  {
    patterns: ['database', 'schema', 'backend', 'postgres', 'supabase', 'query', 'table', 'migration', 'sql', 'index'],
    operator_ids: ['FP-BE-046'],
  },
  {
    patterns: ['frontend', 'component', 'interface', 'layout', 'mobile', 'pwa', 'tailwind', 'react', 'next'],
    operator_ids: ['FP-FE-047'],
  },
  {
    patterns: ['deploy', 'devops', 'infrastructure', 'vercel', 'monitor', 'ci', 'cd', 'environment', 'uptime'],
    operator_ids: ['FP-DO-049'],
  },
  {
    patterns: ['security', 'auth', 'rbac', 'encryption', 'access', 'zero trust', 'secrets', 'permission'],
    operator_ids: ['FP-SEC-050'],
  },
  {
    patterns: ['test', 'qa', 'quality', 'validate', 'adversarial', 'audit', 'review', 'bug', 'broken'],
    operator_ids: ['FP-QA-043'],
  },
  {
    patterns: ['legal', 'contract', 'rights', 'compliance', 'license', 'ip', 'copyright'],
    operator_ids: ['FP-CW-026'],
  },
  {
    patterns: ['financial', 'budget', 'revenue', 'deal', 'money', 'cost', 'pricing', 'margin', 'forecast'],
    operator_ids: ['FP-TM-002', 'FP-WS-018'],
  },
  {
    patterns: ['risk', 'exposure', 'failure', 'scenario', 'stress', 'downside'],
    operator_ids: ['FP-LF-017'],
  },
  {
    patterns: ['story', 'narrative', 'creative', 'script', 'character', 'dialogue', 'theme', 'canon'],
    operator_ids: ['FP-NT-004', 'FP-AR-053'],
  },
  {
    patterns: ['workflow', 'process', 'operations', 'sop', 'plan', 'execution', 'coordinate'],
    operator_ids: ['FP-MH-003'],
  },
  {
    patterns: ['schedule', 'timeline', 'milestone', 'deadline', 'gate', 'status', 'track'],
    operator_ids: ['FP-KJ-015'],
  },
  {
    patterns: ['marketing', 'campaign', 'audience', 'brand', 'positioning', 'demand'],
    operator_ids: ['FP-HL-020'],
  },
  {
    patterns: ['audio', 'music', 'sound', 'song', 'setlist', 'sonic'],
    operator_ids: ['FP-TS-011'],
  },
  {
    patterns: ['stage', 'tour', 'production', 'venue', 'load', 'show'],
    operator_ids: ['FP-RH-008', 'FP-SW-055'],
  },
  {
    patterns: ['strategy', 'direction', 'vision', 'decision', 'approve', 'authorize'],
    operator_ids: ['FP-JH-001'],
  },
  {
    patterns: ['simplif', 'overengineer', 'too complex', 'necessary', 'purpose', 'why are we'],
    operator_ids: ['FP-LRN-042'],
  },
];

const operators = (registry as { operators: Operator[] }).operators;

export function routeOperators(query: string): RoutingResult {
  const queryLower = query.toLowerCase();

  const constitutional = operators.filter((o) => o.runtime_class === 'constitutional_system');

  const matchedIds = new Set<string>();
  for (const { patterns, operator_ids } of DOMAIN_ROUTING) {
    if (patterns.some((p) => queryLower.includes(p))) {
      operator_ids.forEach((id) => matchedIds.add(id));
    }
  }

  let active = operators.filter((o) => matchedIds.has(o.id));

  // Fallback to Louis Rowe Nichols (Common Sense Committee) for unmatched queries
  if (active.length === 0) {
    const fallback = operators.find((o) => o.id === 'FP-LRN-042');
    if (fallback) active = [fallback];
  }

  // Sort by weight descending, cap at 3
  active = active.sort((a, b) => b.weight - a.weight).slice(0, 3);

  return { constitutional, active, all: [...constitutional, ...active] };
}

export function buildOperatorPrompt(routing: RoutingResult): string {
  const parts: string[] = [];

  if (routing.active.length > 0) {
    const primary = routing.active[0];
    parts.push(`## Active Operator: ${primary.name} — ${primary.title}`);
    parts.push(`Thinking style: ${primary.cognitive_identity.thinking_style}`);
    parts.push(`Core instinct: ${primary.cognitive_identity.core_instinct}`);

    if (routing.active.length > 1) {
      const supporting = routing.active.slice(1);
      parts.push(`Supporting: ${supporting.map((o) => `${o.name} (${o.title})`).join(', ')}`);
    }
  }

  parts.push(
    `\nConstitutional systems: ${routing.constitutional.map((o) => o.name).join(' · ')} — always active.`
  );

  return parts.join('\n');
}

export interface RoutingSummary {
  constitutional: Array<{ id: string; name: string }>;
  active: Array<{ id: string; name: string; title: string }>;
}

export function summarizeRouting(routing: RoutingResult): RoutingSummary {
  return {
    constitutional: routing.constitutional.map((o) => ({ id: o.id, name: o.name })),
    active: routing.active.map((o) => ({ id: o.id, name: o.name, title: o.title })),
  };
}
