# VTON Shopify App — Evolutionary Build Roadmap

**Parent Studio: [ Planicle ]**

*A version-by-version build strategy from proof-of-concept to a scalable SaaS product*

---

> **How to read this document**
> 
> 
> This roadmap is structured as evolutionary versions, not phases. Each version is a shippable, learnable product — not just a milestone on the way to something else. Every version ends with a **Reflection Period**: a mandatory pause before you write the next line of code. The reflection is not optional. The decisions made in those windows shape everything that follows.
> 
> Versions are sequenced by risk reduction, not feature completeness. The fastest way to fail is to build the “full product” without first proving the riskiest assumptions. This roadmap is designed to kill bad ideas early and cheaply.
> 

---

## The Core Assumption Stack

Before any code is written, be explicit about what you are betting on. These assumptions, ordered from most to least critical:

1. **Shopify merchants will pay for a try-on tool** — not just install a free one
2. **VTON image quality from a third-party API is good enough** to actually reduce returns, not just look impressive in a demo
3. **Users on a product page will upload a photo of themselves** — this is a significant behavioural ask
4. **Sizing intelligence (the Gemini layer) adds enough value on top of raw VTON** to justify the complexity and cost
5. **Merchants can provide or you can infer structured garment sizing data** at an acceptable quality level

Each version in this roadmap is designed to test one or more of these assumptions with real evidence before betting the next month of your life on them.

---

## Version Map Overview

```
v0  ──────────────────  2 days    ──  Raw proof of concept. Does VTON work at all?
  └─ Reflection 0       1-2 days  ──  Is the output good enough to show a merchant?

v0.5 ────────────────── 3-4 days  ──  First real Shopify injection. Can it live on a store?
  └─ Reflection 0.5     2 days    ──  Would a merchant actually want this installed?

v1  ──────────────────  2-3 weeks ──  Installable app, billing, basic UX. First real merchant.
  └─ Reflection 1       1 week    ──  What did the first merchant break, ignore, or love?

v1.5 ────────────────── 2 weeks   ──  Gemini sizing layer added on top of working VTON.
  └─ Reflection 1.5     1 week    ──  Is sizing intelligence actually useful or just clever?

v2  ──────────────────  3 weeks   ──  Merchant dashboard, email capture, onboarding UX.
  └─ Reflection 2       1 week    ──  Can a merchant self-onboard? Does the dashboard justify $249/mo?

v2.5 ────────────────── 2 weeks   ──  Performance hardening, model quality audit, India-specific tuning.
  └─ Reflection 2.5     3-4 days  ──  Are we App Store ready?

v3  ──────────────────  2-3 weeks ──  App Store submission, public pricing, first 10 paying merchants.
```

**Total: approximately 16–18 weeks from first commit to public launch.**

## Permanent Principles — Apply at Every Version

These are not phase-specific. Read them before writing code in any version.

**Build in public, log in private.** Maintain a build journal from day 1. Log every decision, every mistake, every surprise. Not for anyone else — for yourself in 6 months when you can’t remember why you made a choice.

**Every feature starts as a question, not a solution.** Before building anything, write one sentence describing what user behaviour you expect to change as a result. If you can’t write that sentence, don’t build the feature.

**Your first 10 merchants are not customers, they are co-founders.** Treat every piece of feedback they give you as a product specification. Talk to them more than you think you need to.

**Latency is a product problem, not just a technical problem.** If your try-on takes 15 seconds, the loading state IS the product experience for 15 seconds. It needs to be designed, not just tolerated.

**Never attribute to features what is explained by your customer support.** If merchants are churning, don’t build new features — talk to the churned merchants and fix the reason they left.

**The App Store listing is a product.** It is the first thing every merchant sees. Invest proportionally in it.

**Pricing is a product decision.** Your pricing tier structure determines which merchants you attract, which features you build, and what success looks like. Revisit it every quarter.

**Protect your margins from day one.** API costs (VTON generation) are your COGS( Cost Of Goods Sold ). Track cost per generation, revenue per generation, and gross margin per plan tier every single month. Never let a pricing tier go margin-negative without a strategic reason.

---

## Appendix: Key Risk Register

| Risk                                                           | Likelihood | Impact   | Mitigation                                                                                                  |
| -------------------------------------------------------------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| VTON output quality insufficient for real purchasing decisions | Medium     | Critical | Test with 20 real outputs before v0.5. Find best model before building app infra.                           |
| Merchant garment data doesn’t exist at usable quality          | High       | High     | Build OCR ingestion in v1.5. Accept manual entry. Consider offering concierge setup for first 10 merchants. |
| User photo upload drop-off too high                            | Medium     | High     | Test multiple UX framings. Try “use your front camera” prompt. Consider avatar-based sizing as fallback.    |
| fal.ai / Fashn.ai API costs make pricing unworkable            | Medium     | Critical | Model unit economics before v1. Have a self-host migration path planned from v2 onward.                     |
| Shopify App Store rejection for biometric data handling        | Medium     | High     | Write Privacy Policy and Biometric Data Policy before v2.5. Implement consent flow in v1.                   |
| VTON model performance on Indian skin tones / garment styles   | High       | High     | Dedicated quality audit in v2.5. Add explicit disclaimers for garment types the model handles poorly.       |
| Competitor launches a similar product mid-build                | Low        | Medium   | Speed is your advantage. v0 and v0.5 are days, not weeks. Be live before anyone knows you’re building.      |
| Single beta merchant provides misleading positive feedback     | Medium     | Medium   | Get 3+ independent merchants in v1 beta. Cross-reference feedback. Watch behaviour, not just words.         |

---

## Quick Links

*Last updated: March 2026. Revisit this document at the start of every new version.*

[v0 — Raw Proof of Concept](https://www.notion.so/v0-Raw-Proof-of-Concept-325920dff81a80b48e7bc9e5134d336d?pvs=21)

[v0 5 — First Shopify Injection](https://www.notion.so/v0-5-First-Shopify-Injection-325920dff81a8058b739d26cc24ad272?pvs=21)

[v1 — Real Shopify App, First Merchant](https://www.notion.so/v1-Real-Shopify-App-First-Merchant-325920dff81a8030a5f5f1b93bb5b2b8?pvs=21)

[v2 — Merchant Tools, Dashboard, Onboarding](https://www.notion.so/v2-Merchant-Tools-Dashboard-Onboarding-325920dff81a8084ab71e5e32f420ca6?pvs=21)

[v2 5 — Hardening, Quality Audit](https://www.notion.so/v2-5-Hardening-Quality-Audit-325920dff81a8089aff3d10e641716ed?pvs=21)

[v3 — Gemini Sizing Intelligence Layer](https://www.notion.so/v3-Gemini-Sizing-Intelligence-Layer-325920dff81a80aa9078e639128ffd11?pvs=21)

[v4 — App Store Launch, Public Pricing](https://www.notion.so/v4-App-Store-Launch-Public-Pricing-325920dff81a809e91eec7184b23c232?pvs=21)

---