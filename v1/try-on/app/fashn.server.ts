const FASHN_API_URL = "https://api.fashn.ai/v1/run";
const FASHN_STATUS_URL = "https://api.fashn.ai/v1/status";

export type FashnResponse = {
  id: string;
  status: "starting" | "processing" | "completed" | "failed" | "cancelled";
  output?: string[];
  error?: string;
};

/**
 * Runs the Virtual Try-On generation using Fashn.ai
 */
export async function runVton(
  personImageUrl: string,
  garmentImageUrl: string,
  category: "tops" | "bottoms" | "one-pieces" = "tops"
): Promise<string> {
  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) throw new Error("FASHN_API_KEY is not configured");

  console.log("[Fashn.ai] Submitting VTON request...");

  const response = await fetch(FASHN_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "fashn-v1.5",
      input: {
        person_image: personImageUrl,
        garment_image: garmentImageUrl,
        category: category,
        num_samples: 1,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fashn.ai API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as FashnResponse;
  const predictionId = data.id;

  if (!predictionId) throw new Error("No prediction ID returned from Fashn.ai");

  // Poll for status
  return pollForCompletion(predictionId);
}

async function pollForCompletion(predictionId: string): Promise<string> {
  const apiKey = process.env.FASHN_API_KEY;
  const maxRetries = 60; // 60 * 2s = 120s max
  let retries = 0;

  while (retries < maxRetries) {
    const response = await fetch(`${FASHN_STATUS_URL}/${predictionId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fashn.ai status error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as FashnResponse;

    if (data.status === "completed" && data.output && data.output.length > 0) {
      return data.output[0];
    }

    if (data.status === "failed") {
      throw new Error(`Fashn.ai generation failed: ${data.error || "Unknown error"}`);
    }

    if (data.status === "cancelled") {
      throw new Error("Fashn.ai generation was cancelled");
    }

    // Wait 2 seconds before next poll
    await new Promise((resolve) => setTimeout(resolve, 2000));
    retries++;
  }

  throw new Error("Fashn.ai generation timed out");
}
