/**
 * Try-On Widget Javascript
 * Handles file validation, modal interaction, and API mock (Phase 4).
 */

document.addEventListener('DOMContentLoaded', () => {
    // Select elements
    const wrapper = document.getElementById('try-on-widget-wrapper');
    const container = document.querySelector('.try-on-widget-container');
    const button = container?.querySelector('.try-on-button');
    
    if (wrapper) {
      const urlParams = new URLSearchParams(window.location.search);
      const isPreview = urlParams.get('try_on_preview') === '1';
      const isDesignMode = wrapper.dataset.designMode === 'true';
      const configUrl = wrapper.dataset.configUrl;
      
      console.log('[Try-On Widget] Config:', {
        configUrl,
        isDesignMode,
        isPreview
      });

      const toCssColor = ({ hue = 120, saturation = 1, brightness = 1 } = {}) => {
        const h = (((hue % 360) + 360) % 360) / 60;
        const s = Math.max(0, Math.min(1, saturation));
        const v = Math.max(0, Math.min(1, brightness));
        const c = v * s;
        const x = c * (1 - Math.abs((h % 2) - 1));
        const m = v - c;

        let red = 0;
        let green = 0;
        let blue = 0;

        if (h < 1) {
          red = c; green = x;
        } else if (h < 2) {
          red = x; green = c;
        } else if (h < 3) {
          green = c; blue = x;
        } else if (h < 4) {
          green = x; blue = c;
        } else if (h < 5) {
          red = x; blue = c;
        } else {
          red = c; blue = x;
        }

        const channel = (value) => Math.round((value + m) * 255).toString(16).padStart(2, '0');
        return `#${channel(red)}${channel(green)}${channel(blue)}`;
      };

      const normalizeContentType = (value) => {
        if (value === 'image' || value === 'emoji' || value === 'text') {
          return value;
        }

        return 'text';
      };

      const normalizeIcon = (value) => {
        const trimmed = String(value || '').trim();
        return trimmed || 'none';
      };

      const normalizeIconPosition = (value) => {
        if (value === 'before' || value === 'after' || value === 'none') {
          return value;
        }

        return 'none';
      };

      const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

      const getButtonMetrics = (size, radius, iconOnly) => {
        const normalizedSize = clamp(size, 0, 100);
        const scale = normalizedSize / 100;
        const fontSize = Math.round(14 + scale * 8);
        const paddingY = Math.round(10 + scale * 6);
        const paddingX = Math.round(14 + scale * 14);
        const iconOnlySize = Math.round(34 + scale * 28);
        const height = iconOnly ? iconOnlySize : Math.max(fontSize + paddingY * 2, 40);
        const borderRadius = Math.round((height / 2) * (clamp(radius, 0, 100) / 100));

        return {
          fontSize,
          paddingY,
          paddingX,
          iconOnlySize,
          height,
          borderRadius,
        };
      };

      const resolveButtonRenderMode = (buttonContentType, buttonRadius, buttonSize, buttonIcon) => {
        const iconOnly = buttonContentType !== 'text';
        const effectiveContentType = buttonContentType;
        const metrics = getButtonMetrics(buttonSize, buttonRadius, iconOnly);
        return {
          iconOnly,
          effectiveContentType,
          metrics,
          buttonIcon,
        };
      };

      const applyWidgetConfig = (config = {}) => {
        const isEnabled = Boolean(config.isEnabled);
        const position = config.position || 'bottom-right';
        const hue = Number.parseInt(String(config.hue ?? 120), 10);
        const saturation = Number.parseFloat(String(config.saturation ?? 1));
        const brightness = Number.parseFloat(String(config.brightness ?? 1));
        const buttonContentType = normalizeContentType(config.buttonContentType);
        const buttonText = config.buttonText || 'Try It On';
        const buttonEmoji = config.buttonEmoji || '👀';
        const buttonImageUrl = config.buttonImageUrl || '';
        const buttonIcon = normalizeIcon(config.buttonIcon);
        const buttonIconPosition = buttonIcon === 'none'
          ? 'none'
          : normalizeIconPosition(config.buttonIconPosition) === 'none'
            ? 'after'
            : normalizeIconPosition(config.buttonIconPosition);
        const buttonSize = clamp(
          Number.isFinite(Number(config.buttonSize)) ? Number(config.buttonSize) : 56,
          0,
          100
        );
        const buttonRadius = clamp(
          Number.isFinite(Number(config.buttonRadius)) ? Number(config.buttonRadius) : 12,
          0,
          100
        );
        const buttonTextColor = config.buttonTextColor || '#FFFFFF';
        const { iconOnly, effectiveContentType, metrics } = resolveButtonRenderMode(
          buttonContentType,
          buttonRadius,
          buttonSize,
          buttonIcon
        );

        if (!isEnabled && !isPreview && !isDesignMode) {
          wrapper.style.display = 'none';
          return;
        }

        wrapper.style.display = 'block';

        if (container) {
          container.classList.remove('tryon-pos-bottom-right', 'tryon-pos-bottom-left', 'tryon-pos-middle-left');
          container.classList.add(`tryon-pos-${position}`);
          if (button) {
            button.style.backgroundColor = toCssColor({
              hue: Number.isFinite(hue) ? hue : 120,
              saturation: Number.isFinite(saturation) ? saturation : 1,
              brightness: Number.isFinite(brightness) ? brightness : 1,
            });
            button.style.color = buttonContentType === 'text' ? buttonTextColor : 'inherit';
            button.style.borderRadius = `${metrics.borderRadius}px`;
            button.style.padding = iconOnly ? '0' : `${metrics.paddingY}px ${metrics.paddingX}px`;
            button.style.minWidth = iconOnly ? `${metrics.iconOnlySize}px` : 'fit-content';
            button.style.width = iconOnly ? `${metrics.iconOnlySize}px` : 'auto';
            button.style.height = iconOnly ? `${metrics.iconOnlySize}px` : 'auto';
            button.style.overflow = 'hidden';
            button.style.fontSize = `${metrics.fontSize}px`;
            button.style.lineHeight = '1';
            button.innerHTML = '';

            if (effectiveContentType === 'image' && buttonImageUrl) {
              const img = document.createElement('img');
              img.src = buttonImageUrl;
              img.alt = buttonText || 'Button icon';
              img.width = 22;
              img.height = 22;
              img.style.width = '22px';
              img.style.height = '22px';
              img.style.objectFit = 'cover';
              img.style.borderRadius = '9999px';
              button.appendChild(img);
            } else if (effectiveContentType === 'image') {
              const icon = document.createElement('span');
              icon.className = 'try-on-button-content';
              icon.textContent = buttonEmoji || '👀';
              button.appendChild(icon);
            } else {
              const content = document.createElement('span');
              content.className = 'try-on-button-content';
              content.style.display = 'inline-flex';
              content.style.alignItems = 'center';
              content.style.gap = buttonContentType === 'text' && buttonIcon !== 'none' && buttonIconPosition !== 'none' ? '6px' : '0';

              if (buttonContentType === 'text' && buttonIcon !== 'none' && buttonIconPosition === 'before') {
                const icon = document.createElement('span');
                icon.textContent = buttonIcon;
                content.appendChild(icon);
              }

              const label = document.createElement('span');
              label.textContent = buttonText;
              content.appendChild(label);

              if (buttonContentType === 'text' && buttonIcon !== 'none' && buttonIconPosition === 'after') {
                const icon = document.createElement('span');
                icon.textContent = buttonIcon;
                content.appendChild(icon);
              }

              button.appendChild(content);
            }
          }
        }
      };

      const fallbackConfig = {
        isEnabled: false,
        hue: 120,
        saturation: 1,
        brightness: 1,
        position: 'bottom-right',
        buttonText: 'Try It On',
        buttonEmoji: '👀',
        buttonImageUrl: '',
        buttonIcon: '',
        buttonIconPosition: 'none',
        buttonSize: 56,
        buttonContentType: 'text',
        buttonRadius: 12,
        buttonTextColor: '#FFFFFF',
      };

      if (!configUrl) {
        applyWidgetConfig(fallbackConfig);
      } else {
        fetch(configUrl, { cache: 'no-store' })
          .then(async (response) => {
            if (!response.ok) throw new Error(`Config request failed: ${response.status}`);
            return response.json();
          })
          .then((config) => applyWidgetConfig({ ...fallbackConfig, ...config }))
          .catch((error) => {
            console.warn('[Try-On Widget] Failed to load proxy config, using fallback', error);
            applyWidgetConfig(fallbackConfig);
          });
      }
    }

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
