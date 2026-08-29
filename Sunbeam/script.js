let photoCount = 3;
let bgColor = '#b8c0ff';
let bgPattern = 'solid';
let takenPhotos = [];
let appliedStickers = [];
let streamInstance = null;

let selectedStickerIndex = null;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

const stripCanvas = document.getElementById('strip-canvas');
const ctx = stripCanvas.getContext('2d');

function setPhotoCount(count) {
  photoCount = count;
  document.getElementById('mode-3').classList.toggle('active', count === 3);
  document.getElementById('mode-4').classList.toggle('active', count === 4);
}

function setBgColor(color) {
  bgColor = color;
  document.querySelectorAll('.color-circle').forEach(el => el.classList.remove('active'));
  if (event && event.target) {
    event.target.classList.add('active');
  }
  renderPhotoStrip();
}

function setBgPattern(pattern) {
  bgPattern = pattern;
  document.getElementById('bg-solid').classList.toggle('active', pattern === 'solid');
  document.getElementById('bg-polkadot').classList.toggle('active', pattern === 'polkadot');
  renderPhotoStrip();
}

function goToCamera() {
  document.getElementById('step-select').classList.add('hidden');
  document.getElementById('step-camera').classList.remove('hidden');

  navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
      streamInstance = stream;
      document.getElementById('webcam').srcObject = stream;
    })
    .catch((err) => {
      alert("Gagal mengakses kamera. Pastikan izin kamera telah diberikan!");
      console.error(err);
    });
}

function resetToStep1() {
  document.getElementById('step-camera').classList.add('hidden');
  document.getElementById('step-decorate').classList.add('hidden');
  document.getElementById('step-select').classList.remove('hidden');
  if (streamInstance) streamInstance.getTracks().forEach(t => t.stop());
}

document.getElementById('snap-btn').addEventListener('click', async () => {
  const video = document.getElementById('webcam');
  const countdown = document.getElementById('countdown-overlay');
  takenPhotos = [];

  for (let i = 0; i < photoCount; i++) {
    countdown.classList.remove('hidden');
    for (let c = 3; c > 0; c--) {
      countdown.innerText = c;
      await new Promise(r => setTimeout(r, 1000));
    }
    countdown.classList.add('hidden');

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(video, 0, 0);
    takenPhotos.push(tempCanvas);

    await new Promise(r => setTimeout(r, 800));
  }

  document.getElementById('step-camera').classList.add('hidden');
  document.getElementById('step-decorate').classList.remove('hidden');
  if (streamInstance) streamInstance.getTracks().forEach(t => t.stop());

  appliedStickers = [];
  renderPhotoStrip();
});

function renderPhotoStrip() {
  const photoW = 400;
  const photoH = 300;
  const padding = parseInt(document.getElementById('padding-slider')?.value || 20);
  const header = 30;
  const footer = 50;

  stripCanvas.width = photoW + (padding * 2);
  stripCanvas.height = header + (photoH * photoCount) + (padding * photoCount) + footer;

  // 1. Render Warna Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, stripCanvas.width, stripCanvas.height);

  // 2. Render Motif Polkadot (Otomatis menyesuaikan warna background)
  if (bgPattern === 'polkadot') {
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    for (let x = 15; x < stripCanvas.width; x += 30) {
      for (let y = 15; y < stripCanvas.height; y += 30) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 3. Render Hasil Foto
  takenPhotos.forEach((img, i) => {
    ctx.drawImage(img, padding, header + i * (photoH + padding), photoW, photoH);
  });

  // 4. Render Stiker
  appliedStickers.forEach((s, index) => {
    ctx.font = `${s.size}px sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(s.emoji, s.x, s.y);

    // Garis penanda stiker terpilih
    if (index === selectedStickerIndex) {
      ctx.strokeStyle = "#7209b7";
      ctx.lineWidth = 3;
      const boxSize = s.size;
      ctx.strokeRect(s.x - boxSize / 2, s.y - boxSize / 2, boxSize, boxSize);
    }
  });

  // Update Link Unduh
  const downloadBtn = document.getElementById('download-btn');
  downloadBtn.href = stripCanvas.toDataURL('image/png');
  downloadBtn.download = `photostrip-${Date.now()}.png`;
}

function addSticker(emoji) {
  appliedStickers.push({
    emoji: emoji,
    x: stripCanvas.width / 2,
    y: stripCanvas.height / 2,
    size: 55
  });
  selectedStickerIndex = appliedStickers.length - 1;
  renderPhotoStrip();
}

function clearStickers() {
  appliedStickers = [];
  selectedStickerIndex = null;
  renderPhotoStrip();
}

// Konversi Koordinat Mouse ke Skala Canvas
function getCanvasCoordinates(e) {
  const rect = stripCanvas.getBoundingClientRect();
  const scaleX = stripCanvas.width / rect.width;
  const scaleY = stripCanvas.height / rect.height;

  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

// Event Interaksi Drag & Drop Stiker
stripCanvas.addEventListener('mousedown', (e) => {
  const { x, y } = getCanvasCoordinates(e);
  selectedStickerIndex = null;

  for (let i = appliedStickers.length - 1; i >= 0; i--) {
    const s = appliedStickers[i];
    const halfSize = s.size / 2;
    if (x >= s.x - halfSize && x <= s.x + halfSize && y >= s.y - halfSize && y <= s.y + halfSize) {
      selectedStickerIndex = i;
      isDragging = true;
      dragStartX = x - s.x;
      dragStartY = y - s.y;
      break;
    }
  }
  renderPhotoStrip();
});

stripCanvas.addEventListener('mousemove', (e) => {
  if (!isDragging || selectedStickerIndex === null) return;
  const { x, y } = getCanvasCoordinates(e);
  appliedStickers[selectedStickerIndex].x = x - dragStartX;
  appliedStickers[selectedStickerIndex].y = y - dragStartY;
  renderPhotoStrip();
});

window.addEventListener('mouseup', () => { 
  isDragging = false; 
});

// Event Ubah Ukuran Stiker dengan Scroll Wheel
stripCanvas.addEventListener('wheel', (e) => {
  if (selectedStickerIndex !== null) {
    e.preventDefault();
    const sticker = appliedStickers[selectedStickerIndex];
    if (e.deltaY < 0) {
      sticker.size = Math.min(160, sticker.size + 5);
    } else {
      sticker.size = Math.max(20, sticker.size - 5);
    }
    renderPhotoStrip();
  }
}, { passive: false });