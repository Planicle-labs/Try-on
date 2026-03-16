## 1. Purpose

Build a bare-bones, localhost-only VTON (Virtual Try-On) tool to answer a single question:

> **Does the VTON pipeline produce output good enough to build a product on?**

This is not a product. It is not a Shopify app. It is a validation artifact — a single-page application running locally that lets you upload a photo and a garment image and returns a try-on result.

## 3. Goals

- Validate that the chosen VTON model (fal.ai nanobanana / Kling / Fashn.ai) produces output of acceptable quality.
- Establish baseline cost per generation.
- Identify failure modes early — before any Shopify infrastructure is built.
- Complete within 2 days. If it takes longer, something is wrong.

---

## 4. Non-Goals (explicitly out of scope for v0)

- Shopify integration of any kind
- User accounts or authentication
- Consent or privacy flows
- Sizing logic or Gemini intelligence layer
- UI styling or polished UX
- Deployment — this must only run on localhost
- Any database or persistent storage
- Any billing logic

---

## 5. User Stories

For v0, the only "user" is the developer running evaluations.

| ID | Story |
|----|-------|
| U1 | As the developer, I can upload a photo of a person and a garment image so that I can trigger a VTON generation. |
| U2 | As the developer, I can see the generated try-on result image in the browser so that I can evaluate output quality. |
| U3 | As the developer, I can see the API call cost logged to the console so that I can track cost per generation. |

---

## 6. Functional Requirements

### 6.1 Core UI (minimal)
- Two file inputs:
  - Input 1: User/person photo (JPG/PNG)
  - Input 2: Garment image (JPG/PNG)
- One submit button: "Generate Try-On"
- One output area: display the returned image

### 6.2 API Integration
- Call the fal.ai client SDK (nanobanana or Kling model) OR Fashn.ai API
- API key stored in `.env.local` — hardcoded is acceptable for v0
- Handle basic error states (API failure, timeout) with a visible error message

### 6.3 Cost Logger
- After every generation, `console.log` the cost of the API call
- Format: `[VTON Cost] $X.XXXX per generation`

---

## 7. Technical Specification

### 7.1 Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| VTON API | fal.ai client SDK OR Fashn.ai |
| Styling | None — raw HTML or bare Tailwind defaults only |
| Infrastructure | localhost only (`npm run dev`) |
| Cost control | fal.ai free tier or $10 credit top-up / Fashn.ai dev plan |

### 7.2 Project Structure

```
/app
  /page.tsx           ← single page: file inputs + button + output
  /api/generate/      ← API route: calls fal.ai or Fashn.ai
    /route.ts
/.env.local           ← FAL_KEY or FASHN_API_KEY
```

### 7.3 API Route (`/api/generate/route.ts`)

**Input (POST body):**
```json
{
  "personImageBase64": "...",
  "garmentImageBase64": "..."
}
```

**Output:**
```json
{
  "resultImageUrl": "https://...",
  "costUSD": 0.0034
}
```

**Logic:**
1. Receive base64 images from client
2. Call fal.ai / Fashn.ai with person + garment images
3. Return output image URL and estimated cost
4. Log cost to server console

### 7.4 Environment Variables

```
FAL_KEY=your_fal_api_key_here
# OR
FASHN_API_KEY=your_fashn_api_key_here
```

---