// Part 4's script. Given code: don't change it.
// 1. Checks the judge against the hand-labelled replies.
// 2. Runs both prompt versions on every case, several times each, and compares them.
//
//   node src/run.ts                     the model from PROVIDER and MODEL also judges
//   JUDGE_MODEL=... node src/run.ts     a different model judges (same provider)
//   TRIALS=5 node src/run.ts            trials per case (default 3)
import { compare, flaky, runEval, type EvalReport } from "./eval.ts";
import { agreement, judge } from "./judge.ts";
import { modelFromEnv } from "./model/index.ts";
import { LABELLED, makeCases, PROMPTS, rubricFor, varsOf } from "./support.ts";

const { model, name } = modelFromEnv();
const judgeEnv = process.env.JUDGE_MODEL ? { ...process.env, MODEL: process.env.JUDGE_MODEL } : process.env;
const { model: judgeModel, name: judgeName } = modelFromEnv(judgeEnv);
const trials = Number(process.env.TRIALS ?? 3);

console.log(`Model: ${name}. Judge: ${judgeName}. Trials per case: ${trials}.\n`);

// 1. Can the judge be trusted?
console.log("== The judge vs. the hand labels ==");
const judged: boolean[] = [];
for (const item of LABELLED) {
    const grade = await judge(judgeModel, rubricFor(varsOf(item.caseId)))(item.reply);
    judged.push(grade.pass);
    const mark = grade.pass === item.human ? "  agree   " : "  DISAGREE";
    console.log(`${mark} ${item.caseId}: human ${item.human ? "pass" : "fail"}, judge ${grade.pass ? "pass" : "fail"}: ${grade.reason}`);
}
const a = agreement(judged, LABELLED.map(item => item.human));
console.log(`agreement ${(a.agreement * 100).toFixed(0)}%, false passes ${a.falsePass}, false fails ${a.falseFail}\n`);

// 2. Which prompt is better?
const cases = makeCases(judgeModel);
const reports: EvalReport[] = [];
for (const prompt of PROMPTS) {
    console.log(`== Prompt ${prompt.id} ==`);
    const report = await runEval(model, prompt, cases, trials);
    reports.push(report);
    for (const r of report.results) {
        const first = r.failures.length > 0 ? `  (${r.failures[0]})` : "";
        console.log(`  ${r.id.padEnd(14)} ${r.passes}/${r.trials}${first}`);
    }
    console.log(`  pass rate ${(report.passRate * 100).toFixed(0)}%, flaky: ${flaky(report).join(", ") || "none"}\n`);
}

const [before, after] = reports;
const change = compare(before, after);
console.log(`== ${before.promptId} → ${after.promptId} ==`);
console.log(`  fixed:  ${change.fixed.join(", ") || "none"}`);
console.log(`  broken: ${change.broken.join(", ") || "none"}`);
