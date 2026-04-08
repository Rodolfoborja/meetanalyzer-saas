// Romelly AI - Popup Script

const API_URL = 'https://api.romelly.ai'; // Change in production
const WS_URL = 'wss://api.romelly.ai/live';

let socket = null;
let mediaRecorder = null;
let recordingStartTime = null;
let timerInterval = null;

// DOM Elements
const loginSection = document.getElementById('login-section');
const readySection = document.getElementById('ready-section');
const recordingSection = document.getElementById('recording-section');
const processingSection = document.getElementById('processing-section');

const loginBtn = document.getElementById('login-btn');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const platformBadge = document.getElementById('platform');
const recordingPlatform = document.getElementById('recording-platform');
const recordingTime = document.getElementById('recording-time');
const processingStatus = document.getElementById('processing-status');
const progressBar = document.getElementById('progress-bar');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const token = await getToken();
  
  if (token) {
    showSection('ready');
    detectPlatform();
    connectWebSocket(token);
  } else {
    showSection('login');
  }
});

// Event Listeners
loginBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `${API_URL.replace('api.', 'app.')}/login?extension=true` });
});

startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);

// Functions
function showSection(section) {
  loginSection.classList.add('hidden');
  readySection.classList.add('hidden');
  recordingSection.classList.add('hidden');
  processingSection.classList.add('hidden');

  switch (section) {
    case 'login':
      loginSection.classList.remove('hidden');
      break;
    case 'ready':
      readySection.classList.remove('hidden');
      break;
    case 'recording':
      recordingSection.classList.remove('hidden');
      break;
    case 'processing':
      processingSection.classList.remove('hidden');
      break;
  }
}

async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['romellyToken'], (result) => {
      resolve(result.romellyToken || null);
    });
  });
}

async function detectPlatform() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';

  let platform = 'No detectada';
  if (url.includes('meet.google.com')) {
    platform = 'Google Meet';
  } else if (url.includes('teams.microsoft.com')) {
    platform = 'Microsoft Teams';
  } else if (url.includes('zoom.us')) {
    platform = 'Zoom';
  }

  platformBadge.textContent = platform;
  return platform;
}

function connectWebSocket(token) {
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    socket.send(JSON.stringify({ type: 'auth', token }));
    console.log('WebSocket connected');
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleSocketMessage(data);
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  socket.onclose = () => {
    console.log('WebSocket closed');
    // Reconnect after 3 seconds
    setTimeout(() => connectWebSocket(token), 3000);
  };
}

function handleSocketMessage(data) {
  switch (data.type) {
    case 'recording-started':
      console.log('Recording started, meeting ID:', data.meetingId);
      break;

    case 'chunk-received':
      console.log('Chunks:', data.chunks, 'Duration:', data.duration);
      break;

    case 'status':
      processingStatus.textContent = getStatusText(data.step);
      progressBar.style.width = `${data.progress}%`;
      break;

    case 'transcription-complete':
      processingStatus.textContent = 'Analizando con IA...';
      break;

    case 'analysis-complete':
      processingStatus.textContent = '¡Completado!';
      progressBar.style.width = '100%';
      
      // Open results in new tab
      setTimeout(() => {
        chrome.tabs.create({ 
          url: `${API_URL.replace('api.', 'app.')}/dashboard/meetings/${data.meetingId}` 
        });
        showSection('ready');
      }, 1500);
      break;

    case 'error':
      processingStatus.textContent = `Error: ${data.message}`;
      setTimeout(() => showSection('ready'), 3000);
      break;
  }
}

function getStatusText(step) {
  const texts = {
    transcribing: 'Transcribiendo audio...',
    analyzing: 'Analizando con IA...',
    complete: '¡Completado!',
  };
  return texts[step] || 'Procesando...';
}

async function startRecording() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const platform = await detectPlatform();

  if (platform === 'No detectada') {
    alert('Abre una reunión de Google Meet, Teams o Zoom primero');
    return;
  }

  try {
    // Capture tab audio
    const stream = await chrome.tabCapture.capture({
      audio: true,
      video: false,
    });

    if (!stream) {
      throw new Error('No se pudo capturar el audio');
    }

    // Setup MediaRecorder
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && socket?.readyState === WebSocket.OPEN) {
        // Convert to base64 and send
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          socket.send(JSON.stringify({
            type: 'audio-chunk',
            chunk: base64,
          }));
        };
        reader.readAsDataURL(event.data);
      }
    };

    // Start recording
    mediaRecorder.start(1000); // Send chunks every second
    recordingStartTime = Date.now();

    // Notify server
    socket.send(JSON.stringify({
      type: 'start-recording',
      meetingUrl: tab.url,
      platform: platform.toLowerCase().replace(' ', '-'),
      title: tab.title || `Reunión ${new Date().toLocaleDateString()}`,
    }));

    // Update UI
    recordingPlatform.textContent = platform;
    showSection('recording');
    startTimer();

  } catch (error) {
    console.error('Failed to start recording:', error);
    alert('Error al iniciar la grabación: ' + error.message);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }

  stopTimer();

  // Notify server
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'stop-recording' }));
  }

  showSection('processing');
  processingStatus.textContent = 'Preparando audio...';
  progressBar.style.width = '10%';
}

function startTimer() {
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    recordingTime.textContent = `${minutes}:${seconds}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Listen for token from login
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'login-success') {
    chrome.storage.local.set({ romellyToken: message.token }, () => {
      showSection('ready');
      connectWebSocket(message.token);
    });
  }
});
