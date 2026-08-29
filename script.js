// State Management
let photoCount = 3;
let mediaStream = null;
let takenPhotos = [];
let bgColor = '#ffb6c1';
let bgPattern = 'solid';
let currentFilter = 'none';
let appliedStickers = [];
let selectedStickerIndex = null;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let currentQrImage = null;

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
  appliedStickers = [];
  selectedStickerIndex = null;
  currentQrImage = null;
  const qrStatus = document.getElementById('qr-status');
  if (qrStatus) qrStatus.style.display = 'none';
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
  tempCanvas.width = 800;
  tempCanvas.height = 600;
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

// Filter Engine (Offscreen processing)
function applyFilterToCanvas(image, width, height, filter) {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
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

  oCtx.drawImage(image, 0, 0, width, height);

  if (filter === 'vintage') {
    oCtx.fillStyle = 'rgba(255, 230, 180, 0.15)';
    oCtx.fillRect(0, 0, width, height);
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

  // 4. Render Footer Text & Date
  const customText = document.getElementById('footer-text-input')?.value || "";
  const fontFamily = document.getElementById('footer-font-select')?.value || "Plus Jakarta Sans";
  const textColor = document.getElementById('footer-color-picker')?.value || "#ffffff";
  const showDate = document.getElementById('show-date-checkbox')?.checked;

  const footerCenterY = stripCanvas.height - (footerHeight / 2) - 5;
  const textCenterX = currentQrImage ? (stripCanvas.width - 70) / 2 : stripCanvas.width / 2;

  ctx.fillStyle = textColor;
  ctx.textAlign = currentQrImage ? "left" : "center";
  ctx.textBaseline = "middle";

  const drawX = currentQrImage ? 25 : textCenterX;

  if (customText.trim() !== "") {
    ctx.font = `700 18px '${fontFamily}', sans-serif`;
    ctx.fillText(customText, drawX, footerCenterY - (showDate ? 10 : 0));
  }

  if (showDate) {
    const today = new Date();
    const dateStr = today.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
    ctx.font = `400 12px '${fontFamily}', sans-serif`;
    ctx.fillText(dateStr, drawX, footerCenterY + (customText.trim() !== "" ? 14 : 0));
  }

  // 5. Render QR Code (jika tersedia)
  if (currentQrImage) {
    const qrSize = 55;
    const qrMargin = 18;
    const qrX = stripCanvas.width - qrSize - qrMargin;
    const qrY = stripCanvas.height - qrSize - 18;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
    ctx.drawImage(currentQrImage, qrX, qrY, qrSize, qrSize);
  }

  // 6. Render Stickers
  appliedStickers.forEach((s, index) => {
    ctx.font = `${s.size}px sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(s.emoji, s.x, s.y);

    if (index === selectedStickerIndex) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      const boxSize = s.size;
      ctx.strokeRect(s.x - boxSize / 2, s.y - boxSize / 2, boxSize, boxSize);
    }
  });

  // Update Download Link
  const downloadBtn = document.getElementById('download-btn');
  downloadBtn.href = stripCanvas.toDataURL('image/png');
  downloadBtn.download = `photostrip-${Date.now()}.png`;
}

// QR Code Generator via tmpfiles.org API (Tanpa API Key/Client-ID)
async function generatePhotoQR() {
  const qrBtn = document.getElementById('qr-generate-btn');
  const qrStatus = document.getElementById('qr-status');
  
  qrBtn.disabled = true;
  qrStatus.style.display = 'block';
  qrStatus.innerText = 'Mengunggah foto...';

  try {
    // 1. Convert Canvas ke Blob Data
    const blob = await new Promise(resolve => stripCanvas.toBlob(resolve, 'image/png'));
    
    const formData = new FormData();
    formData.append('file', blob, 'photostrip.png');

    // 2. Upload ke tmpfiles.org
    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.status === 'success') {
      // Ubah URL tampilan biasa menjadi direct URL download
      const fileUrl = result.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      qrStatus.innerText = 'Membuat QR Code...';

      // 3. Render QR Code ke Element Temporer
      const qrTemp = document.getElementById('qrcode-temp-container');
      qrTemp.innerHTML = "";
      
      new QRCode(qrTemp, {
        text: fileUrl,
        width: 100,
        height: 100,
        correctLevel: QRCode.CorrectLevel.H
      });

      // Tunggu render QR image selesai
      setTimeout(() => {
        const qrImgElement = qrTemp.querySelector('img');
        if (qrImgElement) {
          currentQrImage = new Image();
          currentQrImage.src = qrImgElement.src;
          currentQrImage.onload = () => {
            renderPhotoStrip(); // Re-render canvas dengan QR Code
            qrStatus.innerText = '✓ QR Code berhasil dipasang!';
            qrBtn.disabled = false;
          };
        }
      }, 300);

    } else {
      throw new Error("Gagal mengunggah gambar.");
    }

  } catch (err) {
    console.error(err);
    qrStatus.innerText = '❌ Gagal membuat QR Code. Coba lagi.';
    qrBtn.disabled = false;
  }
}

// Sticker Management & Drag-Drop Interaction
function addSticker(emoji) {
  const newSticker = {
    emoji: emoji,
    x: stripCanvas.width / 2,
    y: stripCanvas.height / 2,
    size: 40
  };
  appliedStickers.push(newSticker);
  selectedStickerIndex = appliedStickers.length - 1;
  renderPhotoStrip();
}

function getCanvasCoordinates(e) {
  const rect = stripCanvas.getBoundingClientRect();
  const scaleX = stripCanvas.width / rect.width;
  const scaleY = stripCanvas.height / rect.height;

  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

stripCanvas.addEventListener('mousedown', (e) => {
  const coords = getCanvasCoordinates(e);
  selectedStickerIndex = null;

  for (let i = appliedStickers.length - 1; i >= 0; i--) {
    const s = appliedStickers[i];
    const half = s.size / 2;
    if (coords.x >= s.x - half && coords.x <= s.x + half &&
        coords.y >= s.y - half && coords.y <= s.y + half) {
      selectedStickerIndex = i;
      isDragging = true;
      dragOffsetX = coords.x - s.x;
      dragOffsetY = coords.y - s.y;
      break;
    }
  }
  renderPhotoStrip();
});

stripCanvas.addEventListener('mousemove', (e) => {
  if (isDragging && selectedStickerIndex !== null) {
    const coords = getCanvasCoordinates(e);
    appliedStickers[selectedStickerIndex].x = coords.x - dragOffsetX;
    appliedStickers[selectedStickerIndex].y = coords.y - dragOffsetY;
    renderPhotoStrip();
  }
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

window.addEventListener('keydown', (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedStickerIndex !== null) {
    if (document.activeElement.tagName !== 'INPUT') {
      appliedStickers.splice(selectedStickerIndex, 1);
      selectedStickerIndex = null;
      renderPhotoStrip();
    }
  }
});