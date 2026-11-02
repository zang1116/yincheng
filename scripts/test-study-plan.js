/** 学习计划展开 / 截断抢救 / Intent 识别回归 */
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m || 'assert failed'); };

global.window = global;
const Util = {
  pad: (n) => String(n).padStart(2, '0'),
  localDate: () => '2026-11-02',
  parseDate: (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  },
  addDaysStr: (s, n) => {
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d + n);
    return dt.getFullYear() + '-' + Util.pad(dt.getMonth() + 1) + '-' + Util.pad(dt.getDate());
  },
  weekdayLabel: () => '周一',
};
global.Util = Util;

const StudyPlan = require(path.join(__dirname, '..', 'www', 'js', 'study-plan.js'));
global.StudyPlan = StudyPlan;

// —— 1. 展开后每天标题不重复 ——
const plan = StudyPlan.buildClassicPlan({
  from: '2026-11-03',
  to: '2027-02-16',
  text: '周一三五 20:00，周二四 19:00，周末 10:00',
});
const { tasks, truncated, counts } = StudyPlan.expand(plan);
assert(tasks.length > 90, 'should expand ~100 days, got ' + tasks.length);
assert(!truncated, 'range should fit in MAX_TASKS');
const titles = tasks.map((t) => t.title);
assert(new Set(titles).size === titles.length, 'titles must be unique, dupes=' + (titles.length - new Set(titles).size));
assert(counts['Agent开发'] > 30 && counts['Web开发'] > 20 && counts['深度学习'] > 20, 'subject counts ' + JSON.stringify(counts));
assert(tasks[0].time === '19:00', '2026-11-03 is Tue → 19:00, got ' + tasks[0].time);
assert(tasks[0].title.indexOf('Web开发') === 0, 'Tue → Web, got ' + tasks[0].title);
const fri = tasks.find((t) => t.date === '2026-11-06');
assert(fri && fri.time === '20:00' && fri.title.indexOf('Agent') === 0, 'Fri agent 20:00');
const sat = tasks.find((t) => t.date === '2026-11-07');
assert(sat && sat.time === '10:00' && sat.title.indexOf('深度') === 0, 'Sat DL 10:00');

// —— 2. Intent 识别学习计划 ——
const Timetable = require(path.join(__dirname, '..', 'www', 'js', 'timetable.js'));
global.Timetable = Timetable;
const Intent = require(path.join(__dirname, '..', 'www', 'js', 'intent.js'));
const judged = Intent.interpret(
  '我要学 agent开发 web开发和深度学习，从 2026-11-03 排到 2027-02-16，每天1小时穿插进行，周一三五20:00周二四19:00周末10:00',
  { tasks: [], meals: [], courses: [], pending: null },
  new Date('2026-11-02T12:00:00')
);
assert(judged.handled, 'intent should handle study plan');
assert(judged.actions && judged.actions[0].type === 'create_study_plan', 'action type');
assert(judged.actions[0].from === '2026-11-03' && judged.actions[0].to === '2027-02-16', 'date range');

// —— 3. 截断 JSON 抢救（复用 llm 内函数需 Store mock） ——
global.Store = { get: () => ({ settings: { apiKey: 'x', model: 'm', baseUrl: 'http://x' }, diy: { chat: [] } }) };
// llm.js 依赖浏览器；这里直接测 salvage 逻辑副本
function salvage(text) {
  const tasks2 = [];
  const re = /\{\s*"title"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let m;
  while ((m = re.exec(text)) && tasks2.length < 120) {
    const start = m.index;
    let depth = 0;
    let inStr = false;
    let esc = false;
    let end = -1;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end < 0) break;
    try {
      const obj = JSON.parse(text.slice(start, end + 1));
      if (obj.title) tasks2.push(obj);
    } catch (e) { /* skip */ }
  }
  return tasks2;
}
const truncatedJson = '{"reply":"继续","actions":[{"type":"create_tasks","tasks":[{"title":"A：一","date":"2026-11-08","time":"10:00","note":"一"},{"title":"B：二","date":"2026-11-09","time":"20:00","note":"二"},{"title":"C：三","date":"2026-11-10","time":"19:00","note":"残缺';
const salvaged = salvage(truncatedJson);
assert(salvaged.length === 2, 'salvage complete objects only, got ' + salvaged.length);

// —— 4. 续排 Intent ——
const cont = Intent.interpret('继续', {
  tasks: [], meals: [], courses: [],
  pending: { type: 'task_continue', afterDate: '2026-12-01', to: '2027-02-16', plan },
}, new Date('2026-11-02T12:00:00'));
assert(cont.handled && cont.actions[0].type === 'create_study_plan', 'continue study plan');
assert(cont.actions[0].from === '2026-12-01', 'continue from breakpoint');

// —— 5. 单科考研高数：本地课纲、节假日和已有安排 ——
const mathSubjects = StudyPlan.guessSubjects('我要考研数学二，每天复习高等数学一小时');
assert(mathSubjects.some((item) => item.id === 'math'), 'math should be a first-class study subject');
assert(StudyPlan.topicsFor({ name: '高等数学' }).length >= 40, 'math curriculum should be detailed');

const mathPlan = StudyPlan.buildClassicPlan({
  from: '2026-11-03',
  to: '2026-11-12',
  subjects: [{ id: 'math', name: '考研高数' }],
  slots: {
    1: { time: '20:30', endTime: '21:30' },
    2: { time: '20:30', endTime: '21:30' },
    3: { time: '20:30', endTime: '21:30' },
    4: { time: '20:30', endTime: '21:30' },
    5: { time: '20:30', endTime: '21:30' },
    6: { time: '20:30', endTime: '21:30' },
    7: { time: '20:30', endTime: '21:30' },
  },
  excludeDates: ['2027-01-01', '2026-11-05'],
});
const mathExpanded = StudyPlan.expand(mathPlan);
assert(mathExpanded.tasks.length === 9, 'math plan should skip the excluded date');
assert(!mathExpanded.tasks.some((task) => task.date === '2026-11-05'), 'excluded date must not be scheduled');
assert(mathExpanded.tasks.every((task) => task.time === '20:30' && task.endTime === '21:30'), 'daily time range');
assert(mathExpanded.tasks.every((task) => task.title.startsWith('考研高数：')), 'math task titles');
assert(new Set(mathExpanded.tasks.map((task) => task.title)).size === mathExpanded.tasks.length, 'math topics unique');
assert(/函数|极限|连续/.test(mathExpanded.tasks[0].title), 'math curriculum should start from fundamentals');

const openPlan = StudyPlan.buildClassicPlan({
  from: '2026-11-03',
  to: '2026-11-03',
  subjects: [{ id: 'math', name: '考研高数' }],
  slots: {},
});
openPlan.durationMinutes = 60;
openPlan.windowStart = '18:00';
openPlan.windowEnd = '22:00';
openPlan.busyByDate = {
  '2026-11-03': [['18:00', '19:00'], ['20:00', '21:00']],
};
const openSlot = StudyPlan.expand(openPlan).tasks[0];
assert(openSlot && openSlot.time === '19:00' && openSlot.endTime === '20:00', 'open slot should avoid busy ranges');

// —— 6. 缺少结束日期时只保留结构化草稿，不伪造任务 ——
const draft = Intent.interpret(
  '帮我安排高数，我要考数学二，每天一小时，每天晚上8:30到9:30，循序渐进，元旦不要排',
  { tasks: [], meals: [], courses: [], pending: null, term: { week1: '2026-09-21', weeks: 20 } },
  new Date('2026-11-02T12:00:00')
);
assert(draft.handled, 'single-subject math plan should be handled locally');
assert((draft.actions || []).length === 0, 'missing end date must not write a partial plan');
assert(draft.pending && draft.pending.type === 'study_plan_draft', 'draft should be persisted');
assert(/排到|结束日期/.test(draft.reply), 'draft should ask one necessary question');

const startReply = Intent.interpret('从明天开始', {
  tasks: [], meals: [], courses: [], pending: draft.pending, term: { week1: '2026-09-21', weeks: 20 },
}, new Date('2026-11-02T12:10:00'));
assert(startReply.handled, 'start reply should be handled');
assert((startReply.actions || []).length === 0, 'start-only reply must not create a fake task');
assert(startReply.pending && startReply.pending.plan.from === '2026-11-03', 'start date should update the draft');

const completed = Intent.interpret('排到2027年1月15日', {
  tasks: [], meals: [], courses: [], pending: startReply.pending, term: { week1: '2026-09-21', weeks: 20 },
}, new Date('2026-11-02T12:11:00'));
assert(completed.handled && completed.actions[0].type === 'create_study_plan', 'completed draft should execute');
assert(completed.actions[0].from === '2026-11-03' && completed.actions[0].to === '2027-01-15', 'completed date range');
assert(completed.actions[0].slots[1].time === '20:30' && completed.actions[0].slots[1].endTime === '21:30', 'completed time range');
assert(completed.actions[0].excludeDates.indexOf('2027-01-01') >= 0, 'New Year should remain excluded after completing the draft');

const flexible = Intent.interpret(
  '帮我安排高数复习，从2026-11-03到2026-11-04，每天一小时，不固定时间，找我的空档，循序渐进',
  {
    tasks: [{ id: 'busy1', title: '社团', date: '2026-11-03', time: '18:00', endTime: '19:00', done: false }],
    meals: [], courses: [], pending: null, term: { week1: '2026-09-21', weeks: 20 },
  },
  new Date('2026-11-02T12:15:00')
);
assert(flexible.handled && flexible.actions[0].type === 'create_study_plan', 'flexible plan should execute');
const flexiblePreview = StudyPlan.expand(Object.assign({}, flexible.actions[0], {
  excludeDates: flexible.actions[0].excludeDates,
  busyByDate: flexible.actions[0].busyByDate,
  windowStart: flexible.actions[0].windowStart,
  windowEnd: flexible.actions[0].windowEnd,
  durationMinutes: flexible.actions[0].durationMinutes,
}));
assert(flexiblePreview.tasks[0].time === '19:00', 'flexible plan should choose an empty evening slot');

const strayStart = Intent.interpret('从明天开始', {
  tasks: [], meals: [], courses: [], pending: null,
}, new Date('2026-11-02T12:20:00'));
assert(strayStart.handled, 'start without context should be handled locally');
assert(!(strayStart.actions || []).some((action) => action.type === 'create_tasks'), 'start phrase must never become a task');

console.log('OK study-plan regression', {
  days: tasks.length,
  counts,
  samples: tasks.slice(0, 3).map((t) => t.date + ' ' + t.title),
});
