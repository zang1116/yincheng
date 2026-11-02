const assert = require('assert');
const path = require('path');

const CalendarSearch = require(path.join(__dirname, '..', 'www', 'js', 'calendar-search.js'));

const tasks = [
  {
    id: 't1',
    title: 'Agent 开发：工具调用练习',
    date: '2026-11-03',
    time: '20:00',
    note: '记得带电脑',
    location: '创新中心 B302',
    category: 'study',
    done: false,
  },
  {
    id: 't2',
    title: '高等数学：第三章习题',
    date: '2026-11-04',
    time: '09:30',
    note: '极限与连续',
    location: '图书馆 3F',
    category: 'study',
    done: false,
  },
  {
    id: 't3',
    title: '小组项目碰头',
    date: '2026-11-02',
    time: '16:00',
    note: '',
    location: '教 8-517',
    category: 'work',
    done: true,
  },
];

const courses = [
  {
    id: 'c1',
    name: '高等数学',
    weekday: 1,
    startTime: '08:30',
    location: '教 8-517',
    teacher: '田老师',
    weeksText: '1-16周',
  },
];

const meals = [
  {
    id: 'm1',
    date: '2026-11-03',
    name: '午餐',
    text: '食堂牛肉面',
    items: [{ name: '牛肉面' }],
  },
];

const state = { tasks, courses, meals };

const multiField = CalendarSearch.search(state, 'agent 电脑');
assert.deepStrictEqual(multiField.tasks.map((item) => item.id), ['t1'], 'multi-term search should use all task fields');

const teacher = CalendarSearch.search(state, '田老师');
assert.deepStrictEqual(teacher.courses.map((item) => item.id), ['c1'], 'course teacher should be searchable');

const weekday = CalendarSearch.search(state, '周一');
assert.deepStrictEqual(weekday.courses.map((item) => item.id), ['c1'], 'course weekday should be searchable');

const dateText = CalendarSearch.search(state, '11月4日');
assert.deepStrictEqual(dateText.tasks.map((item) => item.id), ['t2'], 'Chinese date should be searchable');

const alias = CalendarSearch.search(state, '高数');
assert.deepStrictEqual(alias.tasks.map((item) => item.id), ['t2'], 'common course alias should match');
assert.deepStrictEqual(alias.courses.map((item) => item.id), ['c1'], 'common course alias should match courses');

const meal = CalendarSearch.search(state, '牛肉面');
assert.deepStrictEqual(meal.meals.map((item) => item.id), ['m1'], 'meal items should be searchable');

const empty = CalendarSearch.search(state, '   ');
assert.strictEqual(empty.total, 0, 'blank search should return no results');

const none = CalendarSearch.search(state, '不存在的安排');
assert.strictEqual(none.total, 0, 'unmatched search should return an empty result');

console.log('OK calendar search');
