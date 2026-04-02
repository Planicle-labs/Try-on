# v0 — Raw Proof of Concept

**Timeframe: 2 days maximumGoal: Answer one question — does the VTON pipeline produce output that is good enough to build a product on?**

This is not a Shopify app. This is not a product. This is a single HTML file or a Next.js page running locally that lets you upload a photo and a garment image and returns a try-on result. Nothing more.

### What to build

- [x]  A single-page app (Next.js, plain HTML, whatever you're fastest in) with:
    - [x]  Two file inputs: user photo + garment image
    - [x]  A button that calls the [fal.ai](http://fal.ai) API (nanobanana or Kling or [Fashn.ai](http://Fashn.ai) model)
    - [x]  An output image display
    - [x]  No authentication, no database, no Shopify, no styling
- [x]  The [fal.ai](http://fal.ai) API key hardcoded in the environment (`.env.local`) — this is fine for day 1
- [x]  A simple cost logger: print the API call cost to the console for every generation

### What you are NOT building in v0

- Any Shopify integration
- Any user accounts
- Any consent flow
- Any sizing logic
- Any UI beyond the bare minimum to trigger and display the generation
- Any deployment — this runs on localhost only

### How to evaluate v0

Run 20 test generations minimum before calling v0 done. Use:
- 5 different user body types (varied height, weight, build)
- 4 different garment categories (fitted top, loose top, trousers, dress)
- At least 3 images that represent typical Indian D2C product photography (plain background, model shot, flat lay)

Score each output honestly on three axes:
1. **Texture fidelity** — does the fabric look like the original garment?
2. **Fit plausibility** — does the garment look like it’s actually on the person, not pasted?
3. **Body preservation** — does the person’s face, skin tone, and body shape survive the generation?

If the average score across these is below 6/10, stop. You have a model quality problem, not a product problem. Test alternative models (try CatVTON via Replicate, try Fashn.ai free tier) before continuing.

### Tech stack for v0

```
Framework    : Next.js 14 (App Router)
API          : fal.ai client SDK/ fashn.ai
Styling      : Nothing — raw HTML or Tailwind defaults
Infra        : localhost only
Cost control : fal.ai free tier or $10 credit top-up/ fashn.ai dev plan
```

### v0 success criteria

- [x]  Pipeline runs end-to-end without errors
- [x]  Output quality scores averaged and documented honestly
- [x]  API cost per generation calculated and noted
- [x]  At least one output you would feel confident showing to a stranger

---

### 🔴 Reflection Period 0 — 1 to 2 days

**Answer before moving to v0.5:**

- **Quality:** Would you trust the *average* output to influence a real purchase? What are the top 3 failure modes (garment type, body type, lighting)?
- **South Asia fit:** Any consistent skin tone shifts or ethnic-wear failures (kurtas/dupattas/drapes)? If yes, write the launch exclusions now.
- **Unit economics:** Cost per generation. Break-even generations for $49/$149/$249 plans. Worst-case month: `100 users × 2 gens × cost × 30`.
- **Model choice:** Which model/provider wins on quality *and* cost. What is your fallback option?

**Decision gate:** Do not proceed if (a) average quality is below threshold or (b) pricing goes margin-negative on realistic usage.

**Log (one page):** Best 3 + worst 3 outputs, cost math table, and your go/no-go verdict.