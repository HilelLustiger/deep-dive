// Runs one pattern on the inbox, on a real model. Given code: don't change it.
//   node src/main.ts chain|route|review|vote|orchestrate|refine
// The model is chosen with PROVIDER and MODEL, as in AGENT01.
import { chain } from "./chain.ts";
import { CHAIN, EMAILS, FALLBACK, ORCHESTRATOR, PHISHING, REFINE, REVIEWS, ROUTES } from "./inbox.ts";
import { modelFromEnv } from "./model/index.ts";
import { orchestrate } from "./orchestrate.ts";
import { sections, vote } from "./parallel.ts";
import { refine } from "./refine.ts";
import { route } from "./route.ts";

const { model, name } = modelFromEnv();
const pattern = process.argv[2];
console.log(`Model: ${name}\n`);

function show(title: string, text: string): void {
    console.log(`--- ${title} ---\n${text}\n`);
}

switch (pattern) {
    case "chain": {
        const result = await chain(model, CHAIN, EMAILS["lost-code"]);
        result.outputs.forEach((output, i) => show(CHAIN[i].name, output));
        console.log(result.failedAt ? `Stopped: the "${result.failedAt}" check failed.` : "All checks passed.");
        break;
    }
    case "route": {
        for (const id of ["refund", "lost-code", "crushed", "careers"]) {
            const result = await route(model, ROUTES, FALLBACK, EMAILS[id]);
            show(`${id} → ${result.route}`, result.output);
        }
        break;
    }
    case "review": {
        const reply = "Hi Daniel,\n\nSorry about that! You're right, and I've refunded the $5 difference to your card. It will be there by tomorrow.\n\n— Parcelpoint Support";
        show("the reply", reply);
        const reviews = await sections(model, REVIEWS, reply);
        for (const [aspect, verdict] of Object.entries(reviews)) {
            console.log(`${aspect}: ${verdict}`);
        }
        break;
    }
    case "vote": {
        for (const id of ["phishing", "lost-code"]) {
            const result = await vote(model, PHISHING, EMAILS[id], 5);
            console.log(`${id}: ${result.answer}  ${JSON.stringify(result.votes)}`);
        }
        break;
    }
    case "orchestrate": {
        const result = await orchestrate(model, ORCHESTRATOR, EMAILS["many-questions"], { maxTasks: 5, limit: 3 });
        result.tasks.forEach((task, i) => show(`${task.id}: ${task.instruction}`, result.answers[i]));
        show("the reply", result.output);
        break;
    }
    case "refine": {
        const result = await refine(model, REFINE, EMAILS["refund"], 3);
        result.drafts.forEach((draft, i) => show(`draft ${i + 1}: ${result.feedback[i] || "passed"}`, draft));
        console.log(result.passed ? `Passed after ${result.drafts.length} drafts.` : `Not passed after ${result.drafts.length} drafts.`);
        break;
    }
    default:
        console.error("Usage: node src/main.ts chain|route|review|vote|orchestrate|refine");
        process.exit(1);
}
