/**
 * 桌宠层：主题精灵（奶龙/奶蛙）可拖动；大肥鱼为 DeepSeek 社区梗二创桌宠体验，可开关。
 * 非 DSH 原生插件，状态与对话走本机模型密钥。
 */
const Pet = (() => {
  const FISH_SVG = `<svg class="fish-svg" viewBox="0 0 120 80" aria-hidden="true">
    <ellipse class="fish-body" cx="58" cy="42" rx="38" ry="24"/>
    <path class="fish-tail" d="M22 42 L6 24 L10 42 L6 60 Z"/>
    <ellipse class="fish-belly" cx="62" cy="50" rx="24" ry="12"/>
    <circle class="fish-eye" cx="78" cy="36" r="5.5"/>
    <circle class="fish-pupil" cx="79.5" cy="36" r="2.2"/>
    <path class="fish-fin" d="M48 28 Q58 12 70 26"/>
    <path class="fish-smile" d="M84 46 Q90 50 84 54"/>
  </svg>`;

  let root = null;
  let buddyEl = null;
  let fishEl = null;
  let status = 'idle';
  let drag = null;
  let onOpenBuddy = null;
  let onOpenFish = null;
  let getState = null;

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function ensureRoot() {
    if (root) return root;
    root = document.createElement('div');
    root.className = 'pet-layer';
    root.id = 'petLayer';
    document.body.appendChild(root);
    return root;
  }

  function stateApi() {
    if (!getState) return null;
    // app 传入对象；也兼容 () => api 的写法
    return typeof getState === 'function' ? getState() : getState;
  }

  function savePos(key, x, y) {
    const api = stateApi();
    if (api && typeof api.savePos === 'function') api.savePos(key, x, y);
  }

  function readPos(key, fallback) {
    const api = stateApi();
    if (!api || typeof api.pos !== 'function') return fallback;
    return api.pos(key) || fallback;
  }

  function bindDrag(el, key) {
    const start = (clientX, clientY) => {
      const r = el.getBoundingClientRect();
      drag = {
        el, key,
        ox: clientX - r.left,
        oy: clientY - r.top,
        moved: false,
        sx: clientX,
        sy: clientY,
      };
      el.classList.add('dragging');
    };
    const move = (clientX, clientY) => {
      if (!drag || drag.el !== el) return;
      if (Math.abs(clientX - drag.sx) + Math.abs(clientY - drag.sy) > 6) drag.moved = true;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const x = clamp(clientX - drag.ox, 4, window.innerWidth - w - 4);
      const y = clamp(clientY - drag.oy, 4, window.innerHeight - h - 4);
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    };
    const end = () => {
      if (!drag || drag.el !== el) return;
      const moved = drag.moved;
      const r = el.getBoundingClientRect();
      savePos(key, Math.round(r.left), Math.round(r.top));
      drag = null;
      el.classList.remove('dragging');
      return moved;
    };

    el.addEventListener('pointerdown', (e) => {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      start(e.clientX, e.clientY);
    });
    el.addEventListener('pointermove', (e) => {
      move(e.clientX, e.clientY);
      if (drag && drag.el === fishEl && drag.moved && !drag._said) {
        drag._said = true;
        banter('drag');
      }
    });
    el.addEventListener('pointerup', (e) => {
      const moved = end();
      if (!moved) {
        if (el === buddyEl && onOpenBuddy) onOpenBuddy();
        if (el === fishEl) {
          banter('tap');
          // 短回嘴后再进对话页，更像桌宠
          clearTimeout(el._openTimer);
          el._openTimer = setTimeout(() => { if (onOpenFish) onOpenFish(); }, 380);
        }
      }
      try { el.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    el.addEventListener('pointercancel', () => { end(); });
  }

  function place(el, key, defX, defY) {
    const pos = readPos(key, null);
    const x = pos && typeof pos.x === 'number' ? pos.x : defX;
    const y = pos && typeof pos.y === 'number' ? pos.y : defY;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  }

  function showBubble(text, ms) {
    if (!fishEl) return;
    const bubble = fishEl.querySelector('.pet-bubble');
    if (!bubble) return;
    const t = String(text || '').trim();
    bubble.hidden = !t;
    bubble.textContent = t;
    clearTimeout(fishEl._bubbleTimer);
    if (t && ms !== 0) {
      fishEl._bubbleTimer = setTimeout(() => {
        if (status === 'idle' || status === 'done' || status === 'error') {
          bubble.hidden = true;
          if (status === 'done' || status === 'error') status = 'idle';
          fishEl.dataset.status = status;
        }
      }, ms || 2200);
    }
  }

  function setStatus(next) {
    status = next || 'idle';
    if (!fishEl) return;
    fishEl.dataset.status = status;
    const persona = window.FishPersona;
    let text = '';
    if (status === 'thinking' || status === 'looking') {
      text = persona ? persona.quip('busy') : '思考中…';
    } else if (status === 'done') {
      text = persona ? persona.quip('done') : '搞定啦';
    } else if (status === 'error') {
      text = persona ? persona.quip('error') : '翻车了';
    } else if (status === 'chat') {
      text = '嗯？说。';
    }
    showBubble(text, status === 'thinking' || status === 'looking' ? 0 : 2400);
  }

  function banter(kind) {
    const text = window.FishPersona ? FishPersona.quip(kind || 'tap') : '嗯？';
    showBubble(text, 2000);
    return text;
  }

  function renderBuddy(theme) {
    ensureRoot();
    if (!theme || !theme.avatar) {
      if (buddyEl) { buddyEl.remove(); buddyEl = null; }
      return;
    }
    if (!buddyEl) {
      buddyEl = document.createElement('button');
      buddyEl.type = 'button';
      buddyEl.className = 'pet-float pet-buddy';
      buddyEl.setAttribute('aria-label', '和精灵聊日常');
      root.appendChild(buddyEl);
      bindDrag(buddyEl, 'buddy');
    }
    buddyEl.innerHTML = `<img src="${theme.avatar}" alt="${theme.name || ''}" draggable="false" /><span class="pet-hint">日常</span>`;
    place(buddyEl, 'buddy', window.innerWidth - 88, Math.max(120, window.innerHeight - 220));
  }

  function renderFish(on) {
    ensureRoot();
    if (!on) {
      if (fishEl) { fishEl.remove(); fishEl = null; }
      return;
    }
    if (!fishEl) {
      fishEl = document.createElement('button');
      fishEl.type = 'button';
      fishEl.className = 'pet-float pet-fish';
      fishEl.dataset.status = 'idle';
      fishEl.setAttribute('aria-label', '大肥鱼');
      fishEl.innerHTML = `<img class="fish-avatar-img" src="assets/themes/fish/avatar.png" alt="" draggable="false" /><span class="pet-bubble" hidden></span>`;
      root.appendChild(fishEl);
      bindDrag(fishEl, 'fish');
    }
    place(fishEl, 'fish', 16, Math.max(100, window.innerHeight - 240));
    setStatus(status);
  }

  function sync(opts) {
    opts = opts || {};
    getState = opts.state || getState;
    onOpenBuddy = opts.onOpenBuddy || onOpenBuddy;
    onOpenFish = opts.onOpenFish || onOpenFish;
    renderBuddy(opts.theme);
    renderFish(!!opts.dafeiyu);
    if (opts.status) setStatus(opts.status);
  }

  function hideDuring(view) {
    ensureRoot();
    root.classList.toggle('pet-hidden', view === 'buddy' || view === 'fish');
  }

  return { sync, setStatus, hideDuring, banter, showBubble };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Pet;
if (typeof window !== 'undefined') window.Pet = Pet;
