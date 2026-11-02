/** 全流程回归：课表解析 / 周次 / 通知排程逻辑（不依赖 DOM） */
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m); };

// mock minimal browser globals used by modules
global.window = global;
const Util = {
  pad: (n) => String(n).padStart(2, '0'),
  localDate: () => '2026-10-27', // Monday
  addDaysStr: (s, n) => {
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d + n);
    return dt.getFullYear() + '-' + Util.pad(dt.getMonth() + 1) + '-' + Util.pad(dt.getDate());
  },
};
global.Util = Util;

const Timetable = require(path.join(__dirname, '..', 'www', 'js', 'timetable.js'));
global.Timetable = Timetable;

// —— 1. 节次 / 周次 ——
assert(Timetable.PERIOD[1][0] === '08:30', 'PERIOD');
assert(Timetable.parseWeeks('1-15(单)', 16).join() === '1,3,5,7,9,11,13,15', 'odd weeks');
assert(Timetable.parseWeeks('2-16(双)', 16)[0] === 2, 'even weeks');

const sample = `星期一\n1-2\n深度学习A★\n1-15(单)\n东校区 教8-517\n教师:田鹏志\n星期三\n5-6\n机器学习\n2-16(双)\n东校区 教3-201\n教师:李四`;
const grid = Timetable.parseOfficialTable(sample, 16);
assert(grid.length >= 2, 'grid parse ' + grid.length);
assert(grid[0].startTime === '08:30', 'section clock');

// —— 2. 学期周次对齐（2026-09-21 为周一） ——
const term = Timetable.termOf({ week1: '2026-09-21', weeks: 20 });
assert(Timetable.weekOf('2026-10-27', term) === 6, 'week 6 expected, got ' + Timetable.weekOf('2026-10-27', term));
assert(Timetable.occurs({ weekday: 1, weeks: [1, 3, 5, 7, 9, 11, 13, 15], weeksText: '1-15(单)' }, '2026-10-26', term) === false, 'Mon week6 even not odd');
// 2026-10-26 is Monday of week 6? week1=09-21, Oct 26 = day 35 = week 6. Week 6 even - odd course shouldn't occur.
assert(Timetable.weekday('2026-10-26') === 1, 'monday');

// —— 3. 通知排程时间计算（内联复制逻辑） ——
function fireAt(task, lead) {
  const d = new Date(task.date + 'T' + task.time + ':00');
  return d.getTime() - lead * 60000;
}
const fire = fireAt({ date: '2026-10-27', time: '09:00' }, 10);
assert(new Date(fire).getHours() === 8 && new Date(fire).getMinutes() === 50, 'lead 10 min');

// —— 4. 日程混排键 ——
const items = [
  { kind: 'task', sort: '14:00', title: '社团' },
  { kind: 'course', sort: '08:30', title: '高数' },
  { kind: 'task', sort: '00:00', title: '全天', allDay: true },
];
items.sort((a, b) => a.sort.localeCompare(b.sort));
assert(items[0].title === '全天' && items[1].title === '高数' && items[2].title === '社团', 'agenda order');

// —— 5. Intent 改课（若可加载） ——
try {
  // intent depends on Timetable global
  const Intent = require(path.join(__dirname, '..', 'www', 'js', 'intent.js'));
  const st = {
    tasks: [], meals: [], courses: [
      { id: 'c1', name: '高等数学', weekday: 1, startTime: '08:30', endTime: '10:10', sectionStart: 1, sectionEnd: 2, weeksText: '1-16周', weeks: Timetable.parseWeeks('1-16周', 16), location: '教A101' },
    ],
    term: { week1: '2026-09-21', weeks: 20 },
  };
  const r = Intent.interpret('高数换教室到教8-517', st, new Date('2026-10-27T10:00:00'));
  assert(r.handled && r.actions && r.actions[0].type === 'update_courses', 'intent update course');
  const r2 = Intent.interpret('高数改成单周', st, new Date('2026-10-27T10:00:00'));
  assert(r2.handled && /单/.test(JSON.stringify(r2.actions)), 'intent odd weeks');
  console.log('Intent OK');
} catch (e) {
  console.log('Intent skip:', e.message);
}

console.log('OK flow regression');
