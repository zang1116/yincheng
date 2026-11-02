/**
 * 把学生日常说的话先在本机认出来。
 * 覆盖：课表、作业截止、考试复习、查今日、调课、社团、提醒、饮食、完成打卡、条件删除等。
 * 认不准就追问，不把没说清的事情写进日程。
 */
const Intent = (() => {
  const FOOD = {
    米饭: 230, 面条: 350, 馒头: 220, 牛奶: 140, 鸡蛋: 75, 鸡胸: 160, 沙拉: 90,
    奶茶: 320, 炸鸡: 520, 汉堡: 540, 薯条: 340, 可乐: 140, 咖啡: 20, 苹果: 80,
    香蕉: 90, 酸奶: 100, 包子: 230, 饺子: 420, 盖浇饭: 650, 麻辣烫: 480,
    火锅: 800, 面包: 250, 燕麦: 160, 牛肉面: 560, 鸡腿: 220, 番茄: 25,
    青菜: 40, 豆腐: 80, 粥: 120, 玉米: 110, 坚果: 180, 巧克力: 230,
  };
  const WD = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };
  const SLOT = { 上午: ['08:30', '10:10'], 下午: ['14:00', '15:40'], 晚上: ['19:00', '20:40'], 中午: ['12:10', '13:00'] };

  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function start(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function add(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function parse(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function addStr(s, n) { return iso(add(parse(s), n)); }

  function nextWeekStart(now) {
    const base = start(now);
    const day = base.getDay() || 7;
    return add(base, 8 - day);
  }
  function weekdayOf(now, which, n) {
    const base = start(now);
    if (which === 'next') {
      const startMon = nextWeekStart(now);
      return add(startMon, n - 1);
    }
    const day = base.getDay() || 7;
    const monday = add(base, 1 - day);
    const date = add(monday, n - 1);
    return date < base ? add(date, 7) : date;
  }

  function cnNum(ch) {
    return { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 半: 0.5 }[ch] || 1;
  }

  function mealName(text) {
    if (/早餐|早上|清晨/.test(text)) return '早餐';
    if (/午餐|中午|午饭/.test(text)) return '午餐';
    if (/夜宵|宵夜/.test(text)) return '夜宵';
    if (/晚餐|晚上|晚饭/.test(text)) return '晚餐';
    return '加餐';
  }

  function foodsIn(text) {
    const known = [];
    const unknown = [];
    const parts = text.split(/[，,、和跟以及加]+/).map((s) => s.trim()).filter(Boolean);
    const names = Object.keys(FOOD).sort((a, b) => b.length - a.length);
    parts.forEach((part) => {
      const hit = names.find((n) => part.indexOf(n) >= 0);
      if (!hit) {
        const bare = part.replace(/今天|我|吃了|喝了|早餐|午餐|晚餐|中午|早上|晚上|夜宵|大概|约|了/g, '').trim();
        if (bare && bare.length <= 12) unknown.push(bare);
        return;
      }
      const qty = part.match(/([一二两三四五六半]|\d+(?:\.\d+)?)\s*(?:个|份|碗|杯|瓶|根|片|块)?/);
      let n = 1;
      if (qty) n = /^\d/.test(qty[1]) ? parseFloat(qty[1]) : cnNum(qty[1]);
      if (!n || n <= 0) n = 1;
      known.push({ name: hit, count: n, kcal: Math.round(FOOD[hit] * n) });
    });
    return { known, unknown };
  }

  function resolveDate(raw, now) {
    const today = start(now);
    if (/大后天/.test(raw)) return iso(add(today, 3));
    if (/后天/.test(raw)) return iso(add(today, 2));
    if (/明天|明日/.test(raw)) return iso(add(today, 1));
    if (/今天|今日/.test(raw)) return iso(today);
    const fullMd = raw.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/);
    if (fullMd) return fullMd[1] + '-' + pad(+fullMd[2]) + '-' + pad(+fullMd[3]);
    const md = raw.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/);
    if (md) return today.getFullYear() + '-' + pad(+md[1]) + '-' + pad(+md[2]);
    const isoHit = raw.match(/(20\d{2}-\d{2}-\d{2})/);
    if (isoHit) return isoHit[1];
    const wd = raw.match(/(下下|下|本|这)?\s*(?:周|星期)\s*([一二三四五六日天])/);
    if (wd) {
      const which = wd[1] === '下' || wd[1] === '下下' ? 'next' : 'this';
      const base = which === 'next'
        ? (wd[1] === '下下' ? add(nextWeekStart(now), 7) : nextWeekStart(now))
        : null;
      if (base) return iso(add(base, WD[wd[2]] - 1));
      return iso(weekdayOf(now, 'this', WD[wd[2]]));
    }
    if (/周末/.test(raw)) {
      const day = today.getDay();
      if (day === 6 || day === 0) return iso(today);
      return iso(add(today, 6 - day));
    }
    return '';
  }

  function resolveTime(raw) {
    const clock = raw.match(/(上午|下午|晚上|中午|早上)?\s*(\d{1,2})\s*(?:[:：点时])\s*(\d{1,2})?/);
    if (clock) {
      let h = parseInt(clock[2], 10);
      const m = clock[3] != null && clock[3] !== '' ? parseInt(clock[3], 10) : 0;
      const period = clock[1] || '';
      if ((period === '下午' || period === '晚上') && h < 12) h += 12;
      if (period === '中午' && h < 11) h += 12;
      if (h >= 0 && h <= 23 && m >= 0 && m < 60) return pad(h) + ':' + pad(m);
    }
    const slot = Object.keys(SLOT).find((k) => raw.indexOf(k) >= 0);
    return slot ? SLOT[slot][0] : '';
  }

  function clock(hour, minute, period) {
    let h = parseInt(hour, 10);
    const m = minute == null || minute === '' ? 0 : parseInt(minute, 10);
    if ((period === '下午' || period === '晚上' || period === '傍晚') && h < 12) h += 12;
    if (period === '中午' && h < 12) h += 12;
    if (!(h >= 0 && h <= 23 && m >= 0 && m < 60)) return '';
    return pad(h) + ':' + pad(m);
  }

  function resolvePlanTimeRange(raw) {
    const range = String(raw || '').match(/(晚上|下午|上午|早上|中午)?\s*(\d{1,2})\s*[:：点时]\s*(\d{1,2})?\s*(?:-|~|～|到|至)\s*(晚上|下午|上午|早上|中午)?\s*(\d{1,2})\s*[:：点时]\s*(\d{1,2})?/);
    if (!range) return null;
    const firstPeriod = range[1] || '';
    const secondPeriod = range[4] || firstPeriod;
    const startTime = clock(range[2], range[3], firstPeriod);
    const endTime = clock(range[5], range[6], secondPeriod);
    return startTime && endTime ? { startTime, endTime } : null;
  }

  function parseEndDate(raw, now, from) {
    const explicit = raw.match(/(?:排到|到|至|截止|持续到)\s*(20\d{2}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*[日号]?|20\d{2}-\d{2}-\d{2}|\d{1,2}\s*月\s*\d{1,2}\s*[日号]?)/);
    if (!explicit) return '';
    let value = resolveDate(explicit[1], now);
    if (!value) return '';
    if (from && value < from) {
      const d = parse(value);
      value = (d.getFullYear() + 1) + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }
    return value;
  }

  function addClockMinutes(time, minutes) {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time || '');
    if (!m) return '';
    const total = Math.min(23 * 60 + 59, +m[1] * 60 + +m[2] + minutes);
    return pad(Math.floor(total / 60)) + ':' + pad(total % 60);
  }

  function planBusyMap(state, from, to) {
    const map = {};
    (state.tasks || []).forEach((task) => {
      if (!task.date || task.date < from || task.date > to) return;
      if (!Array.isArray(map[task.date])) map[task.date] = [];
      if (task.allDay) map[task.date].push(['00:00', '23:59']);
      else if (task.time) map[task.date].push([task.time, task.endTime || addClockMinutes(task.time, 60)]);
    });
    if (typeof Timetable !== 'undefined' && state.courses) {
      let date = from;
      while (date <= to) {
        Timetable.onDate(state.courses, date, state.term).forEach((course) => {
          if (!course.startTime) return;
          if (!Array.isArray(map[date])) map[date] = [];
          map[date].push([course.startTime, course.endTime || addClockMinutes(course.startTime, 90)]);
        });
        date = addStr(date, 1);
      }
    }
    return map;
  }

  function planAction(plan) {
    return {
      type: 'create_study_plan',
      from: plan.from,
      to: plan.to,
      slots: plan.slots,
      subjects: plan.subjects,
      excludeDates: plan.excludeDates || [],
      durationMinutes: plan.durationMinutes || 60,
      windowStart: plan.windowStart || '',
      windowEnd: plan.windowEnd || '',
      busyByDate: plan.busyByDate || {},
      category: plan.category || 'study',
    };
  }

  function isPlanDraftFollowup(raw) {
    return /^(可以|好的?|开始|确认|重新执行|按这个|照这个|继续)$/.test(String(raw || '').trim())
      || /从|自|排到|到|元旦|不固定|有空|空档|调整|晚上|早上|下午|\d{1,2}\s*[:：点时]/.test(String(raw || ''));
  }

  function courseClauses(text) {
    const courses = [];
    const bits = text.split(/[，,；;。]/).map((s) => s.trim()).filter(Boolean);
    let place = '';
    let lastSlot = null;
    let weeksText = '';
    const placeHit = text.match(/(?:地点|在|教室)\s*([^\s，,。]{2,16})/);
    if (placeHit) place = placeHit[1];
    const weekHit = text.match(/(\d{1,2}\s*[-~到至]\s*\d{1,2}\s*(?:周)?(?:\([单双]\)|（[单双]）)?|单周|双周|全学期|\d{1,2}\s*[-~到至]\s*\d{1,2}\(单\)|\d{1,2}\s*[-~到至]\s*\d{1,2}\(双\))/);
    if (weekHit) weeksText = weekHit[1].replace(/\s+/g, '');
    bits.forEach((bit) => {
      const days = [];
      const compact = bit.match(/周([一二三四五六日天]{2,7})/) || bit.match(/^([一二三四五六日天]{2,7})/);
      if (compact) {
        compact[1].split('').forEach((ch) => { if (WD[ch]) days.push(WD[ch]); });
      } else {
        const one = bit.match(/周([一二三四五六日天])/);
        if (one) days.push(WD[one[1]]);
      }
      if (!days.length) return;
      let slot = null;
      let sectionStart = 0;
      let sectionEnd = 0;
      const sec = bit.match(/第?\s*(\d{1,2})\s*[-~到至]\s*(\d{1,2})\s*节/);
      if (sec) {
        sectionStart = +sec[1];
        sectionEnd = +sec[2];
        if (typeof Timetable !== 'undefined') slot = Timetable.sectionSpan(sectionStart, sectionEnd);
      } else {
        Object.keys(SLOT).forEach((k) => { if (bit.indexOf(k) >= 0) slot = SLOT[k]; });
      }
      if (!slot) slot = lastSlot;
      if (slot) lastSlot = slot;
      let title = bit
        .replace(/^.*周[一二三四五六日天]+|^[一二三四五六日天]{2,7}/, '')
        .replace(/第?\s*\d{1,2}\s*[-~到至]\s*\d{1,2}\s*节/g, '')
        .replace(/上午|下午|晚上|中午|下周|这周|帮我|排课|课程|安排|课表|写进/g, '')
        .replace(/\d{1,2}\s*[-~到至]\s*\d{1,2}\s*(?:周)?(?:\([单双]\)|（[单双]）)?|单周|双周|全学期/g, '')
        .replace(/(?:地点|在|教室)\s*[^\s，,。]{2,16}/g, '')
        .replace(/^[:：\s]+|的$/g, '')
        .trim();
      if (!title) return;
      days.forEach((n) => courses.push({
        name: title,
        weekday: n,
        startTime: slot ? slot[0] : '',
        endTime: slot ? slot[1] : '',
        sectionStart: sectionStart || undefined,
        sectionEnd: sectionEnd || undefined,
        weeksText: weeksText || '1-16周',
        location: place,
      }));
    });
    return courses;
  }

  function deleteFilterFrom(raw) {
    const keepUnrelated = raw.match(/删[除掉]?(?:所有|全部)?跟?(.{1,12}?)无关/);
    if (keepUnrelated) {
      return { keep: keepUnrelated[1].replace(/的|有关|日程|任务/g, '').trim(), label: '只留下和「' + keepUnrelated[1] + '」有关的' };
    }
    const onlyKeep = raw.match(/(?:只保留|只留|留下)(.{1,12}?)(?:相关|有关|的日程|日程|任务|$)/);
    if (onlyKeep) {
      return { keep: onlyKeep[1].replace(/相关|有关|的/g, '').trim(), label: '只保留「' + onlyKeep[1] + '」' };
    }
    const drop = raw.match(/删[除掉]?(?:所有|全部)?(.{1,12}?)(?:相关|有关)?(?:的)?(?:日程|任务|安排)/);
    if (drop && !/无关/.test(raw)) {
      const word = drop[1].replace(/相关|有关|的/g, '').trim();
      if (word && word.length <= 10) return { exclude: word, label: '删掉含「' + word + '」的' };
    }
    return null;
  }

  function findTasks(state, word, now) {
    const today = iso(start(now));
    return (state.tasks || []).filter((t) => !t.done && t.title && t.title.indexOf(word) >= 0)
      .sort((a, b) => {
        const da = a.date || '9999';
        const db = b.date || '9999';
        const pa = da < today ? 1 : 0;
        const pb = db < today ? 1 : 0;
        if (pa !== pb) return pa - pb;
        return da.localeCompare(db);
      });
  }

  function titleFrom(raw, drop) {
    let t = raw;
    (drop || []).forEach((re) => { t = t.replace(re, ' '); });
    return t.replace(/\s+/g, ' ').replace(/^[:：\s]+|[:：\s]+$/g, '').trim().slice(0, 40);
  }

  function summarizeDay(st, date, term) {
    const tasks = (st.tasks || []).filter((t) => t.date === date).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    const courses = (typeof Timetable !== 'undefined' && st.courses)
      ? Timetable.onDate(st.courses, date, term || st.term)
      : [];
    const lines = [];
    courses.forEach((c) => lines.push('课 · ' + (c.startTime || '') + ' ' + c.name + (c.location ? ' @' + c.location : '')));
    tasks.forEach((t) => lines.push((t.done ? '✓ ' : '') + (t.time || '全天') + ' ' + t.title));
    return { tasks, courses, lines };
  }

  function interpret(text, state, now) {
    const raw = String(text || '').trim();
    const st = state || { tasks: [], meals: [], courses: [], pending: null };
    const today = iso(start(now || new Date()));
    if (!raw) return { handled: false };

    // —— 饮食追问续写 ——
    if (st.pending && st.pending.type === 'food') {
      const kcal = raw.match(/(\d{2,4})\s*(?:千卡|大卡|卡)?/);
      if (kcal || /不知道|不清楚|随便/.test(raw)) {
        const extra = kcal ? parseInt(kcal[1], 10) : 0;
        const items = st.pending.known.concat(extra ? [{ name: st.pending.unknown.join('、'), count: 1, kcal: extra }] : []);
        const total = items.reduce((s, i) => s + i.kcal, 0);
        return {
          handled: true,
          clearPending: true,
          reply: extra
            ? '按你说的先记上，这一顿大约 ' + total + ' 千卡。'
            : '那一笔先按已知的食物记。不确定的部分没有算进热量。',
          actions: [{
            type: 'log_food',
            meal: {
              date: st.pending.date, name: st.pending.meal, text: st.pending.text,
              items, total, note: extra ? '' : '有食物未估算热量',
            },
          }],
        };
      }
      return { handled: true, reply: '我想把热量记准确。直接告诉我大约多少千卡就行，比如「600」。' };
    }

    // —— 学习计划缺日期时保留结构化草稿；补充信息时从草稿继续 ——
    if (st.pending && st.pending.type === 'study_plan_draft' && isPlanDraftFollowup(raw)) {
      const plan = JSON.parse(JSON.stringify(st.pending.plan || {}));
      const startHit = raw.match(/(?:从|自)\s*(明天|今天|后天|大后天|20\d{2}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*[日号]?|20\d{2}-\d{2}-\d{2}|\d{1,2}\s*月\s*\d{1,2}\s*[日号]?)/)
        || raw.match(/^(明天|今天|后天|大后天)开始/);
      if (startHit) {
        const startDate = resolveDate(startHit[1], now || new Date());
        if (startDate) plan.from = startDate;
      }
      const endDate = parseEndDate(raw, now || new Date(), plan.from);
      if (endDate) plan.to = endDate;
      if (/不固定|有空|空档/.test(raw)) {
        plan.slots = {};
        plan.windowStart = '18:00';
        plan.windowEnd = '22:00';
      }
      const revisedTime = resolvePlanTimeRange(raw);
      if (revisedTime && !/不固定|有空|空档/.test(raw)) {
        const slot = { time: revisedTime.startTime, endTime: revisedTime.endTime };
        plan.slots = { 1: slot, 2: slot, 3: slot, 4: slot, 5: slot, 6: slot, 7: slot };
        plan.windowStart = '';
        plan.windowEnd = '';
      }
      if (/元旦/.test(raw)) {
        const years = new Set([String(plan.from || today).slice(0, 4), String(plan.to || today).slice(0, 4)]);
        plan.excludeDates = Array.from(years).map((year) => year + '-01-01');
      }
      if (!plan.to) {
        return {
          handled: true,
          pending: { type: 'study_plan_draft', plan, missing: ['to'] },
          reply: '我先保留这份计划草稿，但目前还差结束日期。请只回答：排到哪一天？',
        };
      }
      if (plan.from > plan.to) return { handled: true, pending: st.pending, reply: '开始日期晚于结束日期了，请告诉我正确的结束日期。' };
      plan.busyByDate = planBusyMap(st, plan.from, plan.to);
      const preview = typeof StudyPlan !== 'undefined' ? StudyPlan.expand(plan) : { tasks: [], truncated: false, nextDate: '' };
      if (!preview.tasks.length) {
        return { handled: true, pending: { type: 'study_plan_draft', plan, missing: ['to'] }, reply: '这几天没有可用的完整一小时空档。告诉我可接受的晚间时间范围，或调整结束日期。' };
      }
      return {
        handled: true,
        clearPending: !preview.truncated,
        pending: preview.truncated ? { type: 'task_continue', afterDate: preview.nextDate, to: plan.to, plan } : null,
        reply: '已按草稿写入：' + plan.from + ' 至 ' + plan.to + '，共 ' + preview.tasks.length + ' 项，时间段会按草稿和已有日程安排。'
          + (preview.truncated ? ' 先写入前 ' + preview.tasks.length + ' 项，之后说「继续」。' : ''),
        actions: [planAction(plan)],
      };
    }

    // —— 学习计划续排（上次被截断 / 用户说继续） ——
    if (
      (st.pending && st.pending.type === 'task_continue' && /继续|接着|没排上|剩余|余下/.test(raw))
      || (/^(继续|接着排|继续排|没排上)$/.test(raw) && st.pending && st.pending.type === 'task_continue')
    ) {
      if (typeof StudyPlan !== 'undefined' && st.pending.plan) {
        const plan = Object.assign({}, st.pending.plan, {
          from: st.pending.afterDate || st.pending.plan.from,
        });
        return {
          handled: true,
          clearPending: true,
          reply: '接着把后面的学习日程排上，每天内容不重复。',
          actions: [{ type: 'create_study_plan', from: plan.from, to: plan.to, slots: plan.slots, subjects: plan.subjects, category: plan.category || 'study' }],
        };
      }
      // 无本地计划时交给模型，但先清掉无用 pending 标记由模型续
      return { handled: false };
    }

    if (/^(?:从)?(明天|今天|后天|大后天)开始$/.test(raw)) {
      return { handled: true, reply: '可以从这个日期开始。要安排哪一科、每天多久、排到哪一天？' };
    }

    // —— 长周期学习计划（单科或多科都由本地课纲展开，避免模型自由发挥） ——
    const guessedSubjects = typeof StudyPlan !== 'undefined' ? StudyPlan.guessSubjects(raw) : [];
    const planIntent = typeof StudyPlan !== 'undefined'
      && guessedSubjects.length > 0
      && /学习计划|学习|复习|备考|考研|每天|每日|穿插|轮换|轮着|循序渐进/.test(raw)
      && /学习|复习|备考|考研|每科|科目|高数|数学|agent|web|深度|前端|单词/i.test(raw);
    if (
      planIntent
    ) {
      const list = guessedSubjects.length ? guessedSubjects : StudyPlan.classicRotation([]);
      let from = resolveDate(raw, now || new Date()) || today;
      // 「从 X 排到 Y」
      const range = raw.match(/(20\d{2}-\d{2}-\d{2}).{0,8}?(20\d{2}-\d{2}-\d{2})/);
      let to = parseEndDate(raw, now || new Date(), from);
      if (range) {
        from = range[1];
        to = range[2];
      }
      // 起始若写了「从某日」
      const startHit = raw.match(/(?:从|自)\s*(20\d{2}-\d{2}-\d{2}|\d{1,2}\s*月\s*\d{1,2}\s*[日号]?)/);
      if (startHit) {
        const s = resolveDate(startHit[1], now || new Date()) || startHit[1];
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) from = s;
      }
      const timeRange = resolvePlanTimeRange(raw);
      const flexible = /不固定|有空|空档|找.*时间/.test(raw);
      const slots = flexible ? {} : (timeRange ? {
        1: { time: timeRange.startTime, endTime: timeRange.endTime },
        2: { time: timeRange.startTime, endTime: timeRange.endTime },
        3: { time: timeRange.startTime, endTime: timeRange.endTime },
        4: { time: timeRange.startTime, endTime: timeRange.endTime },
        5: { time: timeRange.startTime, endTime: timeRange.endTime },
        6: { time: timeRange.startTime, endTime: timeRange.endTime },
        7: { time: timeRange.startTime, endTime: timeRange.endTime },
      } : StudyPlan.defaultSlotsFromText(raw));
      const durationMatch = raw.match(/(?:每天|每日|每次)\s*(?:学习|复习)?\s*([一二两三四五\d]+)\s*(?:个)?小时/);
      const durationHours = durationMatch ? cnNum(durationMatch[1]) : 1;
      const durationMinutes = Math.max(15, Math.min(240, Math.round((durationHours || 1) * 60)));
      const excludeDates = [];
      if (/元旦|1\s*月\s*1\s*[日号]/.test(raw)) {
        excludeDates.push(from.slice(0, 4) + '-01-01');
        const nextYear = String(+from.slice(0, 4) + 1) + '-01-01';
        excludeDates.push(nextYear);
      }
      const plan = StudyPlan.buildClassicPlan({
        from,
        to: to || from,
        subjects: list,
        text: raw,
        slots,
        excludeDates,
        durationMinutes,
        windowStart: flexible ? '18:00' : '',
        windowEnd: flexible ? '22:00' : '',
      });
      if (/每天|每日|天天/.test(raw)) {
        plan.subjects = plan.subjects.map((subject) => Object.assign({}, subject, { weekdays: [1, 2, 3, 4, 5, 6, 7] }));
      }
      if (!to) {
        plan.to = '';
        return {
          handled: true,
          pending: { type: 'study_plan_draft', plan, missing: ['to'] },
          reply: '我先记下：'
            + list.map((subject) => subject.name).join('、')
            + '，每天 ' + durationMinutes + ' 分钟'
            + (timeRange ? '，' + timeRange.startTime + '–' + timeRange.endTime : '，按已有日程找空档')
            + '，内容会按循序渐进展开。还差一个信息：排到哪一天？',
        };
      }
      plan.to = to;
      plan.busyByDate = flexible ? planBusyMap(st, plan.from, plan.to) : {};
      const preview = StudyPlan.expand(plan);
      if (!preview.tasks.length) {
        return {
          handled: true,
          pending: { type: 'study_plan_draft', plan, missing: ['time'] },
          reply: '按这个日期范围暂时找不到可用的完整时段。请给我一个可接受的晚间时间范围。',
        };
      }
      return {
        handled: true,
        reply: '已整理并写入：' + from + ' 至 ' + to + '，'
          + (list.length > 1 ? list.map((s) => s.name).join('/') + ' 轮换' : list[0].name)
          + '，每天 ' + durationMinutes + ' 分钟，按章节循序渐进。'
          + (preview.truncated ? ' 区间较长，先写入前 ' + preview.tasks.length + ' 项，说「继续」接着排。' : ''),
        actions: [planAction(plan)],
        pending: preview.truncated ? {
          type: 'task_continue',
          afterDate: preview.nextDate,
          to: plan.to,
          plan,
        } : null,
        clearPending: !preview.truncated,
      };
    }

    // —— 提醒设置 ——
    if (/提醒|闹钟|提前/.test(raw) && /(\d+)\s*分钟|半小时|一小时|1\s*小时/.test(raw)) {
      let lead = 10;
      if (/半小时/.test(raw)) lead = 30;
      else if (/一小时|1\s*小时/.test(raw)) lead = 60;
      else {
        const m = raw.match(/(\d+)\s*分钟/);
        if (m) lead = Math.min(180, Math.max(1, +m[1]));
      }
      return {
        handled: true,
        reply: '提醒已设为提前 ' + lead + ' 分钟。打开系统通知后，到点前会提醒你。',
        actions: [{ type: 'set_settings', notify: true, remindLead: lead }],
      };
    }

    // —— 打卡 ——
    if (/^(打卡|今日打卡|学习打卡|签到)$/.test(raw) || /帮我打卡|今天打卡/.test(raw)) {
      return { handled: true, reply: '今天已打卡。', actions: [{ type: 'checkin', on: true }] };
    }

    // —— 查今日 / 明天 / 某天安排（含口语化） ——
    if (/^(今天|明日|明天)?(有什么|有哪些|什么|有啥)(安排|事|日程)|今天几节课|看看今天|今日安排|明天安排|这周课表|本周安排/.test(raw)
      || /今天有什么|明天有什么|查一下今天|查一下明天|查(一下)?日程|看看日程/.test(raw)
      || /^(今天|明天|今日|明日)?(咋样|怎么样|怎样|忙不忙|忙吗|有空吗|有课吗|几点上课|安排呢|行程)$/.test(raw)
      || /^(今天|明天|今日|明日).{0,4}(咋样|怎么样|怎样|忙不忙|有空|有课|安排|行程)/.test(raw)
      || /我(今天|明天).{0,4}(有啥|有什么|安排)/.test(raw)) {
      const date = /明天|明日/.test(raw) ? addStr(today, 1) : today;
      if (/这周|本周/.test(raw) && /课/.test(raw)) {
        const list = st.courses || [];
        if (!list.length) return { handled: true, reply: '课表还是空的。可以说「周一 1-2 节高数」或发课表照片。' };
        const lines = list.slice(0, 24).map((c) =>
          '周' + '一二三四五六日'[c.weekday - 1] + ' ' + (c.startTime || '') + ' ' + c.name + (c.weeksText ? ' ' + c.weeksText : '')
        );
        return { handled: true, reply: '这学期课表 ' + list.length + ' 门：\n' + lines.join('\n') };
      }
      const pack = summarizeDay(st, date, st.term);
      const label = date === today ? '今天' : '明天';
      if (!pack.lines.length) return { handled: true, reply: label + '还没有课，也没有自己加的日程。' };
      return {
        handled: true,
        reply: label + '一共 ' + (pack.courses.length + pack.tasks.length) + ' 项：\n' + pack.lines.join('\n'),
      };
    }

    // —— 清空某天 / 清空今天 ——
    if (/清空(今天|今日|明天)|删掉(今天|今日|明天)(的)?(所有)?(日程|安排|任务)/.test(raw)) {
      const date = /明天/.test(raw) ? addStr(today, 1) : today;
      return {
        handled: true,
        reply: (date === today ? '今天' : '明天') + '自己加的日程已清空。课表不受影响。',
        actions: [{ type: 'delete_tasks', date }],
      };
    }

    // —— 推迟 / 顺延 ——
    if (/推迟|延后|挪到明天|改到明天|顺延/.test(raw)) {
      const from = /今天|今日/.test(raw) || !/明天/.test(raw.replace(/挪到明天|改到明天/, '')) ? today : today;
      const days = /后天/.test(raw) ? 2 : 1;
      const to = addStr(from, days);
      const word = (raw.match(/(学习|作业|健身|运动|高数|英语|复习)/) || [])[1] || '';
      return {
        handled: true,
        reply: word
          ? '含「' + word + '」且在 ' + from + ' 的日程，已推迟到 ' + to + '。'
          : from + ' 的未完成日程已推迟到 ' + to + '。',
        actions: [{ type: 'shift_tasks', from, to, match: word, onlyOpen: true }],
      };
    }

    // —— 备忘 ——
    if (/^(备忘|记下|备注|灵感)[:：\s]/.test(raw) || /记得带|别忘了|提醒自己/.test(raw)) {
      const content = titleFrom(raw, [/^(备忘|记下|备注|灵感)[:：\s]*/, /记得|别忘了|提醒自己/g]);
      if (!content) return { handled: true, reply: '要记什么？比如「备忘：记得带学生证」。' };
      return {
        handled: true,
        reply: '已记下备忘。',
        actions: [{ type: 'create_memos', items: [{ content }] }],
      };
    }

    // —— 长线目标 ——
    if (/目标是|我的目标|定个目标|这个月想|今年想|过四级|考研|拿奖学金/.test(raw) && !/安排|排进|帮我排/.test(raw)) {
      const title = titleFrom(raw, [/目标是|我的目标|定个目标|帮我|我想|这个月想|今年想/g]).slice(0, 40) || raw.slice(0, 40);
      const horizon = /今年|考研/.test(raw) ? 'year' : /月|四级|奖学金/.test(raw) ? 'month' : 'quarter';
      return {
        handled: true,
        reply: '目标已记下。需要拆成日程时直接说，比如「按这个目标排下周复习」。',
        actions: [{
          type: 'set_goals',
          goals: [{
            title,
            horizon,
            detail: raw.slice(0, 120),
            encouragement: '先订下一件最小的行动，比空喊目标管用。',
          }],
        }],
      };
    }

    // —— 作业 / DDL ——
    if (/交作业|截止|DDL|ddl|deadline|要交|提交/.test(raw)) {
      const date = resolveDate(raw, now || new Date()) || addStr(today, 1);
      const time = resolveTime(raw) || '23:00';
      let title = titleFrom(raw, [
        /明天|后天|今天|今日|下周|本周|这周/g,
        /周[一二三四五六日天]/g,
        /\d{1,2}\s*月\s*\d{1,2}\s*[日号]?/g,
        /(上午|下午|晚上|中午|早上)?\s*\d{1,2}\s*(?:[:：点时])\s*\d{0,2}/g,
        /交作业|截止|DDL|ddl|deadline|要交|提交|之前|以前|帮我|记得|安排/g,
      ]);
      if (!title || title.length < 2) title = '交作业';
      if (!/交|提交|截止/.test(title)) title = '交：' + title;
      return {
        handled: true,
        reply: '已记截止：' + date + ' ' + time + '「' + title + '」。到点前会按提醒设置通知你。',
        actions: [{ type: 'create_tasks', tasks: [{ title, date, time, category: 'study', note: '截止' }] }],
      };
    }

    // —— 考试复习计划（含「弄一下复习」等口语） ——
    if (/考试|期末|测验|复习/.test(raw) && /安排|计划|帮我|排|准备|弄一下|弄下|整一下|搞一下/.test(raw)) {
      const subject = (raw.match(/([\u4e00-\u9fffA-Za-z]{2,12})(?:考试|期末|测验)/) || raw.match(/(?:复习|准备)\s*([\u4e00-\u9fffA-Za-z]{2,12})/) || [])[1] || '考试';
      const examDate = resolveDate(raw, now || new Date()) || addStr(today, 7);
      const tasks = [];
      for (let i = 0; i < 5; i++) {
        const date = addStr(today, i);
        if (date >= examDate) break;
        tasks.push({
          title: '复习' + subject + ' · 第' + (i + 1) + '段',
          date,
          time: '20:00',
          endTime: '21:30',
          category: 'study',
          note: '考前分段复习',
        });
      }
      tasks.push({ title: subject + '考试', date: examDate, time: resolveTime(raw) || '09:00', category: 'study', note: '考试日' });
      return {
        handled: true,
        reply: '按考前几天给你拆了复习段，考试日也写上了。哪一天想加长或缩短，直接说。',
        actions: [
          { type: 'set_goals', goals: [{ title: '顺利通过' + subject, horizon: 'month', detail: raw.slice(0, 80), encouragement: '每天一小段，比考前熬夜稳。' }] },
          { type: 'create_tasks', tasks },
        ],
      };
    }

    // —— 社团 / 活动 / 面试 / 约饭 ——
    if (/社团|活动|面试|约饭|聚餐|讲座|志愿|比赛|开会|班会/.test(raw) && !/删|清空/.test(raw)) {
      const date = resolveDate(raw, now || new Date()) || addStr(today, 1);
      const time = resolveTime(raw) || (/约饭|聚餐/.test(raw) ? '12:00' : '19:00');
      let title = titleFrom(raw, [
        /明天|后天|今天|今日|下周|本周|这周|周末/g,
        /周[一二三四五六日天]/g,
        /\d{1,2}\s*月\s*\d{1,2}\s*[日号]?/g,
        /(上午|下午|晚上|中午|早上)?\s*\d{1,2}\s*(?:[:：点时])\s*\d{0,2}/g,
        /帮我|安排|记一下|排进|日程/g,
      ]);
      if (!title || title.length < 2) {
        title = (/面试/.test(raw) && '面试') || (/约饭|聚餐/.test(raw) && '聚餐') || (/讲座/.test(raw) && '讲座') || '活动';
      }
      const loc = (raw.match(/(?:在|地点)\s*([^\s，,。]{2,16})/) || [])[1] || '';
      return {
        handled: true,
        reply: '已排入：' + date + ' ' + time + '「' + title + '」' + (loc ? ' @' + loc : '') + '。',
        actions: [{ type: 'create_tasks', tasks: [{ title, date, time, location: loc, category: 'life' }] }],
      };
    }

    // —— 自习 / 图书馆 ——
    if (/自习|图书馆|占座|去馆/.test(raw)) {
      const date = resolveDate(raw, now || new Date()) || today;
      const time = resolveTime(raw) || '14:00';
      let endTime = '';
      const span = raw.match(/(\d{1,2})\s*[-~到至]\s*(\d{1,2})\s*点/);
      if (span) {
        let a = +span[1];
        let b = +span[2];
        if (/下午|晚上/.test(raw) && a < 12) a += 12;
        if (/下午|晚上/.test(raw) && b < 12) b += 12;
        endTime = pad(b) + ':00';
      } else if (/两小时|2\s*小时/.test(raw)) {
        const h = parseInt((time || '14:00').slice(0, 2), 10);
        endTime = pad(Math.min(23, h + 2)) + ':00';
      }
      return {
        handled: true,
        reply: '自习已排上：' + date + ' ' + time + (endTime ? '–' + endTime : '') + '。',
        actions: [{
          type: 'create_tasks',
          tasks: [{ title: /图书馆|占座|去馆/.test(raw) ? '图书馆自习' : '自习', date, time, endTime, location: /图书馆|占座/.test(raw) ? '图书馆' : '', category: 'study' }],
        }],
      };
    }

    // —— 减肥饮食周计划 ——
    if (/减肥|减重|控制体重|瘦/.test(raw)) {
      const tasks = [];
      for (let i = 0; i < 7; i++) {
        const date = addStr(today, i);
        tasks.push({ title: '早餐：燕麦和鸡蛋', date, time: '07:30', category: 'life', note: '目标约 300 千卡' });
        tasks.push({ title: '午餐：一荤两素', date, time: '12:00', category: 'life', note: '少油，目标约 550 千卡' });
        tasks.push({ title: '晚餐：清淡', date, time: '18:30', category: 'life', note: '目标约 450 千卡' });
        tasks.push({ title: '走路或慢跑 30 分钟', date, time: '20:30', endTime: '21:00', category: 'life' });
      }
      tasks.push({ title: '称体重并记下来', date: addStr(today, 6), time: '07:10', category: 'life' });
      return {
        handled: true,
        reply: '按七天给你排了三餐和晚上的活动，热量写在备注里。哪一餐想换成你爱吃的，直接告诉我。',
        actions: [
          { type: 'set_goals', goals: [{ title: '把体重稳稳降下来', horizon: 'month', detail: raw.slice(0, 80), encouragement: '先把这七天吃完、走完，比一下子定很高的目标有用。' }] },
          { type: 'create_tasks', tasks },
        ],
      };
    }

    // —— 饮食记录 ——
    if (/吃了|喝了|早餐|午餐|晚餐|夜宵/.test(raw) && !/安排|规划|帮我排/.test(raw)) {
      const found = foodsIn(raw);
      if (!found.known.length && !found.unknown.length) {
        return { handled: true, reply: '吃的具体是什么？比如「中午吃了盖浇饭和一杯可乐」。' };
      }
      if (found.unknown.length) {
        return {
          handled: true,
          pending: { type: 'food', date: today, meal: mealName(raw), text: raw, known: found.known, unknown: found.unknown },
          reply: '「' + found.unknown.join('、') + '」我还不能确定热量。这一份大概多少千卡？回我一个数字就行。',
        };
      }
      const total = found.known.reduce((s, i) => s + i.kcal, 0);
      return {
        handled: true,
        reply: mealName(raw) + '记下了，大约 ' + total + ' 千卡。' + (total > 700 ? '这一顿偏高，晚餐可以清淡一点。' : '这个量比较合适。'),
        actions: [{ type: 'log_food', meal: { date: today, name: mealName(raw), text: raw, items: found.known, total, note: '' } }],
      };
    }

    // —— 完成打卡 ——
    if (/学完|看完|写完|做完|完成了|搞定|学会了|交完了|办完了|办了|勾掉|标成完成|已经做完/.test(raw)) {
      const words = (st.tasks || []).map((t) => t.title).filter((title) => title && raw.indexOf(title) >= 0);
      let word = words.sort((a, b) => b.length - a.length)[0] || '';
      if (!word) {
        const m = raw.match(/([\u4e00-\u9fffA-Za-z0-9]{2,12})(?:学完|看完|写完|做完|完成了|搞定|交完了)/);
        if (m) word = m[1];
      }
      const hits = word ? findTasks(st, word, now || new Date()) : [];
      if (hits.length > 1 && hits[0].title !== hits[1].title) {
        return { handled: true, reply: '有好几条都像「' + word + '」。你指的是哪一天的？' };
      }
      const note = raw.slice(0, 80);
      if (!hits.length) {
        return {
          handled: true,
          reply: word
            ? '日程上还没有「' + word + '」。我先把今天的学习记录写上了。'
            : '我先把今天学的内容记下来了。',
          actions: [{ type: 'log_study', entry: { date: today, text: raw } }],
        };
      }
      return {
        handled: true,
        reply: '「' + hits[0].title + '」标成完成了，批注也写上了。',
        actions: [{ type: 'complete_tasks', id: hits[0].id, note }],
      };
    }

    function matchCourseName(text) {
      const list = st.courses || [];
      const exact = list.map((c) => c.name).filter((n) => n && text.indexOf(n) >= 0).sort((a, b) => b.length - a.length)[0];
      if (exact) return exact;
      const alias = { 高数: '高等数学', 大物: '大学物理', 线代: '线性代数', 计网: '计算机网络', 操统: '操作系统' };
      const keys = Object.keys(alias);
      for (let i = 0; i < keys.length; i++) {
        if (text.indexOf(keys[i]) < 0) continue;
        const hit = list.find((c) => c.name.indexOf(alias[keys[i]]) >= 0 || c.name.indexOf(keys[i]) >= 0);
        if (hit) return hit.name;
      }
      return (text.match(/(深度学习|机器学习|操作系统|高等数学|大学物理|线性代数|[\u4e00-\u9fff]{2,10})/) || [])[1] || '';
    }

    // —— 删一门课 ——
    if (/删(掉|除)?(课表里的|这门)?/.test(raw) && /课/.test(raw) && !/清空|全部|所有/.test(raw)) {
      const nameHit = matchCourseName(raw);
      if (nameHit) {
        return {
          handled: true,
          reply: '已从课表删掉「' + nameHit + '」。',
          actions: [{ type: 'delete_courses', name: nameHit }],
        };
      }
    }

    // —— 调课 / 换教室 / 改节次 / 改单双周（优先于改日程） ——
    if (/调课|换教室|改教室|教室改成|老师换成|改成单周|改成双周|改节|挪到第|改到第|单周|双周/.test(raw)
      || (/课表|课/.test(raw) && /改|换|挪/.test(raw) && !/日程|作业/.test(raw))
      || (matchCourseName(raw) && /改|换|挪|单周|双周|教室/.test(raw) && !/作业|截止/.test(raw))) {
      const nameHit = matchCourseName(raw);
      if (!nameHit) return { handled: true, reply: '要改哪门课？说出课名，比如「高数换教室到教A201」或「高数改成单周」。' };
      const item = { name: nameHit };
      const loc = (raw.match(/(?:教室|地点|到|换成)\s*([A-Za-z0-9教\-－东校区西校区南校区北校区\s]{2,24})/) || raw.match(/教\s*[A-Za-z0-9\-－]{1,12}/) || [])[1];
      if (loc) item.location = loc.replace(/\s/g, '');
      const day = raw.match(/(?:改到|挪到|换成)?周([一二三四五六日天])/);
      if (day) item.weekday = WD[day[1]];
      const sec = raw.match(/第?\s*(\d{1,2})\s*[-~到至]\s*(\d{1,2})\s*节/);
      if (sec) {
        item.sectionStart = +sec[1];
        item.sectionEnd = +sec[2];
        if (typeof Timetable !== 'undefined') {
          const span = Timetable.sectionSpan(item.sectionStart, item.sectionEnd);
          item.startTime = span[0];
          item.endTime = span[1];
        }
      } else {
        const time = resolveTime(raw);
        if (time) item.startTime = time;
      }
      if (/单周|\(单\)|（单）/.test(raw) && !/双/.test(raw.replace(/单周|\(单\)|（单）/g, ''))) {
        const base = (raw.match(/(\d{1,2})\s*[-~到至]\s*(\d{1,2})/) || ['', '1', '16']);
        item.weeksText = base[1] + '-' + base[2] + '(单)';
      } else if (/双周|\(双\)|（双）/.test(raw)) {
        const base = (raw.match(/(\d{1,2})\s*[-~到至]\s*(\d{1,2})/) || ['', '2', '16']);
        item.weeksText = base[1] + '-' + base[2] + '(双)';
      } else {
        const weekHit = raw.match(/(\d{1,2}\s*[-~到至]\s*\d{1,2}\s*(?:周)?(?:\([单双]\)|（[单双]）)?)/);
        if (weekHit) item.weeksText = weekHit[1].replace(/\s+/g, '');
      }
      const teacher = (raw.match(/(?:老师|教师)\s*(?:换成|改成|是)?\s*([^\s，,。]{2,8})/) || [])[1];
      if (teacher) item.teacher = teacher;
      if (!item.location && !item.weekday && !item.startTime && !item.sectionStart && !item.weeksText && !item.teacher) {
        return { handled: true, reply: '要改地点、星期、节次还是单双周？说具体一点。' };
      }
      return {
        handled: true,
        reply: '课表里「' + nameHit + '」已按你说的改了。',
        actions: [{ type: 'update_courses', items: [item] }],
      };
    }

    // —— 改日程时间 ——
    if (/改到|换成|改成|挪到/.test(raw) && !/课表|节|单周|双周|教室|调课/.test(raw)) {
      const titleHit = (st.tasks || []).map((t) => t.title).filter((title) => title && raw.indexOf(title) >= 0).sort((a, b) => b.length - a.length)[0];
      if (!titleHit) return { handled: true, reply: '要改哪一条？把日程上的名字说出来，比如「高数作业改到明天晚上八点」。' };
      let hits = findTasks(st, titleHit, now || new Date());
      if (!hits.length) return { handled: true, reply: '「' + titleHit + '」已经完成，或日程上没有未完成的这条。' };
      const day = raw.match(/周([一二三四五六日天])/);
      const item = { id: hits[0].id };
      const date = resolveDate(raw, now || new Date());
      if (date) item.date = date;
      else if (day) item.date = iso(weekdayOf(now || new Date(), /下周|后周/.test(raw) ? 'next' : 'this', WD[day[1]]));
      const time = resolveTime(raw);
      if (time) item.time = time;
      if (!item.date && !item.time) return { handled: true, reply: '改到哪一天、几点？' };
      return { handled: true, reply: '好，这条我改好了。', actions: [{ type: 'update_tasks', items: [item] }] };
    }

    // —— 批量改周次 ——
    if (/批量|全部|所有课/.test(raw) && /周次|单周|双周|改成/.test(raw) && (st.courses || []).length) {
      let weeksText = '';
      if (/单周|\(单\)/.test(raw)) weeksText = '1-16(单)';
      else if (/双周|\(双\)/.test(raw)) weeksText = '2-16(双)';
      else {
        const hit = raw.match(/(\d{1,2}\s*[-~到至]\s*\d{1,2}\s*(?:周)?(?:\([单双]\)|（[单双]）)?)/);
        if (hit) weeksText = hit[1].replace(/\s+/g, '');
      }
      if (weeksText) {
        return {
          handled: true,
          reply: '已把课表里 ' + st.courses.length + ' 门课的周次统一成 ' + weeksText + '。',
          actions: [{
            type: 'update_courses',
            items: st.courses.map((c) => ({ id: c.id, weeksText })),
          }],
        };
      }
    }

    // —— 学期周次 ——
    if (/第一周|开学|学期周|从几月|周次/.test(raw) && /(\d{1,2})\s*月\s*(\d{1,2})|20\d{2}-\d{2}-\d{2}/.test(raw)) {
      let week1 = '';
      const isoHit = raw.match(/(20\d{2}-\d{2}-\d{2})/);
      if (isoHit) week1 = isoHit[1];
      else {
        const md = raw.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日?/);
        if (md) week1 = (now || new Date()).getFullYear() + '-' + pad(+md[1]) + '-' + pad(+md[2]);
      }
      const weeksHit = raw.match(/共?\s*(\d{1,2})\s*周/);
      const weeks = weeksHit ? Math.min(30, Math.max(8, +weeksHit[1])) : 0;
      if (week1) {
        return {
          handled: true,
          reply: '第一周起始已改成 ' + week1 + (weeks ? '，学期共 ' + weeks + ' 周' : '') + '。课表会按这一天对齐第几周。',
          actions: [{ type: 'set_term', week1, weeks: weeks || undefined }],
        };
      }
    }

    // —— 条件删除 ——
    const del = /删|清|去掉|移除/.test(raw) ? deleteFilterFrom(raw) : null;
    if (del && (del.keep || del.exclude)) {
      const action = { type: 'delete_tasks' };
      if (del.keep) action.keep = del.keep;
      if (del.exclude) action.exclude = del.exclude;
      return {
        handled: true,
        reply: '好，' + del.label + '日程。课表不会动；要改课表请说「清空课表」或单独改某一门。',
        actions: [action],
      };
    }

    if (/清空课表|删除全部课程|删掉所有课/.test(raw)) {
      return { handled: true, reply: '课表已清空。自己加的日程还在。', actions: [{ type: 'set_courses', mode: 'replace', courses: [] }] };
    }

    if (/有哪些课|课表里|这学期的课|看看课表|我的课表/.test(raw)) {
      const list = st.courses || [];
      if (!list.length) return { handled: true, reply: '课表还是空的。可以发 PDF 或照片，或直接说「周一 1-2 节高数」。' };
      const lines = list.slice(0, 20).map((c) =>
        '周' + '一二三四五六日'[c.weekday - 1] + ' ' + (c.startTime || '') + ' ' + c.name + (c.weeksText ? ' ' + c.weeksText : '')
      );
      return { handled: true, reply: '课表里有 ' + list.length + ' 门：\n' + lines.join('\n') + (list.length > 20 ? '\n…' : '') };
    }

    // —— 写入课表 ——
    const asCourse = /课表|排课|加入课表|写进课表|第\s*\d+\s*[-~到至]\s*\d+\s*节/.test(raw)
      || (/课|课程|高数|大物|线代|计网|操统|英语|思政/.test(raw) && /周[一二三四五六日天]/.test(raw));
    const courses = asCourse ? courseClauses(raw) : [];
    if (courses.length) {
      const mode = /替换|覆盖|重新导/.test(raw) ? 'replace' : 'merge';
      return {
        handled: true,
        reply: '已写入课表 ' + courses.length + ' 门（按周次循环，不是一次性日程）。第一周起始可在日程页点「第 N 周」修改。',
        actions: [{ type: 'set_courses', mode, courses }],
      };
    }

    // —— 含糊「有事 / 记一下」：能定日期就先占位，否则追问 ——
    if (/有(点|个)?事|有点事|要出门|要出去|有约会|临时有事/.test(raw) && !/删|清空|完成|做完/.test(raw)) {
      const date = resolveDate(raw, now || new Date());
      const time = resolveTime(raw);
      if (!date) {
        return { handled: true, reply: '哪一天、大概几点？可以说「明天下午三点有事」我帮你占上。' };
      }
      const title = titleFrom(raw, [
        /明天|后天|今天|今日|下周|本周|这周|周末/g,
        /周[一二三四五六日天]/g,
        /\d{1,2}\s*月\s*\d{1,2}\s*[日号]?/g,
        /(上午|下午|晚上|中午|早上)?\s*\d{1,2}\s*(?:[:：点时])\s*\d{0,2}/g,
        /帮我|安排|记一下|排进|日程/g,
      ]) || '有事（待补充）';
      return {
        handled: true,
        reply: '先占上：' + date + (time ? ' ' + time : '') + '「' + title + '」。想改标题或补地点直接说。',
        actions: [{ type: 'create_tasks', tasks: [{ title, date, time: time || '', category: 'life', note: '口述占位' }] }],
      };
    }

    if (/^(帮我)?记(一?下|住)/.test(raw) || /^记一下/.test(raw)) {
      const content = titleFrom(raw, [/^(帮我)?记(一?下|住)[:：\s]*/]);
      if (!content) return { handled: true, reply: '要记什么？比如「记一下：带学生证」。' };
      const date = resolveDate(raw, now || new Date());
      const time = resolveTime(raw);
      if (date || time) {
        return {
          handled: true,
          reply: '已记下：' + (date || '未定日期') + (time ? ' ' + time : '') + '「' + content + '」。',
          actions: [{ type: 'create_tasks', tasks: [{ title: content, date: date || '', time: time || '', category: 'other' }] }],
        };
      }
      return {
        handled: true,
        reply: '已记下备忘。',
        actions: [{ type: 'create_memos', items: [{ content }] }],
      };
    }

    // —— 纯追问：太短/太含糊时本机直接引导，少走模型 ——
    if (raw.length <= 8 && /^(帮我|弄一下|整一下|搞一下|安排一下|排一下|嗯|好|哦|啊)$/.test(raw)) {
      return {
        handled: true,
        reply: '可以说具体一点，例如「明天交高数作业」「今天下午图书馆自习」「今天有什么安排」。',
      };
    }

    // —— 通用：带日期的一件事（作业以外） ——
    if (typeof Nlp !== 'undefined') {
      const parsed = Nlp.parseText(raw, now || new Date());
      if (parsed.tasks.length && (parsed.tasks.some((t) => t.date) || parsed.memos.length)) {
        const actions = [];
        if (parsed.tasks.length) {
          actions.push({
            type: 'create_tasks',
            tasks: parsed.tasks.map((t) => Object.assign({ category: /健身|跑步|运动|饭|聚餐/.test(t.title) ? 'life' : 'study' }, t)),
          });
        }
        if (parsed.memos.length) actions.push({ type: 'create_memos', items: parsed.memos });
        return {
          handled: true,
          reply: '已按你说的记下' + (parsed.tasks.length ? ' ' + parsed.tasks.length + ' 项日程' : '') + (parsed.memos.length ? '和备忘' : '') + '。',
          actions,
        };
      }
    }

    return { handled: false };
  }

  return { interpret, FOOD, resolveDate, summarizeDay, isPlanDraftFollowup };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Intent;
if (typeof window !== 'undefined') window.Intent = Intent;
