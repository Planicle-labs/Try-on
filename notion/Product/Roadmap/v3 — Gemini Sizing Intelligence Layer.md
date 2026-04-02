# v3 — Gemini Sizing Intelligence Layer

**Timeframe: 2 weeksGoal: Add the sizing intelligence that differentiates you from every other VTON wrapper on the market**

This is where your product becomes defensible. Every competitor uses the same underlying VTON models. Your edge is that you help users understand whether a garment will actually fit before they try it on visually. The Gemini layer makes the try-on smarter, not just prettier.

### What to build

**Garment Data Ingestion (merchant-side):**
- A size chart input UI in the merchant admin panel: for each product, merchants can enter measurements per size (chest, waist, hip, length in cm/inches with toggle)
- An OCR upload option: merchant uploads a size chart image → your backend calls Google Vision API or Gemini Flash’s vision capability to extract measurements → merchant confirms/corrects
- Store structured measurements in Shopify product metafields (namespace: `vton`, key: `sizing_data`, type: JSON)
- A “sizing data completeness” indicator on the merchant dashboard: X of Y products have sizing data

**User Body Metrics Capture (consumer-side):**
- Before the photo upload, show a one-time “Your measurements” form: height, weight, chest, waist, hip
- Unit toggle (cm/inches, kg/lbs)
- Store in browser `localStorage` (not your server — this is a privacy boundary that matters) so the user only fills it once
- Add a “How to measure” tooltip with simple diagrams (SVG inline, no external image assets)

**Gemini Flash Fit Analysis:**
- After user submits measurements AND a size is highlighted in the storefront, call your backend
- Backend constructs a Gemini Flash prompt with:
- User measurements
- Garment measurements for each available size
- Garment type and fit category (if merchant has provided it)
- Prompt instructs Gemini to return structured JSON only:
`json   {     "recommended_size": "M",     "fit_analysis": {       "chest": "comfortable",       "waist": "tight",       "hips": "comfortable",       "length": "true to size"     },     "confidence": "high",     "notes": "This garment runs small in the waist. Size up if you're between sizes."   }`
- Validate the response with Zod before rendering anything
- Display a fit badge next to each size option: “Best fit”, “Slightly tight at waist”, “Loose fit”, “Too small”
- If Gemini returns low confidence or the garment has no sizing data, display nothing — fail silently rather than showing garbage

**Integration with VTON flow:**
- Once the recommended size is shown, pre-select it in the storefront size picker
- When the user proceeds to generate a try-on image, pass the recommended size as metadata to your generation record
- Post-generation, show a small overlay on the result: “Generated for size M — recommended for you”

### What you are NOT building in v1.5

- Body estimation from photos (that requires a separate ML model and months of work — not now)
- Fabric stretch coefficient analysis (too complex for this version)
- Multi-garment outfit combinations

### v1.5 success criteria

- [ ]  Gemini returning valid structured JSON for 9 out of 10 test calls (the 10th should fail gracefully)
- [ ]  At least 10 products on your beta merchant’s store have complete sizing data
- [ ]  The fit badge is displaying correctly on the storefront
- [ ]  User measurements are persisting in localStorage across sessions
- [ ]  The OCR size chart extraction works on at least 70% of typical Indian brand size chart images
- [ ]  You have tested the full flow: measurements → Gemini analysis → size recommendation → VTON generation

---

### 🔴 Reflection Period 1.5 — 1 week

**Answer before moving to v2:**

- **Accuracy:** On a 20-garment test set, does the recommendation match an expert baseline. What are the top failure modes (stretch, plus-size, slim fits)?
- **Language:** Do fit messages help, or increase anxiety and drop-off?
- **Engagement:** Measurement form completion rate. Merchant size-chart completion rate.
- **Impact:** Ask 3 real users: did the recommendation change the chosen size.
- **Positioning:** Which value prop wins in practice: visual try-on or sizing intelligence.

**Write down:** Test results summary, failure modes, and whether sizing is a moat or a distraction.