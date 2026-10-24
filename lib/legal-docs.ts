import { REFUND } from "@/lib/legal";

// Drafts written for how the product actually works. They are not legal advice:
// have a lawyer review them before launch (see docs/LEGAL.md).

export type Block =
  | { t: "p"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][] };

export type Section = { id: string; title: string; blocks: Block[] };

export type LegalDocData = {
  slug: "terms" | "privacy" | "refunds";
  title: string;
  intro: string;
  summary: string[];
  sections: Section[];
};

/* ----------------------------------------------------------------------------
 * Terms of Service
 * -------------------------------------------------------------------------- */
export const TERMS: LegalDocData = {
  slug: "terms",
  title: "Terms of Service",
  intro:
    'These terms govern your use of {{product}}, run by {{entity}} ("we", "us"). By creating an account, joining the early-access list or using the service, you agree to them. If you do not agree, please do not use the service.',
  summary: [
    "You own your topics and the scripts we write for you.",
    "AI and web sources can be wrong. You check the facts and you are the publisher.",
    "Credits are used when a script finishes. Failed runs are refunded automatically.",
    "Subscriptions renew until you cancel. The refund policy explains what we refund.",
  ],
  sections: [
    {
      id: "service",
      title: "The service",
      blocks: [
        {
          t: "p",
          text: "{{product}} researches a topic on the live web and writes a faceless video script in two versions: one with visual cues for an editor, and one clean for voiceover with a list of sources and a fact check (the \"service\").",
        },
        {
          t: "p",
          text: 'We are still in early access. Features marked "soon" or "coming soon" are plans and not promises. Until launch we may change, pause or remove features, and we may reset balances created during testing.',
        },
      ],
    },
    {
      id: "account",
      title: "Your account",
      blocks: [
        {
          t: "ul",
          items: [
            "You must be at least 18 years old, or the age of majority where you live.",
            "Give us accurate information and keep your sign-in details and API keys secret. You are responsible for activity under your account. Tell us quickly if you think someone else has used it.",
            "An account is for one person, unless your plan includes team seats.",
            "The free trial is for one person. We may block duplicate accounts made to get more free credits.",
          ],
        },
      ],
    },
    {
      id: "plans",
      title: "Plans, credits and payment",
      blocks: [
        {
          t: "ul",
          items: [
            "**Subscriptions.** Paid plans are billed in advance, monthly or yearly, and renew automatically until you cancel. A yearly plan is charged at ten times the monthly price and covers twelve months.",
            "**Credits.** Each plan grants credits every billing period. Monthly credits reset at the start of each period and do not roll over. Credits from a top-up pack do not expire while your account is active. Credits have no cash value and cannot be transferred.",
            "**What things cost.** A script costs credits based on its length, and deep research costs credits per run. We show the cost before you start. We may change credit costs and plan allowances with at least 30 days' notice. Changes do not affect a job already started or a period you have already paid for.",
            "**Failed runs.** If a script does not finish, the credits for it return to your balance automatically.",
            "**Payment.** Payments are handled by our payment provider and we do not store full card numbers. Prices exclude taxes unless stated, and we collect VAT or sales tax where the law requires it. If a payment fails we may retry it and then pause paid features until it is paid.",
            "**Cancelling.** You can cancel at any time in your account. You keep access until the end of the period you paid for. Refunds are covered in our Refund Policy.",
          ],
        },
      ],
    },
    {
      id: "content",
      title: "Your content and your scripts",
      blocks: [
        {
          t: "ul",
          items: [
            "**Your inputs.** Topics, briefs, voice notes, links and documents you give us stay yours. You give us permission to store and process them to run the service for you, including sending them to the providers described in our Privacy Policy.",
            "**Your scripts.** As between you and us, you own the scripts and research we produce for you and may use them commercially, including in videos you publish, subject to these terms and to other people's rights. We do not claim ownership of them.",
            "**No promise of uniqueness.** Other users may receive similar text for similar topics. We cannot promise that a script is unique or that it can be registered for copyright.",
            "**No training on your content.** We do not sell your content and we do not use your inputs or scripts to train our own models.",
            "**You need the right to submit it.** Only give us links, documents and text you are allowed to use.",
          ],
        },
      ],
    },
    {
      id: "accuracy",
      title: "Accuracy and your responsibility",
      blocks: [
        {
          t: "p",
          text: "AI models and web sources can be wrong, incomplete or out of date. We map claims to sources and flag what we could not source, but we do not guarantee that any script is accurate, complete or fit for a particular purpose.",
        },
        {
          t: "ul",
          items: [
            "**You are the publisher.** Read the script and open the sources before you publish, especially anything about real people, allegations, health, law or money. Nothing we produce is legal, medical, financial or other professional advice.",
            "**You are responsible for what you publish**, including defamation, privacy, copyright, platform rules such as YouTube's policies, and any rules about disclosing AI-assisted content.",
            "**Visual cues are suggestions.** A line such as a B-roll or clip cue does not give you the right to use that footage. Get the rights you need.",
          ],
        },
      ],
    },
    {
      id: "use",
      title: "Acceptable use",
      blocks: [
        { t: "p", text: "Do not use the service to:" },
        {
          t: "ul",
          items: [
            "break the law or help someone else do so",
            "defame, harass, threaten or expose private details about a real person, or target a private individual",
            "create sexual content involving minors, or content that promotes violence, terrorism or self-harm",
            "present invented claims as fact, or impersonate a person or organization",
            "infringe someone's copyright, trademark or other rights",
            "get around limits, abuse the free trial, or create accounts to avoid paying",
            "scrape or resell the service, present it as your own, or use it to build a competing script-research service",
            "probe or test our security without our written permission, or overload the service",
          ],
        },
        {
          t: "p",
          text: "We may refuse requests, remove content and suspend accounts that break these rules.",
        },
      ],
    },
    {
      id: "agents",
      title: "Agent and API access",
      blocks: [
        {
          t: "p",
          text: "When agent access (MCP) or an API is available, these terms apply to it. Your keys are secret: anything done with a key is treated as done by you, and it uses your credits. Set spend caps, revoke a key you think is exposed, and expect rate limits. AI agents and tools made by other companies are covered by their own terms, and you are responsible for what your agent does on your account.",
        },
      ],
    },
    {
      id: "third-parties",
      title: "Third-party services and sources",
      blocks: [
        {
          t: "p",
          text: "The service uses independent providers, including TinyFish for web research and Anthropic's Claude models for writing. Their names and trademarks belong to their owners. We are not affiliated with or endorsed by them. The websites we research are run by other people and we do not control them or their content.",
        },
      ],
    },
    {
      id: "ip",
      title: "Our intellectual property",
      blocks: [
        {
          t: "p",
          text: "The service, its software, writing rules, prompts, design and brand belong to us or our licensors. We give you a limited, non-exclusive, non-transferable right to use the service under these terms. If you send us feedback, we may use it without owing you anything.",
        },
      ],
    },
    {
      id: "availability",
      title: "Availability and changes",
      blocks: [
        {
          t: "p",
          text: "We work to keep the service reliable but we do not promise it will always be available or error-free. Research depends on third-party providers and may be delayed. We may change or discontinue features and will give reasonable notice when a change matters to you.",
        },
      ],
    },
    {
      id: "termination",
      title: "Suspension and ending your account",
      blocks: [
        {
          t: "ul",
          items: [
            "You can stop using the service and delete your account at any time.",
            "We may suspend or end an account for breaking these terms, not paying, abuse, or legal risk, and we will give notice where we can.",
            "When an account ends, unused monthly credits end with it. If we end your account without a breach on your side, we will refund unused top-up credits.",
          ],
        },
      ],
    },
    {
      id: "disclaimer",
      title: "Disclaimers",
      blocks: [
        {
          t: "p",
          text: 'To the maximum extent the law allows, the service is provided "as is" and "as available", without warranties of any kind, whether express or implied, including accuracy, merchantability, fitness for a particular purpose and non-infringement.',
        },
      ],
    },
    {
      id: "liability",
      title: "Limits of liability",
      blocks: [
        {
          t: "ul",
          items: [
            "To the maximum extent the law allows, we are not liable for indirect or consequential losses, or for lost profits, revenue, views, monetization, channel strikes or damage to reputation.",
            "Our total liability for any claim is limited to the greater of the amount you paid us in the 12 months before the claim and 100 US dollars.",
            "Nothing in these terms limits liability that cannot be limited by law, such as for fraud, or for death or personal injury caused by negligence, or removes rights you have as a consumer.",
          ],
        },
      ],
    },
    {
      id: "indemnity",
      title: "If your use causes a claim",
      blocks: [
        {
          t: "p",
          text: "If you use the service for business, you will cover the costs of claims brought against us because of what you published, the content you gave us, or your breach of these terms or the law. If you are a consumer, this applies only as far as the law allows.",
        },
      ],
    },
    {
      id: "law",
      title: "Governing law and disputes",
      blocks: [
        {
          t: "p",
          text: "These terms are governed by the laws of {{jurisdiction}}, and its courts have jurisdiction, except that consumers keep the protection of mandatory laws in the country where they live. Please contact us first at {{email}} so we can try to settle a problem informally.",
        },
      ],
    },
    {
      id: "changes",
      title: "Changes to these terms",
      blocks: [
        {
          t: "p",
          text: "We may update these terms. For material changes we will give at least 30 days' notice by email or in the service. If you keep using the service after the change takes effect, you accept it. If you do not agree, you can cancel before then.",
        },
      ],
    },
    {
      id: "general",
      title: "General",
      blocks: [
        {
          t: "p",
          text: "These terms, with the Privacy Policy and Refund Policy, are the whole agreement between you and us about the service. If a part is found unenforceable, the rest stays in force. Not enforcing a term is not giving it up. You may not transfer your rights without our consent. We may give notices by email or in the service.",
        },
      ],
    },
    {
      id: "contact",
      title: "Contact",
      blocks: [{ t: "p", text: "{{entity}}, {{address}}. Email: {{email}}." }],
    },
  ],
};

/* ----------------------------------------------------------------------------
 * Privacy Policy
 * -------------------------------------------------------------------------- */
export const PRIVACY: LegalDocData = {
  slug: "privacy",
  title: "Privacy Policy",
  intro:
    "This policy explains what personal information {{product}} collects, why, who we share it with and what rights you have. {{entity}} is the controller of your information. It covers our website, the app and any API or agent (MCP) access.",
  summary: [
    "We collect what we need to run your account, take payment and write your scripts.",
    "We do not sell your information and we do not use your scripts to train our own models.",
    "To write a script we send your topic and brief to our research and AI providers.",
    "You can ask us to access, correct, export or delete your information at any time.",
  ],
  sections: [
    {
      id: "collect",
      title: "What we collect",
      blocks: [
        {
          t: "table",
          head: ["Category", "Examples", "Why"],
          rows: [
            ["Account", "Email, name if you give one, sign-in details", "Create and secure your account"],
            [
              "Billing",
              "Plan, payment status, card brand and last four digits, billing country, tax ID. Full card numbers go to our payment provider, not to us",
              "Take payment, tax, prevent fraud",
            ],
            [
              "Your content",
              "Topics, briefs, voice notes, links and documents you add, the research and fact lists we produce, your scripts",
              "Provide the service",
            ],
            ["Usage", "Runs, credit balance and history, features used, errors", "Operate, bill, support and improve the service"],
            [
              "Technical",
              "IP address, device and browser type, timestamps, approximate location from IP",
              "Security, abuse prevention, reliability",
            ],
            [
              "Agent and API",
              "Key names (never the full key after creation), tool calls with sizes and times",
              "Security, billing, support",
            ],
            ["Messages", "Support emails, early-access sign-up email, email preferences", "Reply to you, tell you about the service"],
          ],
        },
        {
          t: "p",
          text: "Please do not put sensitive personal information (such as health or government ID numbers) into a brief. We do not ask for it and do not need it.",
        },
      ],
    },
    {
      id: "use",
      title: "How we use it, and our legal bases",
      blocks: [
        {
          t: "table",
          head: ["Purpose", "Legal basis (EU and UK)"],
          rows: [
            ["Provide the service and your account, including research, writing and credits", "Contract"],
            ["Take payments, keep tax and accounting records", "Contract and legal obligation"],
            ["Keep the service secure, prevent fraud and abuse, fix errors", "Legitimate interests"],
            ["Understand overall usage and improve the product, using usage data and not your script text", "Legitimate interests"],
            ["Send service emails such as receipts, run finished and security notices", "Contract and legitimate interests"],
            ["Send news and offers", "Consent, and you can withdraw it at any time"],
            ["Meet legal duties and respond to lawful requests", "Legal obligation"],
          ],
        },
        {
          t: "p",
          text: "We do not make decisions about you that have legal or similarly significant effects by automated means.",
        },
      ],
    },
    {
      id: "ai",
      title: "AI and web research",
      blocks: [
        {
          t: "ul",
          items: [
            "**Research.** To research your topic we send the topic and the search queries we build from it to TinyFish, which reads public web pages and returns what it finds.",
            "**Writing.** To write your script we send your brief, the researched facts and our instructions to Anthropic's Claude models.",
            "**How providers handle it.** We use these providers through their business API services and not their consumer chat products. We do not allow them to use your content to train their models where their terms give us that control. Their own policies apply to what they receive.",
            "**Information about other people.** Public web pages can contain personal information about people. We process it only to produce the research you asked for, we do not build profiles of individuals, and you can ask us to remove information about you from stored research by emailing {{email}}.",
          ],
        },
      ],
    },
    {
      id: "sharing",
      title: "Who we share it with",
      blocks: [
        {
          t: "p",
          text: "We share information only with providers that help us run the service, under contracts that limit how they use it:",
        },
        {
          t: "table",
          head: ["Provider", "What they do", "What they receive"],
          rows: [
            ["Anthropic", "AI text generation", "Brief, research excerpts, script text"],
            ["TinyFish", "Web research and page fetching", "Topic, research queries, URLs"],
            ["Payment provider (Stripe)", "Payments and invoices", "Billing details, plan, amount"],
            ["Hosting and database providers", "Run the service and store data", "Everything stored in your account"],
            ["Email delivery provider", "Service emails", "Email address, name, message content"],
            ["Privacy-friendly analytics", "Measure usage", "Pseudonymous usage events, never script text"],
          ],
        },
        {
          t: "p",
          text: "We may also share information if the law requires it, to protect people and our rights, in a merger or sale of the business (with notice to you), or with your permission, for example when you share a script. We do not sell personal information and we do not share it for advertising. We keep this list current and update this page when it changes.",
        },
      ],
    },
    {
      id: "transfers",
      title: "International transfers",
      blocks: [
        {
          t: "p",
          text: "Our providers may process information in countries other than yours, including the United States. Where the law requires it, we rely on safeguards such as the European Commission's standard contractual clauses or an adequacy decision.",
        },
      ],
    },
    {
      id: "cookies",
      title: "Cookies and similar technology",
      blocks: [
        {
          t: "p",
          text: "We use essential cookies and local storage to keep you signed in and remember preferences, and basic analytics without cross-site tracking. We do not use advertising cookies. If we add anything non-essential, we will ask for consent where the law requires it. You can also block or delete cookies in your browser, but parts of the service may stop working.",
        },
      ],
    },
    {
      id: "retention",
      title: "How long we keep it",
      blocks: [
        {
          t: "table",
          head: ["Information", "How long"],
          rows: [
            ["Account details", "While your account is open, plus up to 30 days"],
            ["Research, fact lists and scripts", "Until you delete them or close your account"],
            ["Deleted content", "Removed from live systems within 30 days and from backups within 90 days"],
            ["Technical and security logs", "Up to 90 days"],
            ["Agent and API call records", "Up to 12 months"],
            ["Billing and tax records", "As long as tax and accounting law requires, commonly 6 to 7 years"],
            ["Early-access email", "Until you unsubscribe, or 12 months after launch"],
          ],
        },
      ],
    },
    {
      id: "security",
      title: "Security",
      blocks: [
        {
          t: "ul",
          items: [
            "Information is encrypted in transit, and our providers encrypt it at rest.",
            "API keys are stored hashed and shown to you once.",
            "Staff cannot read your scripts unless you ask for help or we are investigating abuse, and that access is logged. Staff accounts use multi-factor authentication.",
            "No system is perfectly secure. If you find a vulnerability, please tell us at {{email}}.",
          ],
        },
      ],
    },
    {
      id: "rights",
      title: "Your rights",
      blocks: [
        {
          t: "p",
          text: "Depending on where you live, you can ask us to access, correct, delete or export your information, restrict or object to some uses, and withdraw consent. Email {{email}} and we will answer within one month. We may need to confirm it is you.",
        },
        {
          t: "ul",
          items: [
            "**EU and UK.** You can complain to your data protection authority.",
            "**California.** You have the right to know, delete and correct your personal information and to opt out of its sale or sharing. We do not sell or share it as those terms are defined, and we will not treat you worse for using your rights. An authorized agent may make a request for you.",
            "**Marketing.** Use the unsubscribe link in any email, or write to us.",
          ],
        },
      ],
    },
    {
      id: "children",
      title: "Children",
      blocks: [
        {
          t: "p",
          text: "The service is not for people under 18. If we learn that we hold information from a child, we will delete it.",
        },
      ],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      blocks: [
        {
          t: "p",
          text: "We will update this page when our practices change and show the date at the top. For material changes we will also tell you by email or in the service.",
        },
      ],
    },
    {
      id: "contact",
      title: "Contact",
      blocks: [{ t: "p", text: "{{entity}}, {{address}}. Email: {{email}}." }],
    },
  ],
};

/* ----------------------------------------------------------------------------
 * Refund Policy
 * -------------------------------------------------------------------------- */
export const REFUNDS: LegalDocData = {
  slug: "refunds",
  title: "Refund Policy",
  intro:
    "We want you to pay only for scripts that work for you. This is how refunds and credit returns work at {{product}}.",
  summary: [
    "A run that fails gives your credits back automatically. You do not need to ask.",
    `Your first payment on a paid plan is refundable within ${REFUND.monthlyDays} days (${REFUND.yearlyDays} days for a yearly plan) if you have used ${REFUND.maxUsedPercent}% or less of its credits.`,
    `If a plan renews by accident, tell us within ${REFUND.renewalWindowHours} hours and we will refund it if you have not used it.`,
    "You can cancel at any time to stop future renewals.",
  ],
  sections: [
    {
      id: "failed",
      title: "Failed or broken scripts",
      blocks: [
        {
          t: "ul",
          items: [
            "If research or writing fails before a script finishes, the credits for that job return to your balance automatically, including credits for deep research runs.",
            "If a finished script is unusable because of a technical fault, such as missing sections or text cut off, email us within 14 days. We will regenerate it or restore the credits.",
            "A script that is complete but not to your taste is not a fault. You can regenerate a section, which uses credits.",
          ],
        },
      ],
    },
    {
      id: "guarantee",
      title: "Money-back guarantee for new subscribers",
      blocks: [
        {
          t: "p",
          text: `If this is your first payment on a paid plan and it is not right for you, email us within **${REFUND.monthlyDays} days** of the payment for a monthly plan, or within **${REFUND.yearlyDays} days** for a yearly plan, and we will refund that payment in full.`,
        },
        {
          t: "ul",
          items: [
            `You must have used ${REFUND.maxUsedPercent}% or less of the credits that payment gave you. Every script and deep research run costs us real money from AI and research providers, which is why there is a limit.`,
            "It applies to your first paid payment only. If you later upgrade, the upgrade is not covered again.",
            "The free trial costs nothing, so there is nothing to refund.",
          ],
        },
      ],
    },
    {
      id: "renewals",
      title: "Renewals",
      blocks: [
        {
          t: "ul",
          items: [
            `**Renewed by accident.** Email us within ${REFUND.renewalWindowHours} hours of a renewal. If you have not used credits from it, we will refund it in full.`,
            "**Reminders.** We email you before a yearly plan renews so you can cancel first.",
            "**Otherwise** renewal payments are not refundable. Cancel before the renewal date to avoid the next charge.",
          ],
        },
      ],
    },
    {
      id: "topups",
      title: "Credit top-ups",
      blocks: [
        {
          t: "p",
          text: `A top-up pack is refundable within ${REFUND.topUpDays} days of purchase if none of its credits have been used. Once any of a pack has been used, the rest is not refundable.`,
        },
      ],
    },
    {
      id: "not-refundable",
      title: "What is not refundable",
      blocks: [
        {
          t: "ul",
          items: [
            "Credits that have been used on finished scripts, apart from the cases above.",
            "Unused time left on a plan after you cancel, apart from the cases above. You keep access until the end of the period you paid for.",
            "Accounts closed for breaking the Terms of Service, apart from unused top-up credits, which we refund if we close your account without a breach on your side.",
          ],
        },
      ],
    },
    {
      id: "cancel",
      title: "Cancelling",
      blocks: [
        {
          t: "p",
          text: "Cancel any time in your account settings. Your plan stays active until the end of the period you paid for and then stops renewing. Cancelling on its own does not trigger a refund.",
        },
      ],
    },
    {
      id: "ask",
      title: "How to ask for a refund",
      blocks: [
        {
          t: "ul",
          items: [
            "Email {{email}} from the address on your account and tell us which payment you mean.",
            "We reply within 3 business days.",
            "Approved refunds go back to the original payment method, usually within 5 to 10 business days depending on your bank. Taxes paid on that payment are refunded with it.",
          ],
        },
        {
          t: "p",
          text: "Please contact us before disputing a payment with your bank. We resolve problems faster than a chargeback, and a dispute can freeze your account while it is open.",
        },
      ],
    },
    {
      id: "rights",
      title: "Your legal rights",
      blocks: [
        {
          t: "p",
          text: "Nothing in this policy limits rights you have under the consumer law where you live, for example any right to cancel or to a refund for goods or services that are faulty or not as described.",
        },
      ],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      blocks: [
        {
          t: "p",
          text: "If we change this policy, the version that applied when you paid applies to that payment. The date at the top shows the latest update.",
        },
      ],
    },
    {
      id: "contact",
      title: "Contact",
      blocks: [{ t: "p", text: "{{entity}}, {{address}}. Email: {{email}}." }],
    },
  ],
};
