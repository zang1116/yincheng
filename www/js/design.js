/**
 * 板块外观沙箱。
 * Agent 可以改某一块的 CSS 和少量 HTML，但不能写脚本、引外部资源，也不能把样式漏到别的板块。
 */
const Design = (() => {
  const ALLOWED = new Set(['DIV', 'P', 'SPAN', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'BR', 'SMALL', 'HEADER']);
  const BANNED = /@import|expression\s*\(|javascript:|behavior\s*:|-moz-binding|@charset|@namespace|url\s*\(|position\s*:\s*fixed|position\s*:\s*sticky|<script|<\/script|<\/style/i;

  function facts() {
    const s = Store.get();
    const today = Util.localDate();
    const streak = countStreak(s);
    const todayTasks = s.tasks.filter((t) => t.date === today && !t.done).map((t) => t.title);
    const openTasks = s.tasks.filter((t) => !t.done).slice(0, 8).map((t) => (t.date ? Util.pretty(t.date) + ' ' : '') + t.title);
    const memos = s.memos.slice(0, 5).map((m) => m.content);
    return {
      date: Util.esc(Util.pretty(today) + ' ' + Util.weekdayLabel(today)),
      streak: Util.esc(String(streak)),
      today_tasks: Util.esc(todayTasks.join('、') || '今天没有未完成任务'),
      open_tasks: Util.esc(openTasks.join('；') || '没有未完成任务'),
      memos: Util.esc(memos.join('；') || '没有备忘'),
    };
  }

  function countStreak(s) {
    const set = new Set(s.checkins || []);
    (s.tasks || []).forEach((t) => { if (t.done && t.doneOn) set.add(t.doneOn); });
    let day = Util.localDate();
    if (!set.has(day)) day = Util.addDaysStr(day, -1);
    let n = 0;
    while (set.has(day) && n < 4000) {
      n += 1;
      day = Util.addDaysStr(day, -1);
    }
    return n;
  }

  function fill(html, bag) {
    return String(html || '').replace(/\{\{(date|streak|today_tasks|open_tasks|memos)\}\}/g, (_, key) => (bag && bag[key]) || '');
  }

  function sanitizeHtml(input) {
    const raw = String(input || '').slice(0, 4000);
    if (!raw.trim() || BANNED.test(raw)) return '';
    const doc = new DOMParser().parseFromString('<div>' + raw + '</div>', 'text/html');
    const root = doc.body.firstElementChild;
    if (!root) return '';
    const clean = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) return;
        if (child.nodeType !== 1 || !ALLOWED.has(child.tagName)) {
          child.remove();
          return;
        }
        [...child.attributes].forEach((attr) => child.removeAttribute(attr.name));
        clean(child);
      });
    };
    clean(root);
    return root.innerHTML;
  }

  function scopeCss(panelId, css) {
    const id = String(panelId || '').replace(/[^a-zA-Z0-9_\-]/g, '');
    if (!id) return '';
    let text = String(css || '').slice(0, 4000);
    text = text.replace(/\/\*[\s\S]*?\*\//g, '');
    if (!text.trim() || /[<>]/.test(text) || BANNED.test(text)) return '';
    const scope = '[data-panel="' + id + '"]';
    return text.split('}').map((chunk) => {
      const i = chunk.indexOf('{');
      if (i < 0) return '';
      let sel = chunk.slice(0, i).trim();
      const body = chunk.slice(i + 1);
      if (!sel || !body.trim() || BANNED.test(sel) || BANNED.test(body)) return '';
      if (sel !== scope) {
        sel = sel.split(',').map((part) => {
          const p = part.trim();
          if (!p || p.indexOf(scope) === 0) return p;
          return scope + ' ' + p;
        }).filter(Boolean).join(', ');
      }
      return sel + ' {' + body + '}';
    }).filter(Boolean).slice(0, 40).join('\n');
  }

  return { facts, fill, sanitizeHtml, scopeCss };
})();
