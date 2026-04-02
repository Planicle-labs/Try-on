/**
 * Try-On Widget Javascript
 * Handles file validation, modal interaction, and API mock (Phase 4).
 */

document.addEventListener('DOMContentLoaded', () => {
    // Select elements
    const container = document.querySelector('.try-on-widget-container');
    if (!container) return; // Not on a product page or block not included
  
    const openBtn = document.getElementById('open-try-on-modal');
    const closeBtn = document.getElementById('close-try-on-modal');
    const modal = document.getElementById('try-on-modal');
    
    // Views
    const uploadView = document.getElementById('try-on-upload-view');
    const loadingView = document.getElementById('try-on-loading-view');
    const resultView = document.getElementById('try-on-result-view');
  
    // Upload elements
    const dropzone = document.getElementById('try-on-dropzone');
    const fileInput = document.getElementById('try-on-file-input');
    const errorMsg = document.getElementById('try-on-error-msg');
  
    // Result elements
    const originalImg = document.getElementById('try-on-original-image');
    const generatedImg = document.getElementById('try-on-generated-image');
    const toggleBtn = document.getElementById('try-on-toggle-btn');
    const retryBtn = document.getElementById('try-on-retry-btn');
    
    // Product data (passed from Liquid)
    const productId = container.dataset.productId;
    const productImage = container.dataset.productImage;
  
    // Context State
    let state = {
      isOriginalView: false,
      userImageFile: null,
      generatedUrl: ''
    };
  
    // ===============
    // Modal Execution
    // ===============
    const openModal = () => {
      resetViews();
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    };
  
    const closeModal = () => {
      modal.classList.add('hidden');
      document.body.style.overflow = 'auto'; // Restore scrolling
    };
  
    const resetViews = () => {
      uploadView.classList.remove('hidden');
      loadingView.classList.add('hidden');
      resultView.classList.add('hidden');
      errorMsg.classList.add('hidden');
      errorMsg.textContent = '';
      fileInput.value = '';
      state.userImageFile = null;
    };
  
    const showError = (msg) => {
      errorMsg.textContent = msg;
      errorMsg.classList.remove('hidden');
    };
  
    // ===============
    // File Validation
    // ===============
    const MAX_SIZE_MB = 4;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
  
    const handleFile = (file) => {
      errorMsg.classList.add('hidden');
  
      if (!file) return;
  
      if (!ALLOWED_TYPES.includes(file.type)) {
        showError('Please upload a valid JPG or PNG image.');
        return;
      }
  
      if (file.size > MAX_SIZE_BYTES) {
        showError(`File is too large. Maximum size is ${MAX_SIZE_MB}MB.`);
        return;
      }
  
      // File passes validation, start generation flow
      state.userImageFile = file;
      startTryOnGeneration();
    };
  
    // ===============
    // Generation Logic
    // ===============
    const startTryOnGeneration = async () => {
      uploadView.classList.add('hidden');
      loadingView.classList.remove('hidden');
  
      // Phase 4: Mock the API Request.
      // In Phase 5, we will hit /apps/try-on/generate
      try {
        await new Promise(resolve => setTimeout(resolve, 3500)); // Mock network latency
        
        // Mock successful result
        // TODO: Replace with real API fetch later
        const mockResultUrl = productImage; // Mocking with product image for now
        showResult(mockResultUrl);
      } catch (err) {
        loadingView.classList.add('hidden');
        uploadView.classList.remove('hidden');
        showError('Generation failed. Please try again.');
        console.error("VTON Proxy Error:", err);
      }
    };
  
    const showResult = (resultUrl) => {
      loadingView.classList.add('hidden');
      resultView.classList.remove('hidden');
      
      const userImageUrl = URL.createObjectURL(state.userImageFile);
      
      originalImg.src = userImageUrl;
      generatedImg.src = resultUrl;
      state.generatedUrl = resultUrl;
      
      state.isOriginalView = false;
      originalImg.classList.add('hidden');
      generatedImg.classList.remove('hidden');
      toggleBtn.textContent = 'Show Original';
    };
  
    // ===============
    // Event Listeners
    // ===============
    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  
    // Drag and drop mechanics
    dropzone.addEventListener('click', () => fileInput.click());
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, preventDefaults, false);
    });
  
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
  
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
    });
  
    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
    });
  
    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) handleFile(files[0]);
    });
  
    // File input selection
    fileInput.addEventListener('change', function() {
      if (this.files && this.files.length > 0) {
        handleFile(this.files[0]);
      }
    });
  
    // Before/After Toggle
    toggleBtn.addEventListener('click', () => {
      state.isOriginalView = !state.isOriginalView;
      if (state.isOriginalView) {
        originalImg.classList.remove('hidden');
        generatedImg.classList.add('hidden');
        toggleBtn.textContent = 'Show Try-On';
      } else {
        originalImg.classList.add('hidden');
        generatedImg.classList.remove('hidden');
        toggleBtn.textContent = 'Show Original';
      }
    });
  
    // Retry
    retryBtn.addEventListener('click', resetViews);
});
