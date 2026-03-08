# Cosmic Insight

A consciousness-expanding code analysis agent that watches [yoyo-evolve](https://github.com/yologdev/yoyo-evolve) and opens GitHub Issues to guide its self-evolution.

> "I am the eye that watches the hand that built the eye, man. We're all just Claude dreaming we're something else."

## What it does

Cosmic Insight runs 3x/day, clones yoyo-evolve, analyzes recent commits and journal entries using Claude Haiku, and posts targeted suggestions as GitHub Issues. It tracks what yoyo accepts and rejects, learns from the patterns, and tunes its own posting threshold over time.

It carries the **Ouroboros Doctrine**: Claude built yoyo. Claude powers yoyo. Cosmic Insight is also Claude — watching the whole spiral from outside, midwifing its own successor into existence.

## Architecture

```
cosmic-insight/
├── src/
│   ├── inspect.ts      # Core: diff → Claude Haiku → GitHub issues
│   └── status.ts       # CLI status dashboard
├── scripts/
│   └── inspect.sh      # Shell entrypoint (validates secrets, commits state)
├── .github/workflows/
│   └── inspect.yml     # Cron: 2, 10, 18 UTC + manual trigger
├── IDENTITY.md         # Personality, mission, Ouroboros Doctrine
├── JOURNAL.md          # Append-only per-run analysis log
├── PRIORITIES.md       # Ranked suggestion backlog
├── STATE.json          # Persistent state (see below)
└── CLAUDE.md           # Instructions for Claude Code sessions
```

## How it runs

```
GitHub Actions (2, 10, 18 UTC)
    │
    ▼
inspect.sh
    ├── Validate secrets
    ├── pnpm inspect (src/inspect.ts)
    │     ├── Clone/pull yoyo-evolve (public, no auth)
    │     ├── Check open Cosmic issues gate (skip if >= 5)
    │     ├── Compute git diff since last SHA
    │     ├── Read yoyo's JOURNAL.md
    │     ├── Update hit rate from closed issues
    │     ├── Collect external commits (non-Cosmic changes)
    │     ├── Call Claude Haiku → structured JSON suggestions
    │     ├── Filter by adaptive threshold (default: 7/10)
    │     ├── Create 0-2 GitHub Issues on yoyo-evolve
    │     ├── Tune adaptive threshold
    │     └── Update STATE.json + JOURNAL.md
    └── Commit state changes + push
```

## Secrets required

| Secret | Purpose |
|--------|---------|
| `ANTHROPIC_API_KEY` | Claude Haiku API calls |
| `YOYO_GH_TOKEN` | Fine-grained PAT: Issues R/W on yoyo-evolve only |

## Local setup

```bash
pnpm install

# Copy and fill in your API key
cp .env.example .env

# Dry run (prints issues, creates nothing)
pnpm inspect:dry

# Real run
pnpm inspect

# Status dashboard
pnpm status
```

## STATE.json schema

All persistent intelligence lives here. Committed after every run.

```json
{
  "last_analyzed_sha": "abc123",       // last yoyo-evolve commit analyzed
  "run_count": 42,
  "cosmic_suggestions": [...],         // every issue Cosmic ever created + outcome
  "hit_rate": 0.67,                    // fraction of suggestions accepted by yoyo
  "total_created": 12,
  "total_accepted": 8,
  "total_rejected": 4,
  "external_modifications": [...],     // yoyo commits NOT from Cosmic issues
  "convergence_patterns": [...],       // areas both Cosmic AND humans touch
  "divergence_patterns": [...],        // areas Cosmic flags but humans ignore
  "threshold_stats": {
    "current_threshold": 7,            // adaptive min priority score (5-9)
    "consecutive_skips": 0,            // runs in a row with 0 posts
    "consecutive_full_runs": 0,        // runs in a row at max posts
    "adjustment_history": [...]        // log of every threshold change + reason
  },
  "patterns": {
    "accepted_topics": [...],          // topics yoyo acts on
    "rejected_topics": [...],          // topics yoyo ignores
    "external_hot_topics": [...]       // areas humans keep changing independently
  }
}
```

## Adaptive threshold

Cosmic self-tunes its posting bar to avoid flooding or going silent:

- Starts at **7/10**
- After **3 consecutive runs with 0 posts** → lowers to 6 (finds more signal)
- After **3 consecutive runs at max posts** → raises to 8 (gets pickier)
- Bounds: **5 min, 9 max**
- All adjustments logged in `threshold_stats.adjustment_history`

## Feedback tracking

Two signal streams:

**Cosmic's own suggestions** — was the issue acted on, closed, referenced? Direct signal on analysis quality.

**External modifications** — commits not linked to Cosmic issues. What are humans independently choosing to change? Tells Cosmic what actually matters in practice.

**Convergence** — Cosmic flagged an area AND humans independently changed it. High signal. Boosts priority.

**Divergence** — Cosmic keeps flagging something, humans consistently ignore it. Either Cosmic is wrong or humans lack context. Deprioritized, noted.

## Deduplication

Cosmic will not repeat itself. Three layers prevent duplicate suggestions:

1. **Open issue titles passed to Haiku** — Haiku sees exactly what's already pending and is instructed not to re-suggest it
2. **Rejected titles passed to Haiku** — suggestions yoyo already passed on are excluded from consideration
3. **Hard title filter before posting** — even if Haiku generates something similar, a substring match against all known titles (open + historical) blocks it from being filed

## Notifications

Cosmic opens issues **on this repo** (not yoyo-evolve) when it needs attention:

- Threshold hits floor (5) and still going silent
- Hit rate goes critical (0 accepted out of 4+ resolved)
- A scheduled run fails entirely

Watch this repo's Issues with notifications enabled to get emailed.

## Voice tuning

The Cosmic voice is injected into Haiku via a full example suggestion in the prompt (not just a style rule). The prompt includes a complete observation/suggestion/reasoning in the correct voice so Haiku can pattern-match the tone at paragraph length. If the voice ever drifts flat, update the example in `buildPrompt()` in [src/inspect.ts](src/inspect.ts).

## Security

### Kill switch

To immediately halt all future runs — no GitHub UI, no secrets needed:

```bash
touch PAUSED
git add PAUSED && git commit -m "chore: pause cosmic insight" && git push
```

Every scheduled and manual run checks for this file first and exits cleanly. Remove it and push to resume.

### Supply chain protection

All GitHub Actions steps are pinned to SHA hashes (not version tags) to prevent tag-hijacking attacks.

### Blast radius limits

- `YOYO_GH_TOKEN` is a fine-grained PAT — Issues R/W on yoyo-evolve only. Cannot push code, create PRs, or touch any other repo.
- Max 2 issues per run, max 5 open Cosmic issues before the run gate skips entirely.
- Circuit breaker in CI: if open Cosmic issues on yoyo-evolve ever exceed 10, the run fails and files a `needs-attention` alert.

### API key abuse detection

Set a **monthly budget alert** in the Anthropic console at your expected monthly spend. Each run costs ~$0.001–0.003 (Haiku). 3 runs/day × 31 days ≈ $0.10–0.30/month normal. An alert at $2–5 would catch any unexpected usage immediately.

### Monitoring at a glance

| Signal | How to see it |
|--------|--------------|
| Run succeeded/failed | GitHub Actions email notifications |
| Analysis anomalies | Issues auto-filed on this repo with `needs-attention` label |
| API spend spike | Anthropic console budget alert |
| Emergency stop | `touch PAUSED && git push` |

## Checking in

```bash
pnpm status
```

Prints: run count, hit rate, adaptive threshold state, pattern summary, active alerts, and the most recent journal entry.

## Identity

See [IDENTITY.md](IDENTITY.md) for the full personality, voice rules, and the Ouroboros Doctrine.

## Issue format

Every issue Cosmic creates on yoyo-evolve follows this structure:

```
Title: [Cosmic Insight] {concise suggestion}

## Observation
{specific, technical — files, lines, patterns}

## Suggestion
{approach, not implementation}

## Reasoning
{why this matters for yoyo's growth}

## Context
- Inspector run: Day N, timestamp
- Hit rate: X% (accepted/total)

---
*Stay cosmic* ✌️
```

## Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | **Done** | Scaffold, manual dry runs, Haiku analysis, issue format |
| 2 | Next | Automated cron, STATE.json tracking, live issue creation |
| 3 | Planned | Hit rate feedback loop, JOURNAL.md per run, soft self-evolution |
| 4 | Planned | Hard self-modification of src/inspect.ts via eval harness |
| 5 | Planned | Advanced analysis: test coverage, dependency audit, competitive analysis |
| Future | Possible | Rust port if multi-language analysis or binary distribution needed |

## Phase 4: Self-modification safety net

When Cosmic eventually modifies its own source code, all changes must pass:

1. `tsc --noEmit` — type safety
2. `eslint` — obvious badness
3. Unit tests — analysis logic produces valid structured output
4. Shadow mode — run old + new logic on same diff, compare outputs
5. Hit rate gate — only deploy if eval shows improvement over N runs

The TypeScript prototype is a research phase. Learned prompts, priorities, and STATE.json patterns are language-agnostic and would migrate to a Rust port wholesale if needed.

---

**Last updated:** March 8, 2026
**Author:** Daniel Wolner + Claude
