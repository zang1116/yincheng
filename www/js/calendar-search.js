/**
 * 跨日程、课表和记录的统一搜索。
 * 多个关键词按 AND 匹配；英文忽略大小写，常见课程简称会自动补全。
 */
const CalendarSearch = (() => {
  const CATEGORY = { study: '学习', work: '工作', life: '生活', personal: '个人', other: '其他' };
  const WEEKDAY = '日一二三四五六';
  const ALIASES = {
    高数: ['高等数学'],
    大物: ['大学物理'],
    线代: ['线性代数'],
    计网: ['计算机网络'],
    操统: ['操作系统'],
    agent: ['智能体'],
  };

  function fold(value) {
    return String(value == null ? '' : value)
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\s·•:：,，;；/\\|_\-—–]+/g, '');
  }

  function queryTerms(query) {
    return String(query || '')
      .normalize('NFKC')
      .trim()
      .split(/\s+/)
      .map(fold)
      .filter(Boolean);
  }

  function dateVariants(date) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
    if (!match) return [date || ''];
    const year = +match[1];
    const month = +match[2];
    const day = +match[3];
    const parsed = new Date(year, month - 1, day);
    return [
      date,
      year + '年' + month + '月' + day + '日',
      month + '月' + day + '日',
      match[2] + '-' + match[3],
      '周' + WEEKDAY[parsed.getDay()],
    ];
  }

  function variantsFor(term) {
    const direct = [term];
    for (const [short, full] of Object.entries(ALIASES)) {
      const key = fold(short);
      if (term === key) direct.push(...full.map(fold));
      else if (term.includes(key)) direct.push(...full.map((v) => term.replace(key, fold(v))));
    }
    return direct;
  }

  function matches(haystack, terms) {
    const text = fold(haystack);
    return terms.every((term) => variantsFor(term).some((part) => text.includes(part)));
  }

  function taskText(task) {
    return [
      task.title,
      task.note,
      task.location,
      task.category,
      CATEGORY[task.category] || '',
      ...dateVariants(task.date),
      task.time,
      task.endTime,
      task.done ? '已完成' : '未完成',
    ].join(' ');
  }

  function courseText(course) {
    const weekday = Number(course.weekday);
    return [
      course.name,
      course.location,
      course.teacher,
      course.weeksText,
      course.startTime,
      course.endTime,
      weekday >= 1 && weekday <= 7 ? '周' + WEEKDAY[weekday % 7] : '',
    ].join(' ');
  }

  function mealText(meal) {
    return [
      meal.name,
      meal.text,
      meal.note,
      ...dateVariants(meal.date),
      ...(Array.isArray(meal.items) ? meal.items.map((item) => item.name) : []),
    ].join(' ');
  }

  function compareTasks(a, b) {
    if (Boolean(a.done) !== Boolean(b.done)) return a.done ? 1 : -1;
    return String(a.date || '9999-99-99').localeCompare(String(b.date || '9999-99-99'))
      || String(a.time || '99:99').localeCompare(String(b.time || '99:99'));
  }

  function search(state, query) {
    const terms = queryTerms(query);
    if (!terms.length) return { tasks: [], courses: [], meals: [], total: 0, terms };
    const source = state || {};
    const tasks = (source.tasks || []).filter((task) => matches(taskText(task), terms)).sort(compareTasks);
    const courses = (source.courses || []).filter((course) => matches(courseText(course), terms))
      .sort((a, b) => (+a.weekday || 8) - (+b.weekday || 8)
        || String(a.startTime || '99:99').localeCompare(String(b.startTime || '99:99')));
    const meals = (source.meals || []).filter((meal) => matches(mealText(meal), terms))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    return { tasks, courses, meals, total: tasks.length + courses.length + meals.length, terms };
  }

  return { search, fold, queryTerms };
})();

if (typeof module !== 'undefined') module.exports = CalendarSearch;
if (typeof window !== 'undefined') window.CalendarSearch = CalendarSearch;
