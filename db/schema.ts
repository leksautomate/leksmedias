import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();

/* ---------------------------------------------------------------- accounts */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name"),
    passwordHash: text("password_hash").notNull(),
    emailVerifiedAt: ts("email_verified_at"),
    /** When they agreed to the Terms and Privacy Policy at signup. */
    termsAcceptedAt: ts("terms_accepted_at"),
    /** free | starter | creator | pro | studio. Billing sets this later. */
    plan: text("plan").notNull().default("free"),
    /** user | admin */
    role: text("role").notNull().default("user"),
    /** Denormalised sum of credit_ledger.amount. Only changed together with a ledger row. */
    creditBalance: integer("credit_balance").notNull().default(0),
    disabledAt: ts("disabled_at"),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    check("users_balance_nonneg", sql`${t.creditBalance} >= 0`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** sha256 of the random cookie token. The token itself is never stored. */
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    createdAt: createdAt(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
  },
  (t) => [uniqueIndex("sessions_token_idx").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

export const emailTokens = pgTable(
  "email_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** verify | reset */
    purpose: text("purpose").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("email_tokens_hash_idx").on(t.tokenHash), index("email_tokens_user_idx").on(t.userId)],
);

export const authAttempts = pgTable(
  "auth_attempts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    /** sha256 of "ip|email" so we can rate limit without storing either. */
    key: text("key").notNull(),
    success: boolean("success").notNull(),
    at: ts("at").notNull().defaultNow(),
  },
  (t) => [index("auth_attempts_key_idx").on(t.key, t.at)],
);

/* ----------------------------------------------------------------- credits */

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** grant | plan_grant | topup | spend | refund | adjust */
    kind: text("kind").notNull(),
    /** Signed. Positive adds credits, negative spends them. */
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    runId: uuid("run_id"),
    note: text("note"),
    /** Makes a grant or refund safe to retry. */
    idempotencyKey: text("idempotency_key"),
    createdAt: createdAt(),
  },
  (t) => [
    index("credit_ledger_user_idx").on(t.userId, t.id),
    uniqueIndex("credit_ledger_idem_idx").on(t.idempotencyKey).where(sql`${t.idempotencyKey} is not null`),
  ],
);

/* -------------------------------------------------------------------- runs */

export const runs = pgTable(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** queued | running | completed | failed | cancelled */
    status: text("status").notNull().default("queued"),
    /** research | facts | outline | writing | audit | done */
    stage: text("stage").notNull().default("queued"),
    topic: text("topic").notNull(),
    format: text("format").notNull(),
    niche: text("niche"),
    words: integer("words").notNull(),
    /** standard | deep */
    depth: text("depth").notNull().default("standard"),
    voiceNotes: text("voice_notes"),
    ownSources: jsonb("own_sources").$type<string[]>(),
    language: text("language").notNull().default("en"),
    creditsCost: integer("credits_cost").notNull(),
    deepRunsPlanned: integer("deep_runs_planned").notNull().default(0),
    researchReport: text("research_report"),
    outline: jsonb("outline").$type<Outline | null>(),
    progress: jsonb("progress").$type<{ done: number; total: number } | null>(),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    workerId: text("worker_id"),
    heartbeatAt: ts("heartbeat_at"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 4 }).notNull().default("0"),
    /** true when this run used the offline demo providers. */
    demo: boolean("demo").notNull().default(false),
    cancelRequestedAt: ts("cancel_requested_at"),
    /** The worker will not pick the run up before this time. Used for retry backoff. */
    availableAt: ts("available_at").notNull().defaultNow(),
    createdAt: createdAt(),
    startedAt: ts("started_at"),
    finishedAt: ts("finished_at"),
  },
  (t) => [
    index("runs_user_idx").on(t.userId, t.createdAt),
    index("runs_queue_idx").on(t.status, t.availableAt),
    check("runs_words_range", sql`${t.words} between 300 and 30000`),
  ],
);

export type OutlineSection = { title: string; beat: string; targetWords: number; factNs: number[] };
export type Outline = { title: string; sections: OutlineSection[] };

export const runEvents = pgTable(
  "run_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    runId: uuid("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
    at: ts("at").notNull().defaultNow(),
    /** info | stage | search | read | warn | error */
    kind: text("kind").notNull(),
    message: text("message").notNull(),
    data: jsonb("data"),
  },
  (t) => [index("run_events_run_idx").on(t.runId, t.id)],
);

export const sources = pgTable(
  "sources",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    runId: uuid("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
    n: integer("n").notNull(),
    url: text("url").notNull(),
    title: text("title"),
    host: text("host"),
    /** Short excerpt we may quote or paraphrase. Never the whole page. */
    excerpt: text("excerpt"),
  },
  (t) => [uniqueIndex("sources_run_n_idx").on(t.runId, t.n)],
);

export const facts = pgTable(
  "facts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    runId: uuid("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
    n: integer("n").notNull(),
    claim: text("claim").notNull(),
    sourceNs: integer("source_ns").array().notNull().default(sql`'{}'::integer[]`),
    /** high | medium | low */
    confidence: text("confidence").notNull().default("medium"),
    /** True when the claim is an allegation about a person and must be framed as one. */
    allegation: boolean("allegation").notNull().default(false),
  },
  (t) => [uniqueIndex("facts_run_n_idx").on(t.runId, t.n)],
);

export const runSections = pgTable(
  "run_sections",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    runId: uuid("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(),
    title: text("title").notNull(),
    beat: text("beat"),
    targetWords: integer("target_words").notNull(),
    /** pending | done */
    status: text("status").notNull().default("pending"),
    /** Raw model output: narration lines, cue lines and {f1,f2} fact tags. */
    raw: text("raw"),
    attempts: integer("attempts").notNull().default(0),
  },
  (t) => [uniqueIndex("run_sections_idx").on(t.runId, t.idx)],
);

export const scripts = pgTable(
  "scripts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    runId: uuid("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
    /** visual | clean */
    kind: text("kind").notNull(),
    body: text("body").notNull(),
    wordCount: integer("word_count").notNull(),
    audit: jsonb("audit"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("scripts_run_kind_idx").on(t.runId, t.kind)],
);

/* ------------------------------------------------------------ cost logging */

export const llmCalls = pgTable(
  "llm_calls",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    runId: uuid("run_id").references(() => runs.id, { onDelete: "set null" }),
    step: text("step").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
    ms: integer("ms").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("llm_calls_run_idx").on(t.runId)],
);

export const providerEvents = pgTable(
  "provider_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    runId: uuid("run_id").references(() => runs.id, { onDelete: "set null" }),
    provider: text("provider").notNull(),
    /** research_deep | research_max | search | fetch */
    kind: text("kind").notNull(),
    /** Provider's own id, e.g. TinyFish research_run_id. Lets a restarted worker resume. */
    externalId: text("external_id"),
    status: text("status").notNull().default("started"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 4 }).notNull().default("0"),
    meta: jsonb("meta"),
    createdAt: createdAt(),
  },
  (t) => [index("provider_events_run_idx").on(t.runId)],
);

/* ---------------------------------------------------------------- waitlist */

export const waitlist = pgTable(
  "waitlist",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    email: text("email").notNull(),
    source: text("source"),
    createdAt: createdAt(),
    invitedAt: ts("invited_at"),
  },
  (t) => [uniqueIndex("waitlist_email_idx").on(t.email)],
);
