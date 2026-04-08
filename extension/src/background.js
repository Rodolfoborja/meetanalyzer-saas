// Romelly AI - Background Service Worker

// Listen for extension install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Romelly AI Extension installed');
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'save-token') {
    chrome.storage.local.set({ romellyToken: message.token }, () => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'get-token') {
    chrome.storage.local.get(['romellyToken'], (result) => {
      sendResponse({ token: result.romellyToken || null });
    });
    return true;
  }
});

// Handle external messages (from web app for login)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'login-success' && message.token) {
    chrome.storage.local.set({ romellyToken: message.token }, () => {
      // Notify popup if open
      chrome.runtime.sendMessage({ type: 'login-success', token: message.token });
      sendResponse({ success: true });
    });
    return true;
  }
});
