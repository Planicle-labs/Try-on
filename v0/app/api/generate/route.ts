import { NextResponse } from "next/server";

const FASHN_API_URL = "https://api.fashn.ai/v1/run";
const FASHN_STATUS_URL = "https://api.fashn.ai/v1/status";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60; // 2 minutes max

// CORS headers — tighten Access-Control-Allow-Origin to your Shopify domain later
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Helper: JSON response with CORS headers baked in */
function jsonResponse(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

/** Handle CORS preflight */
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.FASHN_API_KEY;

    if (!apiKey || apiKey === "your_fashn_api_key_here") {
      return jsonResponse(
        { error: "FASHN_API_KEY is not configured. Add it to .env.local" },
        500
      );
    }

    const body = await request.json();
    const { personImageBase64, garmentImageBase64 } = body;

    if (!personImageBase64 || !garmentImageBase64) {
      return jsonResponse(
        { error: "Both person image and garment image are required." },
        400
      );
    }

    // Step 1: Submit the try-on request
    console.log("[VTON] Submitting try-on request to Fashn.ai...");
    const startTime = Date.now();

    const runResponse = await fetch(FASHN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model_name: "tryon-v1.6",
        inputs: {
          model_image: personImageBase64,
          garment_image: garmentImageBase64,
          category: "auto",
          mode: "quality",
          garment_photo_type: "auto",
          num_samples: 1,
        },
      }),
    });

    if (!runResponse.ok) {
      const errText = await runResponse.text();
      console.error("[VTON] Fashn.ai /run error:", runResponse.status, errText);
      return jsonResponse(
        { error: `Fashn.ai API error: ${runResponse.status} — ${errText}` },
        502
      );
    }

    const runData = await runResponse.json();
    const predictionId = runData.id;

    if (!predictionId) {
      console.error("[VTON] No prediction ID returned:", runData);
      return jsonResponse(
        { error: "No prediction ID returned from Fashn.ai" },
        502
      );
    }

    console.log(`[VTON] Prediction ID: ${predictionId}`);

    // Step 2: Poll for completion
    let creditsUsed: string | null = null;

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const statusResponse = await fetch(`${FASHN_STATUS_URL}/${predictionId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!statusResponse.ok) {
        console.error("[VTON] Status poll error:", statusResponse.status);
        continue;
      }

      // Capture credits used from headers
      const headerCredits = statusResponse.headers.get("x-fashn-credits-used");
      if (headerCredits) {
        creditsUsed = headerCredits;
      }

      const statusData = await statusResponse.json();
      console.log(`[VTON] Status: ${statusData.status} (attempt ${attempt + 1})`);

      if (statusData.status === "completed") {
        const elapsedMs = Date.now() - startTime;
        const outputUrl = statusData.output?.[0];

        if (!outputUrl) {
          return jsonResponse(
            { error: "Prediction completed but no output image URL returned." },
            502
          );
        }

        // Log cost
        console.log(`[VTON] ✅ Completed in ${(elapsedMs / 1000).toFixed(1)}s`);
        console.log(`[VTON Cost] Credits used: ${creditsUsed ?? "unknown"}`);
        console.log(`[VTON] Output URL: ${outputUrl}`);

        return jsonResponse({
          resultImageUrl: outputUrl,
          creditsUsed: creditsUsed ?? "unknown",
          elapsedSeconds: +(elapsedMs / 1000).toFixed(1),
        });
      }

      if (statusData.status === "failed") {
        const errorMsg =
          statusData.error?.message ?? "Unknown error during generation";
        console.error(`[VTON] ❌ Failed: ${errorMsg}`);
        return jsonResponse(
          { error: `Generation failed: ${errorMsg}` },
          502
        );
      }

      // Otherwise keep polling (starting, in_queue, processing)
    }

    // Timeout
    console.error("[VTON] ⏳ Timed out after polling");
    return jsonResponse(
      { error: "Generation timed out. Try again." },
      504
    );
  } catch (err) {
    console.error("[VTON] Unexpected error:", err);
    return jsonResponse(
      { error: `Internal server error: ${(err as Error).message}` },
      500
    );
  }
}
