/** 教务样例回归：node scripts/test-timetable.js */
const path = require('path');
const Timetable = require(path.join(__dirname, '..', 'www', 'js', 'timetable.js'));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// 1) PERIOD 教务默认
assert(Timetable.PERIOD[1][0] === '08:30', 'PERIOD 1 应为 08:30');
assert(Timetable.PERIOD[5][0] === '14:00', 'PERIOD 5 应为 14:00');

// 2) parseWeeks
const odd = Timetable.parseWeeks('1-15(单)', 16);
assert(odd.every((n) => n % 2 === 1) && odd[0] === 1 && odd.indexOf(15) >= 0, '1-15(单)');
const even = Timetable.parseWeeks('2-16(双)', 16);
assert(even.every((n) => n % 2 === 0) && even[0] === 2, '2-16(双)');
const disc = Timetable.parseWeeks('3,5-16', 16);
assert(disc.indexOf(3) >= 0 && disc.indexOf(4) < 0 && disc.indexOf(5) >= 0, '3,5-16');
assert(Timetable.parseWeeks('第15周', 20).join() === '15', '第15周');

// 3) sectionSpan
const span = Timetable.sectionSpan(5, 6);
assert(span[0] === '14:00' && span[1] === '15:40', '5-6 节时钟');

// 4) 教务栅格样例（臧后文课表风格）
const sample = `
星期 节次 星期一 星期二 星期三 星期四 星期五
星期一
1-2
深度学习A★
1-15(单)
东校区 教8-517
教师:田鹏志
星期三
5-6
机器学习
2-16(双)
东校区 教3-201
教师:李四
星期五
3-4
高等数学
1-16周
教A101
教师:王五
`;
const grid = Timetable.parseOfficialTable(sample, 16);
assert(grid.length >= 2, '栅格至少 2 门，实得 ' + grid.length);
const dl = grid.find((c) => /深度/.test(c.name));
assert(dl && dl.weekday === 1 && dl.sectionStart === 1, '深度学习 周一 1-2');
assert(dl.weeks.every((n) => n % 2 === 1), '深度学习单周');

// 5) 行解析 + 节次
const lines = Timetable.parseText('周一 1-2节 高等数学 1-15(单) 教A101\n周三 5-6节 大物 2-16(双)', 16);
assert(lines.length === 2, '行解析 2 门');
assert(lines[0].sectionStart === 1 && lines[0].startTime === '08:30', '节次→时钟');
assert(lines[1].startTime === '14:00', '下午第5节');

console.log('OK timetable regression', {
  odd: odd.length,
  even: even.length,
  disc: disc.join(','),
  grid: grid.map((c) => c.name + '@周' + c.weekday + '第' + c.sectionStart).join(' | '),
  lines: Timetable.summarize(lines),
});
