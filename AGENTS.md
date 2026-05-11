# AGENTS.md

## Project
TELA One Alpha Runtime

## Mission
Build a continuity-first operational runtime shell.

## Priorities
1. Stability
2. Persistence
3. Mobile reliability
4. Calm UX
5. Reconnect safety
6. Runtime continuity

## Avoid
- speculative infrastructure
- orchestration complexity
- unnecessary abstractions
- AI gimmicks
- dashboard overload

## Current Phase
Step 2 — Memory Layer

Building: pgvector + AKB retrieval, message embeddings, cross-session continuity, thread persistence.

## Completed
- Step 1: Runtime Shell (auth, streaming chat, thread persistence, responsive layout)

## Active
- pgvector semantic search (search_akbs, search_messages RPCs)
- AKBs table with truth_rank and scope hierarchy
- Embedding generation on every message (text-embedding-3-small)
- Retrieval injection into system prompt on each chat turn
- /remember <text> command to create AKBs from chat
- Thread list from DB with real titles
- Assistant message persistence
- initialMessages on thread page load (session continuity)
- Continuity engine: operational state snapshot on session open (G3)
- Pig Pen v5.2 operator routing (G4): deterministic domain→operator mapping,
  operator context injected into system prompt, routing streamed to client,
  visible in chat panel routing bar

## Do Not Build Yet
- MOSE orchestration engine
- Governance UI
- Observability dashboard

## Standards
- production-safe TypeScript
- App Router best practices
- SSR-safe auth
- mobile-first
- clean folder structure
- low complexity
