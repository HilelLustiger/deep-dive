// The product for Parts 3 and 4: sort incoming support tickets. Given code.
// The model reads a ticket and returns a label as JSON; the code that routes the ticket uses the label.
import { z } from "zod";

// What the model must return. Part 3 checks every reply against this.
export const TicketLabel = z.object({
    category: z.enum(["billing", "bug", "account", "other"]),
    urgent: z.boolean(),
});
export type TicketLabel = z.infer<typeof TicketLabel>;

// Two system prompts to compare in Part 4.
export const PROMPTS: Record<string, string> = {
    short: `Classify the support ticket. Reply with only JSON: {"category": ..., "urgent": ...}.`,
    detailed: `You sort support tickets for an online invoicing service.
Reply with only a JSON object, no other text: {"category": "billing" | "bug" | "account" | "other", "urgent": true | false}

Categories:
- billing: charges, refunds, invoices from us to the customer, plans and prices.
- bug: the product does something wrong or shows an error.
- account: signing in, passwords, two-factor codes, users and permissions, closing the account.
- other: anything else, including feature requests and questions about how to do something.

Urgent means the customer can't work right now or is losing money right now. A strong tone alone is not urgent.`,
};

// Labelled tickets: the eval set. Each one was labelled by hand, following the detailed prompt's rules.
export const TICKETS: Array<{ id: string; input: string; expected: TicketLabel }> = [
    { id: "double-charge", input: "You charged my card twice this month for the same plan. Please refund one of them.", expected: { category: "billing", urgent: false } },
    { id: "cant-login-payroll", input: "I can't log in since this morning and payroll has to go out in an hour!!", expected: { category: "account", urgent: true } },
    { id: "pdf-export-error", input: "Exporting an invoice to PDF shows 'Error 500'. It worked last week.", expected: { category: "bug", urgent: false } },
    { id: "dark-mode", input: "Any plans for a dark mode? My eyes would thank you.", expected: { category: "other", urgent: false } },
    { id: "angry-price", input: "This is OUTRAGEOUS. Why did the Pro plan go up by 3 dollars?!", expected: { category: "billing", urgent: false } },
    { id: "invoices-not-sending", input: "None of our invoices have been emailed to clients since yesterday. We're not getting paid until this works.", expected: { category: "bug", urgent: true } },
    { id: "add-accountant", input: "How do I give my accountant read-only access to our invoices?", expected: { category: "account", urgent: false } },
    { id: "2fa-new-phone", input: "Got a new phone and the two-factor codes go to the old one. I'm locked out and have a client meeting now.", expected: { category: "account", urgent: true } },
    { id: "vat-rounding", input: "The VAT on my invoices is rounded wrong: 17% of 99.99 shows 16.99 instead of 17.00.", expected: { category: "bug", urgent: false } },
    { id: "cancel-plan", input: "Please cancel my plan at the end of the month and don't charge me again.", expected: { category: "billing", urgent: false } },
    { id: "import-csv", input: "Is there a way to import my client list from a CSV file?", expected: { category: "other", urgent: false } },
    { id: "charged-after-cancel", input: "I cancelled last month and you charged me again today. My account is overdrawn because of this.", expected: { category: "billing", urgent: true } },
];
