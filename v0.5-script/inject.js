/**
 * v0.5 — First Shopify Injection Script
 * 
 * Instructions:
 * 1. Go to your Shopify Store Admin -> Online Store -> Themes
 * 2. Click "..." on your active theme -> Edit Code
 * 3. Open `layout/theme.liquid`
 * 4. Paste this entire script BEFORE the closing `</body>` tag.
 * 
 * Note: Ensure the script is wrapped in <script> tags if pasting directly.
 */

(function () {
  // Prevent double injection
  if (window.__VTON_INJECTED) return;
  window.__VTON_INJECTED = true;

  // Only run on product pages
  const isProductPage =
    /\/products\/[^/]+/.test(window.location.pathname) ||
    window.ShopifyAnalytics?.meta?.page?.pageType === 'product';
  if (!isProductPage) return;

  // 1. Inject Styles
  const style = document.createElement("style");
  style.textContent = `
    .vton-floating-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: #000;
      color: #fff;
      border: none;
      padding: 12px 24px;
      border-radius: 99px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s, background 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .vton-floating-btn:hover {
      transform: translateY(-2px);
      background: #222;
    }


    .vton-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      z-index: 9999999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .vton-modal-overlay.vton-open {
      display: flex;
    }
    .vton-modal {
      background: #fff;
      border-radius: 16px;
      width: 100%;
      max-width: 400px;
      padding: 24px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      position: relative;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .vton-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: #f3f4f6;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6b7280;
    }
    .vton-title {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 16px 0;
      color: #111;
    }
    .vton-upload-area {
      border: 2px dashed #e5e7eb;
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      margin-bottom: 16px;
      position: relative;
      background: #fafafa;
    }
    .vton-upload-area:hover {
      border-color: #d1d5db;
      background: #f3f4f6;
    }
    .vton-preview {
      width: 100%;
      height: 250px;
      object-fit: cover;
      border-radius: 8px;
      display: none;
      margin-bottom: 16px;
      background: #eee;
    }
    .vton-submit {
      width: 100%;
      background: #000;
      color: #fff;
      border: none;
      padding: 14px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
    .vton-submit:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
    .vton-file-input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
      width: 100%;
    }
    .vton-error {
      color: #ef4444;
      font-size: 14px;
      margin-bottom: 12px;
      display: none;
      text-align: center;
    }
    .vton-loader {
      display: none;
      text-align: center;
      margin: 20px 0;
      color: #4b5563;
      font-size: 14px;
    }
    .vton-result-image {
      width: 100%;
      border-radius: 8px;
      display: none;
      margin-top: 16px;
    }
    /* Simple spinner */
    .vton-spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #000;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: vton-spin 1s linear infinite;
      margin: 0 auto 12px auto;
    }
    @keyframes vton-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  // 2. Inject UI Elements
  const floatingBtn = document.createElement("button");
  floatingBtn.className = "vton-floating-btn";
  floatingBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/></svg>
    Try it On
  `;
  document.body.appendChild(floatingBtn);

  const modalOverlay = document.createElement("div");
  modalOverlay.className = "vton-modal-overlay";
  modalOverlay.innerHTML = `
    <div class="vton-modal">
      <button class="vton-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <h2 class="vton-title">Virtual Try-On</h2>
      
      <div id="vton-upload-state">
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">See how this product looks on you.</p>
        
        <img id="vton-preview" class="vton-preview" src="" alt="Your photo" />
        
        <div class="vton-upload-area" id="vton-upload-box">
          <svg style="margin: 0 auto 8px auto; color: #9ca3af;" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <div style="font-weight: 500; color: #374151;">Upload your photo</div>
          <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">JPG, PNG (Full body works best)</div>
          <input type="file" class="vton-file-input" id="vton-file-input" accept="image/*" />
        </div>

        <div class="vton-error" id="vton-error"></div>
        <button class="vton-submit" id="vton-submit" disabled>Generate Try-On</button>
      </div>

      <div id="vton-loading-state" class="vton-loader">
        <div class="vton-spinner"></div>
        <div style="font-weight: 600; color: #111; margin-bottom: 4px;">Generating AI Try-On...</div>
        <div>This usually takes 15-30 seconds. Feel free to close this window; the result will appear here when ready.</div>
      </div>

      <div id="vton-result-state" style="display: none; text-align: center;">
        <img id="vton-result-image" class="vton-result-image" src="" alt="Try-On Result" style="display: block;" />
        <button class="vton-submit" style="margin-top: 16px; background: #fff; color: #000; border: 1px solid #e5e7eb;" onclick="document.getElementById('vton-result-state').style.display='none'; document.getElementById('vton-upload-state').style.display='block';">Try Another Photo</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalOverlay);

  // 3. Logic & State
  const fileInput = document.getElementById("vton-file-input");
  const previewImg = document.getElementById("vton-preview");
  const uploadBox = document.getElementById("vton-upload-box");
  const submitBtn = document.getElementById("vton-submit");
  const errorEl = document.getElementById("vton-error");
  
  const stateUpload = document.getElementById("vton-upload-state");
  const stateLoading = document.getElementById("vton-loading-state");
  const stateResult = document.getElementById("vton-result-state");
  const resultImg = document.getElementById("vton-result-image");

  let base64PersonImage = null;

  // Toggle Modal
  floatingBtn.addEventListener("click", () => modalOverlay.classList.add("vton-open"));
  modalOverlay.querySelector(".vton-close").addEventListener("click", () => modalOverlay.classList.remove("vton-open"));
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.remove("vton-open");
  });

  // Handle File Upload
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    errorEl.style.display = "none";
    
    const reader = new FileReader();
    reader.onload = (event) => {
      base64PersonImage = event.target.result;
      previewImg.src = base64PersonImage;
      previewImg.style.display = "block";
      uploadBox.style.display = "none";
      submitBtn.disabled = false;
    };
    reader.onerror = () => {
      showError("Failed to read file.");
    };
    reader.readAsDataURL(file);
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = "block";
    stateLoading.style.display = "none";
    stateUpload.style.display = "block";
  }

  // Helper to extract the garment image URL from the Shopify page
  function getShopifyProductImage() {
    // 1. Try ShopifyAnalytics (most reliable on modern themes)
    const analyticsImage = window.ShopifyAnalytics?.meta?.product?.variants?.[0]?.featured_image?.src 
                        || window.ShopifyAnalytics?.meta?.product?.featured_image;
    
    if (analyticsImage) {
        // Ensure it starts with https:
        return analyticsImage.startsWith('//') ? 'https:' + analyticsImage : analyticsImage;
    }

    // 2. Fallback to OpenGraph meta tag
    const ogImage = document.querySelector('meta[property="og:image"]')?.content;
    if (ogImage) {
        return ogImage.startsWith('http') ? ogImage : 'https:' + ogImage;
    }

    // 3. Throw if not found
    return null;
  }

  // Handle Submission
  submitBtn.addEventListener("click", async () => {
    if (!base64PersonImage) return;

    const garmentUrl = getShopifyProductImage();

    if (!garmentUrl) {
      showError("Could not automatically find the product image on this page.");
      return;
    }

    // Update UI State
    errorEl.style.display = "none";
    stateUpload.style.display = "none";
    stateLoading.style.display = "block";

    try {
      // NOTE: Replace this URL with your actual deployed Vercel backend URL
      const API_ENDPOINT = "https://try-on-xi.vercel.app/api/generate";

      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personImageBase64: base64PersonImage,
          // Passing the raw Shopify CDN URL as the garment image
          garmentImageBase64: garmentUrl, 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation request failed");
      }

      // Success
      resultImg.src = data.resultImageUrl;
      stateLoading.style.display = "none";
      stateResult.style.display = "block";

    } catch (err) {
      console.error("VTON Error:", err);
      showError(err.message || "Something went wrong.");
    }
  });

})();
