const App = (() => {
  const PROVIDERS = [
    { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    { id: 'qwen', name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
    { id: 'custom', name: '自定义', baseUrl: '', model: '' },
  ];
  const I = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 6 9 12l6 6"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3.5V7M16 3.5V7M4 10h16"/></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M6 4v16M6 5h10l-2 4 2 4H6"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3V20.5M3.5 12h2.2M18.3 12H20.5M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12 5 5L19 7"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M7 17.2 4.8 20 8.6 18.2A8 8 0 1 0 7 17.2z"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m20 20-3.5-3.5"/></svg>',
    more: '<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none"/></svg>',
    album: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="11" r="1.8"/><path d="m7.5 17 3.2-3.4a1.2 1.2 0 0 1 1.7 0L14 15.2l1.1-1.1a1.2 1.2 0 0 1 1.7 0L19 16.8"/></svg>',
    camera: '<svg viewBox="0 0 24 24"><path d="M4.5 8.5h3l1.4-2h6.2l1.4 2H19.5A1.5 1.5 0 0 1 21 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5V10a1.5 1.5 0 0 1 1.5-1.5z"/><circle cx="12" cy="13.5" r="3.2"/></svg>',
    pdf: '<svg viewBox="0 0 24 24"><path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z"/><path d="M14 3.5V8h4.5M8.5 14h7M8.5 17.5h5"/></svg>',
  };
  const CATS = [
    { id: 'study', name: '学习', color: '#0f6a4e' },
    { id: 'work', name: '工作', color: '#c2410c' },
    { id: 'life', name: '生活', color: '#b45309' },
    { id: 'personal', name: '个人', color: '#1d4e89' },
  ];
  const session = {
    view: 'chat',
    day: '',
    month: null,
    text: '',
    files: [],
    busy: '',
    undo: null,
    undoMsg: '',
    showKey: false,
    q: '',
    searchOn: false,
    chatDaysBack: 0,
    companionText: '',
    courseWeek: 0,
    calAnim: '',
    pageAnim: 'in',
    msgMenuId: '',
    courseBatch: false,
    coursePicked: [],
    taskBatch: false,
    taskPicked: [],
    calQuiet: false,
  };

  const COURSE_PALETTE = ['#f7c6d0', '#ffd8a8', '#c5dff8', '#c8ebd6', '#e0d4f7', '#f5e6b8', '#d4e5ef', '#f0d0c8'];

  function s() { return Store.get(); }
  function clip(v, n) { return String(v || '').trim().slice(0, n); }
  function setBusy(t) {
    session.busy = t || '';
    const el = document.getElementById('busy');
    if (!el) return;
    el.hidden = !t;
    const label = document.getElementById('busyLabel');
    if (label) label.textContent = t || '';
    if (window.Pet) {
      if (!t) Pet.setStatus(session._lastOk ? 'done' : (session._lastErr ? 'error' : 'idle'));
      else if (/附件|看/.test(t)) Pet.setStatus('looking');
      else Pet.setStatus('thinking');
    }
  }
  function explain(e) {
    if (!e) return '没有完成';
    if (e.code === 'NO_KEY') return '先到设置里填写密钥';
    return e.message || '没有完成';
  }

  function claimsMutation(reply) {
    const text = String(reply || '');
    return /已.{0,16}(排入|排好|写好|写入|写进|记下|记录|添加|创建|更新|修改|删除|推迟|顺延|设置|安排好了|安排到)|排好了|写入了|已从.+(删|改)|已经完成|已经记/.test(text)
      && !/(没有|未能|尚未|还没).{0,8}(写入|排入|保存)/.test(text);
  }

  function hasActualWrite(notes) {
    return (notes || []).some((note) => /^(已|课表写入|第一周起始|早餐|午餐|晚餐|夜宵|加餐)/.test(note)
      && !/(没有|未能|尚未|已经排过|无可)/.test(note));
  }

  function executionReply(reply, notes, actionCount) {
    const text = String(reply || '').trim();
    if (claimsMutation(text) && (!actionCount || !hasActualWrite(notes))) {
      const detail = (notes || []).filter(Boolean).join('；');
      return '没有产生新的写入。' + (detail || '这次回复没有包含可执行的数据') + '。如果日程没有出现在日历里，请换一种说法再试一次。';
    }
    return text;
  }

  function pushChat(role, content, extra) {
    const id = Util.uid();
    Store.update((st) => {
      if (!Array.isArray(st.diy.chat)) st.diy.chat = [];
      st.diy.chat.push(Object.assign({
        id, role, content: String(content || '').slice(0, 2000), at: Date.now(),
      }, extra || {}));
      if (st.diy.chat.length > 400) st.diy.chat.splice(0, st.diy.chat.length - 400);
    });
    return id;
  }

  function pushChannel(channel, role, content, extra) {
    const key = channel === 'fish' ? 'fishChat' : 'buddyChat';
    const id = Util.uid();
    Store.update((st) => {
      if (!Array.isArray(st.diy[key])) st.diy[key] = [];
      st.diy[key].push(Object.assign({
        id, role, content: String(content || '').slice(0, 2000), at: Date.now(),
      }, extra || {}));
      if (st.diy[key].length > 300) st.diy[key].splice(0, st.diy[key].length - 300);
    });
    return id;
  }

  function findMsg(id) {
    return (s().diy.chat || []).find((m) => m.id === id);
  }

  function deleteMsg(id) {
    Store.update((st) => {
      st.diy.chat = (st.diy.chat || []).filter((m) => m.id !== id);
    });
  }

  function recallMsg(id) {
    const m = findMsg(id);
    if (!m || m.role !== 'user') return false;
    if (Date.now() - (m.at || 0) > 2 * 60 * 1000) {
      Util.toast('超过 2 分钟不能撤回');
      return false;
    }
    Store.update((st) => {
      const list = st.diy.chat || [];
      const i = list.findIndex((x) => x.id === id);
      if (i < 0) return;
      list[i] = {
        id: Util.uid(),
        role: 'system',
        kind: 'recalled',
        content: '你撤回了一条消息',
        at: Date.now(),
      };
      // 若紧挨着助手回复，一并去掉，更像微信
      if (list[i + 1] && list[i + 1].role === 'assistant' && (list[i + 1].at || 0) >= (m.at || 0)) {
        list.splice(i + 1, 1);
      }
    });
    return true;
  }

  function companionContext() {
    const today = Util.localDate();
    const open = s().tasks.filter((t) => t.date === today && !t.done).slice(0, 4).map((t) => t.title);
    const goals = (s().goals || []).slice(0, 2).map((g) => g.title);
    return [
      open.length ? ('今日未完成：' + open.join('、')) : '今日暂无待办',
      goals.length ? ('目标：' + goals.join('、')) : '',
    ].filter(Boolean).join('；');
  }

  function contextBlock() {
    const st = s();
    const today = Util.localDate();
    const term = termNow();
    const wk = window.Timetable ? Timetable.weekOf(today, term) : 0;
    const tasks = st.tasks.filter((t) => !t.date || t.date >= Util.addDaysStr(today, -3)).slice(0, 80)
      .map((t) => [t.id, t.date || '未定', t.time || '', t.category || '', t.done ? '完成' : '未完成', t.title].join(' | '));
    const goals = (st.goals || []).map((g) => [g.id, g.horizon || '', g.title, g.progress || ''].join(' | '));
    const memos = st.memos.slice(0, 12).map((m) => m.id + ' | ' + m.content);
    const courses = (st.courses || []).slice(0, 40).map((c) =>
      [c.id, '周' + (Timetable.WD_NAME[c.weekday - 1] || c.weekday),
        c.sectionStart ? ('第' + c.sectionStart + (c.sectionEnd && c.sectionEnd !== c.sectionStart ? '-' + c.sectionEnd : '') + '节') : '',
        c.startTime || '', c.endTime || '', c.name, c.weeksText || '', c.location || '', c.teacher || ''].join(' | ')
    );
    return [
      '今天是 ' + today + ' ' + Util.weekdayLabel(today) + '。默认提前 ' + (st.settings.remindLead || 10) + ' 分钟提醒。',
      '学期：' + (term.title ? term.title + ' · ' : '') + '第一周周一 ' + term.week1 + '，共 ' + term.weeks + ' 周；今天是第 ' + (wk || '—') + ' 周。课表按周次显示，不要拆成普通日程。节次方案=' + (term.periodPreset || 'jiaowu') + '。',
      '课表（独立体系，改课用 update_courses / delete_courses，禁止把学期课拆成 create_tasks）：', courses.join('\n') || '（空）',
      '自己加的日程：', tasks.join('\n') || '（无）',
      '长线目标：', goals.join('\n') || '（无）',
      '备忘：', memos.join('\n') || '（无）',
    ].join('\n');
  }

  function expandRepeat(rep) {
    if (!rep || !rep.from || !rep.to) return [];
    const baseTitle = clip(rep.title, 40);
    const topics = Array.isArray(rep.topics)
      ? rep.topics.map((t) => clip(t, 60)).filter(Boolean)
      : [];
    if (!baseTitle && !topics.length) return [];
    const days = Array.isArray(rep.weekdays) ? rep.weekdays.map(Number) : [1, 2, 3, 4, 5, 6, 7];
    const out = [];
    let topicIdx = 0;
    let d = rep.from;
    const cap = (window.StudyPlan && StudyPlan.MAX_TASKS) || 180;
    while (d && d <= rep.to && out.length < cap) {
      const date = Util.parseDate(d);
      const iso = date ? (date.getDay() === 0 ? 7 : date.getDay()) : 0;
      if (days.indexOf(iso) >= 0) {
        let title = baseTitle;
        let note = clip(rep.note, 200);
        if (topics.length) {
          const topic = topics[Math.min(topicIdx, topics.length - 1)];
          const lap = topicIdx >= topics.length ? Math.floor(topicIdx / topics.length) : 0;
          const topicLabel = topic + (lap ? '（巩固' + lap + '）' : '');
          title = clip(baseTitle ? (baseTitle + '：' + topicLabel) : topicLabel, 80);
          note = clip(topicLabel, 200);
          topicIdx += 1;
        }
        out.push({
          title,
          date: d,
          time: validTime(rep.time),
          endTime: validTime(rep.endTime),
          note,
          location: clip(rep.location, 40),
          category: rep.category || 'study',
        });
      }
      d = Util.addDaysStr(d, 1);
    }
    return out;
  }

  function validTime(v) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(v || '') ? v : ''; }

  function normalizeStudyPlan(a) {
    if (!window.StudyPlan || !a) return null;
    const plan = {
      from: Util.parseDate(a.from) ? String(a.from).slice(0, 10) : '',
      to: Util.parseDate(a.to) ? String(a.to).slice(0, 10) : '',
      time: validTime(a.time),
      endTime: validTime(a.endTime),
      category: a.category || 'study',
      slots: a.slots && typeof a.slots === 'object' ? a.slots : {},
      subjects: Array.isArray(a.subjects) ? a.subjects.slice(0, 8) : [],
      excludeDates: Array.isArray(a.excludeDates)
        ? a.excludeDates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).slice(0, 120)
        : [],
      durationMinutes: Math.max(15, Math.min(240, parseInt(a.durationMinutes, 10) || 60)),
      windowStart: validTime(a.windowStart),
      windowEnd: validTime(a.windowEnd),
      busyByDate: a.busyByDate && typeof a.busyByDate === 'object' ? a.busyByDate : {},
    };
    if (!plan.from || !plan.to || !plan.subjects.length) return null;
    const expanded = StudyPlan.expand(plan);
    if (!expanded.tasks.length) return null;
    return {
      type: 'create_tasks',
      tasks: expanded.tasks,
      studyPlanMeta: {
        truncated: !!expanded.truncated,
        nextDate: expanded.nextDate || '',
        counts: expanded.counts || {},
        plan,
      },
    };
  }

  function normalize(json) {
    const actions = [];
    const meta = { truncated: !!(json && (json.truncated || json.need_continue)), studyPlan: null };
    (Array.isArray(json && json.actions) ? json.actions : []).slice(0, 12).forEach((a) => {
      if (!a || typeof a !== 'object') return;
      if (a.type === 'create_study_plan') {
        const built = normalizeStudyPlan(a);
        if (built) {
          actions.push({ type: 'create_tasks', tasks: built.tasks });
          meta.studyPlan = built.studyPlanMeta;
          if (built.studyPlanMeta && built.studyPlanMeta.truncated) meta.truncated = true;
        }
      } else if (a.type === 'create_tasks') {
        const cap = (window.StudyPlan && StudyPlan.MAX_TASKS) || 180;
        const tasks = []
          .concat(Array.isArray(a.tasks) ? a.tasks.map((t) => ({
            title: clip(t.title, 80), date: Util.parseDate(t.date) ? String(t.date).slice(0, 10) : '', time: validTime(t.time), endTime: validTime(t.endTime), note: clip(t.note, 200), location: clip(t.location, 40), category: t.category || 'study',
          })) : [])
          .concat(expandRepeat(a.repeat));
        const clean = tasks.filter((t) => t.title).slice(0, cap);
        if (clean.length) actions.push({ type: 'create_tasks', tasks: clean });
        if (Array.isArray(a.tasks) && a.tasks.length > clean.length) meta.truncated = true;
      } else if (a.type === 'update_tasks' && Array.isArray(a.items)) {
        actions.push({ type: 'update_tasks', items: a.items.slice(0, 40) });
      } else if (a.type === 'delete_tasks') {
        actions.push({
          type: 'delete_tasks',
          ids: a.ids || [],
          date: a.date || '',
          title: clip(a.title, 40),
          keep: clip(a.keep, 20),
          exclude: clip(a.exclude, 20),
          category: clip(a.category, 20),
        });
      } else if (a.type === 'create_memos' && Array.isArray(a.items)) {
        const items = a.items.map((m) => ({ content: clip(m.content, 300) })).filter((m) => m.content).slice(0, 10);
        if (items.length) actions.push({ type: 'create_memos', items });
      } else if (a.type === 'delete_memos') {
        actions.push({ type: 'delete_memos', ids: a.ids || [] });
      } else if (a.type === 'set_goals' && Array.isArray(a.goals)) {
        const goals = a.goals.map((g) => ({
          title: clip(g.title, 40), horizon: ['year', 'quarter', 'month'].indexOf(g.horizon) >= 0 ? g.horizon : 'year',
          detail: clip(g.detail, 200), encouragement: clip(g.encouragement, 120),
        })).filter((g) => g.title).slice(0, 6);
        if (goals.length) actions.push({ type: 'set_goals', goals });
      } else if (a.type === 'update_goals' && Array.isArray(a.items)) {
        actions.push({ type: 'update_goals', items: a.items.slice(0, 10) });
      } else if (a.type === 'delete_goals') {
        actions.push({ type: 'delete_goals', ids: a.ids || [] });
      } else if (a.type === 'log_food' && a.meal && a.meal.date) {
        actions.push({ type: 'log_food', meal: a.meal });
      } else if (a.type === 'log_study' && a.entry) {
        actions.push({ type: 'log_study', entry: a.entry });
      } else if (a.type === 'complete_tasks' && (a.id || a.match)) {
        actions.push({ type: 'complete_tasks', id: a.id || '', match: clip(a.match, 20), note: clip(a.note, 80) });
      } else if (a.type === 'checkin') {
        actions.push({ type: 'checkin', on: a.on !== false });
      } else if (a.type === 'design' && (a.panelId === 'calendar' || a.panelId === 'goals')) {
        actions.push({
          type: 'design', panelId: a.panelId, title: clip(a.title, 24),
          css: clip(a.css, 4000), html: clip(a.html, 4000),
        });
      } else if (a.type === 'set_courses' && Array.isArray(a.courses)) {
        actions.push({ type: 'set_courses', mode: a.mode === 'replace' ? 'replace' : 'merge', courses: a.courses.slice(0, 60), preview: !!a.preview });
      } else if (a.type === 'update_courses' && Array.isArray(a.items)) {
        actions.push({ type: 'update_courses', items: a.items.slice(0, 40) });
      } else if (a.type === 'delete_courses') {
        actions.push({ type: 'delete_courses', ids: a.ids || [], name: clip(a.name, 24) });
      } else if (a.type === 'set_term') {
        const weeks = parseInt(a.weeks, 10);
        actions.push({
          type: 'set_term',
          week1: Util.parseDate(a.week1) ? String(a.week1).slice(0, 10) : '',
          weeks: weeks >= 8 && weeks <= 30 ? weeks : 0,
        });
      } else if (a.type === 'shift_tasks') {
        actions.push({
          type: 'shift_tasks',
          from: Util.parseDate(a.from) ? String(a.from).slice(0, 10) : '',
          to: Util.parseDate(a.to) ? String(a.to).slice(0, 10) : '',
          match: clip(a.match, 20),
          onlyOpen: a.onlyOpen !== false,
        });
      } else if (a.type === 'set_settings') {
        const lead = parseInt(a.remindLead, 10);
        actions.push({ type: 'set_settings', notify: a.notify, remindLead: lead > 0 && lead <= 180 ? lead : 0 });
      }
    });
    let reply = clip(json && json.reply, 800) || '好，我按你的话处理了。';
    if (meta.studyPlan && meta.studyPlan.counts) {
      const parts = Object.keys(meta.studyPlan.counts).map((k) => k + ' ' + meta.studyPlan.counts[k] + ' 天');
      if (parts.length) reply = (reply || '已按天排好学习计划。') + (reply.indexOf('项') >= 0 ? '' : '（' + parts.join('，') + '）');
    }
    if (meta.truncated) {
      reply += (reply && !/继续/.test(reply) ? ' 若还没排完，直接说「继续」。' : '');
    }
    return { reply, actions, meta };
  }

  function snapshot() {
    const st = s();
    return JSON.parse(JSON.stringify({
      tasks: st.tasks, memos: st.memos, goals: st.goals || [], meals: st.meals || [], courses: st.courses || [], term: st.term, checkins: st.checkins,
      designs: st.diy.designs || {}, notify: !!st.settings.notify, remindLead: st.settings.remindLead || 10,
    }));
  }

  function lineOf(t) {
    return [t.date ? Util.pretty(t.date) + Util.weekdayLabel(t.date) : '未定日期', t.time || '', t.title].filter(Boolean).join(' ');
  }

  function applyAll(actions) {
    const notes = [];
    const series = Util.uid();
    Store.update((st) => {
      actions.forEach((a) => {
        if (a.type === 'create_tasks') {
          let added = 0;
          const sample = [];
          a.tasks.forEach((t) => {
            // 续排时跳过「同日同标题」避免截断重试造成重复
            const dup = st.tasks.some((x) => x.date && t.date && x.date === t.date && x.title === t.title && !x.done);
            if (dup) return;
            st.tasks.push({
              id: Util.uid(), title: t.title, note: t.note || '', date: t.date || '', time: t.time || '', endTime: t.endTime || '', location: t.location || '', category: t.category || 'study', allDay: !!t.allDay,
              done: false, doneOn: '', doneAt: 0, reminded: false, series, createdAt: Date.now(), source: 'agent',
            });
            added += 1;
            if (sample.length < 12) sample.push(t);
          });
          if (added) notes.push('已排入 ' + added + ' 项\n' + sample.map(lineOf).join('\n') + (added > 12 ? '\n…' : ''));
          else notes.push('这些日程已经排过了，没有重复写入');
        } else if (a.type === 'update_tasks') {
          let n = 0;
          a.items.forEach((item) => {
            const t = st.tasks.find((x) => x.id === item.id) || st.tasks.find((x) => item.title && x.title === item.title && (!item.date || x.date === item.date));
            if (!t) return;
            ['title', 'date', 'time', 'endTime', 'note', 'location', 'category'].forEach((k) => { if (item[k] != null && item[k] !== '') t[k] = item[k]; });
            if (typeof item.done === 'boolean') {
              t.done = item.done;
              t.doneOn = item.done ? Util.localDate() : '';
              t.doneAt = item.done ? Date.now() : 0;
            }
            if (item.time || item.date) t.reminded = false;
            n += 1;
          });
          if (n) notes.push('已修改 ' + n + ' 项日程');
        } else if (a.type === 'delete_tasks') {
          const before = st.tasks.length;
          const ids = new Set(a.ids || []);
          const hasFilter = !!(a.keep || a.exclude || a.category || a.date || a.title || ids.size);
          st.tasks = st.tasks.filter((t) => {
            if (ids.has(t.id)) return false;
            const blob = [t.title, t.note, t.location, t.category].filter(Boolean).join(' ');
            if (a.keep) return blob.indexOf(a.keep) >= 0;
            if (a.exclude && blob.indexOf(a.exclude) >= 0) return false;
            if (a.category && (t.category === a.category || blob.indexOf(a.category) >= 0)) return false;
            if (a.date && t.date === a.date && (!a.title || t.title.indexOf(a.title) >= 0)) return false;
            if (!a.date && a.title && t.title.indexOf(a.title) >= 0) return false;
            if (!hasFilter) return true;
            return true;
          });
          const n = before - st.tasks.length;
          if (n) notes.push('已删除 ' + n + ' 项日程' + (a.keep ? '（只留与「' + a.keep + '」有关）' : ''));
          else if (a.keep || a.exclude || a.category) notes.push('没有匹配到要删的日程');
        } else if (a.type === 'create_memos') {
          a.items.forEach((m) => st.memos.unshift({ id: Util.uid(), content: m.content, createdAt: Date.now(), pinned: false }));
          notes.push('已记下 ' + a.items.length + ' 条备忘');
        } else if (a.type === 'delete_memos') {
          const ids = new Set(a.ids || []);
          const before = st.memos.length;
          st.memos = st.memos.filter((m) => !ids.has(m.id));
          if (st.memos.length !== before) notes.push('已删除备忘');
        } else if (a.type === 'set_goals') {
          a.goals.forEach((g) => {
            const old = (st.goals || []).find((x) => x.title === g.title);
            if (old) Object.assign(old, g);
            else st.goals.unshift(Object.assign({ id: Util.uid(), progress: '', createdAt: Date.now() }, g));
          });
          notes.push(a.goals.map((g) => '目标：' + g.title + (g.encouragement ? '\n' + g.encouragement : '')).join('\n'));
        } else if (a.type === 'update_goals') {
          a.items.forEach((item) => {
            const g = (st.goals || []).find((x) => x.id === item.id);
            if (!g) return;
            ['title', 'detail', 'progress', 'encouragement', 'horizon'].forEach((k) => { if (item[k]) g[k] = item[k]; });
          });
          notes.push('已更新长线目标');
        } else if (a.type === 'delete_goals') {
          const ids = new Set(a.ids || []);
          st.goals = (st.goals || []).filter((g) => !ids.has(g.id));
          notes.push('已删除目标');
        } else if (a.type === 'log_food') {
          if (!st.meals) st.meals = [];
          st.meals.unshift(Object.assign({ id: Util.uid(), at: Date.now(), kind: 'food' }, a.meal));
          notes.push((a.meal.name || '饮食') + ' ' + (a.meal.total || 0) + ' 千卡\n' + (a.meal.items || []).map((i) => i.name + ' ' + i.kcal).join('、'));
        } else if (a.type === 'log_study') {
          if (!st.meals) st.meals = [];
          st.meals.unshift({ id: Util.uid(), date: a.entry.date, name: '学习记录', text: a.entry.text, items: [], total: 0, note: a.entry.text, at: Date.now(), kind: 'study' });
          notes.push('已写下学习记录');
        } else if (a.type === 'complete_tasks') {
          const t = st.tasks.find((x) => x.id === a.id) || st.tasks.find((x) => !x.done && a.match && x.title.indexOf(a.match) >= 0);
          if (t) {
            t.done = true;
            t.doneOn = Util.localDate();
            t.doneAt = Date.now();
            t.note = [t.note, a.note].filter(Boolean).join('\n');
            notes.push('已完成「' + t.title + '」' + (a.note ? '\n批注：' + a.note : ''));
          }
        } else if (a.type === 'checkin') {
          const today = Util.localDate();
          const i = st.checkins.indexOf(today);
          if (a.on && i < 0) st.checkins.push(today);
          if (!a.on && i >= 0) st.checkins.splice(i, 1);
          notes.push(a.on ? '已打卡' : '已取消打卡');
        } else if (a.type === 'design') {
          const cssOk = !a.css || Design.scopeCss(a.panelId, a.css);
          const htmlOk = !a.html || Design.sanitizeHtml(a.html);
          if (!st.diy.designs) st.diy.designs = {};
          const prev = st.diy.designs[a.panelId] || {};
          st.diy.designs[a.panelId] = {
            title: a.title || prev.title || '',
            css: cssOk ? (a.css || prev.css || '') : (prev.css || ''),
            html: htmlOk ? (a.html || prev.html || '') : (prev.html || ''),
          };
          notes.push(a.panelId === 'calendar' ? '已改日历的样子' : '已改目标页的样子');
        } else if (a.type === 'set_courses' && Array.isArray(a.courses)) {
          const list = a.courses.map(normalizeCourse).filter((c) => c.name && c.weekday);
          if (a.mode === 'replace') st.courses = list;
          else st.courses = (st.courses || []).concat(list);
          if (list.length) notes.push('课表写入 ' + list.length + ' 门课');
          else if (a.mode === 'replace') notes.push('课表已清空');
        } else if (a.type === 'update_courses' && Array.isArray(a.items)) {
          let n = 0;
          a.items.forEach((item) => {
            const c = (st.courses || []).find((x) => x.id === item.id)
              || (st.courses || []).find((x) => item.name && x.name === item.name && (!item.weekday || +x.weekday === +item.weekday))
              || (st.courses || []).find((x) => item.name && x.name.indexOf(item.name) >= 0);
            if (!c) return;
            const patch = Object.assign({}, item, { id: c.id });
            // 改周次文本时强制重算 weeks
            if (item.weeksText && !item.weeks) patch.weeks = null;
            if (item.sectionStart && !item.startTime) { patch.startTime = ''; patch.endTime = ''; }
            const next = normalizeCourse(Object.assign({}, c, patch));
            Object.assign(c, next);
            n += 1;
          });
          if (n) notes.push('已改 ' + n + ' 门课');
        } else if (a.type === 'delete_courses') {
          const before = (st.courses || []).length;
          const ids = new Set(a.ids || []);
          st.courses = (st.courses || []).filter((c) => {
            if (ids.has(c.id)) return false;
            if (a.name && c.name.indexOf(a.name) >= 0) return false;
            return true;
          });
          const n = before - st.courses.length;
          if (n) notes.push('已从课表删掉 ' + n + ' 门');
        } else if (a.type === 'set_term') {
          const cur = termNow();
          let week1 = a.week1 || cur.week1;
          if (window.Timetable && a.week1) {
            const d = Util.parseDate(a.week1);
            if (d) week1 = Timetable.iso(Timetable.mondayOf(d));
          }
          st.term = Object.assign({}, st.term || {}, {
            week1,
            weeks: a.weeks || cur.weeks,
            title: a.title != null ? clip(a.title, 24) : (st.term && st.term.title) || '',
            periodPreset: a.periodPreset || (st.term && st.term.periodPreset) || 'jiaowu',
          });
          notes.push('第一周起始：' + week1 + '，共 ' + st.term.weeks + ' 周');
        } else if (a.type === 'shift_tasks' && a.from && a.to) {
          let n = 0;
          st.tasks.forEach((t) => {
            if (t.date !== a.from) return;
            if (a.onlyOpen && t.done) return;
            if (a.match && [t.title, t.note, t.location].join('').indexOf(a.match) < 0) return;
            t.date = a.to;
            t.reminded = false;
            n += 1;
          });
          if (n) notes.push('已推迟 ' + n + ' 项：' + a.from + ' → ' + a.to);
          else notes.push('没有可推迟的日程');
        } else if (a.type === 'set_settings') {
          if (typeof a.notify === 'boolean') st.settings.notify = a.notify;
          if (a.remindLead) st.settings.remindLead = a.remindLead;
          notes.push('提醒已设为提前 ' + (st.settings.remindLead || 10) + ' 分钟' + (st.settings.notify ? '，并已打开' : ''));
        }
      });
    });
    Notify.resync().catch(() => {});
    return notes.filter(Boolean);
  }

  function localFallback(text) {
    const parsed = Nlp.parseText(text, new Date());
    if (!parsed.tasks.length && !parsed.memos.length) return null;
    return {
      reply: '还没填密钥，我先按这句话把能确定的日期记下了。看图、PDF 和长线目标需要密钥。',
      actions: []
        .concat(parsed.tasks.length ? [{ type: 'create_tasks', tasks: parsed.tasks }] : [])
        .concat(parsed.memos.length ? [{ type: 'create_memos', items: parsed.memos }] : []),
    };
  }

  async function send() {
    const text = session.text.trim();
    const files = session.files.slice();
    if (!text && !files.length) return;
    const images = [];
    const pdfBits = [];
    for (const f of files) {
      if (f.kind === 'image') images.push(f.url);
      if (f.kind === 'pdf' && f.text) pdfBits.push(f.name + '\n' + f.text);
    }
    let shown = text;
    if (images.length) shown += (shown ? '\n' : '') + '［图片 ' + images.length + ' 张］';
    if (pdfBits.length) shown += (shown ? '\n' : '') + '［PDF ' + files.filter((f) => f.kind === 'pdf').length + ' 份］';
    pushChat('user', shown || '（附件）');
    session.text = '';
    session.files = [];
    render();
    const pendingBefore = s().diy.pending;
    if (pendingBefore && pendingBefore.type === 'study_plan_draft' && window.Intent
      && Intent.isPlanDraftFollowup && !Intent.isPlanDraftFollowup(text)) {
      Store.update((st) => { st.diy.pending = null; });
    }
    const snap = snapshot();
    if (!images.length && !pdfBits.length && window.Intent) {
      const judged = Intent.interpret(text, {
        tasks: s().tasks, meals: s().meals, courses: s().courses, term: s().term, pending: s().diy.pending,
      }, new Date());
      if (judged.handled) {
        const packed = normalize({
          reply: judged.reply,
          actions: judged.actions || [],
          truncated: !!(judged.pending && judged.pending.type === 'task_continue'),
        });
        Store.update((st) => {
          if (judged.clearPending) st.diy.pending = null;
          if (judged.pending) st.diy.pending = judged.pending;
          else if (packed.meta && packed.meta.truncated && packed.meta.studyPlan) {
            st.diy.pending = {
              type: 'task_continue',
              afterDate: packed.meta.studyPlan.nextDate || '',
              to: packed.meta.studyPlan.plan && packed.meta.studyPlan.plan.to,
              plan: packed.meta.studyPlan.plan,
            };
          } else if (packed.meta && !packed.meta.truncated && st.diy.pending && st.diy.pending.type === 'task_continue') {
            st.diy.pending = null;
          }
        });
        const notes = packed.actions.length ? applyAll(packed.actions) : [];
        const id = Util.uid();
        const wrote = hasActualWrite(notes);
        if (wrote) { session.undo = snap; session.undoMsg = id; }
        pushChat('assistant', executionReply(packed.reply || judged.reply, notes, packed.actions.length), { receipt: notes.join('\n\n'), undo: wrote ? id : '' });
        render();
        return;
      }
    }
    if (!s().settings.apiKey.trim()) {
      const local = localFallback(text);
      if (!local) { Util.toast('先到设置里填写密钥'); session.view = 'settings'; render(); return; }
      const notes = applyAll(local.actions);
      const id = Util.uid();
      const wrote = hasActualWrite(notes);
      pushChat('assistant', executionReply(local.reply, notes, local.actions.length), { receipt: notes.join('\n\n'), undo: wrote ? id : '' });
      if (wrote) {
        session.undo = snap;
        session.undoMsg = id;
      }
      render();
      return;
    }
    session._lastOk = false;
    session._lastErr = false;
    // 附件：本地教务解析优先出草稿，再可选让模型校对
    if ((images.length || pdfBits.length) && window.Timetable && pdfBits.length) {
      const localDraft = Timetable.parseText(pdfBits.join('\n\n'), termNow().weeks)
        .map(normalizeCourse).filter((c) => c.name && c.weekday);
      if (localDraft.length >= 2) {
        pushChat('assistant', '本地已从附件认出 ' + localDraft.length + ' 门课，请先核对。不清的可以再说一声让我重看。', {
          receipt: '课表待确认（本地解析）',
        });
        session._lastOk = true;
        setBusy('');
        render();
        openCoursePreview(localDraft);
        return;
      }
    }
    setBusy(images.length || pdfBits.length ? '正在看附件' : '正在安排');
    try {
      const attachHint = (images.length || pdfBits.length)
        ? '\n用户发了课表或附件。只提取明确看得见的课，禁止擅自改名、改时间、补课。看不清就追问。每门课必须给 weekday + sectionStart/sectionEnd（或 startTime）+ weeksText（如 1-15(单)）。用 set_courses，禁止 create_tasks。'
        : '';
      const continuePending = s().diy.pending && s().diy.pending.type === 'task_continue'
        ? s().diy.pending
        : null;
      const continueHint = continuePending
        ? ('上次排到 ' + (continuePending.afterDate || '中途') + ' 被截断。请从下一天继续，每天标题/内容必须不同；学习计划优先 create_study_plan。')
        : '';
      let result = normalize(await Llm.agent({
        context: contextBlock() + attachHint,
        images,
        pdfText: pdfBits.join('\n\n'),
        continueHint,
        maxTokens: 4500,
      }));
      if (!result.actions.length && claimsMutation(result.reply)) {
        setBusy('核对写入结果');
        const repaired = normalize(await Llm.agent({
          context: contextBlock() + attachHint,
          images,
          pdfText: pdfBits.join('\n\n'),
          continueHint,
          repairHint: '上一轮回复声称已经执行，但 actions 为空，实际没有写入。请根据对话中已经确认的信息重新生成可执行 actions，能确定就立即执行，不要只复述计划。确实缺少关键字段时只问一个问题；actions 为空时禁止说已排好、已写入或已完成。',
          maxTokens: 4500,
        }));
        if (repaired.actions.length || !claimsMutation(repaired.reply)) result = repaired;
      }
      // 若模型仍用超长 create_tasks 且被截断，再自动续一轮（最多 3 轮）
      for (let round = 0; round < 3; round++) {
        const created = result.actions.filter((a) => a.type === 'create_tasks');
        const lastBatch = created.length ? created[created.length - 1].tasks : [];
        const needMore = !!(result.meta && result.meta.truncated) && lastBatch.length >= 8;
        if (!needMore) break;
        const lastDate = lastBatch.map((t) => t.date).filter(Boolean).sort().pop() || '';
        setBusy('继续排后续日程');
        const more = normalize(await Llm.agent({
          context: contextBlock() + attachHint,
          continueHint: '上一批已排到 ' + lastDate + '。请只输出下一批（最多 25 条）create_tasks，或改用完整 create_study_plan。每天内容必须不同。',
          maxTokens: 4500,
        }));
        if (!more.actions.length) break;
        result = {
          reply: more.reply || result.reply,
          actions: result.actions.concat(more.actions),
          meta: {
            truncated: !!(more.meta && more.meta.truncated),
            studyPlan: (more.meta && more.meta.studyPlan) || (result.meta && result.meta.studyPlan) || null,
          },
        };
        if (!(more.meta && more.meta.truncated)) break;
      }
      const courseAct = result.actions.find((a) => a.type === 'set_courses' && a.courses && a.courses.length);
      if (courseAct && (images.length || pdfBits.length)) {
        const other = result.actions.filter((a) => a.type !== 'set_courses');
        const notes = other.length ? applyAll(other) : [];
        const draft = courseAct.courses.map(normalizeCourse).filter((c) => c.name && c.weekday);
        pushChat('assistant', result.reply || ('认出 ' + draft.length + ' 门课，请先核对再写入。'), {
          receipt: notes.concat(draft.length ? '课表待确认，未直接写入' : []).join('\n\n'),
        });
        session._lastOk = true;
        setBusy('');
        render();
        if (draft.length) openCoursePreview(draft);
        return;
      }
      const notes = result.actions.length ? applyAll(result.actions) : [];
      const id = Util.uid();
      const wrote = hasActualWrite(notes);
      if (wrote) { session.undo = snap; session.undoMsg = id; }
      if (!result.actions.length && claimsMutation(result.reply)) {
        result.reply = '我检查后发现这次没有真正写入日程，所以不会把刚才那段说明当成完成。请再说一次具体日期和科目，我会直接写入；如果只是确认刚才的方案，说「重新执行」。';
      }
      // 续排断点：截断时记下最后日期，用户说「继续」可接着排
      Store.update((st) => {
        if (result.meta && result.meta.truncated) {
          const allTasks = result.actions.filter((a) => a.type === 'create_tasks').flatMap((a) => a.tasks || []);
          const afterDate = allTasks.map((t) => t.date).filter(Boolean).sort().pop() || '';
          st.diy.pending = {
            type: 'task_continue',
            afterDate,
            to: (result.meta.studyPlan && result.meta.studyPlan.plan && result.meta.studyPlan.plan.to) || '',
            plan: (result.meta.studyPlan && result.meta.studyPlan.plan) || null,
          };
        } else if (continuePending || (st.diy.pending && st.diy.pending.type === 'task_continue')) {
          st.diy.pending = null;
        }
      });
      pushChat('assistant', executionReply(result.reply, notes, result.actions.length), { receipt: notes.join('\n\n'), undo: wrote ? id : '' });
      session._lastOk = true;
    } catch (e) {
      session._lastErr = true;
      const msg = explain(e);
      pushChat('assistant', msg.indexOf('image') >= 0 || msg.indexOf('vision') >= 0 || msg.indexOf('图') >= 0
        ? '当前模型可能不支持看图。可以换一个带视觉的模型，或把课表拍清楚再发。'
        : msg);
      Util.toast(msg);
    } finally {
      setBusy('');
      render();
    }
  }

  function companionPack() {
    if (session.view === 'fish') return 'fish';
    const theme = window.Theme ? Theme.byId(s().settings.theme) : null;
    return theme && theme.id === 'naiwa' ? 'naiwa' : '';
  }

  async function sendCompanion(preset) {
    const text = String(preset && preset.text != null ? preset.text : session.companionText).trim();
    if (!text) return;
    const kind = session.view === 'fish' ? 'fish' : 'buddy';
    const userExtra = {};
    if (preset && preset.sticker) userExtra.sticker = preset.sticker;
    if (preset && preset.stickerOnly) userExtra.stickerOnly = true;
    pushChannel(kind, 'user', text, userExtra);
    session.companionText = '';
    render();
    if (!s().settings.apiKey.trim()) {
      pushChannel(kind, 'assistant', kind === 'fish'
        ? '本鱼还没接到密钥。去设置里填一下，我再继续嘴贱。'
        : '先去设置里填密钥，我才能好好陪你聊。');
      render();
      return;
    }
    setBusy(kind === 'fish' ? '大肥鱼在想…' : '精灵在想…');
    try {
      const hist = kind === 'fish' ? (s().diy.fishChat || []) : (s().diy.buddyChat || []);
      let reply = kind === 'fish'
        ? await Llm.fishTalk(hist, companionContext())
        : await Llm.buddyTalk((Theme.byId(s().settings.theme) || {}).name || '精灵', hist, companionContext());
      reply = String(reply || '').trim();
      if (!reply) {
        reply = kind === 'fish'
          ? ((window.FishPersona && FishPersona.quip('tap')) || '嗯？再说一遍。')
          : '我走神了，再说一次好吗？';
      }
      const pack = companionPack();
      const parsed = pack && window.Stickers ? Stickers.take(pack, reply) : { content: reply, sticker: '' };
      pushChannel(kind, 'assistant', parsed.content || reply, parsed.sticker ? { sticker: parsed.sticker } : {});
      session._lastOk = true;
    } catch (e) {
      session._lastErr = true;
      pushChannel(kind, 'assistant', kind === 'fish'
        ? ((window.FishPersona && FishPersona.quip('error')) || '翻车了。不是本鱼的锅。') + '（' + explain(e) + '）'
        : explain(e));
    } finally {
      setBusy('');
      render();
    }
  }

  function shiftMonth(dir, anim) {
    if (!session.month) {
      const n = new Date();
      session.month = { y: n.getFullYear(), m: n.getMonth() };
    }
    const d = new Date(session.month.y, session.month.m + dir, 1);
    session.month = { y: d.getFullYear(), m: d.getMonth() };
    session.calAnim = anim || (dir > 0 ? 'next' : 'prev');
    render();
  }

  function undo() {
    if (!session.undo) return;
    const snap = session.undo;
    Store.update((st) => {
      st.tasks = snap.tasks;
      st.memos = snap.memos;
      st.goals = snap.goals;
      st.meals = snap.meals || [];
      st.courses = snap.courses || [];
      if (snap.term) st.term = snap.term;
      st.checkins = snap.checkins;
      st.diy.designs = snap.designs;
      st.settings.notify = snap.notify;
      st.settings.remindLead = snap.remindLead;
    });
    session.undo = null;
    Util.toast('已撤销上一轮修改');
    render();
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const max = 1280;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => reject(new Error('这张图打不开'));
      img.src = URL.createObjectURL(file);
    });
  }

  async function addFiles(list) {
    let courseHint = false;
    for (const file of list) {
      if (file.type.indexOf('image/') === 0) {
        const url = await resizeImage(file);
        session.files.push({ kind: 'image', name: file.name, url });
        if (session.wantCourse) courseHint = true;
      } else if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
        const buf = await file.arrayBuffer();
        const got = await PdfText.extract(buf);
        if (session.wantCourse) {
          const found = window.Timetable ? Timetable.parseText(got.text, termNow().weeks) : [];
          if (found.length) {
            session.wantCourse = false;
            openCoursePreview(found);
            continue;
          }
          courseHint = true;
        }
        session.files.push({ kind: 'pdf', name: file.name, text: got.text, empty: !got.text });
        if (!got.text) Util.toast('这份 PDF 没有抽出文字，请改发课表照片');
      }
    }
    if (courseHint) {
      session.wantCourse = false;
      session.view = 'chat';
      if (!session.text.trim()) {
        session.text = '这是课表。只提取图或文字里明确出现的课程（星期、节次、周次、地点），看不清的先问我，不要猜、不要改、不要补课。用课表体系写入，不要拆成普通日程。';
      }
    }
    render();
  }

  function iconBtn(act, svg, label) {
    return `<button class="icon-btn" data-act="${act}" aria-label="${label}">${svg}</button>`;
  }

  function renderTop() {
    const today = Util.localDate();
    const st = s();
    const theme = window.Theme ? Theme.byId(st.settings.theme) : null;
    const todayTasks = (st.tasks || []).filter((t) => t.date === today);
    const todayDone = todayTasks.filter((t) => t.done).length;
    const titles = {
      chat: ['引程', Util.pretty(today) + ' ' + Util.weekdayLabel(today)],
      calendar: ['日程', Util.pretty(today) + ' ' + Util.weekdayLabel(today)],
      goals: ['目标', ((st.goals || []).length ? (st.goals || []).length + ' 个长线目标' : '把想做的事排进日程')],
      settings: ['设置', '本机保存 · 离线优先'],
      buddy: [(theme && theme.name) || '精灵', ''],
      fish: ['大肥鱼', ''],
    };
    const top = document.getElementById('top');
    if (session.view === 'calendar') { top.innerHTML = ''; top.hidden = true; return; }
    top.hidden = false;
    const pair = titles[session.view] || titles.chat;
    const back = (session.view === 'buddy' || session.view === 'fish')
      ? `<button class="icon-btn" data-act="tab" data-view="chat" aria-label="返回">${I.back}</button>`
      : '';
    const avSrc = session.view === 'fish'
      ? 'assets/themes/fish/avatar.png'
      : (session.view === 'buddy' && theme && theme.avatar ? theme.avatar : '');
    const av = avSrc ? `<img class="top-avatar" src="${Util.esc(avSrc)}" alt="" />` : '';
    const mark = av || '<span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>';
    const glance = session.view === 'chat' && todayTasks.length
      ? `<button type="button" class="today-glance" data-act="calendar" aria-label="查看今日日程，已完成 ${todayDone} 项，共 ${todayTasks.length} 项">
          <strong>${todayDone}/${todayTasks.length}</strong><span>今日完成</span>
        </button>`
      : '';
    top.innerHTML = `${back}${mark}<div class="top-copy"><div class="brand">${Util.esc(pair[0])}</div>${pair[1] ? `<div class="top-sub">${Util.esc(pair[1])}</div>` : ''}</div>${glance}`;
  }

  function renderTabs() {
    const items = [['chat', '对话', I.chat], ['calendar', '日程', I.cal], ['goals', '目标', I.flag], ['settings', '设置', I.gear]];
    document.getElementById('tabs').innerHTML = items.map(([id, name, icon]) =>
      `<button type="button" class="${session.view === id ? 'on' : ''}" data-act="tab" data-view="${id}" aria-label="${name}" aria-current="${session.view === id ? 'page' : 'false'}">${icon}<span>${name}</span></button>`
    ).join('');
  }

  function todayStrip() {
    const today = Util.localDate();
    const list = s().tasks.filter((t) => t.date === today).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    if (!list.length) return '';
    return `<button class="today-strip" data-act="calendar" style="width:100%;text-align:left">
      <h2>今天 · ${list.filter((t) => !t.done).length} 项未完成</h2>
      ${list.slice(0, 3).map((t) => `<div class="task-line ${t.done ? 'done' : ''}"><span class="when">${Util.esc(t.time || '全天')}</span><span class="what">${Util.esc(t.title)}</span></div>`).join('')}
    </button>`;
  }

  function dayMark(ts) {
    const day = Util.localDate(new Date(ts || Date.now()));
    const today = Util.localDate();
    if (day === today) return '今天';
    if (day === Util.addDaysStr(today, -1)) return '昨天';
    return Util.pretty(day) + ' ' + Util.weekdayLabel(day);
  }

  function msgDay(m) {
    return Util.localDate(new Date(m.at || Date.now()));
  }

  function buildDayBrief() {
    const today = Util.localDate();
    const st = s();
    const term = termNow();
    const open = st.tasks.filter((t) => t.date === today && !t.done)
      .sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    const courses = window.Timetable ? Timetable.onDate(st.courses || [], today, term) : [];
    const lines = [];
    courses.forEach((c) => lines.push('课 · ' + (c.startTime || '') + ' ' + c.name));
    open.slice(0, 8).forEach((t) => lines.push((t.time || '全天') + ' ' + t.title));
    if (!lines.length) {
      return '今天还没有待办。直接跟我说安排，或去日程页点「＋ 新建」。办完了告诉我，我会在日历上勾掉。';
    }
    return '今日待办 ' + (courses.length + open.length) + ' 项：\n' + lines.join('\n') + '\n\n办完了直接说，例如「高数作业写完了」。';
  }

  function ensureDayBrief() {
    const today = Util.localDate();
    const chat = s().diy.chat || [];
    if (chat.some((m) => m.kind === 'day_brief' && msgDay(m) === today)) return;
    const start = Util.parseDate(today);
    const at = start ? start.getTime() + 60 * 1000 : Date.now();
    Store.update((st) => {
      if (!Array.isArray(st.diy.chat)) st.diy.chat = [];
      if (st.diy.chat.some((m) => m.kind === 'day_brief' && Util.localDate(new Date(m.at)) === today)) return;
      st.diy.chat.push({ id: Util.uid(), role: 'assistant', content: buildDayBrief(), at, kind: 'day_brief' });
    });
  }

  function goalKeyBits(g) {
    const title = String(g.title || '').trim();
    const bits = new Set();
    if (title) bits.add(title);
    for (let i = 0; i < title.length - 1; i++) {
      const pair = title.slice(i, i + 2);
      if (!/^[的了吗呢啊呀吧\s]+$/.test(pair)) bits.add(pair);
    }
    String(g.detail || '').split(/[\s,，、；;。.]+/).forEach((w) => {
      if (w && w.length >= 2) bits.add(w.slice(0, 12));
    });
    return [...bits];
  }

  function taskMatchesGoal(t, g) {
    const hay = ((t.title || '') + ' ' + (t.note || '') + ' ' + (t.category || '')).toLowerCase();
    return goalKeyBits(g).some((k) => k && hay.indexOf(String(k).toLowerCase()) >= 0);
  }

  function goalTaskStats(g, days) {
    const today = Util.localDate();
    const from = Util.addDaysStr(today, -(days || 14));
    const related = (s().tasks || []).filter((t) => t.date && t.date >= from && t.date <= today && taskMatchesGoal(t, g));
    const done = related.filter((t) => t.done);
    const open = related.filter((t) => !t.done);
    const overdue = open.filter((t) => t.date < today);
    return {
      related,
      doneCount: done.length,
      openCount: open.length,
      overdueCount: overdue.length,
      openTitles: open.slice(0, 6).map((t) => (t.date || '') + ' ' + (t.time || '') + ' ' + (t.title || '')),
      doneTitles: done.slice(-4).map((t) => (t.date || '') + ' ' + (t.title || '')),
    };
  }

  function buildGoalAuditPack() {
    const goals = s().goals || [];
    return {
      today: Util.localDate(),
      goals: goals.map((g) => {
        const st = goalTaskStats(g, 14);
        return {
          id: g.id,
          title: g.title,
          horizon: g.horizon || 'year',
          detail: g.detail || '',
          progress: g.progress || '',
          relatedDone: st.doneCount,
          relatedOpen: st.openCount,
          overdue: st.overdueCount,
          openItems: st.openTitles,
          recentlyDone: st.doneTitles,
        };
      }),
    };
  }

  function localGoalRoast(pack) {
    const lines = ['【目标督查】今天又来了。'];
    const updates = [];
    (pack.goals || []).forEach((g) => {
      let verdict = 'ok';
      let progress = '有在动，但别飘。';
      if (!g.relatedDone && !g.relatedOpen) {
        verdict = 'slacking';
        progress = '近两周几乎没排相关日程，空喊目标。';
        lines.push('「' + g.title + '」：嘴上立 flag，日历上空空如也。是打算用意念完成吗？');
      } else if (g.overdue > 0) {
        verdict = 'dragging';
        progress = '有 ' + g.overdue + ' 项相关日程逾期未做。';
        lines.push('「' + g.title + '」：逾期 ' + g.overdue + ' 项还搁着——' + (g.openItems[0] || '具体事项你自己清楚') + '。拖成这样还好意思打开 App？');
      } else if (g.relatedOpen > g.relatedDone) {
        verdict = 'dragging';
        progress = '未完成多于已完成，节奏偏松。';
        lines.push('「' + g.title + '」：未做 ' + g.relatedOpen + '、做成 ' + g.relatedDone + '。进度像散步，目标像在月球。');
      } else {
        verdict = 'good';
        progress = '近期相关日程跟得上，别松劲。';
        lines.push('「' + g.title + '」：这几天还算没全废。得意什么，明天一样查。');
      }
      updates.push({ id: g.id, progress, verdict });
    });
    if ((pack.goals || []).length > 1) lines.push('少辩解，多勾掉。今天把最丢人的那一项做完再来找我。');
    return { roast: lines.join('\n'), goals: updates };
  }

  function applyGoalRoastResult(parsed, day) {
    const roast = String(parsed && parsed.roast || '').trim();
    if (!roast) return false;
    const byId = {};
    (parsed.goals || []).forEach((g) => { if (g && g.id) byId[g.id] = g; });
    Store.update((st) => {
      st.diy = st.diy || {};
      st.diy.goalRoastDay = day;
      st.diy.goalRoastText = roast.slice(0, 800);
      st.diy.goalRoastAt = Date.now();
      (st.goals || []).forEach((g) => {
        const u = byId[g.id];
        if (!u) return;
        if (u.progress) g.progress = String(u.progress).slice(0, 80);
        if (u.verdict) g.verdict = String(u.verdict).slice(0, 16);
        g.lastRoastAt = Date.now();
      });
      if (!Array.isArray(st.diy.chat)) st.diy.chat = [];
      const already = st.diy.chat.some((m) => m.kind === 'goal_roast' && Util.localDate(new Date(m.at || 0)) === day);
      if (!already) {
        const start = Util.parseDate(day);
        const at = start ? start.getTime() + 90 * 1000 : Date.now();
        st.diy.chat.push({
          id: Util.uid(),
          role: 'assistant',
          content: roast.slice(0, 2000),
          at,
          kind: 'goal_roast',
        });
      } else {
        const m = st.diy.chat.slice().reverse().find((x) => x.kind === 'goal_roast' && Util.localDate(new Date(x.at || 0)) === day);
        if (m) m.content = roast.slice(0, 2000);
      }
    });
    return true;
  }

  async function runGoalRoast(force) {
    const today = Util.localDate();
    const goals = s().goals || [];
    if (!goals.length) {
      if (force) Util.toast('还没有长线目标，先在对话里立一个');
      return false;
    }
    if (!force && s().diy.goalRoastDay === today) return false;
    if (!force && (s().diy.chat || []).some((m) => m.kind === 'goal_roast' && msgDay(m) === today)) {
      Store.update((st) => { st.diy.goalRoastDay = today; });
      return false;
    }
    const pack = buildGoalAuditPack();
    const key = String(s().settings.apiKey || '').trim();
    let parsed;
    try {
      if (key && window.Llm && Llm.goalRoast) {
        parsed = await Llm.goalRoast(JSON.stringify(pack, null, 0));
      } else {
        parsed = localGoalRoast(pack);
        if (force && !key) Util.toast('未填密钥，先用本地督查');
      }
    } catch (e) {
      parsed = localGoalRoast(pack);
      if (force) Util.toast('模型督查失败，已用本地批评：' + (e && e.message ? e.message : ''));
    }
    if (!parsed || !parsed.roast) parsed = localGoalRoast(pack);
    const ok = applyGoalRoastResult(parsed, today);
    if (ok && force) Util.toast('督查已更新');
    return ok;
  }

  function ensureGoalRoast() {
    if (session._goalRoastKick) return;
    const goals = s().goals || [];
    if (!goals.length) return;
    const today = Util.localDate();
    if (s().diy.goalRoastDay === today) return;
    session._goalRoastKick = true;
    runGoalRoast(false).then((changed) => {
      if (changed && session.view === 'chat') render();
    }).catch(() => {}).finally(() => {
      session._goalRoastKick = false;
    });
  }

  function htmlChat() {
    ensureDayBrief();
    ensureGoalRoast();
    const today = Util.localDate();
    const cutoff = Util.addDaysStr(today, -session.chatDaysBack);
    const all = (s().diy.chat || []).slice().sort((a, b) => (a.at || 0) - (b.at || 0));
    const olderExists = all.some((m) => msgDay(m) < cutoff);
    const msgs = all.filter((m) => msgDay(m) >= cutoff && m.kind !== 'hidden');
    if (!msgs.length) {
      const theme = window.Theme ? Theme.byId(s().settings.theme) : null;
      const buddy = theme && theme.avatar ? `<div class="hello-mascot" data-act="open-buddy">${Theme.mascotHtml(theme.id, 108)}</div>` : '';
      return `<div class="hello page-enter">${buddy}<p>今天从待办开始。课表按周次，作业和社团直接说就行。长按气泡可撤回或删除。</p>
        <div class="suggest">
          <button data-act="prefill" data-text="明天下午五点前交高数作业">作业截止</button>
          <button data-act="prefill" data-text="下周三高等数学考试，帮我安排复习">考试复习</button>
          <button data-act="prefill" data-text="今天下午两点到四点去图书馆自习">图书馆自习</button>
          <button data-act="prefill" data-text="今天有什么安排">查今日</button>
          <button data-act="pick">课表照片或 PDF</button>
          <button data-act="prefill" data-text="把今天没做完的顺延到明天">一键顺延</button>
        </div></div>`;
    }
    let lastDay = '';
    const body = msgs.map((m) => {
      const mark = dayMark(m.at);
      const sep = mark === lastDay ? '' : `<div class="day-mark">${mark}</div>`;
      lastDay = mark;
      if (m.kind === 'recalled') {
        return `${sep}<div class="msg-recall">${Util.esc(m.content || '你撤回了一条消息')}</div>`;
      }
      const receipt = m.receipt ? `<div class="receipt">${Util.esc(m.receipt).replace(/\n/g, '<br>')}${m.undo && m.undo === session.undoMsg && session.undo ? ' <button data-act="undo">撤销写入</button>' : ''}</div>` : '';
      const brief = m.kind === 'day_brief' ? ' day-brief' : (m.kind === 'goal_roast' ? ' goal-roast' : '');
      const role = m.role === 'user' ? 'user' : 'assistant';
      const head = m.kind === 'goal_roast' ? '<div class="roast-badge">目标督查</div>' : '';
      const menu = session.msgMenuId === m.id
        ? `<div class="msg-menu" data-msg="${Util.esc(m.id)}">
            <button type="button" data-act="msg-copy" data-id="${Util.esc(m.id)}">复制</button>
            ${m.role === 'user' ? `<button type="button" data-act="msg-recall" data-id="${Util.esc(m.id)}">撤回</button>` : ''}
            <button type="button" data-act="msg-delete" data-id="${Util.esc(m.id)}">删除</button>
          </div>` : '';
      return `${sep}<div class="bubble-wrap ${role}" data-msg-wrap="${Util.esc(m.id || '')}">
        <div class="bubble ${role}${brief}" data-act="msg-hold" data-id="${Util.esc(m.id || '')}">${head}${Util.esc(m.content)}${receipt}</div>
        ${menu}
      </div>`;
    }).join('');
    const olderBtn = olderExists
      ? `<button class="chat-older" data-act="older-chat">↑ 查看更早的对话</button>`
      : (session.chatDaysBack > 0 ? `<button class="chat-older" data-act="today-chat">只看今天</button>` : '');
    return `<div class="chat page-enter" id="log">${olderBtn}${body}</div>`;
  }

  function monthCells(y, m) {
    const first = new Date(y, m, 1);
    const pad = first.getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < pad; i++) cells.push('');
    for (let d = 1; d <= days; d++) cells.push(Util.localDate(new Date(y, m, d)));
    while (cells.length % 7) cells.push('');
    return cells;
  }

  function catOf(id) { return CATS.find((c) => c.id === id) || CATS[0]; }
  function termNow() {
    const term = window.Timetable
      ? Timetable.termOf(s().term, new Date().getFullYear())
      : { week1: '', weeks: 20, title: '', periodPreset: 'jiaowu' };
    if (window.Timetable) Timetable.useTermPeriods(term);
    return term;
  }
  function parseWeekday(v) {
    if (typeof v === 'number' && v >= 1 && v <= 7) return v;
    const s = String(v == null ? '' : v).trim();
    const n = parseInt(s, 10);
    if (n >= 1 && n <= 7) return n;
    const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7, 七: 7 };
    const m = s.match(/(?:星期|周)?([一二三四五六日天七])/);
    if (m && map[m[1]]) return map[m[1]];
    return 0;
  }
  function normalizeCourse(raw) {
    const term = termNow();
    const weekday = parseWeekday(raw.weekday != null ? raw.weekday : raw.weekDay || raw.day);
    let weeks = Array.isArray(raw.weeks) ? raw.weeks.map(Number).filter((n) => n > 0 && n <= term.weeks) : [];
    const weeksText = clip(raw.weeksText || raw.weekRange || '', 32);
    if (raw.weeksText && !Array.isArray(raw.weeks)) weeks = [];
    if (!weeks.length && window.Timetable) weeks = Timetable.parseWeeks(weeksText || raw.weeks, term.weeks);
    if (!weeks.length) weeks = Array.from({ length: term.weeks }, (_, i) => i + 1);
    let sectionStart = parseInt(raw.sectionStart != null ? raw.sectionStart : raw.section_start, 10) || 0;
    let sectionEnd = parseInt(raw.sectionEnd != null ? raw.sectionEnd : raw.section_end, 10) || 0;
    if (!sectionStart && raw.section) {
      const m = String(raw.section).match(/(\d{1,2})\s*[-~～到至]?\s*(\d{1,2})?/);
      if (m) { sectionStart = +m[1]; sectionEnd = m[2] ? +m[2] : sectionStart; }
    }
    if (sectionStart && !sectionEnd) sectionEnd = sectionStart;
    let startTime = validTime(raw.startTime) || validTime(String(raw.startTime || '').replace(/：/g, ':')) || '';
    let endTime = validTime(raw.endTime) || validTime(String(raw.endTime || '').replace(/：/g, ':')) || '';
    // 有节号且无时钟时，用 PERIOD 补时间；已有自由时间则保留，避免被节次表覆盖
    if (sectionStart && window.Timetable) {
      const span = Timetable.sectionSpan(sectionStart, sectionEnd || sectionStart);
      if (!startTime) startTime = span[0];
      if (!endTime) endTime = span[1];
    } else if ((startTime || endTime) && window.Timetable) {
      const guess = Timetable.sectionsFromTimes(startTime, endTime);
      if (!sectionStart && guess.sectionStart) {
        sectionStart = guess.sectionStart;
        sectionEnd = guess.sectionEnd || guess.sectionStart;
      }
    }
    const color = clip(raw.color, 16);
    return {
      id: raw.id || Util.uid(),
      name: clip(raw.name || raw.title, 24),
      weekday,
      startTime,
      endTime,
      sectionStart: sectionStart || 0,
      sectionEnd: sectionEnd || sectionStart || 0,
      weeks,
      weeksText: weeksText || (weeks[0] + '-' + weeks[weeks.length - 1] + '周'),
      location: clip(raw.location || raw.place || raw.room, 30),
      teacher: clip(raw.teacher, 20),
      color: color || '',
    };
  }
  function repairCourses(list) {
    return (list || []).map((c) => {
      const next = normalizeCourse(c);
      return next.name && next.weekday ? next : null;
    }).filter(Boolean);
  }

  function soonText(date, time) {
    if (!date || !time) return '';
    const at = new Date(date + 'T' + time + ':00').getTime();
    if (Number.isNaN(at)) return '';
    const diff = at - Date.now();
    if (diff < 0) return '已开始';
    const mins = Math.round(diff / 60000);
    if (mins < 60) return mins + ' 分钟后开始';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h >= 48) return Math.floor(h / 24) + ' 天后开始';
    return h + ' 小时' + (m ? m + ' 分钟' : '') + '后开始';
  }

  function htmlCalendar() {
    if (!session.month) {
      const n = new Date();
      session.month = { y: n.getFullYear(), m: n.getMonth() };
    }
    if (!session.day) session.day = Util.localDate();
    const st = s();
    const design = (st.diy.designs || {}).calendar || {};
    const css = Design.scopeCss('calendar', design.css || '');
    const extra = design.html ? Design.fill(Design.sanitizeHtml(design.html), Design.facts()) : '';
    const courses = repairCourses(st.courses || []);
    if ((st.courses || []).length && courses.length) {
      const dirty = courses.length !== st.courses.length || courses.some((c, i) => {
        const o = st.courses[i];
        return !o || c.weekday !== o.weekday || (c.weeks || []).join() !== (o.weeks || []).join() || c.name !== o.name
          || !!c.sectionStart !== !!o.sectionStart || c.startTime !== o.startTime;
      });
      if (dirty) Store.update((s2) => { s2.courses = courses; });
    }
    const counts = {};
    st.tasks.forEach((t) => { if (t.date && !t.done) counts[t.date] = (counts[t.date] || 0) + 1; });
    const term = termNow();
    const weekNo = window.Timetable ? Timetable.weekOf(session.day, term) : 0;
    const { y, m } = session.month;
    const today = Util.localDate();
    const cells = monthCells(y, m).map((day) => {
      if (!day) return '<div></div>';
      const date = Util.parseDate(day);
      const info = (window.Lunar && date) ? Lunar.mark(day, date) : { sub: '', rest: false };
      const on = day === session.day;
      const hasCourse = window.Timetable && Timetable.onDate(courses, day, term, { fallbackWeekday: true }).length;
      const has = counts[day] || hasCourse;
      return `<button class="cal-cell${on ? ' on' : ''}${day === today && !on ? ' today' : ''}" data-act="pick-day" data-date="${day}">
        ${info.rest ? '<i class="rest">休</i>' : ''}
        <span class="num">${+day.slice(8)}</span>
        <span class="sub">${Util.esc(info.sub || '')}</span>
        <i class="dot" style="${has ? '' : 'visibility:hidden'}"></i>
      </button>`;
    }).join('');
    const picked = Util.parseDate(session.day);
    const lunarLine = (window.Lunar && picked) ? Lunar.mark(session.day, picked).footer : '';
    let dayCourses = window.Timetable ? Timetable.onDate(courses, session.day, term) : [];
    let courseLoose = false;
    if (!dayCourses.length && courses.length && window.Timetable && !weekNo) {
      dayCourses = Timetable.onWeekday(courses, session.day);
      courseLoose = dayCourses.length > 0;
    }
    const q = session.q.trim();
    let agenda = st.tasks.filter((t) => q
      ? (t.title + (t.location || '') + (t.note || '')).indexOf(q) >= 0
      : t.date === session.day);
    const dayMeals = (st.meals || []).filter((meal) => meal.date === (q ? meal.date : session.day) && (!q || (meal.text || meal.name || '').indexOf(q) >= 0));
    let mealsForDay = q ? dayMeals : dayMeals.filter((meal) => meal.date === session.day);
    if (q && window.CalendarSearch) {
      const found = CalendarSearch.search(st, q);
      agenda = found.tasks;
      dayCourses = found.courses;
      mealsForDay = found.meals;
      courseLoose = false;
    }
    const batchBar = session.taskBatch
      ? `<div class="batch-bar">
          <span>已选 ${session.taskPicked.length} 项</span>
          <button type="button" class="link" data-act="task-batch-time">改时间</button>
          <button type="button" class="link" data-act="task-batch-shift">顺延</button>
          <button type="button" class="link" data-act="task-batch-cat">分类</button>
          <button type="button" class="link" data-act="task-batch-done">完成</button>
          <button type="button" class="link danger" data-act="task-batch-del">删除</button>
          <button type="button" class="link" data-act="task-batch-off">取消</button>
        </div>`
      : `<div class="batch-bar thin">
          <button type="button" class="link" data-act="task-batch-on">批量</button>
          <button type="button" class="link" data-act="new-event">加日程</button>
          <button type="button" class="link" data-act="course-add">加课</button>
        </div>`;
    const agendaHtml = buildDayAgendaHtml(dayCourses, agenda, mealsForDay, q, courses.length);
    const courseHint = courses.length
      ? `<div class="course-bar" id="calCourseHint">
          <div>
            <strong>${weekNo ? ('第 ' + weekNo + ' 周') : '不在学期周次内'}</strong>
            <span>${courses.length} 门课${courseLoose ? ' · 按星期显示' : ''}</span>
          </div>
          <button type="button" class="link" data-act="view-courses">看课表</button>
        </div>
        ${courseLoose ? `<p class="course-warn" id="calCourseWarn">日期对不上第一周 ${Util.esc(term.week1)}，仍按星期显示。</p>` : ''}
        ${!dayCourses.length && weekNo ? `<p class="course-warn" id="calCourseEmpty">这天没课，可点「看课表」或直接加课。</p>` : ''}`
      : `<div class="course-bar bare" id="calCourseHint">
          <span>还没有课表</span>
          <button type="button" class="link" data-act="course">导入课表</button>
        </div>`;
    const search = session.searchOn
      ? `<input id="calQ" class="cal-search" type="search" enterkeyhint="search" aria-label="搜索日程、课程和记录" placeholder="搜索日程、课程、备注" value="${Util.esc(session.q)}" />`
      : '';
    const isToday = session.day === today;
    const anim = session.calAnim ? ' cal-' + session.calAnim : '';
    const pageClass = session.calQuiet ? 'cal-page panel' : 'cal-page panel page-enter';
    session.calQuiet = false;
    return `<section class="${pageClass}" data-panel="calendar" id="calPage">
      ${css ? `<style>${css}</style>` : ''}
      ${extra ? `<div class="panel-extra">${extra}</div>` : ''}
      <div class="cal-head">
        <div class="ym">${y}/<b>${m + 1}</b></div>
        ${isToday ? '' : `<button class="today-pill" data-act="today-jump">今日</button>`}
        <button class="icon-btn" data-act="month" data-dir="-1" aria-label="上个月">‹</button>
        <button class="icon-btn" data-act="month" data-dir="1" aria-label="下个月">›</button>
        <div class="spacer"></div>
        <button class="icon-btn" data-act="search-toggle" aria-label="搜索">${I.search}</button>
        <button class="icon-btn" data-act="cal-menu" aria-label="更多">${I.more}</button>
      </div>
      <p class="cal-swipe-hint">左右滑动翻月 · 点日期看当天</p>
      ${search}
      <div class="cal-swipe-area${anim}" id="calSwipe">
        <div class="weekdays"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div>
        <div class="cal-grid" id="calGrid">${cells}</div>
      </div>
      <button class="lunar-line" id="calLunar" data-act="today-jump">${Util.esc(lunarLine || Util.pretty(session.day))} <span>›</span></button>
      <div id="calHintWrap">${courseHint}</div>
      <div id="calBatchWrap">${batchBar}</div>
      <div class="agenda quiet" id="calAgenda">${agendaHtml}</div>
    </section>`;
  }

  function buildDayAgendaHtml(dayCourses, agenda, meals, q, hasCourses) {
    const items = [];
    (dayCourses || []).forEach((c) => {
      items.push({
        kind: 'course',
        sort: c.startTime || (c.sectionStart ? String(c.sectionStart).padStart(2, '0') + ':00' : '99:99'),
        done: false,
        id: c.id,
        course: c,
      });
    });
    (agenda || []).forEach((t) => {
      items.push({
        kind: 'task',
        sort: t.allDay ? '00:00' : (t.time || '99:99'),
        done: !!t.done,
        id: t.id,
        task: t,
      });
    });
    (meals || []).forEach((m, i) => {
      items.push({
        kind: 'meal',
        sort: '12:30',
        done: false,
        id: 'meal_' + i,
        meal: m,
      });
    });
    items.sort((a, b) => Number(a.done) - Number(b.done) || a.sort.localeCompare(b.sort) || a.kind.localeCompare(b.kind));
    const summary = q
      ? `<div class="search-summary">
          <span>“${Util.esc(q)}” 找到 ${items.length} 项</span>
          <button type="button" class="link" data-act="search-clear">清除</button>
        </div>`
      : '';
    if (!items.length) {
      return summary + `<div class="muted search-empty">${q ? '没有匹配的日程或课程' : (hasCourses ? '这天没课，也没有其他安排' : '这天还空着，可加课或加日程')}</div>`;
    }
    return summary + items.map((it) => {
      if (it.kind === 'course') {
        const c = it.course;
        const clock = [c.startTime, c.endTime].filter(Boolean).join('–') || '时间待定';
        const sec = c.sectionStart
          ? ('第' + c.sectionStart + (c.sectionEnd && c.sectionEnd !== c.sectionStart ? '-' + c.sectionEnd : '') + '节')
          : '';
        const weekday = c.weekday ? '周' + '一二三四五六日'[+c.weekday - 1] : '';
        return `<button type="button" class="event course" data-act="open-course" data-id="${Util.esc(c.id)}">
          <span class="when-col">${Util.esc(c.startTime || '—')}</span>
          <span class="body">
            <span class="event-title"><em class="tag">课</em>${Util.esc(c.name)}</span>
            <span class="event-meta">${Util.esc([q ? weekday : '', sec, clock, c.location, c.teacher].filter(Boolean).join(' · '))}</span>
          </span>
          <i class="bullet" style="background:${Util.esc(softCourseColor(c.color || COURSE_PALETTE[0]))}"></i>
        </button>`;
      }
      if (it.kind === 'meal') {
        const meal = it.meal;
        return `<div class="event">
          <span class="when-col">记录</span>
          <span class="body">
            <span class="event-title">${Util.esc(meal.name || '记录')}</span>
            <span class="event-meta">${meal.kind === 'study' ? Util.esc(meal.text || '') : ((meal.total || 0) + ' 千卡 · ' + Util.esc((meal.items || []).map((i) => i.name).join('、')))}</span>
          </span>
          <i class="bullet" style="background:${meal.kind === 'study' ? '#1d4e89' : '#b45309'}"></i>
        </div>`;
      }
      const t = it.task;
      const c = catOf(t.category);
      const span = t.allDay ? '全天' : [t.time, t.endTime].filter(Boolean).join('–');
      const wait = t.allDay || t.done ? '' : soonText(t.date, t.time);
      const picked = session.taskPicked.indexOf(t.id) >= 0;
      return `<div class="event ${t.done ? 'done' : ''} ${picked ? 'picked' : ''}">
        <span class="when-col">${Util.esc(t.allDay ? '全天' : (t.time || '—'))}</span>
        ${session.taskBatch
          ? `<button class="check ${picked ? 'on' : ''}" data-act="task-pick" data-id="${Util.esc(t.id)}" aria-label="选择">${picked ? I.check : ''}</button>`
          : `<button class="check ${t.done ? 'on' : ''}" data-act="toggle-done" data-id="${Util.esc(t.id)}" aria-label="${t.done ? '标为未完成' : '标为完成'}">${t.done ? I.check : ''}</button>`}
        <button class="body" data-act="${session.taskBatch ? 'task-pick' : 'open-task'}" data-id="${Util.esc(t.id)}" style="border:0;background:transparent;text-align:left;padding:0;flex:1">
          <span class="event-title">${Util.esc(t.title)}</span>
          <span class="event-meta">${Util.esc(span)}${wait ? ' · ' + wait : ''}${q && t.date ? ' · ' + Util.pretty(t.date) : ''}</span>
          ${t.location ? `<span class="event-meta">${Util.esc(t.location)}</span>` : ''}
        </button>
        <i class="bullet" style="background:${c.color}"></i>
      </div>`;
    }).join('');
  }

  /** 点日期：只改选中态与下方列表，避免整页闪一下 */
  function selectCalendarDay(date) {
    if (!date || date === session.day) return;
    session.day = date;
    const d = Util.parseDate(date);
    if (d) session.month = { y: d.getFullYear(), m: d.getMonth() };
    const page = document.getElementById('calPage');
    if (!page || session.view !== 'calendar') {
      session.calQuiet = true;
      render();
      return;
    }
    const today = Util.localDate();
    page.querySelectorAll('.cal-cell').forEach((btn) => {
      const on = btn.dataset.date === date;
      btn.classList.toggle('on', on);
      btn.classList.toggle('today', btn.dataset.date === today && !on);
    });
    const st = s();
    const term = termNow();
    const courses = repairCourses(st.courses || []);
    const weekNo = window.Timetable ? Timetable.weekOf(date, term) : 0;
    let dayCourses = window.Timetable ? Timetable.onDate(courses, date, term) : [];
    let courseLoose = false;
    if (!dayCourses.length && courses.length && window.Timetable && !weekNo) {
      dayCourses = Timetable.onWeekday(courses, date);
      courseLoose = dayCourses.length > 0;
    }
    const q = session.q.trim();
    let agenda = st.tasks.filter((t) => q
      ? (t.title + (t.location || '') + (t.note || '')).indexOf(q) >= 0
      : t.date === date);
    let meals = (st.meals || []).filter((meal) => meal.date === date && (!q || (meal.text || meal.name || '').indexOf(q) >= 0));
    if (q && window.CalendarSearch) {
      const found = CalendarSearch.search(st, q);
      agenda = found.tasks;
      dayCourses = found.courses;
      meals = found.meals;
      courseLoose = false;
    }
    const agendaEl = document.getElementById('calAgenda');
    if (agendaEl) agendaEl.innerHTML = buildDayAgendaHtml(dayCourses, agenda, meals, q, courses.length);
    const lunar = document.getElementById('calLunar');
    if (lunar) {
      const picked = Util.parseDate(date);
      const lunarLine = (window.Lunar && picked) ? Lunar.mark(date, picked).footer : Util.pretty(date);
      lunar.innerHTML = Util.esc(lunarLine) + ' <span>›</span>';
    }
    const hint = document.getElementById('calHintWrap');
    if (hint) {
      hint.innerHTML = courses.length
        ? `<div class="course-bar" id="calCourseHint">
            <div>
              <strong>${weekNo ? ('第 ' + weekNo + ' 周') : '不在学期周次内'}</strong>
              <span>${courses.length} 门课${courseLoose ? ' · 按星期显示' : ''}</span>
            </div>
            <button type="button" class="link" data-act="view-courses">看课表</button>
          </div>
          ${courseLoose ? `<p class="course-warn">日期对不上第一周 ${Util.esc(term.week1)}，仍按星期显示。</p>` : ''}
          ${!dayCourses.length && weekNo ? `<p class="course-warn">这天没课，可点「看课表」或直接加课。</p>` : ''}`
        : `<div class="course-bar bare"><span>还没有课表</span><button type="button" class="link" data-act="course">导入课表</button></div>`;
    }
    const head = page.querySelector('.cal-head');
    if (head) {
      const pill = head.querySelector('.today-pill');
      if (date === today && pill) pill.remove();
      else if (date !== today && !pill) {
        const ym = head.querySelector('.ym');
        if (ym) ym.insertAdjacentHTML('afterend', '<button class="today-pill" data-act="today-jump">今日</button>');
      }
    }
  }

  function editTerm() {
    const term = termNow();
    const presets = window.Timetable ? Object.values(Timetable.PRESETS) : [];
    const presetOpts = presets.map((p) =>
      `<option value="${Util.esc(p.id)}" ${term.periodPreset === p.id ? 'selected' : ''}>${Util.esc(p.name)}</option>`
    ).join('');
    document.getElementById('sheet').innerHTML = `<div class="sheet" role="dialog">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-bar"><button data-act="close-sheet">取消</button><strong>学期设置</strong><button data-act="save-term">保存</button></div>
      <p class="muted">第一周从哪个周一开始。课表里的「第几周」都按这一天算。</p>
      <label class="lbl">学期显示名（可选）</label>
      <input id="termTitle" type="text" placeholder="如 2025 秋" value="${Util.esc(term.title || '')}" />
      <label class="lbl">第一周的周一</label>
      <input id="termStart" type="date" value="${Util.esc(term.week1)}" />
      <label class="lbl">这学期一共多少周</label>
      <input id="termWeeks" type="number" min="8" max="30" value="${term.weeks}" />
      <label class="lbl">节次时间方案</label>
      <select id="termPeriod">${presetOpts || '<option value="jiaowu">教务默认(08:30)</option>'}</select>
      <button class="btn btn-block danger" data-act="clear-courses">清空课表</button>
    </div>`;
    document.getElementById('mask').hidden = false;
  }

  function openCoursePreview(list) {
    session.courseDraft = list;
    const rows = list.map((c, i) => {
      const day = '周' + '一二三四五六日'[c.weekday - 1];
      const time = [c.startTime, c.endTime].filter(Boolean).join('–');
      const meta = [c.weeksText, c.location, c.teacher].filter(Boolean).join(' · ');
      return `<label class="form-line"><input type="checkbox" data-course="${i}" checked /><span><strong>${Util.esc(c.name)}</strong><br>${Util.esc(day + ' ' + time)}${meta ? '<br>' + Util.esc(meta) : ''}</span></label>`;
    }).join('');
    const term = termNow();
    document.getElementById('sheet').innerHTML = `<div class="sheet" role="dialog">
      <div class="sheet-bar"><button data-act="close-sheet">取消</button><strong>核对课表 ${list.length} 门</strong></div>
      <p class="muted">不会擅自改课程。勾选要写入的，并确认第一周周一。课表按周次显示，与自己加的日程分开。</p>
      <label class="lbl">第一周的周一</label>
      <input id="termStart" type="date" value="${Util.esc(term.week1)}" />
      <label class="lbl">学期周数</label>
      <input id="termWeeks" type="number" min="8" max="30" value="${term.weeks}" />
      <div class="course-preview">${rows}</div>
      <div class="row">
        <button class="btn btn-primary" data-act="commit-courses" data-mode="merge">加入课表</button>
        <button class="btn" data-act="commit-courses" data-mode="replace">替换原课表</button>
      </div>
    </div>`;
    document.getElementById('mask').hidden = false;
  }

  function jumpToCourseDay(list) {
    const term = termNow();
    const today = Util.localDate();
    const week = window.Timetable ? (Timetable.weekOf(today, term) || 1) : 1;
    const ordered = (list || []).slice().sort((a, b) => a.weekday - b.weekday || (a.startTime || '').localeCompare(b.startTime || ''));
    let day = today;
    for (let i = 0; i < ordered.length; i++) {
      const c = ordered[i];
      const d = window.Timetable ? Timetable.dateOfWeekDay(week, c.weekday, term) : '';
      if (d && (!window.Timetable || Timetable.occurs(c, d, term) || Timetable.weekday(d) === c.weekday)) {
        day = d;
        break;
      }
    }
    const parsed = Util.parseDate(day);
    session.day = day;
    if (parsed) session.month = { y: parsed.getFullYear(), m: parsed.getMonth() };
  }

  function periodTableNow() {
    const term = termNow();
    return (window.Timetable && Timetable.periodTable(term)) || (window.Timetable && Timetable.PERIOD) || {};
  }

  function courseStartsInPeriod(c, p) {
    const table = periodTableNow();
    if (!table[p]) return false;
    if (c.sectionStart) {
      const a = +c.sectionStart;
      const b = +(c.sectionEnd || c.sectionStart);
      return p >= a && p <= b;
    }
    const st = c.startTime || '';
    if (!st) return false;
    return st >= table[p][0] && st <= table[p][1];
  }

  function courseColorOf(c, nameColor) {
    return c.color || nameColor[c.name] || COURSE_PALETTE[0];
  }

  function softCourseColor(hex) {
    const h = String(hex || '').replace('#', '');
    if (h.length !== 6) return hex || COURSE_PALETTE[0];
    // 已是浅色则直接用；深色则提亮成色块底
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (r + g + b > 480) return '#' + h;
    const mix = (n) => Math.round(n + (255 - n) * 0.72);
    return '#' + [mix(r), mix(g), mix(b)].map((n) => n.toString(16).padStart(2, '0')).join('');
  }

  function openCourseWeek(weekOverride) {
    try {
    const term = termNow();
    const courses = repairCourses(s().courses || []);
    const today = session.day || Util.localDate();
    let week = weekOverride || session.courseWeek || (window.Timetable ? Timetable.weekOf(today, term) : 0);
    if (!week) week = 1;
    week = Math.max(1, Math.min(term.weeks, week));
    session.courseWeek = week;
    const span = Timetable.weekSpan(week, term);
    const table = periodTableNow();
    const nameColor = {};
    let colorI = 0;
    courses.forEach((c) => {
      if (!nameColor[c.name]) nameColor[c.name] = c.color || COURSE_PALETTE[colorI++ % COURSE_PALETTE.length];
    });
    const days = [1, 2, 3, 4, 5]; // 工作日主视图，周末折叠
    const weekend = [6, 7].filter((wd) => courses.some((c) => +c.weekday === wd));
    const dayCols = days.concat(weekend);
    const periods = [1, 2, 3, 4, 'noon', 5, 6, 7, 8, 'eve', 9, 10];
    // CSS grid 行：1=表头，其后每节/休息一行
    const rowOf = {};
    let r = 2;
    periods.forEach((p) => { rowOf[p] = r; r += 1; });
    const head = `<div class="ttb-corner"></div>` + dayCols.map((wd) => {
      const date = Timetable.dateOfWeekDay(week, wd, term);
      const isToday = date === Util.localDate();
      return `<button type="button" class="ttb-day ${isToday ? 'today' : ''}" data-act="jump-course-day" data-date="${Util.esc(date)}">
        <em>${'一二三四五六日'[wd - 1]}</em>
        <span>${Util.esc((date || '').slice(5).replace('-', '/'))}</span>
      </button>`;
    }).join('');
    const periodCells = periods.map((p) => {
      if (p === 'noon') return `<div class="ttb-break" style="grid-column:1/-1;grid-row:${rowOf.noon}">午休</div>`;
      if (p === 'eve') return `<div class="ttb-break" style="grid-column:1/-1;grid-row:${rowOf.eve}">晚休</div>`;
      const slot = table[p] || ['', ''];
      return `<div class="ttb-period" style="grid-column:1;grid-row:${rowOf[p]}">
        <b>${p}</b>
        <span>${Util.esc(slot[0])}</span>
        <span>${Util.esc(slot[1])}</span>
      </div>`;
    }).join('');
    const bgCells = periods.filter((p) => typeof p === 'number').map((p) =>
      dayCols.map((wd, i) =>
        `<div class="ttb-slot" style="grid-column:${i + 2};grid-row:${rowOf[p]}"></div>`
      ).join('')
    ).join('');
    const blocks = [];
    courses.forEach((c) => {
      if (dayCols.indexOf(+c.weekday) < 0) return;
      let a = +(c.sectionStart || 0);
      let b = +(c.sectionEnd || a);
      if (!a && c.startTime) {
        const guess = Timetable.sectionsFromTimes(c.startTime, c.endTime, table);
        a = guess.sectionStart || 0;
        b = guess.sectionEnd || a;
      }
      if (!a) return;
      blocks.push({ c, a, b: b || a });
    });
    const placed = blocks.map(({ c, a, b }) => {
      const date = Timetable.dateOfWeekDay(week, c.weekday, term);
      const on = Timetable.occurs(c, date, term);
      const col = dayCols.indexOf(+c.weekday) + 2;
      const rowStart = rowOf[a] || rowOf[1];
      const rowEnd = (rowOf[b] || rowStart) + 1;
      const bg = softCourseColor(courseColorOf(c, nameColor));
      const picked = session.coursePicked.indexOf(c.id) >= 0;
      const act = session.courseBatch ? 'course-pick' : 'open-course';
      const loc = [c.location, c.teacher].filter(Boolean).join(' · ');
      return `<button type="button" class="ttb-course ${on ? '' : 'off'} ${picked ? 'picked' : ''}"
        style="grid-column:${col};grid-row:${rowStart}/${rowEnd};--bg:${bg};--ink:${on ? '#2a2430' : '#6b6570'}"
        data-act="${act}" data-id="${Util.esc(c.id)}">
        <strong>${Util.esc(c.name)}</strong>
        ${loc ? `<span>${Util.esc(loc)}</span>` : ''}
        ${on ? '' : '<em>非本周</em>'}
      </button>`;
    }).join('');
    const pending = courses.filter((c) => !c.sectionStart && !c.startTime);
    const pendingHtml = pending.length
      ? `<div class="course-pending"><p class="muted">时间待定 · 点进去补节次或自由时间</p>${pending.map((c) =>
        `<button type="button" class="course-item" data-act="open-course" data-id="${Util.esc(c.id)}">
          <i style="background:${softCourseColor(courseColorOf(c, nameColor))}"></i>
          <span class="ci-body"><strong>${Util.esc(c.name)}</strong>
          <span>周${'一二三四五六日'[c.weekday - 1]}${c.location ? ' · ' + Util.esc(c.location) : ''}</span></span>
        </button>`).join('')}</div>`
      : '';
    const batchBar = session.courseBatch
      ? `<div class="batch-bar">
          <span>已选 ${session.coursePicked.length}</span>
          <button type="button" class="link" data-act="course-batch-weeks">统一周次</button>
          <button type="button" class="link" data-act="course-batch-shift">偏移节次</button>
          <button type="button" class="link danger" data-act="course-batch-del">删除</button>
          <button type="button" class="link" data-act="course-batch-off">完成</button>
        </div>`
      : '';
    document.getElementById('sheet').innerHTML = `<div class="sheet action-sheet course-sheet tt-board-sheet" role="dialog" aria-label="课表">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="ttb-top">
        <button type="button" class="icon-btn" data-act="close-sheet" aria-label="关闭">${I.back}</button>
        <div class="ttb-title">
          <strong>${Util.esc(term.title || '本学期课表')}</strong>
          <span>${Util.esc(span.monday)} 起 · 左右滑动看全周</span>
        </div>
        <button type="button" class="icon-btn" data-act="edit-term" aria-label="学期">${I.more}</button>
      </div>
      <div class="ttb-tools">
        <button type="button" class="ttb-week-pill" data-act="jump-week">第 ${week} 周 ▾</button>
        <button type="button" class="link" data-act="course-week" data-dir="-1" ${week <= 1 ? 'disabled' : ''}>上一周</button>
        <button type="button" class="link" data-act="course-week" data-dir="1" ${week >= term.weeks ? 'disabled' : ''}>下一周</button>
        <span class="spacer"></span>
        <button type="button" class="link" data-act="course-batch-on">批量</button>
      </div>
      ${batchBar}
      <div class="tt-board" style="--cols:${dayCols.length}" aria-label="周课表格">
        ${head}
        ${periodCells}
        ${bgCells}
        ${placed || '<p class="ttb-empty muted">还没有课，点右下角加课或导入</p>'}
      </div>
      ${pendingHtml}
      <button type="button" class="ttb-fab" data-act="course-add" aria-label="加课">+</button>
    </div>`;
    document.getElementById('mask').hidden = false;
    } catch (err) {
      Util.toast('课表打开失败：' + (err && err.message ? err.message : err));
    }
  }

  function openCourseDetail(id) {
    const term = termNow();
    const c = repairCourses(s().courses || []).find((x) => x.id === id);
    if (!c) { Util.toast('找不到这门课'); return; }
    const today = session.day || Util.localDate();
    const week = session.courseWeek || Timetable.weekOf(today, term) || 1;
    const date = Timetable.dateOfWeekDay(week, c.weekday, term);
    const on = date ? Timetable.occurs(c, date, term) : false;
    const sec = c.sectionStart
      ? ('第' + c.sectionStart + (c.sectionEnd && c.sectionEnd !== c.sectionStart ? '-' + c.sectionEnd : '') + '节')
      : '节次未定';
    const clock = [c.startTime, c.endTime].filter(Boolean).join('–') || '—';
    document.getElementById('sheet').innerHTML = `<div class="sheet" role="dialog">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-bar">
        <button type="button" data-act="view-courses">返回</button>
        <strong>课程详情</strong>
        <button type="button" data-act="edit-course" data-id="${Util.esc(c.id)}">编辑</button>
      </div>
      <div class="course-detail">
        <h3>${Util.esc(c.name)}</h3>
        <p>周${'一二三四五六日'[c.weekday - 1]} · ${Util.esc(sec)} · ${Util.esc(clock)}</p>
        <p>${Util.esc(c.weeksText || '')}${c.location ? ' · ' + Util.esc(c.location) : ''}${c.teacher ? ' · ' + Util.esc(c.teacher) : ''}</p>
        <p class="meta-line">${on ? '本周有这节课' : '本周不开（或周次未命中）'}</p>
      </div>
      <div class="row">
        <button type="button" class="btn" data-act="jump-course-day" data-date="${Util.esc(date || '')}">跳到那天</button>
        <button type="button" class="btn danger" data-act="delete-course" data-id="${Util.esc(c.id)}">删除</button>
      </div>
    </div>`;
    document.getElementById('mask').hidden = false;
  }

  function openCourseEditor(id) {
    const term = termNow();
    const c = id ? repairCourses(s().courses || []).find((x) => x.id === id) : null;
    const wd = c ? c.weekday : (window.Timetable ? Timetable.weekday(session.day || Util.localDate()) || 1 : 1);
    const colors = COURSE_PALETTE;
    const weekChips = Array.from({ length: term.weeks }, (_, i) => i + 1).map((n) => {
      const on = c && (c.weeks || []).indexOf(n) >= 0;
      return `<button type="button" class="week-chip ${on ? 'on' : ''}" data-act="toggle-week-chip" data-n="${n}">${n}</button>`;
    }).join('');
    document.getElementById('sheet').innerHTML = `<div class="sheet course-edit-sheet" role="dialog">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-bar">
        <button type="button" data-act="${c ? 'open-course' : 'view-courses'}" ${c ? 'data-id="' + Util.esc(c.id) + '"' : ''}>取消</button>
        <strong>${c ? '编辑课程' : '加课'}</strong>
        <button type="button" data-act="save-course" data-id="${Util.esc(c ? c.id : '')}">完成</button>
      </div>
      <div class="edit-card">
        <label class="lbl">课程名</label>
        <input id="coName" value="${Util.esc(c ? c.name : '')}" placeholder="深度学习 A" />
      </div>
      <div class="edit-card">
        <label class="lbl">教室 / 地点</label>
        <input id="coLoc" value="${Util.esc(c ? c.location : '')}" placeholder="东校区 教8-517" />
        <label class="lbl">备注（如老师）</label>
        <input id="coTeacher" value="${Util.esc(c ? c.teacher : '')}" placeholder="田鹏志" />
      </div>
      <div class="edit-card">
        <label class="lbl">上课时间</label>
        <select id="coWd">${[1, 2, 3, 4, 5, 6, 7].map((n) =>
          `<option value="${n}" ${wd === n ? 'selected' : ''}>周${'一二三四五六日'[n - 1]}</option>`).join('')}</select>
        <div class="form-line"><span>节次</span><div class="fields">
          <input id="coSecA" type="number" min="1" max="12" value="${c && c.sectionStart ? c.sectionStart : ''}" placeholder="起" />
          <span>–</span>
          <input id="coSecB" type="number" min="1" max="12" value="${c && c.sectionEnd ? c.sectionEnd : ''}" placeholder="止" />
        </div></div>
        <p class="muted thin">也可不填节次，直接写自由时间</p>
        <div class="form-line"><span>时间</span><div class="fields">
          <input id="coStart" type="time" value="${Util.esc(c && c.startTime ? c.startTime : '')}" />
          <span>–</span>
          <input id="coEnd" type="time" value="${Util.esc(c && c.endTime ? c.endTime : '')}" />
        </div></div>
      </div>
      <div class="edit-card">
        <label class="lbl">上课周数（如 1-15(单)）</label>
        <input id="coWeeksText" value="${Util.esc(c ? c.weeksText : ('1-' + term.weeks + '周'))}" />
        <label class="lbl">或点选周次</label>
        <div class="week-chips" id="coWeekChips">${weekChips}</div>
        <label class="lbl">课程背景色</label>
        <div class="color-row">${colors.map((col) =>
          `<button type="button" class="color-dot ${(c && c.color === col) ? 'on' : ''}" data-act="pick-course-color" data-color="${col}" style="background:${col}"></button>`
        ).join('')}<input type="hidden" id="coColor" value="${Util.esc(c && c.color ? c.color : colors[0])}" /></div>
      </div>
      ${c ? `<button type="button" class="btn btn-block danger" data-act="delete-course" data-id="${Util.esc(c.id)}">删除课程</button>` : ''}
    </div>`;
    document.getElementById('mask').hidden = false;
  }

  function saveCourseFromSheet(id) {
    const name = clip(document.getElementById('coName').value, 24);
    if (!name) { Util.toast('请填写课名'); return; }
    const sectionStart = parseInt(document.getElementById('coSecA').value, 10) || 0;
    const sectionEnd = parseInt(document.getElementById('coSecB').value, 10) || sectionStart;
    const freeStart = document.getElementById('coStart') ? document.getElementById('coStart').value : '';
    const freeEnd = document.getElementById('coEnd') ? document.getElementById('coEnd').value : '';
    let weeksText = clip(document.getElementById('coWeeksText').value, 32);
    const chips = [...document.querySelectorAll('#coWeekChips .week-chip.on')].map((el) => +el.dataset.n);
    if (chips.length && chips.length < termNow().weeks) {
      weeksText = chips.join(',');
    }
    const raw = {
      id: id || Util.uid(),
      name,
      location: clip(document.getElementById('coLoc').value, 40),
      teacher: clip(document.getElementById('coTeacher').value, 20),
      weekday: parseInt(document.getElementById('coWd').value, 10) || 1,
      sectionStart: sectionStart || undefined,
      sectionEnd: sectionEnd || undefined,
      startTime: sectionStart ? '' : freeStart,
      endTime: sectionStart ? '' : freeEnd,
      weeksText: weeksText || ('1-' + termNow().weeks + '周'),
      weeks: chips.length ? chips : undefined,
      color: document.getElementById('coColor').value || COURSE_PALETTE[0],
    };
    // 有节次优先；无节次但有自由时间也允许保存
    if (!raw.sectionStart && !raw.startTime) {
      Util.toast('填一下节次或开始时间');
      return;
    }
    const next = normalizeCourse(raw);
    if (!next.sectionStart && freeStart) {
      next.startTime = freeStart;
      next.endTime = freeEnd || '';
    }
    Store.update((st) => {
      const list = repairCourses(st.courses || []);
      const i = list.findIndex((x) => x.id === next.id);
      if (i >= 0) list[i] = next;
      else list.push(next);
      st.courses = list;
    });
    Util.toast(id ? '已保存' : '已加课');
    Notify.resync().catch(() => {});
    openCourseWeek(session.courseWeek);
  }

  function openCourseBatchWeeks() {
    if (!session.coursePicked.length) { Util.toast('先选课程'); return; }
    document.getElementById('sheet').innerHTML = `<div class="sheet" role="dialog">
      <div class="sheet-bar"><button data-act="view-courses">取消</button><strong>统一周次</strong><button data-act="do-course-batch-weeks">应用</button></div>
      <p class="muted">将应用到已选 ${session.coursePicked.length} 门课</p>
      <label class="lbl">周次文本</label>
      <input id="batchWeeks" placeholder="1-15(单) 或 1-16周" value="1-16周" />
    </div>`;
    document.getElementById('mask').hidden = false;
  }

  function openCourseBatchShift() {
    if (!session.coursePicked.length) { Util.toast('先选课程'); return; }
    document.getElementById('sheet').innerHTML = `<div class="sheet" role="dialog">
      <div class="sheet-bar"><button data-act="view-courses">取消</button><strong>偏移节次</strong><button data-act="do-course-batch-shift">应用</button></div>
      <p class="muted">正数延后、负数提前。已选 ${session.coursePicked.length} 门</p>
      <label class="lbl">偏移节数</label>
      <input id="batchShift" type="number" value="1" min="-8" max="8" />
    </div>`;
    document.getElementById('mask').hidden = false;
  }

  function openTaskBatchTime() {
    if (!session.taskPicked.length) { Util.toast('先选日程'); return; }
    document.getElementById('sheet').innerHTML = `<div class="sheet" role="dialog">
      <div class="sheet-bar"><button data-act="close-sheet">取消</button><strong>批量改时间</strong><button data-act="do-task-batch-time">应用</button></div>
      <label class="lbl">开始时间</label>
      <input id="batchTime" type="time" value="09:00" />
      <label class="lbl">结束时间（可选）</label>
      <input id="batchEnd" type="time" value="" />
    </div>`;
    document.getElementById('mask').hidden = false;
  }

  function openTaskBatchShift() {
    if (!session.taskPicked.length) { Util.toast('先选日程'); return; }
    document.getElementById('sheet').innerHTML = `<div class="sheet" role="dialog">
      <div class="sheet-bar"><button data-act="close-sheet">取消</button><strong>批量顺延</strong><button data-act="do-task-batch-shift">应用</button></div>
      <label class="lbl">顺延天数</label>
      <input id="batchDays" type="number" value="1" min="-30" max="60" />
    </div>`;
    document.getElementById('mask').hidden = false;
  }

  function openTaskBatchCat() {
    if (!session.taskPicked.length) { Util.toast('先选日程'); return; }
    document.getElementById('sheet').innerHTML = `<div class="sheet" role="dialog">
      <div class="sheet-bar"><button data-act="close-sheet">取消</button><strong>改分类</strong><span></span></div>
      <div class="cats">${CATS.map((c) =>
        `<button type="button" class="cat" data-act="do-task-batch-cat" data-cat="${c.id}"><i style="background:${c.color}"></i>${c.name}</button>`
      ).join('')}</div>
    </div>`;
    document.getElementById('mask').hidden = false;
  }

  function commitCourses(mode) {
    const picked = [...document.querySelectorAll('[data-course]:checked')].map((el) => session.courseDraft[+el.dataset.course]).filter(Boolean);
    const start = document.getElementById('termStart');
    const weeksEl = document.getElementById('termWeeks');
    const weeks = weeksEl ? (parseInt(weeksEl.value, 10) || 0) : 0;
    if (start && start.value) {
      Store.update((st) => {
        st.term = Object.assign({}, st.term, {
          week1: start.value,
          weeks: weeks >= 8 && weeks <= 30 ? weeks : (st.term && st.term.weeks) || 20,
        });
      });
    }
    if (!picked.length) { Util.toast('先勾选要写入的课'); return; }
    const list = picked.map(normalizeCourse);
    Store.update((st) => {
      st.courses = mode === 'replace' ? list : repairCourses(st.courses || []).concat(list);
    });
    session.courseDraft = null;
    closeSheet();
    session.view = 'calendar';
    jumpToCourseDay(list);
    Util.toast('课表已写入，可在日程里看课');
    Notify.resync().catch(() => {});
    render();
  }

  function openEvent(id) {
    const t = id ? s().tasks.find((x) => x.id === id) : null;
    const date = t ? (t.date || session.day) : (session.day || Util.localDate());
    const cat = t ? (t.category || 'study') : 'study';
    const lead = t && t.remindLead ? t.remindLead : (s().settings.remindLead || 10);
    const type = t && t.remindType ? t.remindType : 'notify';
    document.getElementById('sheet').innerHTML = `<div class="sheet event-sheet" role="dialog">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-bar">
        <button data-act="close-sheet">取消</button>
        <strong>${t ? '编辑' : '新建'}</strong>
        <button data-act="save-event" data-id="${Util.esc(t ? t.id : '')}">完成</button>
      </div>
      <div class="cats">${CATS.map((c) => `<button type="button" class="cat ${cat === c.id ? 'on' : ''}" data-act="pick-cat" data-cat="${c.id}"><i style="background:${c.color}"></i>${c.name}</button>`).join('')}</div>
      <input id="evTitle" placeholder="标题，如「明晚 7 点聚餐」" value="${Util.esc(t ? t.title : '')}" autocomplete="off" />
      <label class="switch-line"><span>全天</span><input id="evAll" type="checkbox" ${t && t.allDay ? 'checked' : ''} /></label>
      <div class="form-line"><span>开始</span><div class="fields"><input id="evDate" type="date" value="${Util.esc(date)}" /><input id="evTime" type="time" value="${Util.esc(t && t.time ? t.time : '')}" /></div></div>
      <div class="form-line"><span>结束</span><div class="fields"><input id="evEnd" type="time" value="${Util.esc(t && t.endTime ? t.endTime : '')}" /></div></div>
      <div class="form-line"><span>提醒</span><div class="fields"><select id="evLead">${[5, 10, 15, 30, 60].map((n) => `<option value="${n}" ${lead === n ? 'selected' : ''}>${n} 分钟前</option>`).join('')}</select></div></div>
      <div class="form-line"><span>方式</span><div class="radios">
        <label><input type="radio" name="evType" value="notify" ${type !== 'alarm' ? 'checked' : ''} /> 通知</label>
        <label><input type="radio" name="evType" value="alarm" ${type === 'alarm' ? 'checked' : ''} /> 闹钟</label>
      </div></div>
      <div class="form-line"><span>重复</span><div class="fields"><select id="evRepeat" ${t ? 'disabled' : ''}>
          <option value="">不重复</option>
          <option value="daily">之后 7 天</option>
          <option value="weekdays">工作日 · 两周</option>
          <option value="weekly">每周 · 四周</option>
        </select></div></div>
      <input id="evLoc" placeholder="地点" value="${Util.esc(t && t.location ? t.location : '')}" />
      <input id="evNote" placeholder="备注" value="${Util.esc(t && t.note ? t.note : '')}" />
      ${t ? `<button class="btn btn-block danger" data-act="delete-one" data-id="${Util.esc(t.id)}">删除</button>` : ''}
    </div>`;
    document.getElementById('mask').hidden = false;
    const box = document.getElementById('evTitle');
    if (box) {
      box.dataset.cat = cat;
      setTimeout(() => { try { box.focus(); } catch (e) { /* ignore */ } }, 40);
    }
  }

  function repeatDates(start, mode) {
    const out = [];
    if (!start || !mode) return out;
    if (mode === 'daily') {
      for (let i = 1; i <= 7; i++) out.push(Util.addDaysStr(start, i));
    } else if (mode === 'weekly') {
      for (let i = 1; i <= 4; i++) out.push(Util.addDaysStr(start, i * 7));
    } else if (mode === 'weekdays') {
      let d = start;
      while (out.length < 10) {
        d = Util.addDaysStr(d, 1);
        const day = Util.parseDate(d);
        const iso = day.getDay() === 0 ? 7 : day.getDay();
        if (iso <= 5) out.push(d);
      }
    }
    return out;
  }

  function saveEvent(id) {
    const titleRaw = (document.getElementById('evTitle') && document.getElementById('evTitle').value || '').trim();
    if (!titleRaw) { closeSheet(); return; }
    const allDay = document.getElementById('evAll').checked;
    const date = document.getElementById('evDate').value || session.day || Util.localDate();
    const time = allDay ? '' : document.getElementById('evTime').value;
    const endTime = allDay ? '' : document.getElementById('evEnd').value;
    const location = document.getElementById('evLoc').value.trim();
    const note = document.getElementById('evNote').value.trim();
    const remindLead = parseInt(document.getElementById('evLead').value, 10) || 10;
    const remindType = (document.querySelector('input[name="evType"]:checked') || {}).value || 'notify';
    const category = document.getElementById('evTitle').dataset.cat || 'study';
    const repeat = id ? '' : document.getElementById('evRepeat').value;
    const parsed = !id ? Nlp.parseText(titleRaw, new Date()) : null;
    const guessed = parsed && parsed.tasks[0] ? parsed.tasks[0] : null;
    const title = (guessed && guessed.title) || titleRaw;
    const useDate = document.getElementById('evDate').value || (guessed && guessed.date) || date;
    const useTime = allDay ? '' : (time || (guessed && guessed.time) || '');
    const base = { title, note, location, category, allDay, endTime, remindLead, remindType, reminded: false };
    let saved = null;
    Store.update((st) => {
      if (id) {
        const t = st.tasks.find((x) => x.id === id);
        if (t) {
          Object.assign(t, base, { date: useDate, time: useTime });
          saved = t;
        }
        return;
      }
      const dates = [useDate].concat(repeatDates(useDate, repeat));
      dates.forEach((d, i) => {
        const row = Object.assign({
          id: Util.uid(), date: d, time: useTime, done: false, doneOn: '', doneAt: 0, createdAt: Date.now(), source: 'manual',
        }, base);
        st.tasks.push(row);
        if (i === 0) saved = row;
      });
    });
    session.day = useDate;
    const picked = Util.parseDate(useDate);
    if (picked) session.month = { y: picked.getFullYear(), m: picked.getMonth() };
    closeSheet();
    render();
    Notify.resync().catch(() => {});
    if (saved && remindType === 'alarm' && !allDay && useTime) {
      Notify.setSystemAlarm(saved).then((ok) => {
        if (ok) Util.toast('已打开系统闹钟');
        else if (s().settings.notify) Util.toast('已用系统通知代替闹钟');
        else Util.toast('请先在设置里打开系统通知');
      }).catch(() => {});
    }
  }

  function htmlGoals() {
    ensureGoalRoast();
    const st = s();
    const design = (st.diy.designs || {}).goals || {};
    const css = Design.scopeCss('goals', design.css || '');
    const extra = design.html ? Design.fill(Design.sanitizeHtml(design.html), Design.facts()) : '';
    const horizon = { year: '今年', quarter: '本季', month: '本月' };
    const verdictLabel = { slacking: '摆烂', dragging: '拖延', ok: '一般', good: '还行' };
    const roastBox = st.diy.goalRoastText
      ? `<div class="goal-roast-card page-enter">
          <div class="roast-badge">今日督查</div>
          <p>${Util.esc(st.diy.goalRoastText)}</p>
          <p class="muted">${st.diy.goalRoastDay === Util.localDate() ? '今天进 App 已自动对照相关日程检查' : '上次督查 · ' + Util.esc(st.diy.goalRoastDay || '')}</p>
        </div>`
      : ((st.goals || []).length
        ? '<div class="card muted">今天进 App 会自动对照相关日程催进度；也可点下面「立刻督查」。</div>'
        : '');
    const cards = (st.goals || []).length ? st.goals.map((g) => {
      const stat = goalTaskStats(g, 14);
      const rate = (stat.doneCount + stat.openCount) ? Math.round(stat.doneCount * 100 / (stat.doneCount + stat.openCount)) : 0;
      return `<article class="goal page-enter" data-verdict="${Util.esc(g.verdict || '')}">
      <div class="goal-top">
        <span class="tag">${horizon[g.horizon] || '长线'}</span>
        ${g.verdict ? `<span class="tag verdict-${Util.esc(g.verdict)}">${verdictLabel[g.verdict] || Util.esc(g.verdict)}</span>` : ''}
      </div>
      <h2>${Util.esc(g.title)}</h2>
      ${g.detail ? `<p class="muted">${Util.esc(g.detail)}</p>` : ''}
      <div class="goal-stats">
        <span><b>${stat.doneCount}</b><small>完成</small></span>
        <span><b>${stat.openCount}</b><small>未做</small></span>
        <span><b>${stat.overdueCount}</b><small>逾期</small></span>
        <span><b>${rate}%</b><small>完成率</small></span>
      </div>
      ${stat.openTitles.length ? `<p class="goal-open">卡住：${Util.esc(stat.openTitles.slice(0, 3).join('；'))}</p>` : '<p class="muted">近两周没有匹配到相关日程——要么排期，要么别立 flag。</p>'}
      ${g.progress ? `<p class="goal-progress">进展：${Util.esc(g.progress)}</p>` : ''}
      ${g.encouragement ? `<p class="quote">${Util.esc(g.encouragement)}</p>` : ''}
    </article>`;
    }).join('') : '<div class="card muted">还没有长线目标。在对话里说「我的目标是…」即可立下。</div>';
    return `<section class="page-enter" data-panel="goals">${css ? `<style>${css}</style>` : ''}${extra ? `<div class="card">${extra}</div>` : ''}${roastBox}${cards}
      <div class="stack">
        <button class="btn btn-primary btn-block" data-act="goal-roast">立刻督查 / 痛骂一顿</button>
        <button class="btn btn-block" data-act="prefill" data-text="看看这些长线目标，按它们排进下一周，相关事项要具体可执行">按目标排进下一周</button>
      </div></section>`;
  }

  function safeSticker(file) {
    return /^assets\/stickers\/(fish|naiwa)\/[a-z]+\.png$/.test(file || '') ? file : '';
  }

  function htmlCompanion(kind) {
    const isFish = kind === 'fish';
    const list = isFish ? (s().diy.fishChat || []) : (s().diy.buddyChat || []);
    const msgs = list.slice(-80).map((m) => {
      if (m.kind === 'recalled') return `<div class="msg-recall">${Util.esc(m.content)}</div>`;
      const emo = safeSticker(m.sticker);
      const text = m.stickerOnly ? '' : String(m.content || '');
      const img = emo ? `<img class="emo" src="${Util.esc(emo)}" alt="" draggable="false" />` : '';
      const body = text ? `<div class="bubble-text">${Util.esc(text)}</div>` : '';
      if (!img && !body) return '';
      const role = m.role === 'user' ? 'user' : 'assistant';
      return `<div class="bubble-wrap ${role}"><div class="bubble ${role}${img ? ' has-emo' : ''}">${img}${body}</div></div>`;
    }).join('');
    return `<section class="comp-page page-enter" data-channel="${kind}">
      <div class="chat comp-chat" id="compLog">${msgs}</div>
    </section>`;
  }

  function htmlSettings() {
    const st = s().settings;
    const chips = PROVIDERS.map((p) => `<button type="button" class="seg ${st.provider === p.id ? 'on' : ''}" data-act="provider" data-id="${p.id}">${p.name}</button>`).join('');
    const leadNow = +st.remindLead || 10;
    const leads = [5, 10, 15, 30, 60].map((n) => `<button type="button" class="seg ${leadNow === n ? 'on' : ''}" data-act="lead" data-n="${n}">${n}分</button>`).join('');
    const themeId = st.theme || 'paper';
    const themes = (window.Theme ? Theme.LIST : []).map((t) => `<button type="button" class="theme-card ${themeId === t.id ? 'on' : ''}" data-act="theme" data-id="${Util.esc(t.id)}" aria-pressed="${themeId === t.id}">
        <span class="theme-preview" style="background:${Util.esc(t.vars['--bg'])}">${t.avatar ? `<img src="${Util.esc(t.avatar)}" alt="" />` : '<i class="theme-dot" style="background:' + Util.esc(t.vars['--green']) + '"></i>'}</span>
        <strong>${Util.esc(t.name)}</strong>
      </button>`).join('');
    const term = termNow();
    const dafeiyuOn = !!st.dafeiyu;
    const fishFlavor = st.fishFlavor || 'qunyou';
    const fishFlavors = (window.FishPersona ? FishPersona.FLAVORS : []).map((f) =>
      `<button type="button" class="seg ${fishFlavor === f.id ? 'on' : ''}" data-act="fish-flavor" data-id="${Util.esc(f.id)}">${Util.esc(f.name)}</button>`
    ).join('');
    return `<div class="page-pad settings-page page-enter">
      <section class="card">
        <h2>主题</h2>
        <div class="theme-grid">${themes}</div>
        <p class="hint">选奶龙 / 奶蛙后，右下角会出现可拖动精灵，点开可单独聊日常。</p>
      </section>
      <section class="card">
        <div class="card-head">
          <h2>大肥鱼</h2>
          <button type="button" class="switch-mini" data-act="toggle-dafeiyu" aria-pressed="${dafeiyuOn}">${dafeiyuOn ? '● 开' : '○ 关'}</button>
        </div>
        <p class="meta-line">DeepSeek 社区热梗桌宠 · 人格已写入</p>
        <p class="hint">傲娇嘴硬、短句口语、被叫大肥鱼会炸毛；记忆最近约 40 轮。非 DSH 原生插件。</p>
        ${fishFlavors ? `<div class="field-block" style="margin-top:10px"><span class="field-label">人格口味</span><div class="seg-row" style="grid-template-columns:1fr 1fr">${fishFlavors}</div></div>` : ''}
        ${dafeiyuOn ? `<button type="button" class="btn btn-block" data-act="open-fish" style="margin-top:8px">打开大肥鱼对话</button>` : ''}
      </section>
      <section class="card">
        <div class="card-head">
          <h2>便捷</h2>
          <button type="button" class="switch-mini" data-act="toggle-chips" aria-pressed="${st.quickChips !== false}">${st.quickChips !== false ? '● 开' : '○ 关'}</button>
        </div>
        <p class="hint">对话页底部「今日 / 课表 / 顺延」快捷条；长按气泡可撤回、删除、复制。</p>
      </section>
      <section class="card">
        <h2>模型</h2>
        <div class="seg-row">${chips}</div>
        <label class="lbl" for="setBase">接口地址</label>
        <input id="setBase" value="${Util.esc(st.baseUrl)}" autocomplete="off" />
        <label class="lbl" for="setModel">模型名</label>
        <input id="setModel" value="${Util.esc(st.model)}" autocomplete="off" />
        <label class="lbl" for="setKey">密钥</label>
        <div class="key-row">
          <input id="setKey" type="${session.showKey ? 'text' : 'password'}" value="${Util.esc(st.apiKey)}" placeholder="只存在这台设备" autocomplete="off" />
          <button type="button" class="btn btn-ghost" data-act="toggle-key">${session.showKey ? '隐藏' : '显示'}</button>
        </div>
        <button type="button" class="btn btn-primary btn-block" data-act="save-key" style="margin-top:12px">保存并测试</button>
        <p class="hint">看课表照片请用带视觉的模型（如 gpt-4o-mini / qwen-vl-plus）。密钥不进备份。</p>
        <details class="fold">
          <summary>怎么拿到密钥</summary>
          <div class="help">
            <div class="help-item">
              <strong>DeepSeek</strong>
              <p>国内可用。模型 <span class="mono">deepseek-chat</span></p>
              <button type="button" class="link" data-act="open-link" data-url="https://platform.deepseek.com/api_keys">打开密钥页</button>
            </div>
            <div class="help-item">
              <strong>通义千问</strong>
              <p>模型 <span class="mono">qwen-plus</span>；认课表改 <span class="mono">qwen-vl-plus</span></p>
              <button type="button" class="link" data-act="open-link" data-url="https://bailian.console.aliyun.com/">打开百炼</button>
            </div>
            <div class="help-item">
              <strong>OpenAI</strong>
              <p>需可访问外网。模型 <span class="mono">gpt-4o-mini</span></p>
              <button type="button" class="link" data-act="open-link" data-url="https://platform.openai.com/api-keys">打开密钥页</button>
            </div>
          </div>
          <p class="hint">登录 → 新建 Key → 立刻粘贴到上方。Key 只显示一次。</p>
        </details>
      </section>
      <section class="card">
        <div class="card-head">
          <h2>学期</h2>
          <button type="button" class="link" data-act="edit-term">修改</button>
        </div>
        <p class="meta-line">${term.title ? Util.esc(term.title) + ' · ' : ''}第一周 ${Util.esc(term.week1)} · 共 ${term.weeks} 周 · 节次 ${Util.esc(term.periodPreset || 'jiaowu')} · 课表 ${(s().courses || []).length} 门</p>
        <p class="hint">第一周请选那一周的周一，后面会自动对上星期与周次。</p>
      </section>
      <section class="card">
        <h2>提醒</h2>
        <div class="field-block">
          <span class="field-label">提前量</span>
          <div class="seg-row seg-tight">${leads}</div>
        </div>
        <button type="button" class="btn btn-primary btn-block" data-act="notify-on">${st.notify ? '重新授权并同步' : '打开系统通知'}</button>
        <div class="btn-pair">
          <button type="button" class="btn" data-act="notify-test">测试通知</button>
          <button type="button" class="btn" data-act="notify-exact">精确闹钟</button>
        </div>
        <button type="button" class="btn btn-block" data-act="notify-settings" style="margin-top:8px">打开系统通知设置</button>
        <p class="hint">首次请授权通知。日程与课表都会按提前量提醒；选「闹钟」的日程会打开系统时钟。</p>
        ${(() => {
          const ns = window.Notify && Notify.status ? Notify.status() : {};
          return `<p class="meta-line">组件：通知 ${ns.localNotifications ? '✓' : '✗'} · 系统闹钟 ${ns.systemAlarm ? '✓' : '✗'}${ns.native ? ' · 原生' : ' · 浏览器'}</p>`;
        })()}
      </section>
      <section class="card">
        <h2>数据</h2>
        <p class="meta-line">本机已存 ${(s().diy.chat || []).length} 条对话</p>
        <div class="btn-pair">
          <button type="button" class="btn" data-act="export">导出备份</button>
          <button type="button" class="btn" data-act="import">恢复备份</button>
        </div>
        <div class="btn-pair">
          <button type="button" class="btn" data-act="clear-chat">清空对话</button>
          <button type="button" class="btn danger-soft" data-act="clear-data">清空日程目标</button>
        </div>
      </section>
      <footer class="about-foot">
        <strong>引程</strong>
        <span>作者 · 一种草本植物</span>
        <span>© ${new Date().getFullYear()} 一种草本植物 · 版权所有</span>
        <span class="about-ver">版本 2.3.5</span>
      </footer>
    </div>`;
  }

  function renderDock() {
    const dock = document.getElementById('dock');
    if (session.view === 'calendar') {
      dock.className = 'dock float';
      dock.innerHTML = `<button class="fab" data-act="new-event" aria-label="新建日程">${I.plus}<span>新建</span></button>`;
      return;
    }
    dock.className = 'dock';
    if (session.view === 'buddy' || session.view === 'fish') {
      const ready = !!session.companionText.trim();
      const pack = companionPack();
      const emos = pack && window.Stickers ? Stickers.list(pack).map((s) =>
        `<button type="button" class="emo-btn" data-act="send-sticker" data-id="${Util.esc(s.id)}" aria-label="${Util.esc(s.label)}"><img src="${Util.esc(s.file)}" alt="" /></button>`
      ).join('') : '';
      dock.innerHTML = `${emos ? `<div class="emo-row">${emos}</div>` : ''}<div class="composer">
        <textarea id="compBox" rows="1" placeholder="${session.view === 'fish' ? '说点什么…' : '说点什么…'}">${Util.esc(session.companionText)}</textarea>
        <button class="send ${ready ? 'ready' : ''}" data-act="comp-send" aria-label="发送">${I.send}</button>
      </div>`;
      const box = document.getElementById('compBox');
      if (box) {
        box.value = session.companionText;
        box.style.height = 'auto';
        box.style.height = Math.min(120, box.scrollHeight) + 'px';
      }
      return;
    }
    if (session.view !== 'chat') { dock.innerHTML = ''; return; }
    const atts = session.files.map((f, i) => f.kind === 'image'
      ? `<div class="att"><img src="${f.url}" alt="" /><button data-act="drop-file" data-i="${i}">×</button></div>`
      : `<div class="att">${Util.esc(f.name)}<button data-act="drop-file" data-i="${i}">×</button></div>`).join('');
    const chips = s().settings.quickChips !== false
      ? `<div class="quick-chips">
          <button type="button" data-act="prefill" data-text="今天有什么安排">今日</button>
          <button type="button" data-act="view-courses">课表</button>
          <button type="button" data-act="prefill" data-text="把今天没做完的顺延到明天">顺延</button>
          <button type="button" data-act="prefill" data-text="帮我记一下：">备忘</button>
        </div>` : '';
    dock.innerHTML = `${chips}
      ${atts ? `<div class="atts">${atts}</div>` : ''}
      <div class="composer">
        <button class="plus" data-act="attach" aria-label="添加附件">${I.plus}</button>
        <textarea id="box" rows="1" placeholder="写安排，或说明要改的日程">${Util.esc(session.text)}</textarea>
        <button class="send ${session.text.trim() || session.files.length ? 'ready' : ''}" data-act="send" aria-label="发送">${I.send}</button>
      </div>`;
    const box = document.getElementById('box');
    if (box) {
      box.value = session.text;
      box.style.height = 'auto';
      box.style.height = Math.min(120, box.scrollHeight) + 'px';
    }
  }

  function syncPets() {
    if (!window.Pet || !window.Theme) return;
    const st = s();
    const theme = Theme.byId(st.settings.theme || 'paper');
    Pet.sync({
      theme: theme.avatar ? theme : null,
      dafeiyu: !!st.settings.dafeiyu,
      onOpenBuddy: () => { session.view = 'buddy'; session.companionText = ''; render(); },
      onOpenFish: () => { session.view = 'fish'; session.companionText = ''; render(); },
      state: {
        pos(key) {
          const p = (Store.get().settings.petPos || {})[key];
          return p && typeof p.x === 'number' ? p : null;
        },
        savePos(key, x, y) {
          Store.update((s2) => {
            if (!s2.settings.petPos) s2.settings.petPos = { buddy: null, fish: null };
            s2.settings.petPos[key] = { x, y };
          });
        },
      },
    });
    Pet.hideDuring(session.view);
  }

  function render() {
    if (window.Theme) Theme.apply(s().settings.theme || 'paper');
    if (session.view === 'fish') {
      const skin = {
        '--bg': '#eef3ff', '--paper': '#ffffff', '--ink': '#1b2a4a', '--muted': '#5d6e92',
        '--line': '#d5e0f5', '--green': '#3d6fd4', '--green-2': '#e4edff', '--user': '#dce8ff',
        '--accent': '#3d6fd4', '--accent-soft': '#e7efff', '--stage': '#d5e2f8', '--theme-color': '#eef3ff',
      };
      Object.keys(skin).forEach((k) => document.documentElement.style.setProperty(k, skin[k]));
      document.body.style.background = skin['--stage'];
    }
    renderTop();
    renderTabs();
    const main = document.getElementById('main');
    const viewChanged = main.dataset.view !== session.view;
    const pages = {
      chat: htmlChat,
      calendar: htmlCalendar,
      goals: htmlGoals,
      settings: htmlSettings,
      buddy: () => htmlCompanion('buddy'),
      fish: () => htmlCompanion('fish'),
    };
    main.innerHTML = (pages[session.view] || htmlChat)();
    main.dataset.view = session.view;
    main.classList.toggle('companion-main', session.view === 'buddy' || session.view === 'fish');
    document.getElementById('tabs').hidden = session.view === 'buddy' || session.view === 'fish';
    renderDock();
    syncPets();
    if (viewChanged) main.scrollTop = 0;
    const log = document.getElementById('log') || document.getElementById('compLog');
    if (log && log.parentElement) {
      const scroller = log.id === 'compLog' ? log : log.parentElement;
      scroller.scrollTop = scroller.scrollHeight;
    }
    session.calAnim = '';
  }

  function openAttach() {
    document.getElementById('sheet').innerHTML = `<div class="sheet action-sheet" role="dialog" aria-label="添加附件">
      <div class="sheet-handle" aria-hidden="true"></div>
      <p class="sheet-title">添加附件</p>
      <div class="action-grid">
        <button type="button" class="action-tile" data-act="album">
          <span class="action-ico">${I.album}</span>
          <strong>相册 / 文件</strong>
          <span>照片或 PDF</span>
        </button>
        <button type="button" class="action-tile" data-act="camera">
          <span class="action-ico cam">${I.camera}</span>
          <strong>拍照</strong>
          <span>现场拍课表</span>
        </button>
      </div>
      <button type="button" class="btn btn-block sheet-cancel" data-act="close-sheet">取消</button>
    </div>`;
    document.getElementById('mask').hidden = false;
  }

  function readSettings() {
    const base = document.getElementById('setBase');
    if (!base) return;
    Store.update((st) => {
      st.settings.baseUrl = base.value.trim();
      st.settings.model = document.getElementById('setModel').value.trim();
      st.settings.apiKey = document.getElementById('setKey').value;
    });
  }

  async function onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    // 思考中只拦重复发送，顶部加载条不挡其它点击
    if (session.busy && (act === 'send' || act === 'comp-send' || act === 'send-sticker')) return;
    if (act === 'tab' || act === 'home' || act === 'calendar' || act === 'goals' || act === 'settings') {
      const next = act === 'tab' ? el.dataset.view : (act === 'home' ? 'chat' : act);
      if (next) session.view = next;
      if (next === 'chat') session.chatDaysBack = 0;
      closeSheet();
      render();
      if (next === 'chat') {
        const log = document.getElementById('log');
        if (log && log.parentElement) log.parentElement.scrollTop = log.parentElement.scrollHeight;
      }
      return;
    }
    if (act === 'older-chat') {
      session.chatDaysBack = Math.min(60, session.chatDaysBack + 1);
      render();
      const log = document.getElementById('log');
      if (log && log.parentElement) log.parentElement.scrollTop = 0;
      return;
    }
    if (act === 'today-chat') {
      session.chatDaysBack = 0;
      render();
      return;
    }
    if (act === 'toggle-done') {
      Store.update((st) => {
        const t = st.tasks.find((x) => x.id === el.dataset.id);
        if (!t) return;
        t.done = !t.done;
        t.doneOn = t.done ? Util.localDate() : '';
        t.doneAt = t.done ? Date.now() : 0;
      });
      if (session.view === 'calendar' && document.getElementById('calAgenda')) {
        const keep = session.day;
        session.day = '';
        selectCalendarDay(keep);
      } else render();
      return;
    }
    if (act === 'prefill') { session.text = el.dataset.text || ''; session.view = 'chat'; render(); return; }
    if (act === 'pick' || act === 'album') { closeSheet(); document.getElementById('file').click(); return; }
    if (act === 'camera') { closeSheet(); document.getElementById('cam').click(); return; }
    if (act === 'attach') { openAttach(); return; }
    if (act === 'close-sheet') { closeSheet(); return; }
    if (act === 'send') { send(); return; }
    if (act === 'undo') { undo(); return; }
    if (act === 'drop-file') { session.files.splice(+el.dataset.i, 1); render(); return; }
    if (act === 'pick-day') {
      closeSheet();
      if (session.q) {
        session.searchOn = false;
        session.q = '';
      }
      selectCalendarDay(el.dataset.date);
      return;
    }
    if (act === 'month') {
      shiftMonth(+el.dataset.dir);
      return;
    }
    if (act === 'view-courses') { openCourseWeek(); return; }
    if (act === 'course-week') {
      const term = termNow();
      const next = Math.max(1, Math.min(term.weeks, (session.courseWeek || 1) + (+el.dataset.dir || 0)));
      openCourseWeek(next);
      return;
    }
    if (act === 'open-course') { openCourseDetail(el.dataset.id); return; }
    if (act === 'edit-course') { openCourseEditor(el.dataset.id); return; }
    if (act === 'course-add') { openCourseEditor(''); return; }
    if (act === 'save-course') { saveCourseFromSheet(el.dataset.id || ''); return; }
    if (act === 'delete-course') {
      const id = el.dataset.id;
      Store.update((st) => { st.courses = (st.courses || []).filter((c) => c.id !== id); });
      Util.toast('已删除');
      openCourseWeek();
      return;
    }
    if (act === 'toggle-week-chip') {
      el.classList.toggle('on');
      return;
    }
    if (act === 'pick-course-color') {
      const input = document.getElementById('coColor');
      if (input) input.value = el.dataset.color || '';
      document.querySelectorAll('.color-dot').forEach((d) => d.classList.toggle('on', d === el));
      return;
    }
    if (act === 'course-batch-on') {
      session.courseBatch = true;
      session.coursePicked = [];
      openCourseWeek(session.courseWeek);
      return;
    }
    if (act === 'course-batch-off') {
      session.courseBatch = false;
      session.coursePicked = [];
      openCourseWeek(session.courseWeek);
      return;
    }
    if (act === 'course-pick') {
      const id = el.dataset.id;
      const i = session.coursePicked.indexOf(id);
      if (i >= 0) session.coursePicked.splice(i, 1);
      else session.coursePicked.push(id);
      openCourseWeek(session.courseWeek);
      return;
    }
    if (act === 'course-batch-weeks') { openCourseBatchWeeks(); return; }
    if (act === 'course-batch-shift') { openCourseBatchShift(); return; }
    if (act === 'do-course-batch-weeks') {
      const text = clip(document.getElementById('batchWeeks').value, 32);
      const ids = new Set(session.coursePicked);
      Store.update((st) => {
        st.courses = repairCourses(st.courses || []).map((c) => {
          if (!ids.has(c.id)) return c;
          return normalizeCourse(Object.assign({}, c, { weeksText: text, weeks: undefined }));
        });
      });
      session.courseBatch = false;
      session.coursePicked = [];
      Util.toast('周次已统一');
      openCourseWeek(session.courseWeek);
      return;
    }
    if (act === 'do-course-batch-shift') {
      const delta = parseInt(document.getElementById('batchShift').value, 10) || 0;
      const ids = new Set(session.coursePicked);
      Store.update((st) => {
        st.courses = repairCourses(st.courses || []).map((c) => {
          if (!ids.has(c.id) || !c.sectionStart) return c;
          const a = Math.max(1, Math.min(12, c.sectionStart + delta));
          const b = Math.max(a, Math.min(12, (c.sectionEnd || c.sectionStart) + delta));
          return normalizeCourse(Object.assign({}, c, { sectionStart: a, sectionEnd: b }));
        });
      });
      session.courseBatch = false;
      session.coursePicked = [];
      Util.toast('节次已偏移');
      openCourseWeek(session.courseWeek);
      return;
    }
    if (act === 'course-batch-del') {
      if (!session.coursePicked.length) { Util.toast('先选课程'); return; }
      const ids = new Set(session.coursePicked);
      Store.update((st) => { st.courses = (st.courses || []).filter((c) => !ids.has(c.id)); });
      session.courseBatch = false;
      session.coursePicked = [];
      Util.toast('已删除');
      const left = (s().courses || []).length;
      if (left) openCourseWeek(session.courseWeek);
      else { closeSheet(); render(); }
      return;
    }
    if (act === 'task-batch-on') {
      session.taskBatch = true;
      session.taskPicked = [];
      render();
      return;
    }
    if (act === 'task-batch-off') {
      session.taskBatch = false;
      session.taskPicked = [];
      render();
      return;
    }
    if (act === 'task-pick') {
      const id = el.dataset.id;
      const i = session.taskPicked.indexOf(id);
      if (i >= 0) session.taskPicked.splice(i, 1);
      else session.taskPicked.push(id);
      render();
      return;
    }
    if (act === 'task-batch-time') { openTaskBatchTime(); return; }
    if (act === 'task-batch-shift') { openTaskBatchShift(); return; }
    if (act === 'task-batch-cat') { openTaskBatchCat(); return; }
    if (act === 'do-task-batch-time') {
      const time = document.getElementById('batchTime').value;
      const end = document.getElementById('batchEnd').value;
      const ids = new Set(session.taskPicked);
      Store.update((st) => {
        st.tasks.forEach((t) => {
          if (!ids.has(t.id)) return;
          if (time) { t.time = time; t.allDay = false; }
          if (end) t.endTime = end;
        });
      });
      session.taskBatch = false;
      session.taskPicked = [];
      closeSheet();
      Util.toast('时间已改');
      render();
      return;
    }
    if (act === 'do-task-batch-shift') {
      const days = parseInt(document.getElementById('batchDays').value, 10) || 0;
      const ids = new Set(session.taskPicked);
      Store.update((st) => {
        st.tasks.forEach((t) => {
          if (!ids.has(t.id) || !t.date) return;
          t.date = Util.addDaysStr(t.date, days);
        });
      });
      session.taskBatch = false;
      session.taskPicked = [];
      closeSheet();
      Util.toast('已顺延 ' + days + ' 天');
      render();
      return;
    }
    if (act === 'do-task-batch-cat') {
      const cat = el.dataset.cat;
      const ids = new Set(session.taskPicked);
      Store.update((st) => {
        st.tasks.forEach((t) => { if (ids.has(t.id)) t.category = cat; });
      });
      session.taskBatch = false;
      session.taskPicked = [];
      closeSheet();
      Util.toast('分类已改');
      render();
      return;
    }
    if (act === 'task-batch-done') {
      const ids = new Set(session.taskPicked);
      Store.update((st) => {
        st.tasks.forEach((t) => {
          if (!ids.has(t.id)) return;
          t.done = true;
          t.doneOn = Util.localDate();
          t.doneAt = Date.now();
        });
      });
      session.taskBatch = false;
      session.taskPicked = [];
      Util.toast('已标为完成');
      render();
      return;
    }
    if (act === 'task-batch-del') {
      const ids = new Set(session.taskPicked);
      Store.update((st) => { st.tasks = st.tasks.filter((t) => !ids.has(t.id)); });
      session.taskBatch = false;
      session.taskPicked = [];
      Util.toast('已删除');
      render();
      return;
    }
    if (act === 'jump-course-day') {
      const date = el.dataset.date;
      const d = Util.parseDate(date);
      if (!d) return;
      session.day = date;
      session.month = { y: d.getFullYear(), m: d.getMonth() };
      session.view = 'calendar';
      closeSheet();
      render();
      return;
    }
    if (act === 'msg-hold') {
      session.msgMenuId = session.msgMenuId === el.dataset.id ? '' : el.dataset.id;
      render();
      return;
    }
    if (act === 'msg-copy') {
      const m = findMsg(el.dataset.id);
      if (m) Util.copyText(m.content || '');
      session.msgMenuId = '';
      render();
      return;
    }
    if (act === 'msg-delete') {
      deleteMsg(el.dataset.id);
      session.msgMenuId = '';
      Util.buzz();
      render();
      return;
    }
    if (act === 'msg-recall') {
      if (recallMsg(el.dataset.id)) Util.toast('已撤回');
      session.msgMenuId = '';
      render();
      return;
    }
    if (act === 'open-buddy') { session.view = 'buddy'; session.companionText = ''; render(); return; }
    if (act === 'open-fish') { session.view = 'fish'; session.companionText = ''; render(); return; }
    if (act === 'comp-send') { sendCompanion(); return; }
    if (act === 'send-sticker') {
      const pack = companionPack();
      const item = pack && window.Stickers ? Stickers.byId(pack, el.dataset.id) : null;
      if (!item) return;
      sendCompanion({ text: '（发表情：' + item.label + '）', sticker: item.file, stickerOnly: true });
      return;
    }
    if (act === 'comp-prefill') {
      session.companionText = el.dataset.text || '';
      render();
      return;
    }
    if (act === 'toggle-dafeiyu') {
      Store.update((st) => { st.settings.dafeiyu = !st.settings.dafeiyu; });
      Util.toast(s().settings.dafeiyu ? '大肥鱼已开启' : '大肥鱼已关闭');
      render();
      return;
    }
    if (act === 'fish-flavor') {
      Store.update((st) => { st.settings.fishFlavor = el.dataset.id || 'qunyou'; });
      const f = window.FishPersona ? FishPersona.byId(s().settings.fishFlavor) : null;
      Util.toast(f ? ('已切换：' + f.name) : '已切换人格');
      render();
      return;
    }
    if (act === 'fish-quip') {
      const line = window.Pet ? Pet.banter('tap') : (window.FishPersona ? FishPersona.quip('tap') : '嗯？');
      pushChannel('fish', 'assistant', line, { sticker: 'assets/stickers/fish/pout.png' });
      render();
      return;
    }
    if (act === 'fish-feed') {
      const food = el.dataset.food || '鱼干';
      pushChannel('fish', 'user', '（投喂了' + food + '）', { sticker: 'assets/stickers/fish/eat.png', stickerOnly: true });
      const line = window.FishPersona ? FishPersona.quip('feed') : '……嗯。';
      pushChannel('fish', 'assistant', line + (food === '白饭' ? ' 白饭可以。' : ''), { sticker: 'assets/stickers/fish/eat.png' });
      if (window.Pet) Pet.banter('feed');
      Util.buzz();
      render();
      return;
    }
    if (act === 'toggle-chips') {
      Store.update((st) => { st.settings.quickChips = st.settings.quickChips === false; });
      render();
      return;
    }
    if (act === 'toggle') {
      Store.update((st) => {
        const t = st.tasks.find((x) => x.id === el.dataset.id);
        if (!t) return;
        t.done = !t.done;
        t.doneOn = t.done ? Util.localDate() : '';
        t.doneAt = t.done ? Date.now() : 0;
      });
      render();
      return;
    }
    if (act === 'provider') {
      readSettings();
      const p = PROVIDERS.find((x) => x.id === el.dataset.id);
      Store.update((st) => {
        st.settings.provider = el.dataset.id;
        if (p && p.id !== 'custom') { st.settings.baseUrl = p.baseUrl; st.settings.model = p.model; }
      });
      render();
      return;
    }
    if (act === 'lead') { Store.update((st) => { st.settings.remindLead = +el.dataset.n; }); render(); return; }
    if (act === 'theme') {
      Store.update((st) => { st.settings.theme = el.dataset.id || 'paper'; });
      render();
      return;
    }
    if (act === 'toggle-key') { readSettings(); session.showKey = !session.showKey; render(); return; }
    if (act === 'save-key') {
      readSettings();
      if (!s().settings.apiKey.trim()) { Util.toast('先填写密钥'); return; }
      setBusy('测试连接');
      try { await Llm.ping(); Util.toast('连接成功'); }
      catch (err) { Util.toast(explain(err)); }
      finally { setBusy(''); }
      return;
    }
    if (act === 'goal-roast') {
      setBusy('对照目标督查中');
      try {
        await runGoalRoast(true);
        render();
      } finally { setBusy(''); }
      return;
    }
    if (act === 'notify-on') {
      try {
        const got = await Notify.enable();
        Util.toast(got && got.count != null ? ('提醒已打开，已安排 ' + got.count + ' 条') : '提醒已打开');
      } catch (err) { Util.toast(err.message || String(err)); }
      render();
      return;
    }
    if (act === 'notify-test') {
      try {
        if (!s().settings.notify) {
          Util.toast('请先点「打开系统通知」');
          return;
        }
        const ok = await Notify.show('引程', '这是一条测试提醒');
        Util.toast(ok === false ? '通知未发出，请检查系统权限' : '已发送测试通知');
      } catch (err) { Util.toast(err.message || '发送失败'); }
      return;
    }
    if (act === 'notify-exact') {
      try { await Notify.openExactAlarmSettings(); Util.toast('请允许精确闹钟'); }
      catch (err) { Util.toast(err.message || '当前系统无需此项'); }
      return;
    }
    if (act === 'notify-settings') {
      try {
        if (Notify.openNotificationSettings) await Notify.openNotificationSettings();
        else Util.toast('请到系统设置 → 应用 → 引程 → 通知');
      } catch (err) { Util.toast(err.message || '无法打开设置'); }
      return;
    }
    if (act === 'open-link') {
      const url = el.dataset.url;
      if (url) window.open(url, '_blank', 'noopener');
      return;
    }
    if (act === 'export') {
      const blob = new Blob([JSON.stringify(Store.exportData(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '引程备份-' + Util.localDate() + '.json';
      a.click();
      return;
    }
    if (act === 'import') { document.getElementById('importFile').click(); return; }
    if (act === 'clear-chat') { Store.update((st) => { st.diy.chat = []; }); session.undo = null; render(); return; }
    if (act === 'new-event') { openEvent(''); return; }
    if (act === 'open-task') { openEvent(el.dataset.id); return; }
    if (act === 'save-event') { saveEvent(el.dataset.id); return; }
    if (act === 'pick-cat') {
      document.querySelectorAll('.cat').forEach((b) => b.classList.toggle('on', b === el));
      const title = document.getElementById('evTitle');
      if (title) title.dataset.cat = el.dataset.cat;
      return;
    }
    if (act === 'delete-one') {
      Store.update((st) => { st.tasks = st.tasks.filter((t) => t.id !== el.dataset.id); });
      closeSheet();
      render();
      return;
    }
    if (act === 'search-toggle') { session.searchOn = !session.searchOn; if (!session.searchOn) session.q = ''; render(); return; }
    if (act === 'search-clear') { session.searchOn = false; session.q = ''; render(); return; }
    if (act === 'today-jump') {
      closeSheet();
      const n = new Date();
      const day = Util.localDate(n);
      if (session.view === 'calendar' && session.month && session.month.y === n.getFullYear() && session.month.m === n.getMonth()) {
        selectCalendarDay(day);
      } else {
        session.day = day;
        session.month = { y: n.getFullYear(), m: n.getMonth() };
        session.calQuiet = true;
        session.view = 'calendar';
        render();
      }
      return;
    }
    if (act === 'cal-menu') {
      document.getElementById('sheet').innerHTML = `<div class="sheet action-sheet" role="dialog" aria-label="更多">
        <div class="sheet-handle" aria-hidden="true"></div>
        <p class="sheet-title">更多</p>
        <div class="action-list">
          <button type="button" class="action-row" data-act="view-courses"><span>查看本周课表</span></button>
          <button type="button" class="action-row" data-act="edit-term"><span>修改第一周起始</span></button>
          <button type="button" class="action-row" data-act="jump-week"><span>跳到某一周</span></button>
          <button type="button" class="action-row" data-act="today-jump"><span>回到今天</span></button>
          <button type="button" class="action-row" data-act="jump-date"><span>日期跳转</span></button>
          <button type="button" class="action-row" data-act="course"><span>导入课表</span></button>
          <button type="button" class="action-row" data-act="tab" data-view="settings"><span>设置</span></button>
        </div>
        <button type="button" class="btn btn-block sheet-cancel" data-act="close-sheet">取消</button>
      </div>`;
      document.getElementById('mask').hidden = false;
      return;
    }
    if (act === 'jump-week') {
      const term = termNow();
      const cur = window.Timetable ? Timetable.weekOf(session.day || Util.localDate(), term) : 1;
      const chips = Array.from({ length: term.weeks }, (_, i) => i + 1).map((n) =>
        `<button class="btn ${n === cur ? 'btn-primary' : ''}" data-act="goto-week" data-week="${n}">第${n}周</button>`
      ).join('');
      document.getElementById('sheet').innerHTML = `<div class="sheet" role="dialog">
        <div class="sheet-bar"><button data-act="close-sheet">取消</button><strong>跳到某一周</strong><span></span></div>
        <p class="muted">第一周周一：${Util.esc(term.week1)}</p>
        <div class="row" style="flex-wrap:wrap;gap:8px;max-height:50vh;overflow:auto">${chips}</div>
      </div>`;
      document.getElementById('mask').hidden = false;
      return;
    }
    if (act === 'goto-week') {
      const term = termNow();
      const week = parseInt(el.dataset.week, 10) || 1;
      const day = window.Timetable ? Timetable.dateOfWeekDay(week, 1, term) : '';
      const d = Util.parseDate(day);
      if (!d) return;
      session.day = day;
      session.month = { y: d.getFullYear(), m: d.getMonth() };
      closeSheet();
      render();
      return;
    }
    if (act === 'jump-date') {
      document.getElementById('sheet').innerHTML = `<div class="sheet" role="dialog">
        <h3>日期跳转</h3>
        <input id="jumpDate" type="date" value="${session.day || Util.localDate()}" />
        <div class="sheet-bar"><button data-act="close-sheet">取消</button><button data-act="do-jump">前往</button></div>
      </div>`;
      return;
    }
    if (act === 'do-jump') {
      const v = document.getElementById('jumpDate').value;
      const d = Util.parseDate(v);
      if (!d) return;
      session.day = v;
      session.month = { y: d.getFullYear(), m: d.getMonth() };
      closeSheet();
      render();
      return;
    }
    if (act === 'course') {
      closeSheet();
      session.wantCourse = true;
      document.getElementById('file').click();
      return;
    }
    if (act === 'edit-term') { editTerm(); return; }
    if (act === 'save-term') {
      const start = document.getElementById('termStart').value;
      const weeks = parseInt(document.getElementById('termWeeks').value, 10) || 20;
      const titleEl = document.getElementById('termTitle');
      const periodEl = document.getElementById('termPeriod');
      Store.update((st) => {
        st.term = Object.assign({}, st.term || {}, {
          week1: start,
          weeks: Math.min(30, Math.max(8, weeks)),
          title: titleEl ? clip(titleEl.value, 24) : (st.term && st.term.title) || '',
          periodPreset: periodEl ? (periodEl.value || 'jiaowu') : (st.term && st.term.periodPreset) || 'jiaowu',
        });
      });
      // 节次方案变更后，用新 PERIOD 重算时钟
      Store.update((st) => { st.courses = repairCourses(st.courses || []); });
      closeSheet();
      Util.toast('学期设置已保存');
      render();
      return;
    }
    if (act === 'clear-courses') {
      Store.update((st) => { st.courses = []; });
      closeSheet();
      render();
      return;
    }
    if (act === 'commit-courses') { commitCourses(el.dataset.mode); return; }
    if (act === 'clear-data') {
      Store.clearWork();
      session.undo = null;
      Util.toast('日程和目标已清空');
      render();
    }
  }

  function closeSheet() { document.getElementById('mask').hidden = true; }

  function onInput(e) {
    if (e.target.id === 'calQ') {
      session.q = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const again = document.getElementById('calQ');
      if (again) { again.focus(); again.setSelectionRange(pos, pos); }
      return;
    }
    if (e.target.id === 'box') {
      session.text = e.target.value;
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px';
      const sendBtn = document.querySelector('.send');
      if (sendBtn) sendBtn.classList.toggle('ready', !!(session.text.trim() || session.files.length));
    }
    if (e.target.id === 'compBox') {
      session.companionText = e.target.value;
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px';
      const sendBtn = document.querySelector('.send');
      if (sendBtn) sendBtn.classList.toggle('ready', !!session.companionText.trim());
    }
  }

  function bindCalendarSwipe() {
    let sx = 0;
    let sy = 0;
    let tracking = false;
    document.body.addEventListener('touchstart', (e) => {
      if (session.view !== 'calendar') return;
      const t = e.changedTouches[0];
      if (!t) return;
      const area = e.target.closest('.cal-swipe-area, .cal-head');
      if (!area) return;
      sx = t.clientX;
      sy = t.clientY;
      tracking = true;
    }, { passive: true });
    document.body.addEventListener('touchend', (e) => {
      if (!tracking || session.view !== 'calendar') return;
      tracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      Util.buzz();
      shiftMonth(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  function bindMsgLongPress() {
    let timer = null;
    let targetId = '';
    document.body.addEventListener('touchstart', (e) => {
      const bubble = e.target.closest('[data-act="msg-hold"]');
      if (!bubble) return;
      targetId = bubble.dataset.id || '';
      timer = setTimeout(() => {
        if (!targetId) return;
        session.msgMenuId = targetId;
        Util.buzz();
        render();
      }, 480);
    }, { passive: true });
    const clear = () => { if (timer) clearTimeout(timer); timer = null; targetId = ''; };
    document.body.addEventListener('touchend', clear, { passive: true });
    document.body.addEventListener('touchmove', clear, { passive: true });
    document.body.addEventListener('touchcancel', clear, { passive: true });
  }

  function handleAndroidBack() {
    const mask = document.getElementById('mask');
    if (mask && !mask.hidden) {
      closeSheet();
      return true;
    }
    if (session.msgMenuId) {
      session.msgMenuId = '';
      render();
      return true;
    }
    if (session.taskBatch) {
      session.taskBatch = false;
      session.taskPicked = [];
      render();
      return true;
    }
    if (session.searchOn) {
      session.searchOn = false;
      session.q = '';
      render();
      return true;
    }
    if (session.view !== 'chat') {
      session.view = 'chat';
      session.companionText = '';
      render();
      return true;
    }
    return false;
  }

  function init() {
    document.body.addEventListener('click', (e) => {
      const outsideMsg = session.msgMenuId && !e.target.closest('.msg-menu') && !e.target.closest('[data-act="msg-hold"]');
      onClick(e);
      if (outsideMsg) {
        session.msgMenuId = '';
        render();
      }
    });
    document.body.addEventListener('input', onInput);
    document.body.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        if (e.target.id === 'box') { e.preventDefault(); send(); }
        if (e.target.id === 'compBox') { e.preventDefault(); sendCompanion(); }
      }
    });
    document.getElementById('mask').addEventListener('click', (e) => { if (e.target.id === 'mask') closeSheet(); });
    document.getElementById('file').addEventListener('change', async (e) => {
      const list = [...e.target.files];
      e.target.value = '';
      try { await addFiles(list); } catch (err) { Util.toast(err.message || '附件没有加上'); }
    });
    document.getElementById('cam').addEventListener('change', async (e) => {
      const list = [...e.target.files];
      e.target.value = '';
      try { await addFiles(list); } catch (err) { Util.toast(err.message || '照片没有加上'); }
    });
    document.getElementById('importFile').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { Store.importData(JSON.parse(reader.result)); Util.toast('已恢复'); render(); }
        catch (err) { Util.toast(err.message || '恢复失败'); }
      };
      reader.readAsText(file);
    });
    const vv = window.visualViewport;
    if (vv) {
      const apply = () => { document.querySelector('.app').style.height = vv.height + 'px'; };
      vv.addEventListener('resize', apply);
      apply();
    }
    bindCalendarSwipe();
    bindMsgLongPress();
    Notify.start();
    render();
    setTimeout(() => { try { ensureGoalRoast(); } catch (e) { /* ignore */ } }, 600);
  }

  window.YinchengApp = { handleAndroidBack };
  init();
})();
