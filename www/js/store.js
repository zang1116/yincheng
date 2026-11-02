const Store = (() => {
  const KEY = 'yc_state_v1';

  function defaultSkills() {
    return [
      {
        id: 'skill_split',
        name: '拆成日程',
        prompt: '把下面的目标拆成可以放进日历的行动。没写周期就按 7 天、每天 2 项。不要添加原文没有的主题。\n\n{{input}}',
      },
      {
        id: 'skill_week',
        name: '只排本周',
        prompt: '只安排本周还没过完的日子。不要排到下周，也不要添加原文没有的主题。\n\n{{input}}',
      },
      {
        id: 'skill_fit',
        name: '按已有安排改一版',
        prompt: '下面是接下来 7 天已经记下的未完成任务。请只调整密度和顺序，给出一版新日程。不要新增用户没提过的主题。\n\n用户补充：{{input}}\n\n已有任务：\n{{schedule}}',
      },
    ];
  }

  function fresh() {
    return {
      settings: {
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        apiKey: '',
        notify: false,
        remindLead: 10,
        theme: 'paper',
        dafeiyu: false,
        fishFlavor: 'qunyou',
        petPos: { buddy: null, fish: null },
        quickChips: true,
      },
      tasks: [],
      memos: [],
      plans: [],
      checkins: [],
      goals: [],
      meals: [],
      courses: [],
      term: { week1: '', weeks: 20, title: '', periodPreset: 'jiaowu' },
      diy: {
        widgets: ['checkin', 'tasks', 'memos', 'upcoming'],
        skills: defaultSkills(),
        designs: {},
        panels: [],
        chat: [],
        buddyChat: [],
        fishChat: [],
      },
    };
  }

  function withMsgId(m) {
    if (!m || typeof m !== 'object') return m;
    if (m.id) return m;
    return Object.assign({}, m, { id: 'm_' + (m.at || Date.now()) + '_' + Math.random().toString(36).slice(2, 6) });
  }

  function normalizeChat(list) {
    return (Array.isArray(list) ? list : []).map(withMsgId);
  }

  function load() {
    const base = fresh();
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return base;
      const s = JSON.parse(raw);
      const diy = s.diy || {};
      const settings = { ...base.settings, ...(s.settings || {}) };
      if (!settings.petPos || typeof settings.petPos !== 'object') settings.petPos = { buddy: null, fish: null };
      return {
        settings,
        tasks: Array.isArray(s.tasks) ? s.tasks : [],
        memos: Array.isArray(s.memos) ? s.memos : [],
        plans: Array.isArray(s.plans) ? s.plans : [],
        checkins: Array.isArray(s.checkins) ? s.checkins : [],
        goals: Array.isArray(s.goals) ? s.goals : [],
        meals: Array.isArray(s.meals) ? s.meals : [],
        courses: Array.isArray(s.courses) ? s.courses : [],
        term: Object.assign({ week1: '', weeks: 20, title: '', periodPreset: 'jiaowu' }, s.term || {}),
        diy: {
          widgets: Array.isArray(diy.widgets) ? diy.widgets : base.diy.widgets,
          skills: Array.isArray(diy.skills) ? diy.skills : base.diy.skills,
          designs: diy.designs && typeof diy.designs === 'object' ? diy.designs : {},
          panels: Array.isArray(diy.panels) ? diy.panels : [],
          chat: normalizeChat(diy.chat),
          buddyChat: normalizeChat(diy.buddyChat),
          fishChat: normalizeChat(diy.fishChat),
          pending: diy.pending || null,
        },
      };
    } catch (e) {
      return base;
    }
  }

  let state = load();

  function persist() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function get() { return state; }

  function update(fn) {
    fn(state);
    persist();
  }

  function exportData() {
    return {
      app: 'yincheng',
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks: state.tasks,
      memos: state.memos,
      plans: state.plans,
      checkins: state.checkins,
      goals: state.goals,
      meals: state.meals,
      courses: state.courses,
      term: state.term,
      remind: { notify: !!state.settings.notify, remindLead: state.settings.remindLead || 10 },
      diy: state.diy,
    };
  }

  function importData(data) {
    if (!data || data.app !== 'yincheng' || !Array.isArray(data.tasks)) {
      throw new Error('这不是引程的备份文件');
    }
    state.tasks = data.tasks;
    state.memos = Array.isArray(data.memos) ? data.memos : [];
    state.plans = Array.isArray(data.plans) ? data.plans : [];
    state.checkins = Array.isArray(data.checkins) ? data.checkins : [];
    state.goals = Array.isArray(data.goals) ? data.goals : [];
    state.meals = Array.isArray(data.meals) ? data.meals : [];
    state.courses = Array.isArray(data.courses) ? data.courses : state.courses;
    if (data.term) state.term = Object.assign({ week1: '', weeks: 20 }, data.term);
    if (data.remind) {
      state.settings.notify = !!data.remind.notify;
      state.settings.remindLead = data.remind.remindLead || 10;
    }
    if (data.diy) {
      if (Array.isArray(data.diy.widgets)) state.diy.widgets = data.diy.widgets;
      if (Array.isArray(data.diy.skills)) state.diy.skills = data.diy.skills;
      if (data.diy.designs && typeof data.diy.designs === 'object') state.diy.designs = data.diy.designs;
      if (Array.isArray(data.diy.panels)) state.diy.panels = data.diy.panels;
      if (Array.isArray(data.diy.chat)) state.diy.chat = normalizeChat(data.diy.chat);
      if (Array.isArray(data.diy.buddyChat)) state.diy.buddyChat = normalizeChat(data.diy.buddyChat);
      if (Array.isArray(data.diy.fishChat)) state.diy.fishChat = normalizeChat(data.diy.fishChat);
    }
    persist();
  }

  function clearWork() {
    state.tasks = [];
    state.memos = [];
    state.plans = [];
    state.checkins = [];
    state.goals = [];
    state.meals = [];
    persist();
  }

  return { get, update, exportData, importData, clearWork };
})();
if (typeof window !== 'undefined') window.Store = Store;
