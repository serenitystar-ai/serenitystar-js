export function setupDynamicHandler(buttonId, handler) {
  const setupButton = (button) => {
    if (!button) return;
    
    button.onclick = async () => {
      const container = button.closest('.demo-container');
      const loadingIndicator = container.querySelector('.loading-indicator');
      
      try {
        loadingIndicator.classList.add('visible');
        await handler();
      } finally {
        loadingIndicator.classList.remove('visible');
      }
    };
  };

  // Initial setup
  setupButton(document.getElementById(buttonId));

  // Handle future elements
  window.addEventListener('demoContentChanged', () => {
    setupButton(document.getElementById(buttonId));
  });
}
