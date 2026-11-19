// Runs the ticket eval once per prompt, through the whole production stack,
// and prints quality, cost and latency side by side. Given code.
//   node src/compare.ts
import { gate, runEval } from "./eval.ts";
import { modelFromEnv } from "./model/index.ts";
import { priceFor } from "./model/prices.ts";
import { withRetry } from "./retry.ts";
import { completeJson } from "./structured.ts";
import { PROMPTS, TicketLabel, TICKETS } from "./tickets.ts";
import { type Span, summarize, traced } from "./trace.ts";

// What "good enough to ship" means for this product.
const LIMITS = { minPassRate: 0.9, maxCostUsd: 0.05, maxP95Ms: 10_000 };

const { model, name } = modelFromEnv();
const price = priceFor(name);
console.log(`Model: ${name}, $${price.inputPerMTok} / $${price.outputPerMTok} per million tokens in / out\n`);

for (const [label, system] of Object.entries(PROMPTS)) {
    const spans: Span[] = [];
    // Tracing outside the retries: one span per request the code made, however many attempts it took.
    const reliable = traced(withRetry(model, { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 8_000, timeoutMs: 60_000 }), {
        name: label,
        price,
        spans,
    });

    const report = await runEval(
        TICKETS,
        ticket => completeJson(reliable, { system, messages: [{ role: "user", text: ticket }], tools: [] }, TicketLabel),
        (output, expected) => output.category === expected.category && output.urgent === expected.urgent,
    );
    const summary = summarize(spans);
    const broken = gate(report, summary, LIMITS);

    console.log(`Prompt "${label}"`);
    console.log(`  pass rate   ${(report.passRate * 100).toFixed(0)}%   failed: ${report.failed.join(", ") || "none"}`);
    console.log(`  calls       ${summary.calls} (${summary.errors} failed), ${summary.inputTokens} tokens in, ${summary.outputTokens} out`);
    console.log(`  cost        $${summary.costUsd.toFixed(4)}`);
    console.log(`  latency     p50 ${summary.p50Ms.toFixed(0)} ms, p95 ${summary.p95Ms.toFixed(0)} ms`);
    console.log(`  ship it?    ${broken.length === 0 ? "yes" : `no: ${broken.join(", ")}`}\n`);
}
