const Util = (() => {
  function pad(n) { return String(n).padStart(2, '0'); }

  function localDate(d = new Date()) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return null;
    return d;
  }

  function addDaysStr(s, n) {
    const d = parseDate(s);
    if (!d) return s;
    d.setDate(d.getDate() + n);
    return localDate(d);
  }

  function weekdayLabel(s) {
    const d = parseDate(s);
    if (!d) return '';
    return '周' + '日一二三四五六'[d.getDay()];
  }

  function pretty(s) {
    const d = parseDate(s);
    if (!d) return s || '';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function toast(msg) {
    const box = document.getElementById('toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2400);
    setTimeout(() => el.remove(), 2800);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('已复制');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        toast('已复制');
      } catch (err) {
        toast('复制失败');
      }
      ta.remove();
    }
  }

  function buzz() {
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* 忽略 */ }
  }

  return { pad, localDate, parseDate, addDaysStr, weekdayLabel, pretty, esc, uid, toast, copyText, buzz };
})();
