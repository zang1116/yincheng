/**
 * 离线语义识别。
 * 做法参考开源快速添加：open-todoist、OmniFocus NLInbox、tasknotes-nlp-core。
 * 只抽取原文里出现的日期和时间，不猜测主题，也不把没写日期的句子改成今天。
 */
const Nlp = (() => {
  function pad(n) { return String(n).padStart(2, '0'); }
  function start(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  }
  function localDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function cnSmall(s) {
    const map = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    if (!s) return null;
    if (/^\d+$/.test(s)) return +s;
    if (s === '十') return 10;
    const i = s.indexOf('十');
    if (i >= 0) {
      const tens = i === 0 ? 1 : map[s[0]];
      const ones = s.slice(i + 1);
      if (tens == null) return null;
      if (!ones) return tens * 10;
      if (map[ones] == null) return null;
      return tens * 10 + map[ones];
    }
    return s.length === 1 ? (map[s] ?? null) : null;
  }

  function weekdayIndex(ch) {
    return { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 }[ch];
  }

  function weekdayOfWeek(today, weekday, weekOffset) {
    const base = start(today);
    const day = base.getDay();
    const mondayDelta = day === 0 ? -6 : 1 - day;
    const monday = addDays(base, mondayDelta + weekOffset * 7);
    const add = weekday === 0 ? 6 : weekday - 1;
    return addDays(monday, add);
  }

  function upcomingWeekday(today, weekday) {
    const base = start(today);
    const delta = (weekday - base.getDay() + 7) % 7;
    return addDays(base, delta);
  }

  const CUE_RE = /大后天|后天|明天|今天|今日|下下周|下周|本周|这周|周末|\d{4}\s*[-/.年]\s*\d{1,2}|\d{1,2}\s*月\s*\d{1,2}\s*[日号]|\d+\s*天后|[一二两三四五六七八九十]{1,3}\s*天后|(?:周|星期)\s*[一二三四五六日天]/g;

  function cueCount(s) {
    return (s.match(CUE_RE) || []).length;
  }

  function splitByCue(line) {
    if (cueCount(line) < 2) return [line];
    const parts = line.split(/(?<!大)(?<!下)(?=(?:大后天|后天|明天|今天|今日|下下周|下周|本周|这周|\d{1,2}\s*月\s*\d{1,2}\s*[日号]))/)
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length ? parts : [line];
  }

  function chunksOf(text) {
    const lines = String(text || '').split(/\n+|；|;|。/).map((s) => s.trim()).filter(Boolean);
    const items = [];
    lines.forEach((line, gi) => {
      const bits = line.split(/[，、]/).map((s) => s.trim()).filter(Boolean);
      const inherit = bits.length > 1 && bits.some((b) => cueCount(b) > 0);
      const pieces = inherit ? bits : splitByCue(line);
      const group = gi + (inherit ? ':c' : ':s');
      pieces.forEach((p) => items.push({ text: p, group }));
    });
    return items;
  }

  function extractTime(text) {
    let t = text;
    let time = '';
    const clock = t.match(/(凌晨|清晨|早上|上午|中午|下午|傍晚|晚上)?\s*(\d{1,2}):(\d{2})(?:\s*左右)?/);
    if (clock) {
      let h = +clock[2];
      const m = +clock[3];
      const period = clock[1] || '';
      if (h >= 0 && h < 24 && m >= 0 && m < 60) {
        if ((period === '下午' || period === '晚上' || period === '傍晚') && h < 12) h += 12;
        if (period === '中午' && h < 11) h += 12;
        if (period === '凌晨' && h === 12) h = 0;
        time = pad(h) + ':' + pad(m);
        t = t.replace(clock[0], ' ');
        return { text: t, time };
      }
    }
    const spoken = t.match(/(凌晨|清晨|早上|上午|中午|下午|傍晚|晚上)?\s*(\d{1,2}|[零一二两三四五六七八九十]{1,3})\s*[点时](?:\s*(半|(\d{1,2})\s*分?))?(?:\s*左右)?/);
    if (spoken) {
      let h = /^\d+$/.test(spoken[2]) ? +spoken[2] : cnSmall(spoken[2]);
      let min = 0;
      if (spoken[3] === '半') min = 30;
      else if (spoken[4]) min = +spoken[4];
      const period = spoken[1] || '';
      if (h != null && h <= 24 && min >= 0 && min < 60) {
        if ((period === '下午' || period === '晚上' || period === '傍晚') && h < 12) h += 12;
        if (period === '中午' && h < 11) h += 12;
        if (period === '凌晨' && h === 12) h = 0;
        if (h === 24) h = 0;
        if (h >= 0 && h <= 23) {
          time = pad(h) + ':' + pad(min);
          t = t.replace(spoken[0], ' ');
        }
      }
    }
    return { text: t, time };
  }

  function take(text, re, toDate) {
    const m = text.match(re);
    if (!m) return null;
    const d = toDate(m);
    if (!d || Number.isNaN(d.getTime())) return null;
    return { text: text.replace(m[0], ' '), date: localDate(d) };
  }

  function extractDate(text, today) {
    const y = today.getFullYear();
    let hit = take(text, /(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?/, (m) => {
      const d = new Date(+m[1], +m[2] - 1, +m[3]);
      if (d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return null;
      return d;
    });
    if (hit) return hit;

    hit = take(text, /(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/, (m) => {
      const d = new Date(y, +m[1] - 1, +m[2]);
      if (d.getMonth() !== +m[1] - 1 || d.getDate() !== +m[2]) return null;
      return d;
    });
    if (hit) return hit;

    hit = take(text, /(大后天|后天|明天|今天|今日)/, (m) => {
      const map = { 今天: 0, 今日: 0, 明天: 1, 后天: 2, 大后天: 3 };
      return addDays(today, map[m[1]]);
    });
    if (hit) return hit;

    hit = take(text, /(下下|下|本|这)?\s*周末/, (m) => {
      const which = m[1] || '';
      if (!which) {
        const day = today.getDay();
        if (day === 6 || day === 0) return today;
        return upcomingWeekday(today, 6);
      }
      const off = which === '下下' ? 2 : which === '下' ? 1 : 0;
      return weekdayOfWeek(today, 6, off);
    });
    if (hit) return hit;

    hit = take(text, /(下下|下|本|这)?\s*(?:周|星期)\s*([一二三四五六日天])/, (m) => {
      const wd = weekdayIndex(m[2]);
      if (wd == null) return null;
      if (m[1] === '下') return weekdayOfWeek(today, wd, 1);
      if (m[1] === '下下') return weekdayOfWeek(today, wd, 2);
      if (m[1] === '本' || m[1] === '这') return weekdayOfWeek(today, wd, 0);
      return upcomingWeekday(today, wd);
    });
    if (hit) return hit;

    hit = take(text, /(\d+|[一二两三四五六七八九十]{1,3})\s*天后/, (m) => {
      const n = cnSmall(m[1]);
      if (n == null || n < 0 || n > 366) return null;
      return addDays(today, n);
    });
    if (hit) return hit;
    return { text, date: '' };
  }

  function cleanTitle(s) {
    return s
      .replace(/^\s*(?:之前|以前)\s*/, '')
      .replace(/^\s*前(?!提条件|前面|前者|前进|前方)/, '')
      .replace(/[，,。；;、]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^[\s:：\-—~～]+|[\s:：\-—~～]+$/g, '')
      .trim();
  }

  function parseChunk(raw, today) {
    const memo = raw.match(/^\s*(?:备忘|记下|备注|灵感|想法)\s*[:：]?\s*(.*)$/);
    if (memo) {
      const content = cleanTitle(memo[1]);
      return content ? { memo: content } : null;
    }
    const timed = extractTime(raw);
    const dated = extractDate(timed.text, today);
    const title = cleanTitle(dated.text);
    if (!title) return (dated.date || timed.time) ? { empty: true, date: dated.date, time: timed.time } : null;
    return { title, date: dated.date, time: timed.time };
  }

  function parseText(text, now) {
    const today = start(now || new Date());
    const tasks = [];
    const memos = [];
    let carryGroup = null;
    let carry = '';
    chunksOf(text).forEach((item) => {
      const parsed = parseChunk(item.text, today);
      if (!parsed) return;
      if (parsed.memo) {
        memos.push({ content: parsed.memo });
        return;
      }
      if (item.group !== carryGroup) {
        carryGroup = item.group;
        carry = '';
      }
      if (parsed.empty) {
        if (parsed.date) carry = parsed.date;
        return;
      }
      const date = parsed.date || carry || '';
      if (date) carry = date;
      tasks.push({ title: parsed.title, date, time: parsed.time || '', note: '' });
    });
    return { tasks, memos };
  }

  return { parseText };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Nlp;
if (typeof window !== 'undefined') window.Nlp = Nlp;
