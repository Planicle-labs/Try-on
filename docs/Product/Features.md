# Product Features Checklist

This document tracks the implemented and planned features for the Final Product. The checklist is organized by logical product areas and feature sets.

## Core Platform & Infrastructure
- [x] Integrate fal.ai / fashn.ai APIs for VTON generation
- [x] Scaffold app with Remix and Shopify CLI
- [x] Database setup with Prisma and NeonDB PostgreSQL
- [x] Handle OAuth session management
- [ ] App proxy / API route setup for storefront-backend communication
- [ ] Connect Cloudflare R2 for image storage 

## Storefront Try-On Experience
- [x] Theme App Extension (App Block layout) for the "Try-On" button
- [x] Autoload garment image using `window.ShopifyAnalytics.meta.product`
- [x] Try-On widget modal, photo upload logic, and result display
- [ ] Client-side photo validation (format, size max 4MB, dimension checking)
- [ ] Loading state with progress indication
- [ ] Result display featuring a before/after toggle
- [ ] Error handling with human-readable messages
- [ ] Image compression before upload
- [ ] Quota display on storefront ("You have X free generations remaining")
- [ ] End-user consent checkbox within the photo upload flow
- [ ] Email capture integration (Opt-in inside the widget, syncs to merchant's Klaviyo/Resend)

## Gemini Sizing Intelligence
- [ ] Merchant Garment Data Ingestion (UI for measurements entry / size charts)
- [ ] OCR upload for automatic size chart extraction via Vision API / Gemini Flash
- [ ] Metafield synchronization (`vton.sizing_data`)
- [ ] User Body Metrics Capture form (Height, weight, body measurements w/ localStorage limitations)
- [ ] Gemini Flash Fit Analysis prompt engineering and execution
- [ ] Provide intelligent fit recommendations using Gemini JSON outputs (Fit badges, notes)
- [ ] Pre-populate sizing selector automatically based on Gemini's "Best Fit" 
- [ ] Generation overlay highlighting the generated image uses recommended size

## Merchant Admin & Analytics
- [ ] Step-by-step merchant onboarding wizard (App block check, Size configurations, Live preview, Plan choice)
- [ ] App initialization dashboard (status, plan, usage, install guide)
- [ ] Global enable/disable toggle parameter in settings
- [ ] Tiered feature gating enforcement (Free, Starter, Growth, Pro capabilities)
- [ ] ROI Analytics Dashboard using Web Pixels API (Conversion comparison, estimated return rate offset, generation usage)
- [ ] Merchant Studio (Pro only feature to generate marketing images leveraging stock models)

## Billing & Subscriptions
- [ ] Shopify Billing API integration (Free vs $49/mo Pro plan setup)
- [ ] Usage-based pricing overage handling ($0.15/gen penalty lines)
- [ ] 7-day free trial limits and tracking
- [ ] Billing status validation intercept on each generation dispatch

## Performance, Quality & Security
- [ ] Generation cost tracking and logging
- [ ] Output quality evaluations documented (Texture fidelity, Fit plausibility, Body preservation)
- [ ] Handle webhooks correctly (`app/uninstalled`, `orders/create`)
- [ ] Implement GDPR/compliance webhooks (`customers/data_request`, `customers/redact`, `shop/redact`) 
- [ ] Load testing generation pipeline (Handling 100 concurrent sessions gracefully)
- [ ] Generation queueing system (Redis/Upstash) to buffer upstream API rate limits
- [ ] Image optimization (Server-side compression before client serving, target < 300KB)
- [ ] India-specific model quality audit (Skin tones, ethnic styles, structured error categorization)
- [ ] Edge cases coverage mapping (Timeout fallbacks, degraded fal.ai state, uninstall sweeps, billing failures)
- [ ] Security hardening (Session token validation, ID enumeration guard, generation rate-limiting)
- [ ] Compliance policy integration (Privacy Policy, Biometric Data Policy, Terms of Service logic implementation)

## Support & App Store Launch
- [ ] Public App Store Listing deployment with polished creatives
- [ ] Crisp/Intercom support setup within Admin dashboard
- [ ] Documentation scaffolding (Help center, FAQ, Photography best practices for merchants)
- [ ] Implementation of public health dashboard / Service outage status page
- [ ] Growth metrics infrastructure hooks (Net installs, time-to-first-generation, trial conversion tracking)
