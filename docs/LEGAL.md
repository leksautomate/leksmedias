# Legal pages: what is done and what you still need to decide

Three pages exist: [`/terms`](../app/terms/page.tsx), [`/privacy`](../app/privacy/page.tsx), [`/refunds`](../app/refunds/page.tsx). Their text lives in `lib/legal-docs.ts`, their settings in `lib/legal.ts`, and the footer links to all three.

**These are drafts written around how the product works. They are not legal advice. Have a lawyer in your country review them before you take payments.** The three documents depend on each other, so review them together.

## 1. Fill in once, in `lib/legal.ts`

Anything left empty shows on the page as a gold `[placeholder]`, so it is hard to miss.

| Setting | What to put |
| --- | --- |
| `entity` | **Done:** "Babatude Lekan, trading as Leksmedias" (sole trader, no registered company). See section 6 for what that means |
| `address` | **Still needed.** A mailing address where you can receive post. As a sole trader, do not publish your home address unless you are happy for it to be public: use a PO box, a virtual mailbox or a business address instead |
| `email` | **Done:** support@leksmedias.com. Make sure this mailbox exists and is monitored, because the privacy and refund pages tell people to write to it |
| `jurisdiction` | **Still needed.** Governing law and courts, for example "England and Wales" or "the State of Delaware, USA". Use where the business is based or registered |

## 2. Business decisions I made as defaults (change them if you disagree)

| Decision | Default | Where to change |
| --- | --- | --- |
| Refund window, first payment | 7 days monthly, 14 days yearly | `REFUND` in `lib/legal.ts` (FAQs and policy read from it) |
| Refund usage limit | 20% or less of the payment's credits | `REFUND.maxUsedPercent` |
| Accidental renewal | 48 hours, if unused | `REFUND.renewalWindowHours` |
| Top-up refunds | 7 days if completely unused | `REFUND.topUpDays` |
| Failed runs | Credits returned automatically | Terms section 3, Refund Policy section 1 |
| Monthly credits roll over? | No. Top-up credits never expire | Terms section 3 |
| Price or allowance changes | 30 days' notice | Terms sections 3 and 16 |
| Liability cap | Greater of 12 months of payments or $100 | Terms section 13 |
| Minimum age | 18 | Terms section 2, Privacy section 11 |
| Retention | Content until deleted, then 30 days live and 90 days backups. Logs 90 days. API records 12 months | Privacy section 7 |

A competitor's page you shared uses "all sales final". A refund window like this one is friendlier and usually lifts conversion, but it costs real money per refunded deep run. Decide deliberately.

## 3. Things the pages promise that we must actually build

Writing a promise on a legal page makes it a legal commitment. Before launch these must be true:

- [ ] Credits for a failed run return automatically (ledger refund on job failure).
- [ ] An email goes out before a yearly plan renews (a legal requirement in several places too).
- [ ] Users can delete their scripts and their account, and a purge job removes data from live systems in 30 days and backups in 90.
- [ ] Users can export their data.
- [ ] API keys are stored hashed and shown once.
- [ ] Staff accounts use multi-factor authentication, and staff access to scripts is logged (see [`ADMIN.md`](ADMIN.md)).
- [ ] No script text goes into logs or analytics.
- [ ] Unsubscribe link in every marketing email.
- [ ] A stored record of consent for marketing email.
- [ ] A way to remove a named person's information from stored research on request.

## 4. Facts to verify before launch

- **Provider data terms.** The Privacy Policy says we use Anthropic and TinyFish through their business services and do not allow them to train on your content where their terms give us that control. Confirm this against each provider's current terms and sign their data processing terms. I did not verify TinyFish's data-handling terms.
- **Subprocessor list.** The table names Anthropic and TinyFish (decided) and generic categories for the rest. Replace "Payment provider (Stripe)" and the hosting row with what you actually choose.
- **Cookies and analytics.** The policy says essential cookies plus basic analytics with no cross-site tracking. If you add anything else, add a consent banner where required (EU and UK).
- **Taxes.** Charging VAT or sales tax internationally needs registration or a merchant-of-record service. Decide this before selling to the EU, UK and US states.
- **The writing rules licence.** Separate from these pages: confirm you may run the rulebook as a service (see [`PLAN.md`](PLAN.md) section 4). The Terms promise customers a service and the scripts, so this has to be settled first.

## 5. Not covered here (probably needed later)

Cookie banner (if non-essential cookies are added), data processing agreement for agency customers, an acceptable-use appeal process, DMCA or copyright complaint contact, a security disclosure page, and an AI-disclosure line if platforms require it for published videos.

## 6. Because you are a sole trader (no registered company)

- **You are personally liable.** The Terms cap what customers can claim from you, but a cap does not protect your personal assets against everything (fraud, some consumer claims, tax). This matters more here than for most products because you publish AI-written text about real people. Consider an LLC, Ltd or equivalent once there is revenue, and keep business insurance in mind. When you register one, change `entity` in `lib/legal.ts` and email customers about the change.
- **Your name is public.** The pages show "Babatude Lekan, trading as Leksmedias". Many laws require the seller's identity on the site, so this is normal, but it is a choice about privacy.
- **Business registration and tax.** Check what your country requires to trade under a business name and to charge VAT or sales tax. Stripe accepts individuals and sole proprietors, but you will need to complete its identity and tax setup.
- **Use a separate bank account** for the business, even if it is in your own name. It keeps refunds, tax and records clean.
- **Data protection still applies in full.** Being an individual does not exempt you from privacy laws such as GDPR when customers are in the EU or UK. The Privacy Policy and the deletion and export promises in section 3 still have to be real.
