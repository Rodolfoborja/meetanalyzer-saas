// Romelly AI - Content Script
// Runs on Google Meet, Teams, and Zoom pages

(function() {
  // Detect platform
  const url = window.location.href;
  let platform = 'unknown';

  if (url.includes('meet.google.com')) {
    platform = 'google-meet';
  } else if (url.includes('teams.microsoft.com')) {
    platform = 'teams';
  } else if (url.includes('zoom.us')) {
    platform = 'zoom';
  }

  console.log(`[Romelly AI] Detected platform: ${platform}`);

  // Notify background script
  chrome.runtime.sendMessage({
    type: 'platform-detected',
    platform,
    url,
    title: document.title,
  });

  // Listen for meeting state changes (optional enhancement)
  if (platform === 'google-meet') {
    // Could detect when meeting starts/ends
    const observer = new MutationObserver((mutations) => {
      // Watch for UI changes that indicate meeting state
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Handle token from login redirect
  if (window.location.search.includes('extension_token=')) {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('extension_token');
    
    if (token) {
      chrome.runtime.sendMessage({
        type: 'save-token',
        token,
      }, (response) => {
        console.log('[Romelly AI] Token saved');
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      });
    }
  }
})();
