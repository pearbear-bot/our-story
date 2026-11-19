/* ============================================================
   致我的宝宝 · 恋爱手账长信交互逻辑 (Script & Interactions)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ------------------------------------------------------------
     0. 专属心动密码锁逻辑 (Password: 0521)
     ------------------------------------------------------------ */
  const CORRECT_PIN = '0521';
  const lockOverlay = document.getElementById('passwordLockOverlay');
  const lockCard = document.getElementById('lockCard');
  const lockIcon = document.getElementById('lockIcon');
  const pinInput = document.getElementById('pinInput');
  const pinDots = document.querySelectorAll('.pin-dot');
  const lockFeedback = document.getElementById('lockFeedback');
  const unlockBtn = document.getElementById('unlockBtn');
  const pinContainer = document.getElementById('pinInputContainer');

  let isUnlocked = false;

  function updatePinDots(val) {
    pinDots.forEach((dot, idx) => {
      if (idx < val.length) {
        dot.classList.add('filled');
        dot.classList.remove('active');
      } else if (idx === val.length) {
        dot.classList.remove('filled');
        dot.classList.add('active');
      } else {
        dot.classList.remove('filled', 'active');
      }
    });
  }

  function handleUnlock() {
    if (isUnlocked || !pinInput) return;
    const entered = pinInput.value.trim();

    if (entered === CORRECT_PIN) {
      isUnlocked = true;
      if (lockIcon) {
        lockIcon.textContent = '💖';
        lockIcon.style.transform = 'scale(1.25)';
      }
      if (lockFeedback) {
        lockFeedback.className = 'lock-feedback handwritten-text success';
        lockFeedback.textContent = '✨ 密码正确！欢迎来到属于我们的星空…… 💕';
      }
      if (unlockBtn) {
        unlockBtn.innerHTML = '<span>🎉 解锁成功！</span>';
      }

      // 自动播放背景音乐《星晴》（用户主动点击解锁行为受浏览器许可）
      const bgmAudio = document.getElementById('bgmAudio');
      const musicDisc = document.getElementById('musicDisc');
      if (bgmAudio) {
        bgmAudio.play().then(() => {
          if (musicDisc) musicDisc.classList.add('playing');
        }).catch(() => {});
      }

      setTimeout(() => {
        if (lockOverlay) {
          lockOverlay.classList.add('unlocked');
          setTimeout(() => {
            lockOverlay.style.display = 'none';
          }, 600);
        }
      }, 700);

    } else {
      // 密码错误震动提示
      if (lockCard) {
        lockCard.classList.remove('shake-anim');
        void lockCard.offsetWidth;
        lockCard.classList.add('shake-anim');
      }
      if (lockFeedback) {
        lockFeedback.className = 'lock-feedback handwritten-text error';
        lockFeedback.textContent = '密码不太对哦，再猜猜看~ 💭';
      }

      pinInput.value = '';
      updatePinDots('');
      setTimeout(() => {
        pinInput.focus();
      }, 400);
    }
  }

  if (pinInput && lockOverlay) {
    if (pinContainer) {
      pinContainer.addEventListener('click', () => pinInput.focus());
    }
    pinInput.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
      e.target.value = val;
      updatePinDots(val);
      if (lockFeedback) {
        lockFeedback.className = 'lock-feedback handwritten-text';
        lockFeedback.textContent = '';
      }

      if (val.length === 4) {
        setTimeout(handleUnlock, 250);
      }
    });

    pinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleUnlock();
      }
    });

    if (unlockBtn) {
      unlockBtn.addEventListener('click', handleUnlock);
    }

    setTimeout(() => {
      try { pinInput.focus(); } catch (e) {}
    }, 300);
  }

  /* ------------------------------------------------------------
     0.5 照片预加载：全部进缓存后才允许输入密码解锁
     用 fetch 填充 HTTP 缓存，不保留解码后的位图，
     否则 38 张 1400px 的图解码后接近 190MB，低端机会被系统杀掉。
     ------------------------------------------------------------ */
  (function preloadPhotos() {
    const wrap = document.getElementById('preloadWrap');
    const fill = document.getElementById('preloadFill');
    const label = document.getElementById('preloadText');

    let finished = false;

    function paint() {
      const pct = total ? Math.round((done / total) * 100) : 100;
      if (fill) fill.style.width = pct + '%';
      if (label) {
        label.textContent = done >= total
          ? '马上就好…'
          : '正在准备我们的照片… ' + done + ' / ' + total;
      }
    }

    function unlockNow() {
      if (finished) return;
      finished = true;
      if (fill) fill.style.width = '100%';
      if (label) label.textContent = '准备好了 ✨';
      setTimeout(() => {
        if (wrap) wrap.style.display = 'none';
        if (pinInput) {
          pinInput.disabled = false;
          try { pinInput.focus(); } catch (e) {}
        }
        if (unlockBtn) {
          unlockBtn.disabled = false;
          unlockBtn.classList.remove('is-waiting');
        }
      }, 450);
    }

    // 图片下完后再悄悄把背景音乐也拉进缓存，别和照片抢带宽
    function warmAudio() {
      const audio = document.getElementById('bgmAudio');
      const source = audio && audio.querySelector('source');
      const url = source && source.getAttribute('src');
      if (!url) return;
      fetch(url).then(r => r.blob()).catch(() => {});
    }

    if (!wrap || !fill || typeof fetch !== 'function') {
      unlockNow();
      return;
    }

    const urls = [];
    document.querySelectorAll('img[src]').forEach(img => {
      const src = img.getAttribute('src');
      if (src && src.trim() && urls.indexOf(src) === -1) urls.push(src);
    });

    const total = urls.length;
    let done = 0;

    if (!total) {
      unlockNow();
      return;
    }

    paint();

    // 兜底：无论如何 90 秒后放行，避免网络异常时永远锁死
    setTimeout(unlockNow, 90000);

    const queue = urls.slice();

    async function worker() {
      while (queue.length > 0 && !finished) {
        const url = queue.shift();
        try {
          const res = await fetch(url, { cache: 'force-cache' });
          if (!res.ok) throw new Error('http ' + res.status);
          await res.blob();
        } catch (err) {
          // 失败再试一次，仍然失败就跳过，不能因为一张图把整页锁死
          try {
            const res2 = await fetch(url, { cache: 'reload' });
            await res2.blob();
          } catch (err2) { /* 忽略 */ }
        }
        done++;
        paint();
      }
    }

    Promise.all(
      Array.from({ length: Math.min(5, total) }, worker)
    ).then(() => {
      unlockNow();
      warmAudio();
    }).catch(() => {
      unlockNow();
    });
  })();

  /* ------------------------------------------------------------
     1. 核心置顶心动计时器 (相守起始日: 2026-05-21 00:00:00)
     ------------------------------------------------------------ */
  const START_DATE = new Date('2026-05-21T00:00:00');
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');

  function updateTimer() {
    const now = new Date();
    let diff = now - START_DATE;
    if (diff < 0) diff = 0;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    if (daysEl) daysEl.textContent = days;
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
  }

  updateTimer();
  setInterval(updateTimer, 1000);


  /* ------------------------------------------------------------
     2. 信件逐页翻页控制器 (15页纯粹沉浸式手账)
     ------------------------------------------------------------ */
  const pages = document.querySelectorAll('.letter-page');
  const totalPages = pages.length;
  let currentPage = 1;

  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  const pageIndicatorPill = document.getElementById('pageIndicatorPill');
  const pageIndicatorText = document.getElementById('pageIndicatorText');
  const progressBarFill = document.getElementById('progressBarFill');
  const firstPageHint = document.getElementById('firstPageHint');

  function showPage(pageNumber) {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    currentPage = pageNumber;

    // 切换活动页面
    pages.forEach(p => {
      const pNum = parseInt(p.getAttribute('data-page'));
      if (pNum === currentPage) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    // 更新顶部与底部页码指示
    if (pageIndicatorText) {
      pageIndicatorText.textContent = `Page ${currentPage} / ${totalPages}`;
    }
    if (pageIndicatorPill) {
      pageIndicatorPill.textContent = `${currentPage} / ${totalPages}`;
    }

    // 更新顶部进度条
    if (progressBarFill) {
      const progressPercent = (currentPage / totalPages) * 100;
      progressBarFill.style.width = `${progressPercent}%`;
    }

    // 更新按钮状态
    if (prevBtn) {
      prevBtn.disabled = currentPage === 1;
    }
    if (nextBtn) {
      if (currentPage === totalPages) {
        nextBtn.innerHTML = '重温长信 ✦';
      } else {
        nextBtn.innerHTML = '下一页 <span class="btn-arrow">❯</span>';
      }
    }

    // 翻页后平滑滚动到信件顶部
    const letterBook = document.querySelector('.letter-book');
    if (letterBook) {
      const topOffset = letterBook.getBoundingClientRect().top + window.scrollY - 66;
      window.scrollTo({
        top: Math.max(0, topOffset),
        behavior: 'smooth'
      });
    }
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        showPage(currentPage - 1);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        showPage(currentPage + 1);
      } else {
        // 最后一页点击从头再看
        showPage(1);
      }
    });
  }

  // 第一页提示点击直接翻页
  if (firstPageHint) {
    firstPageHint.addEventListener('click', () => showPage(2));
  }

  // 手机端触摸滑动翻页 (Swipe Gesture)
  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchEndY = 0;
  let touchStartTarget = null;

  const letterViewport = document.querySelector('.letter-pages-viewport');
  if (letterViewport) {
    letterViewport.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
      touchStartTarget = e.target;
    }, { passive: true });

    letterViewport.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    }, { passive: true });
  }

  function handleSwipe() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // 水平轻扫距离大于40px，且横向位移大于纵向
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX < 0) {
        // 向左划 -> 下一页
        if (currentPage < totalPages) showPage(currentPage + 1);
      } else {
        // 向右划 -> 上一页
        if (currentPage > 1) showPage(currentPage - 1);
      }
    }
  }

  /* ------------------------------------------------------------
     3. 图片点击全屏大图预览 (Photo Modal)
     ------------------------------------------------------------ */
  const photoModal = document.getElementById('photoModal');
  const modalBigImg = document.getElementById('modalBigImg');
  const closePhotoModal = document.getElementById('closePhotoModal');
  const photoModalBackdrop = document.getElementById('photoModalBackdrop');

  const zoomableImgs = document.querySelectorAll('.zoomable-img');
  zoomableImgs.forEach(img => {
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      if (photoModal && modalBigImg) {
        modalBigImg.src = img.src;
        photoModal.classList.add('active');
      }
    });
  });

  function hidePhotoModal() {
    if (photoModal) photoModal.classList.remove('active');
  }

  if (closePhotoModal) closePhotoModal.addEventListener('click', hidePhotoModal);
  if (photoModalBackdrop) photoModalBackdrop.addEventListener('click', hidePhotoModal);


  /* ------------------------------------------------------------
     4. 背景音乐控制器
     ------------------------------------------------------------ */
  const musicBtn = document.getElementById('musicBtn');
  const musicDisc = document.getElementById('musicDisc');
  const bgmAudio = document.getElementById('bgmAudio');
  let isPlaying = false;

  if (musicBtn && bgmAudio) {
    musicBtn.addEventListener('click', () => {
      if (isPlaying) {
        bgmAudio.pause();
        musicDisc.classList.remove('playing');
        isPlaying = false;
      } else {
        bgmAudio.play().then(() => {
          musicDisc.classList.add('playing');
          isPlaying = true;
        }).catch(err => {
          console.log('播放被阻止或音频加载中:', err);
        });
      }
    });
  }


  /* ------------------------------------------------------------
     5. 浪漫星空背景 & 流星雨 Canvas 动画
     ------------------------------------------------------------ */
  const canvas = document.getElementById('star-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;
    let stars = [];
    let meteors = [];

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      initStars();
    }

    function initStars() {
      stars = [];
      const starCount = Math.floor((width * height) / 3800);
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.4 + 0.3,
          alpha: Math.random(),
          speed: Math.random() * 0.02 + 0.005,
          color: Math.random() > 0.2 ? '#ffffff' : (Math.random() > 0.5 ? '#ffeaa7' : '#a29bfe')
        });
      }
    }

    function createMeteor() {
      meteors.push({
        x: Math.random() * width * 1.2,
        y: Math.random() * (height * 0.4),
        length: Math.random() * 80 + 50,
        speed: Math.random() * 6 + 7,
        alpha: 1,
        angle: Math.PI / 4
      });
    }

    function scheduleMeteor() {
      setTimeout(() => {
        createMeteor();
        scheduleMeteor();
      }, Math.random() * 4000 + 3000);
    }
    scheduleMeteor();

    function renderStarrySky() {
      ctx.clearRect(0, 0, width, height);

      // 闪烁繁星
      for (let star of stars) {
        star.alpha += star.speed;
        if (star.alpha > 1 || star.alpha < 0.1) {
          star.speed = -star.speed;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = Math.max(0.1, Math.min(1, star.alpha));
        ctx.shadowBlur = star.radius * 3;
        ctx.shadowColor = star.color;
        ctx.fill();
      }

      // 浪漫流星
      for (let i = meteors.length - 1; i >= 0; i--) {
        let m = meteors[i];
        ctx.save();
        ctx.globalAlpha = m.alpha;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.6;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffeaa7';

        const headX = m.x;
        const headY = m.y;
        const tailX = m.x - Math.cos(m.angle) * m.length;
        const tailY = m.y - Math.sin(m.angle) * m.length;

        const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
        grad.addColorStop(0, 'rgba(255, 234, 167, 0)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 1)');
        ctx.strokeStyle = grad;

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();
        ctx.restore();

        m.x += Math.cos(m.angle) * m.speed;
        m.y += Math.sin(m.angle) * m.speed;
        m.alpha -= 0.012;

        if (m.alpha <= 0 || m.x > width + 100 || m.y > height + 100) {
          meteors.splice(i, 1);
        }
      }

      requestAnimationFrame(renderStarrySky);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    renderStarrySky();
  }


  /* ------------------------------------------------------------
     6. 第 14 页：双向奔赴星光轨迹交互 (Mutual Approach Interaction)
     ------------------------------------------------------------ */
  const stepForwardBtn = document.getElementById('stepForwardBtn');
  const stepDistanceNum = document.getElementById('stepDistanceNum');
  const runnerBoy = document.getElementById('runnerBoy');
  const runnerGirl = document.getElementById('runnerGirl');
  const trackSparkle = document.getElementById('trackSparkle');

  if (stepForwardBtn && stepDistanceNum && runnerBoy && runnerGirl) {
    const stages = [
      { dist: '99 步', boyX: 0, girlX: 0, text: '🐾 戳一戳，朝彼此走一步', sparkle: '❤️' },
      { dist: '66 步', boyX: 35, girlX: -35, text: '🏃 跑向你，风也是甜的', sparkle: '💖' },
      { dist: '33 步', boyX: 70, girlX: -70, text: '💫 马上就能牵到你啦', sparkle: '✨' },
      { dist: '0 步 · 抱紧你啦！', boyX: 105, girlX: -105, text: '✨ 抓紧你的手，再也不放开 💕', sparkle: '👩‍❤️‍👨' }
    ];
    let currentStageIndex = 0;

    stepForwardBtn.addEventListener('click', () => {
      currentStageIndex = (currentStageIndex + 1) % stages.length;
      const stage = stages[currentStageIndex];

      // 更新距离文案与小人位移
      stepDistanceNum.textContent = stage.dist;
      runnerBoy.style.transform = `translateX(${stage.boyX}px)`;
      runnerGirl.style.transform = `translateX(${stage.girlX}px)`;
      stepForwardBtn.innerHTML = `<span class="step-btn-icon">🐾</span> ${stage.text}`;
      if (trackSparkle) {
        trackSparkle.textContent = stage.sparkle;
      }

      // 迸发浪漫爱心粒子特效
      const btnRect = stepForwardBtn.getBoundingClientRect();
      const centerX = btnRect.left + btnRect.width / 2;
      const centerY = btnRect.top + btnRect.height / 2;
      const heartSymbols = ['❤️', '💖', '✨', '🌸', '💫', '🤍'];
      const burstCount = currentStageIndex === 3 ? 16 : 6;
      for (let i = 0; i < burstCount; i++) {
        const p = document.createElement('span');
        p.className = 'click-particle';
        p.textContent = heartSymbols[Math.floor(Math.random() * heartSymbols.length)];
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 65 + 25;
        p.style.left = `${centerX}px`;
        p.style.top = `${centerY}px`;
        p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1000);
      }
    });
  }

  /* ------------------------------------------------------------
     7. 点击/触摸迸发星光微粒特效
     ------------------------------------------------------------ */
  const particles = ['✨', '💫', '✦', '🤍', '⭐'];
  
  function spawnParticle(x, y) {
    const p = document.createElement('span');
    p.className = 'click-particle';
    p.textContent = particles[Math.floor(Math.random() * particles.length)];
    
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 45 + 25;
    const dx = Math.cos(angle) * distance + 'px';
    const dy = Math.sin(angle) * distance + 'px';
    
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.setProperty('--dx', dx);
    p.style.setProperty('--dy', dy);
    
    document.body.appendChild(p);
    
    setTimeout(() => {
      p.remove();
    }, 1000);
  }

  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.nav-btn') || e.target.closest('.modal-close') || e.target.closest('#stepForwardBtn')) return;
    for (let i = 0; i < 2; i++) {
      spawnParticle(e.clientX, e.clientY);
    }
  }, { passive: true });

});
