// State Management
let photoCount = 3;
let mediaStream = null;
let takenPhotos = [];
let bgColor = '#800020'; // Warna Default Maroon
let bgPattern = 'solid';
let currentFilter = 'none';

// Element Selectors
const video = document.getElementById('webcam');
const stripCanvas = document.getElementById('strip-canvas');
const ctx = stripCanvas.getContext('2d');
const countdownOverlay = document.getElementById('countdown-overlay');

// Navigation Helpers
function showStep(stepId) {
  document.querySelectorAll('.step-view').forEach(el => el.classList.add('hidden'));
  document.getElementById(stepId).classList.remove('hidden');
}

function setPhotoCount(count, btn) {
  photoCount = count;
  document.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// Camera Management
async function startCamera() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 960 }, audio: false });
    video.srcObject = mediaStream;
    showStep('step-camera');
  } catch (err) {
    alert("Tidak dapat mengakses kamera! Pastikan izin kamera telah diberikan.");
    console.error(err);
  }
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
}

function resetToHome() {
  stopCamera();
  takenPhotos = [];
  showStep('step-welcome');
}

// Capture Flow
function startCaptureSequence() {
  const snapBtn = document.getElementById('snap-btn');
  snapBtn.disabled = true;
  takenPhotos = [];
  captureStep(0);
}

function captureStep(index) {
  if (index >= photoCount) {
    stopCamera();
    showStep('step-editor');
    renderPhotoStrip();
    document.getElementById('snap-btn').disabled = false;
    return;
  }

  let counter = 3;
  countdownOverlay.innerText = counter;
  countdownOverlay.classList.remove('hidden');

  const timer = setInterval(() => {
    counter--;
    if (counter > 0) {
      countdownOverlay.innerText = counter;
    } else {
      clearInterval(timer);
      countdownOverlay.classList.add('hidden');
      snapPhoto();
      setTimeout(() => captureStep(index + 1), 1000);
    }
  }, 1000);
}

function snapPhoto() {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = video.videoWidth || 800;
  tempCanvas.height = video.videoHeight || 600;
  
  const tCtx = tempCanvas.getContext('2d');

  // Mirror horizontal
  tCtx.translate(tempCanvas.width, 0);
  tCtx.scale(-1, 1);
  tCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

  const img = new Image();
  img.src = tempCanvas.toDataURL('image/png');
  img.onload = () => {
    takenPhotos.push(img);
  };
}

// Customizations Setter
function setBgColor(color) {
  bgColor = color;
  document.querySelectorAll('.color-circle').forEach(c => c.classList.remove('active'));
  if (window.event && window.event.target) window.event.target.classList.add('active');
  renderPhotoStrip();
}

function setBgPattern(pattern) {
  bgPattern = pattern;
  renderPhotoStrip();
}

function setPhotoFilter(filter) {
  currentFilter = filter;
  renderPhotoStrip();
}

function isDarkColor(hex) {
  if (hex.startsWith('#')) hex = hex.slice(1);
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
}

// Filter & Aspect Ratio Engine (Object-Fit Cover)
function applyFilterToCanvas(image, targetWidth, targetHeight, filter) {
  const offscreen = document.createElement('canvas');
  offscreen.width = targetWidth;
  offscreen.height = targetHeight;
  const oCtx = offscreen.getContext('2d');

  switch (filter) {
    case 'bw':
      oCtx.filter = 'grayscale(100%) contrast(110%)';
      break;
    case 'sepia':
      oCtx.filter = 'sepia(90%) contrast(95%)';
      break;
    case 'vintage':
      oCtx.filter = 'sepia(40%) contrast(115%) brightness(90%) saturate(120%)';
      break;
    case 'bright':
      oCtx.filter = 'brightness(115%) contrast(95%) saturate(110%)';
      break;
    case 'cyan':
      oCtx.filter = 'contrast(110%) hue-rotate(170deg) saturate(80%)';
      break;
    default:
      oCtx.filter = 'none';
  }

  // Crop Aspect Ratio (Mencegah Gepeng/Stretched)
  const imgAspect = image.width / image.height;
  const targetAspect = targetWidth / targetHeight;
  
  let renderW, renderH, offsetX, offsetY;

  if (imgAspect > targetAspect) {
    renderH = image.height;
    renderW = image.height * targetAspect;
    offsetX = (image.width - renderW) / 2;
    offsetY = 0;
  } else {
    renderW = image.width;
    renderH = image.width / targetAspect;
    offsetX = 0;
    offsetY = (image.height - renderH) / 2;
  }

  oCtx.drawImage(image, offsetX, offsetY, renderW, renderH, 0, 0, targetWidth, targetHeight);

  if (filter === 'vintage') {
    oCtx.fillStyle = 'rgba(255, 230, 180, 0.15)';
    oCtx.fillRect(0, 0, targetWidth, targetHeight);
  }

  return offscreen;
}

// Main Render Engine
function renderPhotoStrip() {
  const photoW = 400;
  const photoH = 300;
  const padding = parseInt(document.getElementById('padding-slider')?.value || 20);
  const patternSize = parseInt(document.getElementById('pattern-size-slider')?.value || 30);
  const header = 25;
  const footerHeight = 90;

  stripCanvas.width = photoW + (padding * 2);
  stripCanvas.height = header + (photoH * photoCount) + (padding * photoCount) + footerHeight;

  // 1. Fill Background Color
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, stripCanvas.width, stripCanvas.height);

  // 2. Render Pattern
  const darkBg = isDarkColor(bgColor);
  const patternColor = darkBg ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.25)";

  if (bgPattern === 'polkadot') {
    ctx.fillStyle = patternColor;
    const dotRadius = Math.max(2, Math.floor(patternSize / 6));
    for (let x = patternSize / 2; x < stripCanvas.width; x += patternSize) {
      for (let y = patternSize / 2; y < stripCanvas.height; y += patternSize) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (bgPattern === 'stripes') {
    ctx.strokeStyle = patternColor;
    ctx.lineWidth = Math.max(3, Math.floor(patternSize / 3));
    for (let x = -stripCanvas.height; x < stripCanvas.width; x += patternSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripCanvas.height, stripCanvas.height);
      ctx.stroke();
    }
  } else if (bgPattern === 'stars') {
    ctx.fillStyle = patternColor;
    ctx.font = `${Math.max(10, Math.floor(patternSize * 0.6))}px sans-serif`;
    for (let x = patternSize / 2; x < stripCanvas.width; x += patternSize) {
      for (let y = patternSize / 2; y < stripCanvas.height; y += patternSize) {
        ctx.fillText("✦", x, y);
      }
    }
  } else if (bgPattern === 'vintage') {
    ctx.strokeStyle = patternColor;
    const margin = Math.max(5, Math.floor(patternSize / 3));
    ctx.lineWidth = 4;
    ctx.strokeRect(margin, margin, stripCanvas.width - (margin * 2), stripCanvas.height - (margin * 2));
    ctx.lineWidth = 1;
    ctx.strokeRect(margin + 5, margin + 5, stripCanvas.width - ((margin + 5) * 2), stripCanvas.height - ((margin + 5) * 2));
  }

  // 3. Render Photos
  takenPhotos.forEach((img, i) => {
    const yPos = header + i * (photoH + padding);
    const filteredCanvas = applyFilterToCanvas(img, photoW, photoH, currentFilter);
    ctx.drawImage(filteredCanvas, padding, yPos, photoW, photoH);
  });

  // 4. Render Footer Text & Date (Posisi Selalu Center Secara Presisi)
  const customText = document.getElementById('footer-text-input')?.value || "";
  const fontFamily = document.getElementById('footer-font-select')?.value || "Plus Jakarta Sans";
  const textColor = document.getElementById('footer-color-picker')?.value || "#ffffff";
  const fontSize = parseInt(document.getElementById('footer-size-slider')?.value || 18);
  const showDate = document.getElementById('show-date-checkbox')?.checked;

  const footerCenterY = stripCanvas.height - (footerHeight / 2) - 5;
  const textCenterX = stripCanvas.width / 2;

  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (customText.trim() !== "") {
    ctx.font = `700 ${fontSize}px '${fontFamily}', sans-serif`;
    ctx.fillText(customText, textCenterX, footerCenterY - (showDate ? (fontSize / 2) : 0));
  }

  if (showDate) {
    const today = new Date();
    const dateStr = today.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
    const dateFontSize = Math.max(10, Math.floor(fontSize * 0.65));
    ctx.font = `400 ${dateFontSize}px '${fontFamily}', sans-serif`;
    ctx.fillText(dateStr, textCenterX, footerCenterY + (customText.trim() !== "" ? (fontSize / 2 + 6) : 0));
  }

  // Update Link Download Direct
  const downloadBtn = document.getElementById('download-btn');
  if (downloadBtn) {
    downloadBtn.href = stripCanvas.toDataURL('image/png');
    downloadBtn.download = `photostrip-${Date.now()}.png`;
  }
}