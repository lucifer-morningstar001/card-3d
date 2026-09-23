/* ============================================
   AUREUM — Cinematic Scroll Hero
   Frame-sequence scroll-scrub + text reveal
   ============================================ */

(function () {
  "use strict";

  const CONFIG = {
    totalFrames: 17,
    frameFolder: "assets/frames/",
    // frame_01.jpg ... frame_17.jpg
    getFramePath: (i) => `${CONFIG.frameFolder}frame_${String(i).padStart(2, "0")}.png`
  };

  const body = document.body;
  const loader = document.getElementById("loader");
  const loaderFill = document.getElementById("loaderFill");
  const loaderPct = document.getElementById("loaderPct");

  const wrapper = document.getElementById("heroWrapper");
  const canvas = document.getElementById("scrollCanvas");
  const ctx = canvas.getContext("2d");
  const scrollCue = document.getElementById("scrollCue");
  const progressFill = document.getElementById("heroProgressFill");
  const revealEls = Array.from(document.querySelectorAll(".reveal"));

  const images = [];
  let loadedCount = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let ready = false;
  let ticking = false;
  let currentProgress = 0;

  /* ---------- Preload frames ---------- */
  function preload() {
    for (let i = 1; i <= CONFIG.totalFrames; i++) {
      const img = new Image();
      img.src = CONFIG.getFramePath(i);
      img.onload = onFrameLoaded;
      img.onerror = onFrameLoaded; // fail gracefully, don't block forever
      images.push(img);
    }
  }

  function onFrameLoaded() {
    loadedCount++;
    const pct = Math.round((loadedCount / CONFIG.totalFrames) * 100);
    loaderFill.style.width = pct + "%";
    loaderPct.textContent = pct + "%";
    if (loadedCount === CONFIG.totalFrames) {
      finishLoading();
    }
  }

  function finishLoading() {
    ready = true;
    resizeCanvas();
    drawFrame(0);
    updateReveals(0);
    setTimeout(() => {
      loader.classList.add("hidden");
      body.classList.remove("locked");
    }, 250);
  }

  /* ---------- Canvas sizing ---------- */
  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
  }

  function drawCoverImage(img) {
    if (!img || !img.complete || !img.naturalWidth) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const canvasRatio = cw / ch;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    let sx, sy, sw, sh;
    if (imgRatio > canvasRatio) {
      sh = img.naturalHeight;
      sw = sh * canvasRatio;
      sx = (img.naturalWidth - sw) / 2;
      sy = 0;
    } else {
      sw = img.naturalWidth;
      sh = sw / canvasRatio;
      sx = 0;
      sy = (img.naturalHeight - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
  }

  /* ---------- Draw the current scroll frame (with crossfade smoothing) ---------- */
  function drawFrame(progress) {
    const maxIndex = CONFIG.totalFrames - 1;
    const floatIndex = progress * maxIndex;
    const idx = Math.floor(floatIndex);
    const frac = floatIndex - idx;

    const imgA = images[idx];
    const imgB = images[Math.min(idx + 1, maxIndex)];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    drawCoverImage(imgA);

    if (frac > 0.001 && imgB !== imgA) {
      ctx.globalAlpha = frac;
      drawCoverImage(imgB);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- Text reveal based on scroll progress ---------- */
  function updateReveals(progress) {
    revealEls.forEach((el) => {
      const start = parseFloat(el.dataset.start);
      const end = parseFloat(el.dataset.end);
      let t = (progress - start) / (end - start);
      t = Math.min(Math.max(t, 0), 1);

      // ease-out for a soft arrival
      const eased = 1 - Math.pow(1 - t, 3);

      el.style.opacity = eased;
      el.style.transform = `translateY(${26 * (1 - eased)}px)`;
    });

    // scroll cue fades out immediately as the user begins scrolling
    const cueOpacity = 1 - Math.min(progress / 0.05, 1);
    scrollCue.style.opacity = cueOpacity;

    // progress bar
    progressFill.style.width = (progress * 100) + "%";
  }

  /* ---------- Scroll progress calculation ---------- */
  function getScrollProgress() {
    const rect = wrapper.getBoundingClientRect();
    const total = wrapper.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    const scrolled = -rect.top;
    return Math.min(Math.max(scrolled / total, 0), 1);
  }

  function onScroll() {
    currentProgress = getScrollProgress();
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (ready) {
          drawFrame(currentProgress);
          updateReveals(currentProgress);
        }
        ticking = false;
      });
      ticking = true;
    }
  }

  function onResize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    resizeCanvas();
    if (ready) drawFrame(currentProgress);
  }

  /* ---------- Init ---------- */
  body.classList.add("locked");
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  preload();
})();
