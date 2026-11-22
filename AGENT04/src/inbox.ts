// The product: Parcelpoint's support inbox, for a made-up parcel locker service. Given code.
// The prompts for each pattern, and a few customer emails to run them on.
import type { Step } from "./chain.ts";
import type { Section } from "./parallel.ts";
import type { Route } from "./route.ts";

// What support may tell customers. Every pattern answers from this, and only from this.
export const FACTS = `- A parcel waits in its locker for 3 days. The pickup can be extended once, by 3 days, in the app: Orders → Extend.
- The pickup code is in the app under Orders, and in the text message we sent.
- Lockers are open 6:00–23:00. Lockers at train stations are open 24 hours.
- Damage claims: in the app under Help → Report damage, with a photo, within 7 days of delivery.
- Sending a parcel costs $4.90 (small), $6.90 (medium) or $9.90 (large).
- Refund requests are reviewed by the billing team within 5 business days.
- We deliver only within the country. There's no international shipping.`;

const REPLY_RULES = `Use only these facts. If they don't answer something, say that a colleague will reply within one business day. Never promise a refund. Be polite, greet the customer, and sign off with "— Parcelpoint Support".

<facts>
${FACTS}
</facts>`;

function words(text: string): number {
    return text.split(/\s+/).filter(w => w !== "").length;
}

// Part 1: extract the request, draft a reply, then cut it down.
export const CHAIN: Step[] = [
    {
        name: "extract",
        system: "Read the customer's email. Write one sentence saying what they want us to do. Write only that sentence.",
        check: output => !output.includes("\n") && words(output) <= 40,
    },
    {
        name: "draft",
        system: `You write replies for Parcelpoint support. The user message is a summary of what a customer wants. Write the reply. ${REPLY_RULES}`,
    },
    {
        name: "shorten",
        system: "Shorten this support reply to at most 80 words. Keep every fact, the greeting and the sign-off. Write only the new reply.",
        check: output => words(output) <= 100,
    },
];

// Part 2: a specialist for each kind of email, and a fallback for everything else.
export const ROUTES: Route[] = [
    {
        name: "billing",
        description: "prices, charges, refunds",
        system: `You answer billing questions for Parcelpoint. ${REPLY_RULES}`,
    },
    {
        name: "pickup",
        description: "finding, opening or collecting a parcel from a locker",
        system: `You help customers collect their parcels from Parcelpoint lockers. ${REPLY_RULES}`,
    },
    {
        name: "damage",
        description: "a parcel that arrived damaged",
        system: `You handle damaged parcels for Parcelpoint. Start by saying you're sorry. ${REPLY_RULES}`,
    },
];

export const FALLBACK: Route = {
    name: "human",
    description: "anything else",
    system: 'Write a short, polite reply saying that a person from the Parcelpoint team will answer within one business day. Sign off with "— Parcelpoint Support".',
};

// Part 3: three reviews of the same reply, at the same time.
export const REVIEWS: Section[] = [
    { name: "tone", system: 'Is this support reply polite and calm? Answer "ok", or one sentence saying what is wrong.' },
    { name: "facts", system: `Does this support reply state anything that isn't in these facts? Answer "ok", or one sentence naming what's invented.\n\n<facts>\n${FACTS}\n</facts>` },
    { name: "promises", system: 'Does this support reply promise a refund, compensation or a deadline? Answer "ok", or one sentence quoting the promise.' },
];

// Part 3: the same yes-or-no question, asked several times.
export const PHISHING = 'Is this email a phishing attempt: does it pretend to be someone else to get a password, a code or a payment? Answer only "yes" or "no".';

// Part 4: split an email into questions, answer each, and write one reply.
export const ORCHESTRATOR = {
    plan: 'Read the customer\'s email, and list each separate question or request in it. Answer with only JSON: {"tasks": [{"id": "q1", "instruction": "<one question, written so it can be answered on its own>"}, ...]}',
    worker: `Answer one customer question for Parcelpoint support, in one or two sentences. Use only these facts. If they don't answer it, say "Not in the facts."\n\n<facts>\n${FACTS}\n</facts>`,
    synthesize: `Write one reply to the customer's email, using the answers below for each of their questions. Where an answer is "Not in the facts.", say that a colleague will reply about it within one business day. Greet the customer, and sign off with "— Parcelpoint Support".`,
};

// Part 5: a writer and a reviewer.
export const REFINE = {
    write: `You write replies for Parcelpoint support. ${REPLY_RULES}`,
    review: `You review support replies before they're sent. The reply passes only if it answers every question in the email, uses only the facts below, promises no refund, is polite, and is at most 100 words. Answer with only JSON: {"pass": true or false, "feedback": "<what to fix, or empty if it passes>"}\n\n<facts>\n${FACTS}\n</facts>`,
};

export const EMAILS: Record<string, string> = {
    "lost-code": "Hi, I deleted the text message with my pickup code by mistake. How do I get my parcel now? Thanks, Maya",
    "refund": "You charged me $9.90 for a small parcel, which should be $4.90. I want the difference back. Daniel",
    "crushed": "My parcel arrived completely crushed. The vase inside is broken. What now?? Sam",
    "careers": "Hello, are you hiring drivers in the north? I'd love to apply. Regards, Lior",
    "many-questions": "Hi! Three things: how long will my parcel stay in the locker, can I send a parcel to Germany, and is the locker at Central Station open at midnight? Julia",
    "phishing": "PARCELPOINT SECURITY: your parcel is on hold. Reply within 2 hours with your pickup code and card number to release it, or it will be destroyed.",
};
