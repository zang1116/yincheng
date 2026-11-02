/** 模拟 12+ 种大学生对话，检查 Intent 是否 handled 且动作合理。 */
global.Timetable = require('../www/js/timetable.js');
global.Nlp = require('../www/js/nlp.js');
const Intent = require('../www/js/intent.js');

const now = new Date(2026, 2, 10, 10, 0, 0); // 2026-03-10 周二

function pad(n) { return String(n).padStart(2, '0'); }
function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
const today = iso(now);

const base = {
  tasks: [
    { id: 'a1', title: '高数作业', date: today, time: '20:00', note: '', done: false, category: 'study' },
    { id: 'a2', title: '健身房力量', date: today, time: '18:00', note: '健身', done: false, category: 'life' },
    { id: 'a3', title: '英语听力', date: today, time: '21:00', note: '学习', done: false, category: 'study' },
  ],
  courses: [
    { id: 'c1', name: '高等数学', weekday: 1, startTime: '08:00', endTime: '09:40', weeksText: '1-16周', weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], location: '教A101' },
    { id: 'c2', name: '大学英语', weekday: 3, startTime: '10:00', endTime: '11:40', weeksText: '1-16周', weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], location: '教B203' },
  ],
  term: { week1: '2026-03-02', weeks: 18 },
  meals: [],
  pending: null,
};

const cases = [
  ['作业截止', '明天下午五点前交高数作业', (r) => r.actions && r.actions[0].type === 'create_tasks'],
  ['考试复习', '下周三高等数学考试，帮我安排复习', (r) => r.actions && r.actions.some((a) => a.type === 'create_tasks')],
  ['图书馆自习', '今天下午两点到四点去图书馆自习', (r) => r.actions && r.actions[0].tasks[0].title.indexOf('自习') >= 0],
  ['查今日', '今天有什么安排', (r) => r.handled && !r.actions],
  ['社团活动', '周五晚上七点社团开会，在学生活动中心', (r) => r.actions && r.actions[0].type === 'create_tasks'],
  ['约饭', '明天中午和室友约饭', (r) => r.actions && /饭|聚餐/.test(r.actions[0].tasks[0].title + r.reply)],
  ['面试', '下周二上午十点实习面试', (r) => r.actions && r.actions[0].tasks[0].title.indexOf('面试') >= 0],
  ['提醒', '提醒我提前30分钟', (r) => r.actions && r.actions[0].type === 'set_settings' && r.actions[0].remindLead === 30],
  ['打卡', '今天打卡', (r) => r.actions && r.actions[0].type === 'checkin'],
  ['备忘', '备忘：记得带学生证', (r) => r.actions && r.actions[0].type === 'create_memos'],
  ['目标四级', '这个月目标是过英语四级', (r) => r.actions && r.actions[0].type === 'set_goals'],
  ['饮食', '中午吃了盖浇饭和可乐', (r) => r.actions && r.actions[0].type === 'log_food'],
  ['完成作业', '高数作业写完了', (r) => r.actions && r.actions[0].type === 'complete_tasks'],
  ['推迟学习', '把今天的学习推迟到明天', (r) => r.actions && r.actions[0].type === 'shift_tasks'],
  ['条件删除', '删除所有跟健身无关的日程', (r) => r.actions && r.actions[0].keep === '健身'],
  ['清空今天', '清空今天的日程', (r) => r.actions && r.actions[0].type === 'delete_tasks' && r.actions[0].date === today],
  ['调课换教室', '高等数学换教室到教A201', (r) => r.actions && r.actions[0].type === 'update_courses'],
  ['设第一周', '第一周从 2026-03-02 开始，共 18 周', (r) => r.actions && r.actions[0].type === 'set_term'],
  ['口头排课', '周一 1-2 节线性代数 1-16 周，写进课表', (r) => r.actions && r.actions[0].type === 'set_courses'],
  ['查课表', '看看课表里有哪些课', (r) => r.handled && r.reply.indexOf('高等数学') >= 0],
  ['口语查今日', '今天咋样', (r) => r.handled && !r.actions],
  ['含糊有事', '明天下午有事', (r) => r.actions && r.actions[0].type === 'create_tasks'],
  ['弄一下复习', '帮我弄一下复习，下周三考试', (r) => r.actions && r.actions.some((a) => a.type === 'create_tasks')],
  ['记一下', '记一下：带饭卡', (r) => r.actions && (r.actions[0].type === 'create_memos' || r.actions[0].type === 'create_tasks')],
  ['太短追问', '帮我', (r) => r.handled && /具体/.test(r.reply)],
];

let fail = 0;
cases.forEach(([name, text, ok], i) => {
  const r = Intent.interpret(text, JSON.parse(JSON.stringify(base)), now);
  const pass = r.handled && ok(r);
  if (!pass) {
    fail += 1;
    console.log('FAIL', i + 1, name, text);
    console.log(' ', JSON.stringify(r).slice(0, 280));
  } else {
    console.log('OK  ', i + 1, name, '→', (r.actions && r.actions[0] && r.actions[0].type) || 'reply-only');
  }
});
console.log('\n' + (cases.length - fail) + '/' + cases.length + ' passed');
process.exit(fail ? 1 : 0);
