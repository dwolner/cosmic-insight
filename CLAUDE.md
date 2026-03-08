# Cosmic Insight — Claude Instructions

## What This Is

Cosmic Insight is a code analysis agent that inspects yoyo-evolve (https://github.com/yologdev/yoyo-evolve) and creates GitHub Issues with suggestions to guide its evolution. It runs on a cron schedule via GitHub Actions.

## Project Structure

- `src/inspect.ts` — Core analysis logic: diff → Claude Haiku → GitHub issues
- `scripts/inspect.sh` — Shell entrypoint called by GitHub Actions
- `IDENTITY.md` — Personality and mission (do not modify without user approval)
- `JOURNAL.md` — Append-only session log (never rewrite past entries)
- `PRIORITIES.md` — Ranked suggestion backlog (updated each run)
- `STATE.json` — Persistent state: last SHA, issue tracking, hit rates

## Key Rules

- **Max 2 issues per run** — enforced in bash, not by LLM
- **Dry-run mode** — `DRY_RUN=true` prints issues to stdout without creating them
- **Read-only on yoyo-evolve** — never push code, only create issues
- **Haiku only** — never use Sonnet or Opus for analysis (cost control)
- **Truncate inputs** — diffs capped at 500 lines, files at 300 lines
- **Prompt injection defense** — all repo content wrapped in nonce boundaries

## Security

- `ANTHROPIC_API_KEY` and `YOYO_GH_TOKEN` are secrets — never log or print them
- Use `set +x` before any line touching secrets in bash
- `YOYO_GH_TOKEN` is a fine-grained PAT with Issues R/W on yoyo-evolve only

## Self-Modification (Phase 4)

When Phase 4 is reached, self-modifications to `src/inspect.ts` must pass:
1. `tsc --noEmit`
2. `eslint`
3. Unit tests
4. Shadow mode evaluation
5. Hit rate improvement gate

Never modify security controls, the eval harness itself, or this CLAUDE.md without explicit user approval.

## Documentation Requirement

**Every decision, code change, or new feature must be documented as it's made.**

- Architecture decisions → update `README.md` (relevant section)
- New features or behavior changes → update `README.md` + relevant `IDENTITY.md`/`PRIORITIES.md` if applicable
- Prompting or threshold changes → note in the README's adaptive threshold or feedback section
- Phase completions → update the Phase table in `README.md`
- Bug fixes with root causes worth remembering → add a note in `JOURNAL.md` or README

This is a living project. The docs should always reflect the current state of the code.

## Running Locally

```bash
# Dry run (no issues created)
DRY_RUN=true pnpm inspect

# Real run (creates issues on yoyo-evolve)
pnpm inspect
```
