import { type ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { merchant as merchantTable, generation as generationTable } from "../db/schema";
import { eq, and, gte } from "drizzle-orm";
import { uploadImage } from "../r2.server";
import { runVton } from "../fashn.server";
import { createId } from "@paralleldrive/cuid2";

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Identify Merchant
  const merchant = await db.query.merchant.findFirst({
    where: eq(merchantTable.shopDomain, shop),
  });

  if (!merchant) {
    return Response.json({ error: "Merchant not found" }, { status: 404 });
  }

  // 2. Check Quota (50 free/month for free plan)
  if (merchant.plan === "free") {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const usageCount = await db
      .select()
      .from(generationTable)
      .where(
        and(
          eq(generationTable.merchantId, merchant.id),
          gte(generationTable.createdAt, firstOfMonth)
        )
      );

    if (usageCount.length >= 50) {
      return Response.json(
        { error: "Monthly free quota reached (50/50). Please upgrade." },
        { status: 403 }
      );
    }
  }

  // 3. Process Upload
  const formData = await request.formData();
  const userImage = formData.get("userImage") as File;
  const productImage = formData.get("productImage") as string;
  const productId = formData.get("productId") as string;

  if (!userImage || !productImage) {
    return Response.json({ error: "Missing images" }, { status: 400 });
  }

  try {
    const generationId = createId();
    
    // 4. Upload User Image to R2
    const userImageBuffer = await userImage.arrayBuffer();
    const userImageFilename = `uploads/${merchant.id}/${generationId}_input.jpg`;
    const userImageUrl = await uploadImage(
      userImageBuffer,
      userImageFilename,
      userImage.type || "image/jpeg"
    );

    // 5. Call Fashn.ai
    const fashnResultUrl = await runVton(userImageUrl, productImage);

    // 6. Download Fashn.ai result and store in R2
    const resultResponse = await fetch(fashnResultUrl);
    if (!resultResponse.ok) throw new Error("Failed to download Fashn.ai result");
    
    const resultBuffer = await resultResponse.arrayBuffer();
    const resultFilename = `results/${merchant.id}/${generationId}_output.png`;
    const finalResultUrl = await uploadImage(
      resultBuffer,
      resultFilename,
      "image/png"
    );

    // 7. Record Generation
    await db.insert(generationTable).values({
      id: generationId,
      merchantId: merchant.id,
      productId: productId,
      inputImageUrl: userImageUrl,
      resultImageUrl: finalResultUrl,
      costUSD: 0.075, // Fashn.ai approx cost
      status: "completed",
    });

    return Response.json({ resultUrl: finalResultUrl });
  } catch (error: any) {
    console.error("[VTON Error]", error);
    return Response.json(
      { error: error.message || "Generation failed" },
      { status: 500 }
    );
  }
};
