import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");
const STATE_PATH = join(ROOT, "STATE.json");
const JOURNAL_PATH = join(ROOT, "JOURNAL.md");

const state = JSON.parse(readFileSync(STATE_PATH, "utf8"));
const journal = readFileSync(JOURNAL_PATH, "utf8");

// Pull last 3 journal entries
const entries = journal.split("## Run ").slice(1, 4).map((e) => "## Run " + e.trim());

const t = state.threshold_stats;
const hitRate = state.hit_rate !== null ? `${Math.round(state.hit_rate * 100)}%` : "no data yet";
const openSuggestions = state.cosmic_suggestions.filter((s: { accepted: boolean | null }) => s.accepted === null).length;
const lastRun = state.last_run_at ? new Date(state.last_run_at).toLocaleString() : "never";

// Health signals
const alerts: string[] = [];
if (t.current_threshold <= 5 && t.consecutive_skips >= 2)
  alerts.push("QUIET: threshold at floor (5) and still skipping — may need manual review");
if (t.current_threshold >= 9 && t.consecutive_full_runs >= 2)
  alerts.push("CHATTY: threshold at ceiling (9) and still posting max — consider raising MAX_ISSUES_PER_RUN");
if (state.hit_rate !== null && state.hit_rate < 0.25 && state.total_created >= 4)
  alerts.push(`LOW HIT RATE: only ${hitRate} of suggestions accepted — analysis may need recalibration`);
if (state.convergence_patterns.length > 0)
  alerts.push(`CONVERGENCE: ${state.convergence_patterns.length} topic(s) where Cosmic and humans agree — good signal`);
if (state.divergence_patterns.length > 0)
  alerts.push(`DIVERGENCE: ${state.divergence_patterns.length} topic(s) Cosmic keeps flagging but humans ignore`);

console.log(`
╔═══════════════════════════════════════════╗
║           COSMIC INSIGHT STATUS           ║
╚═══════════════════════════════════════════╝

RUNS
  Total runs:       ${state.run_count}
  Last run:         ${lastRun}
  Last SHA:         ${state.last_analyzed_sha?.slice(0, 8) ?? "none"}

ISSUES
  Total created:    ${state.total_created}
  Open (unresolved):${openSuggestions}
  Accepted:         ${state.total_accepted}
  Rejected:         ${state.total_rejected}
  Hit rate:         ${hitRate}

THRESHOLD (adaptive)
  Current:          ${t.current_threshold} / 10 (min: 5, max: 9)
  Consecutive skips:${t.consecutive_skips}
  Consecutive full: ${t.consecutive_full_runs}
  Last adjusted:    ${t.last_adjusted_at ? new Date(t.last_adjusted_at).toLocaleString() : "never"}
  Adjustments:      ${t.adjustment_history.length} total

PATTERNS
  Accepted topics:  ${state.patterns.accepted_topics.slice(0, 5).join(", ") || "none yet"}
  Rejected topics:  ${state.patterns.rejected_topics.slice(0, 5).join(", ") || "none yet"}
  External hot:     ${state.patterns.external_hot_topics.slice(0, 5).join(", ") || "none yet"}
  Convergence:      ${state.convergence_patterns.map((p: { topic: string }) => p.topic).join(", ") || "none yet"}
  Divergence:       ${state.divergence_patterns.map((p: { topic: string }) => p.topic).join(", ") || "none yet"}

${alerts.length > 0 ? `ALERTS\n${alerts.map((a) => `  ⚠  ${a}`).join("\n")}\n` : "  ✓ No alerts\n"}
RECENT JOURNAL ENTRIES
──────────────────────
${entries[0] ?? "(no entries yet)"}
`);
