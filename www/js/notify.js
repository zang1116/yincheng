/**
 * 日程提醒。
 * - 浏览器：Notification + 轮询
 * - Android（Capacitor）：LocalNotifications 系统通知，后台也能响
 * - 选「闹钟」时额外调用系统闹钟 Intent（SystemAlarm 原生插件）
 */
const Notify = (() => {
  let timer = null;
  const CH_REMIND = 'yc_remind';
  const CH_ALARM = 'yc_alarm';
  const ID_BASE = 42000;
  const ID_COURSE = 520000;

  function cap() {
    return typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  }

  function plugin(name) {
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name]) {
        return window.Capacitor.Plugins[name];
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function leadOf(task) {
    const n = parseInt(task && task.remindLead != null ? task.remindLead : Store.get().settings.remindLead, 10);
    return n > 0 ? n : 10;
  }

  function when(task) {
    if (!task || !task.date || !task.time || task.allDay) return 0;
    const d = new Date(task.date + 'T' + task.time + ':00');
    const t = d.getTime();
    return Number.isNaN(t) ? 0 : t;
  }

  function fireAt(task) {
    const at = when(task);
    if (!at) return 0;
    return at - leadOf(task) * 60000;
  }

  function notifId(task) {
    let h = 0;
    const s = String(task.id || task.title || '');
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
    return ID_BASE + Math.abs(h % 500000);
  }

  function courseNotifId(courseId, dateStr) {
    let h = 0;
    const s = String(courseId || '') + '|' + String(dateStr || '');
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
    return ID_COURSE + Math.abs(h % 400000);
  }

  async function ensureChannels() {
    const LN = plugin('LocalNotifications');
    if (!LN || !LN.createChannel) return;
    try {
      await LN.createChannel({
        id: CH_REMIND,
        name: '日程提醒',
        description: '到点前提醒未完成的日程与课程',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
      });
      await LN.createChannel({
        id: CH_ALARM,
        name: '闹钟提醒',
        description: '较强提醒，接近闹钟效果',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
      });
    } catch (e) { /* 旧系统可忽略 */ }
  }

  async function show(title, body, opts) {
    opts = opts || {};
    const LN = plugin('LocalNotifications');
    if (LN) {
      await ensureChannels();
      const id = opts.id || (ID_BASE + Math.floor(Math.random() * 9000) + 1);
      await LN.schedule({
        notifications: [{
          id,
          title: String(title || '引程'),
          body: String(body || ''),
          channelId: opts.alarm ? CH_ALARM : CH_REMIND,
          schedule: { at: new Date(Date.now() + 800), allowWhileIdle: true },
          extra: opts.extra || {},
        }],
      });
      return true;
    }
    try {
      if (window.Notification && Notification.permission === 'granted') {
        new Notification(title, { body });
        return true;
      }
    } catch (e) { /* 忽略 */ }
    return false;
  }

  async function cancelAllScheduled() {
    const LN = plugin('LocalNotifications');
    if (!LN) return;
    try {
      const pending = await LN.getPending();
      const ids = (pending && pending.notifications || [])
        .map((n) => n.id)
        .filter((id) => id >= ID_BASE);
      if (ids.length) await LN.cancel({ notifications: ids.map((id) => ({ id })) });
    } catch (e) { /* 忽略 */ }
  }

  function collectCourseNotifs(now, leadMin) {
    const list = [];
    if (!window.Timetable || !window.Store) return list;
    const st = Store.get();
    const courses = st.courses || [];
    if (!courses.length) return list;
    const term = Timetable.termOf(st.term, new Date().getFullYear());
    Timetable.useTermPeriods(term);
    const lead = leadMin > 0 ? leadMin : 10;
    for (let i = 0; i < 14; i++) {
      const date = Util.addDaysStr(Util.localDate(), i);
      const dayCourses = Timetable.onDate(courses, date, term) || [];
      dayCourses.forEach((c) => {
        let start = c.startTime || '';
        if (!start && c.sectionStart) {
          const span = Timetable.sectionSpan(c.sectionStart, c.sectionEnd || c.sectionStart);
          start = span && span[0] ? span[0] : '';
        }
        if (!start) return;
        const at = new Date(date + 'T' + start + ':00').getTime();
        if (Number.isNaN(at)) return;
        const fire = at - lead * 60000;
        if (fire <= now + 2000) return;
        if (fire - now > 60 * 24 * 3600 * 1000) return;
        list.push({
          id: courseNotifId(c.id, date),
          title: '上课提醒 · ' + (c.name || '课程'),
          body: start + (c.location ? ' · ' + c.location : '') + ' · 提前 ' + lead + ' 分钟',
          channelId: CH_REMIND,
          schedule: { at: new Date(fire), allowWhileIdle: true },
          extra: { courseId: c.id || '', date },
        });
      });
    }
    return list;
  }

  async function scheduleAll() {
    const LN = plugin('LocalNotifications');
    if (!LN) return { count: 0, native: false };
    const s = Store.get();
    if (!s.settings.notify) return { count: 0, native: true };
    await ensureChannels();
    await cancelAllScheduled();
    const now = Date.now();
    const list = [];
    (s.tasks || []).forEach((t) => {
      if (t.done) return;
      const fire = fireAt(t);
      if (!fire || fire <= now + 2000) return;
      if (fire - now > 60 * 24 * 3600 * 1000) return;
      list.push({
        id: notifId(t),
        title: (t.remindType === 'alarm' ? '闹钟 · ' : '提醒 · ') + (t.title || '日程'),
        body: (t.time || '') + (t.location ? ' · ' + t.location : '') + ' · 提前 ' + leadOf(t) + ' 分钟',
        channelId: t.remindType === 'alarm' ? CH_ALARM : CH_REMIND,
        schedule: { at: new Date(fire), allowWhileIdle: true },
        extra: { taskId: t.id || '' },
        actionTypeId: 'OPEN_TASK',
      });
    });
    collectCourseNotifs(now, s.settings.remindLead || 10).forEach((n) => list.push(n));
    // Android 一次不宜过多
    const batch = list.slice(0, 64);
    if (batch.length) {
      try {
        await LN.schedule({ notifications: batch });
      } catch (e) {
        // 部分机型对过去时间或权限敏感，逐条兜底
        let ok = 0;
        for (const n of batch) {
          try {
            await LN.schedule({ notifications: [n] });
            ok += 1;
          } catch (err) { /* skip */ }
        }
        return { count: ok, native: true };
      }
    }
    return { count: batch.length, native: true };
  }

  async function setSystemAlarm(task) {
    const at = when(task);
    if (!at) return false;
    const d = new Date(at);
    const Alarm = plugin('SystemAlarm');
    if (Alarm && Alarm.setAlarm) {
      try {
        await Alarm.setAlarm({
          hour: d.getHours(),
          minute: d.getMinutes(),
          message: task.title || '引程提醒',
          skipUi: false,
        });
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  async function openExactAlarmSettings() {
    const Alarm = plugin('SystemAlarm');
    if (Alarm && Alarm.openExactAlarmSettings) {
      await Alarm.openExactAlarmSettings();
      return { opened: true };
    }
    const LN = plugin('LocalNotifications');
    if (LN && LN.checkExactNotificationSetting) {
      try {
        const st = await LN.checkExactNotificationSetting();
        if (st && (st.exact_alarm === 'granted' || st.exactAlarm === 'granted')) return { already: true };
      } catch (e) { /* ignore */ }
    }
    if (LN && LN.changeExactNotificationSetting) {
      await LN.changeExactNotificationSetting();
      return { opened: true };
    }
    throw new Error('当前环境不支持精确闹钟设置');
  }

  async function openNotificationSettings() {
    const Alarm = plugin('SystemAlarm');
    if (Alarm && Alarm.openNotificationSettings) {
      await Alarm.openNotificationSettings();
      return { opened: true };
    }
    throw new Error('请到系统设置 → 应用 → 引程 → 通知');
  }

  async function enable() {
    const LN = plugin('LocalNotifications');
    if (LN) {
      let perm;
      try {
        perm = await LN.requestPermissions();
      } catch (e) {
        throw new Error('无法请求通知权限：' + (e && e.message ? e.message : e));
      }
      const display = perm && (perm.display || perm.receive || perm.granted);
      if (display === 'denied' || display === false) {
        try { await openNotificationSettings(); } catch (e) { /* ignore */ }
        throw new Error('请到系统设置里允许「引程」通知');
      }
      await ensureChannels();
      Store.update((s) => { s.settings.notify = true; });
      try { await openExactAlarmSettings(); } catch (e) { /* 部分机型可跳过 */ }
      const got = await scheduleAll();
      try {
        await show('引程', '系统通知已打开，已安排 ' + got.count + ' 条提醒', { id: ID_BASE + 1 });
      } catch (e) { /* 即时通知失败不阻断 */ }
      return got;
    }
    if (cap()) {
      throw new Error('当前安装包未包含通知组件，请更新到最新版 APK');
    }
    if (!window.Notification) throw new Error('当前环境不支持系统通知');
    const p = await Notification.requestPermission();
    if (p !== 'granted') throw new Error('没有打开通知权限');
    Store.update((s) => { s.settings.notify = true; });
    show('引程', '提醒已打开。页面在前台时会通知你。');
    return { count: 0, native: false };
  }

  function tick() {
    const s = Store.get();
    if (!s.settings.notify) return;
    if (cap() && plugin('LocalNotifications')) return; // 原生已排程，不必轮询冒泡
    const now = Date.now();
    let changed = false;
    s.tasks.forEach((t) => {
      if (t.done || t.reminded) return;
      const fire = fireAt(t);
      const at = when(t);
      if (!fire || !at) return;
      if (now >= fire && now <= at + 15 * 60000) {
        show((t.remindType === 'alarm' ? '闹钟 · ' : '') + leadOf(t) + ' 分钟后', (t.time || '') + ' ' + t.title, { alarm: t.remindType === 'alarm' });
        t.reminded = true;
        changed = true;
      }
    });
    if (changed) Store.update(() => {});
  }

  async function resync() {
    try {
      if (Store.get().settings.notify) await scheduleAll();
    } catch (e) { /* 忽略 */ }
  }

  function start() {
    if (timer) return;
    timer = setInterval(tick, 20000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        tick();
        resync();
      }
    });
    // 冷启动稍后再同步，等 Capacitor bridge 就绪
    const boot = () => {
      ensureChannels().then(() => resync()).catch(() => {});
      tick();
    };
    if (cap()) setTimeout(boot, 600);
    else boot();
  }

  function status() {
    return {
      native: cap(),
      localNotifications: !!plugin('LocalNotifications'),
      systemAlarm: !!plugin('SystemAlarm'),
      notifyOn: !!(Store.get().settings && Store.get().settings.notify),
    };
  }

  return {
    enable, show, tick, start, resync, scheduleAll, setSystemAlarm,
    openExactAlarmSettings, openNotificationSettings, leadOf, fireAt, status,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Notify;
if (typeof window !== 'undefined') window.Notify = Notify;
