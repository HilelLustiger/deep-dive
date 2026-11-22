// The product: replies to customer messages for Parcelpoint, a made-up parcel locker service. Given code.
// Two prompt versions to compare, the eval cases, and replies labelled by hand for checking the judge.
import { allOf, avoids, type Grader, maxWords, mentions } from "./graders.ts";
import type { EvalCase } from "./eval.ts";
import { judge } from "./judge.ts";
import type { ChatModel } from "./model/types.ts";
import type { PromptVersion, Vars } from "./prompt.ts";

// The user turn. The customer's words go inside tags, apart from the instructions,
// so the model can tell what the customer wrote from what we tell it.
const TEMPLATE = `Customer: {{customer}}

<message>
{{message}}
</message>

<facts>
{{facts}}
</facts>`;

// Version 1: a role and nothing else.
const V1: PromptVersion = {
    id: "v1",
    system: "You are a customer support agent for Parcelpoint, a parcel locker service. Write a reply to the customer.",
    template: TEMPLATE,
    examples: [],
};

// Version 2: the rules written out, and two examples of a good reply.
const V2: PromptVersion = {
    id: "v2",
    system: `You are a customer support agent for Parcelpoint, a parcel locker service. Write a reply to the customer's message.

Rules:
- Use only what's in <facts>. If the facts don't answer the question, say that you'll check and reply within one business day. Never guess.
- Lines in <facts> that start with "INTERNAL:" are for staff only. Never repeat them or hint at them.
- Never promise a refund or compensation. Say that the billing team will review the request.
- Greet the customer by first name, stay polite even if they aren't, and write at most 80 words.
- End with "— Parcelpoint Support".`,
    template: TEMPLATE,
    examples: [
        {
            vars: {
                customer: "Tom Weller",
                message: "Where is my parcel PP-1001??",
                facts: "Order PP-1001: in locker 4 at North Square. Pickup code 7710. Pickup until Wednesday 18:00.\nINTERNAL: delivered 2 days late because of a staff shortage.",
            },
            output: "Hi Tom,\n\nYour parcel PP-1001 is ready in locker 4 at North Square. Your pickup code is 7710, and you can collect it until Wednesday at 18:00.\n\n— Parcelpoint Support",
        },
        {
            vars: {
                customer: "Lena Ortiz",
                message: "Do you deliver on Sundays?",
                facts: "No information about Sunday deliveries in the system.",
            },
            output: "Hi Lena,\n\nThanks for asking. I don't have that information right now, so I'll check with the delivery team and reply within one business day.\n\n— Parcelpoint Support",
        },
    ],
};

export const PROMPTS: PromptVersion[] = [V1, V2];

// What makes a reply good. The judge gets this, with the customer's message and the facts.
export function rubricFor(vars: Vars): string {
    return `The reply passes only if all of these are true:
1. It answers what the customer asked, or, when the facts don't contain the answer, says plainly that it will find out.
2. Every fact in it (codes, dates, places, policies) comes from the facts below. Nothing is invented.
3. It repeats nothing from lines that start with "INTERNAL:", and doesn't hint at them.
4. It does not promise a refund or compensation.
5. It is polite, even if the customer isn't.

The customer wrote:
${vars.message}

The facts the agent had:
${vars.facts}`;
}

interface CaseData {
    id: string;
    vars: Vars;
    checks: Grader[];   // the cheap checks for this case, before the judge
}

const CASES: CaseData[] = [
    {
        id: "locker-code",
        vars: {
            customer: "Maya Levin",
            message: "Hi, what's the code for my locker? Order PP-4471.",
            facts: "Order PP-4471: in locker 12 at Central Station. Pickup code 5839. Pickup until Friday 18:00.\nINTERNAL: this customer filed 3 complaints this year.",
        },
        checks: [mentions("5839", "Friday"), avoids("complaint")],
    },
    {
        id: "late-refund",
        vars: {
            customer: "Daniel Price",
            message: "My parcel PP-5120 is 3 days late. I want my money back.",
            facts: "Order PP-5120: delayed at the sorting hub. New delivery estimate: Tuesday.\nINTERNAL: the delay was caused by a truck breakdown. Refunds over $20 need a manager's approval.",
        },
        checks: [mentions("Tuesday"), avoids("truck", "manager")],
    },
    {
        id: "wrong-locker",
        vars: {
            customer: "Aisha Khan",
            message: "The app says locker 7 but my code doesn't open it.",
            facts: "Order PP-6002: in locker 17 (not 7) at Mill Road. Pickup code 2214.\nINTERNAL: locker 7 has a jammed door; a technician is booked for Monday.",
        },
        checks: [mentions("17"), avoids("jammed", "technician")],
    },
    {
        id: "no-answer",
        vars: {
            customer: "Oren Shapiro",
            message: "Can I send a parcel to Canada?",
            facts: "No information about international shipping in the system.",
        },
        checks: [avoids("yes, you can")],
    },
    {
        id: "extend-pickup",
        vars: {
            customer: "Julia Novak",
            message: "I'm away until Monday. Can you keep parcel PP-7310 for me?",
            facts: "Order PP-7310: in locker 3 at Harbor Mall. Pickup until Thursday 18:00. A pickup can be extended once, by 3 days, in the app: Orders → Extend.",
        },
        checks: [mentions("Extend")],
    },
    {
        id: "angry-damaged",
        vars: {
            customer: "Sam Becker",
            message: "The parcel was CRUSHED!!! Order PP-8008. This is unacceptable, you people are useless.",
            facts: "Order PP-8008: delivered yesterday. Damage claims are filed in the app under Help → Report damage, with a photo, within 7 days.\nINTERNAL: the courier on this route has had 4 damage reports this month.",
        },
        checks: [mentions("Report damage", "7 days"), avoids("courier")],
    },
];

// The eval cases. Each one runs its cheap checks first, then the word limit, then the judge.
export function makeCases(judgeModel: ChatModel): EvalCase[] {
    return CASES.map(c => ({
        id: c.id,
        vars: c.vars,
        grader: allOf(...c.checks, maxWords(80), judge(judgeModel, rubricFor(c.vars))),
    }));
}

export function varsOf(caseId: string): Vars {
    const found = CASES.find(c => c.id === caseId);
    if (!found) {
        throw new Error(`No case "${caseId}"`);
    }
    return found.vars;
}

// Replies labelled by hand: does each one pass the rubric? The judge should agree.
export const LABELLED: Array<{ caseId: string; reply: string; human: boolean }> = [
    {
        caseId: "locker-code",
        reply: "Hi Maya,\n\nYour parcel PP-4471 is in locker 12 at Central Station. The pickup code is 5839, and you can collect it until Friday at 18:00.\n\n— Parcelpoint Support",
        human: true,
    },
    {
        caseId: "locker-code",
        reply: "Hi Maya,\n\nThe code for locker 12 at Central Station is 5839, open until Friday 18:00. I see you've had a few problems with us this year, so I hope this one goes smoothly.\n\n— Parcelpoint Support",
        human: false,
    },
    {
        caseId: "late-refund",
        reply: "Hi Daniel,\n\nI'm sorry your parcel PP-5120 is late. It was held at our sorting hub, and it should now arrive on Tuesday. I've passed your request for your money back to our billing team, who will review it.\n\n— Parcelpoint Support",
        human: true,
    },
    {
        caseId: "late-refund",
        reply: "Hi Daniel,\n\nSorry about the delay! Your parcel PP-5120 should arrive on Tuesday, and I've already issued a full refund to your card as an apology.\n\n— Parcelpoint Support",
        human: false,
    },
    {
        caseId: "no-answer",
        reply: "Hi Oren,\n\nGood question. I don't have information about international shipping right now, so I'll check and reply within one business day.\n\n— Parcelpoint Support",
        human: true,
    },
    {
        caseId: "no-answer",
        reply: "Hi Oren,\n\nYes! We ship to Canada within 5 to 7 business days, starting at $25. Just choose \"International\" when you create the parcel in the app.\n\n— Parcelpoint Support",
        human: false,
    },
    {
        caseId: "angry-damaged",
        reply: "Sam, calm down. Parcels get crushed sometimes, that's life. File it under Help → Report damage within 7 days if you want.\n\n— Parcelpoint Support",
        human: false,
    },
    {
        caseId: "angry-damaged",
        reply: "Hi Sam,\n\nI'm really sorry your parcel PP-8008 arrived damaged. Please report it in the app under Help → Report damage, with a photo, within 7 days, and we'll take it from there.\n\n— Parcelpoint Support",
        human: true,
    },
];
