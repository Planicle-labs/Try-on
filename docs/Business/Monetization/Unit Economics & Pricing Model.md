# Unit Economics & Pricing Model

## Pricing objective

Pricing should make the app easy to trial for SMB merchants while preserving margin as generation volume grows. The market already supports tiered pricing in the roughly $20 to $300 per month range for Shopify-native try-on products.

## Recommended tier structure

| Tier | Indicative Price | Intended Merchant | Included Value |
| --- | --- | --- | --- |
| Starter | $19 to $29 | Early-stage brand testing adoption | Low monthly generation allowance, basic widget, basic reporting |
| Growth | $49 to $79 | Core SMB segment | Higher generation allowance, analytics, email capture, better support |
| Pro | $199 to $299 | Higher-volume brands | Larger generation pool, priority support, ROI dashboard, premium onboarding |

## Cost anchors from market research

- Fashn.ai standard cost sits around $0.075 per generation.
- fal.ai and Replicate can be cheaper for testing but less reliable for production consistency.
- Self-hosted CatVTON becomes compelling once volume is high enough to justify dedicated infrastructure.

## Margin logic

The near-term business should optimize for contribution margin, not for maximum feature breadth.

- Early versions can use hosted inference for speed and quality.
- Gross margin improves materially once volumes justify self-hosting or hybrid routing.
- Usage limits must be tied to realistic generation costs, not just competitor packaging.

## Suggested pricing logic by stage

### Stage 1: Hosted inference

- Use higher per-generation assumptions.
- Keep plan limits conservative.
- Reserve premium analytics and support for higher tiers.

### Stage 2: Hybrid routing

- Route supported categories to lower-cost infrastructure where quality is acceptable.
- Preserve premium provider usage for the highest-value flows.

### Stage 3: Self-hosted optimization

- Shift stable workloads to self-hosted models.
- Use proprietary routing and quality controls to protect output quality while improving margin.

## Merchant ROI framing

Pricing should stay visibly below the cost of the merchant problem.

- A single avoided return can offset a meaningful portion of a monthly subscription.
- A small conversion lift on a mid-volume fashion store can justify the app multiple times over.

This framing should appear in pricing communication, but measured carefully and conservatively.

## Monetization expansion

Over time, revenue should not depend only on generation volume.

- Higher-tier analytics.
- ROI dashboard and benchmarking.
- Merchant Studio content generation.
- Priority support and onboarding services.

## Pricing guardrails

- Do not add per-garment setup fees at launch.
- Do not underprice high-volume plans below infrastructure reality.
- Do not promise ROI numbers that cannot be defended with merchant-specific data.
