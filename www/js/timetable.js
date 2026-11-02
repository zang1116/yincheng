/** 学期周次和课表。课程按「第几周 + 星期」出现，不和自己加的日程混在一条里。 */
const Timetable = (() => {
  /** 教务默认（截图校历）：1=08:30 */
  const PERIOD_JIAOWU = {
    1: ['08:30', '09:15'], 2: ['09:25', '10:10'],
    3: ['10:20', '11:05'], 4: ['11:15', '12:00'],
    5: ['14:00', '14:45'], 6: ['14:55', '15:40'],
    7: ['15:50', '16:35'], 8: ['16:45', '17:30'],
    9: ['19:00', '19:45'], 10: ['19:55', '20:40'],
    11: ['21:00', '21:45'], 12: ['21:55', '22:40'],
  };
  /** 旧方案：整点偏早 */
  const PERIOD_LEGACY = {
    1: ['08:00', '08:45'], 2: ['08:55', '09:40'],
    3: ['10:00', '10:45'], 4: ['10:55', '11:40'],
    5: ['14:00', '14:45'], 6: ['14:55', '15:40'],
    7: ['16:00', '16:45'], 8: ['16:55', '17:40'],
    9: ['19:00', '19:45'], 10: ['19:55', '20:40'],
    11: ['21:00', '21:45'], 12: ['21:55', '22:40'],
  };
  const PRESETS = {
    jiaowu: { id: 'jiaowu', name: '教务默认(08:30)', table: PERIOD_JIAOWU },
    legacy: { id: 'legacy', name: '旧方案(08:00)', table: PERIOD_LEGACY },
  };
  let activePeriod = PERIOD_JIAOWU;
  const PERIOD = PERIOD_JIAOWU;
  const WD = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };
  const WD_NAME = '一二三四五六日';

  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function mondayOf(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - (day - 1));
    return d;
  }
  function defaultWeek1(year) {
    return iso(mondayOf(new Date(year, 8, 1)));
  }
  function termOf(term, year) {
    const weeks = Math.min(30, Math.max(8, parseInt(term && term.weeks, 10) || 20));
    let week1 = term && term.week1;
    if (!parse(week1)) week1 = defaultWeek1(year || new Date().getFullYear());
    const mon = mondayOf(parse(week1));
    return {
      week1: iso(mon),
      weeks,
      title: (term && term.title) || '',
      periodPreset: (term && term.periodPreset) || 'jiaowu',
    };
  }
  function setPeriodPreset(id) {
    const p = PRESETS[id] || PRESETS.jiaowu;
    activePeriod = p.table;
    return p.id;
  }
  function periodTable(term) {
    const id = (term && term.periodPreset) || 'jiaowu';
    return (PRESETS[id] && PRESETS[id].table) || PERIOD_JIAOWU;
  }
  function useTermPeriods(term) {
    activePeriod = periodTable(term);
  }
  function weekOf(dateStr, term) {
    const t = termOf(term);
    const a = parse(t.week1);
    const b = parse(dateStr);
    if (!a || !b) return 0;
    const diff = Math.round((b - a) / 86400000);
    if (diff < 0) return 0;
    const n = Math.floor(diff / 7) + 1;
    return n > t.weeks ? 0 : n;
  }
  function dateOfWeekDay(week, weekday, term) {
    const t = termOf(term);
    const mon = parse(t.week1);
    if (!mon || week < 1) return '';
    const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate());
    d.setDate(d.getDate() + (week - 1) * 7 + (weekday - 1));
    return iso(d);
  }
  function weekday(dateStr) {
    const d = parse(dateStr);
    if (!d) return 0;
    return d.getDay() === 0 ? 7 : d.getDay();
  }

  /** 支持 1-15(单)、2-16(双)、3,5-16、第15周、单周/双周 */
  function parseWeeks(text, total) {
    let src = String(text || '').replace(/\s+/g, '');
    const max = total || 20;
    const odd = /单周|\(单\)|（单）|单$/.test(src) && !/双/.test(src.replace(/单周|\(单\)|（单）/g, ''));
    const even = /双周|\(双\)|（双）/.test(src);
    // 去掉单双标记后再抽数字，避免「单」干扰
    const cleaned = src
      .replace(/单周|\(单\)|（单）|双周|\(双\)|（双）|全周|全学期/g, '')
      .replace(/第/g, '')
      .replace(/周/g, ',');
    const nums = [];
    const re = /(\d{1,2})\s*[-~～到至]\s*(\d{1,2})/g;
    let m;
    let any = false;
    while ((m = re.exec(cleaned))) {
      any = true;
      const a = Math.min(+m[1], +m[2]);
      const b = Math.max(+m[1], +m[2]);
      for (let i = a; i <= b && i <= max; i++) nums.push(i);
    }
    // 离散：3,5-16 里 range 已处理，剩下孤立数字
    const rest = cleaned.replace(/(\d{1,2})\s*[-~～到至]\s*(\d{1,2})/g, ',');
    (rest.match(/\d{1,2}/g) || []).forEach((n) => {
      if (+n >= 1 && +n <= max) {
        any = true;
        nums.push(+n);
      }
    });
    let list = [...new Set(nums)].sort((a, b) => a - b);
    if (!list.length) list = Array.from({ length: max }, (_, i) => i + 1);
    if (odd) list = list.filter((n) => n % 2 === 1);
    if (even) list = list.filter((n) => n % 2 === 0);
    return list;
  }

  function sectionSpan(a, b, table) {
    const T = table || activePeriod || PERIOD_JIAOWU;
    const start = T[a] || T[1];
    const end = T[b] || start;
    return [start[0], end[1]];
  }

  function sectionsFromTimes(startTime, endTime, table) {
    const T = table || activePeriod || PERIOD_JIAOWU;
    let sectionStart = 0;
    let sectionEnd = 0;
    Object.keys(T).forEach((k) => {
      const n = +k;
      const slot = T[n];
      if (startTime && startTime >= slot[0] && startTime <= slot[1]) sectionStart = n;
      if (endTime && endTime >= slot[0] && endTime <= slot[1]) sectionEnd = n;
    });
    if (sectionStart && !sectionEnd) sectionEnd = sectionStart;
    return { sectionStart, sectionEnd };
  }

  function courseWeeks(course, term) {
    if (course && course.weeks && course.weeks.length) return course.weeks;
    return parseWeeks(course && course.weeksText, termOf(term).weeks);
  }
  function occurs(course, dateStr, term) {
    const w = weekOf(dateStr, term);
    if (!w || weekday(dateStr) !== +course.weekday) return false;
    return courseWeeks(course, term).indexOf(w) >= 0;
  }
  function onWeekday(courses, dateStr) {
    const wd = weekday(dateStr);
    return (courses || []).filter((c) => +c.weekday === wd)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }
  function onDate(courses, dateStr, term, opts) {
    const strict = (courses || []).filter((c) => occurs(c, dateStr, term))
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    if (strict.length || !(opts && opts.fallbackWeekday)) return strict;
    if (weekOf(dateStr, term)) return strict;
    return onWeekday(courses, dateStr);
  }
  function weekSpan(week, term) {
    const mon = dateOfWeekDay(week, 1, term);
    const sun = dateOfWeekDay(week, 7, term);
    return { monday: mon, sunday: sun };
  }

  function cleanName(raw, loc) {
    let name = String(raw || '')
      .replace(/周[一二三四五六日天]/g, '')
      .replace(/星期[一二三四五六日天]/g, '')
      .replace(/第?\s*\d{1,2}\s*[-~～到至]\s*\d{1,2}\s*节/g, '')
      .replace(/第?\s*\d{1,2}\s*节/g, '')
      .replace(/\d{1,2}:\d{2}\s*[-~～到至]\s*\d{1,2}:\d{2}/g, '')
      .replace(/\d{1,2}\s*[-~～到至]\s*\d{1,2}\s*(?:周)?(?:\([单双]\)|（[单双]）|单|双)?|单周|双周|全周/g, '')
      .replace(/[\[【(（][^\]】)）]*[\]】)）]/g, ' ')
      .replace(/(?:地点|教室|老师|教师|授课)\s*[^\s，,|｜]{1,20}/g, '')
      .replace(/[|｜★●◇◆○]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^[:：\-\s]+|[:：\-\s]+$/g, '')
      .trim();
    if (loc) name = name.replace(loc, '').trim();
    name = name.replace(/\s+/g, ' ').slice(0, 24);
    return name;
  }

  function extractLoc(line) {
    const src = String(line || '').replace(/\d{1,2}\s*[-~～到至]\s*\d{1,2}\s*周/g, '');
    const locWord = src.match(/(?:地点|教室|上课地点)\s*[:：]?\s*([^\s，,|｜]{2,24})/);
    const locMatch = src.match(/((?:[东西南北中]校区)?\s*教\s*[A-Za-z0-9\-－]{1,12}|[A-Z]教[A-Za-z0-9\-－]{1,8}|教\s*\d+-\d+)/);
    return ((locWord && locWord[1]) || (locMatch && locMatch[1]) || '').replace(/\s/g, '');
  }

  function extractTeacher(line) {
    const m = line.match(/(?:老师|教师|授课|任课)\s*([^\s，,|｜]{2,8})/)
      || line.match(/([^\s，,|｜]{2,4})\s*老师/)
      || line.match(/(?:教师[:：]\s*)([^\s，,|｜]{2,8})/);
    return m ? m[1] : '';
  }

  function extractWeeksText(line, totalWeeks) {
    // 先去掉节次，避免「1-2节」被当成周次
    const src = String(line || '')
      .replace(/第?\s*\d{1,2}\s*[-~～到至]\s*\d{1,2}\s*节/g, ' ')
      .replace(/第?\s*\d{1,2}\s*节/g, ' ');
    const marked = src.match(
      /\d{1,2}\s*[-~～到至]\s*\d{1,2}\s*[\(（][单双][\)）]|\d{1,2}\s*[-~～到至,，、]\s*\d{1,2}(?:\s*[-~～到至,，、]\s*\d{1,2})*\s*周|第\s*\d{1,2}\s*周|单周|双周|全周/g
    );
    if (marked && marked.length) return marked.join('').replace(/\s+/g, '');
    const paren = src.match(/(\d{1,2}\s*[-~～到至]\s*\d{1,2})\s*[\(（]([单双])[\)）]/);
    if (paren) return paren[1].replace(/\s+/g, '') + '(' + paren[2] + ')';
    const range = src.match(/(\d{1,2}\s*[-~～到至]\s*\d{1,2})(?:\s*周)?/);
    if (range && /周/.test(src)) return range[1].replace(/\s+/g, '') + '周';
    const discrete = src.match(/(\d{1,2}(?:\s*[,，、]\s*\d{1,2}\s*(?:[-~～到至]\s*\d{1,2})?)+)\s*周/);
    if (discrete) return discrete[1].replace(/\s+/g, '') + '周';
    const bracket = src.match(/\[\s*(\d{1,2}\s*[-~～到至]\s*\d{1,2})\s*\]/);
    if (bracket) return bracket[1].replace(/\s+/g, '') + '周';
    return '1-' + (totalWeeks || 20) + '周';
  }

  function pushCourse(list, item, totalWeeks) {
    if (!item.name || item.name.length < 2 || !item.weekday) return;
    const weeksText = item.weeksText || ('1-' + (totalWeeks || 20) + '周');
    const a = item.sectionStart || 0;
    const b = item.sectionEnd || a;
    let startTime = item.startTime || '';
    let endTime = item.endTime || '';
    if ((!startTime || !endTime) && a) {
      const span = sectionSpan(a, b || a);
      startTime = startTime || span[0];
      endTime = endTime || span[1];
    }
    list.push({
      name: item.name,
      weekday: item.weekday,
      startTime,
      endTime,
      sectionStart: a || 0,
      sectionEnd: b || a || 0,
      weeksText,
      weeks: parseWeeks(weeksText, totalWeeks || 20),
      location: item.location || '',
      teacher: item.teacher || '',
      color: item.color || '',
    });
  }

  function parseLine(line, totalWeeks) {
    const day = line.match(/(?:周|星期)([一二三四五六日天])/) || line.match(/^([一二三四五六日天])\s/);
    if (!day) return null;
    const sec = line.match(/第?\s*(\d{1,2})\s*[-~～到至]\s*(\d{1,2})\s*节/)
      || line.match(/(\d{1,2})\s*[-~～]\s*(\d{1,2})\s*节/)
      || line.match(/第\s*(\d{1,2})\s*节/);
    const clock = line.match(/(\d{1,2}:\d{2})\s*[-~～到至]\s*(\d{1,2}:\d{2})/);
    if (!sec && !clock) return null;
    let startTime = '';
    let endTime = '';
    let sectionStart = 0;
    let sectionEnd = 0;
    if (sec) {
      sectionStart = +sec[1];
      sectionEnd = sec[2] ? +sec[2] : sectionStart;
      const span = sectionSpan(sectionStart, sectionEnd);
      startTime = span[0];
      endTime = span[1];
    } else {
      startTime = clock[1].length === 4 ? '0' + clock[1] : clock[1];
      endTime = clock[2].length === 4 ? '0' + clock[2] : clock[2];
      const secGuess = sectionsFromTimes(startTime, endTime);
      sectionStart = secGuess.sectionStart;
      sectionEnd = secGuess.sectionEnd;
    }
    const loc = extractLoc(line);
    const teacher = extractTeacher(line);
    const weeksText = extractWeeksText(line, totalWeeks);
    const name = cleanName(line, loc);
    if (!name) return null;
    return {
      name, weekday: WD[day[1]], startTime, endTime,
      sectionStart, sectionEnd, weeksText, location: loc, teacher,
    };
  }

  function parseBlocks(text, totalWeeks) {
    const src = String(text || '').replace(/\r/g, '\n');
    const courses = [];
    const dayChunks = src.split(/(?=(?:星期|周)[一二三四五六日天])/);
    dayChunks.forEach((chunk) => {
      const day = chunk.match(/(?:星期|周)([一二三四五六日天])/);
      if (!day) return;
      const wd = WD[day[1]];
      const bits = chunk.split(/\n+/).map((s) => s.trim()).filter(Boolean);
      let pendingSec = null;
      bits.forEach((bit) => {
        const sec = bit.match(/第?\s*(\d{1,2})\s*[-~～到至]\s*(\d{1,2})\s*节/) || bit.match(/^(\d{1,2})\s*[-~～]\s*(\d{1,2})$/);
        if (sec && bit.length < 12) {
          pendingSec = [+sec[1], +(sec[2] || sec[1])];
          return;
        }
        if (/^(?:\d{1,2}\s*[-~～到至]\s*\d{1,2}\s*(?:周)?(?:\([单双]\)|（[单双]）)?|单周|双周)$/.test(bit)) {
          if (courses.length) {
            const last = courses[courses.length - 1];
            if (last.weekday === wd) {
              last.weeksText = bit.replace(/\s+/g, '');
              last.weeks = parseWeeks(last.weeksText, totalWeeks || 20);
            }
          }
          return;
        }
        if (/^(?:星期|周)[一二三四五六日天]$/.test(bit) || (/^第?\d{1,2}/.test(bit) && bit.length < 6 && !/周/.test(bit))) return;
        if (/老师$/.test(bit) || (/^[\u4e00-\u9fff]{2,4}$/.test(bit) && !/(课|学|语|论|理|术|机|数|物|化|史|政|育|计|网|统|设计|实验|视觉|系统|数据)/.test(bit))) {
          if (courses.length) {
            const last = courses[courses.length - 1];
            if (last.weekday === wd && !last.teacher) last.teacher = bit.replace(/老师$/, '');
          }
          return;
        }
        const locOnly = extractLoc(bit);
        if (locOnly && bit.replace(/\s/g, '') === locOnly && courses.length) {
          const last = courses[courses.length - 1];
          if (last.weekday === wd && !last.location) last.location = locOnly;
          return;
        }
        const hasCourseHint = /[\u4e00-\u9fff]{2,}/.test(bit) && !/节次|时间|星期|教室|教师|周次/.test(bit);
        if (!hasCourseHint) return;
        const joined = bit + (pendingSec ? ' 第' + pendingSec[0] + '-' + pendingSec[1] + '节' : '');
        const line = '周' + day[1] + ' ' + joined;
        const one = parseLine(line, totalWeeks);
        if (one) {
          one.weekday = wd;
          pushCourse(courses, one, totalWeeks);
        } else if (pendingSec) {
          const span = sectionSpan(pendingSec[0], pendingSec[1]);
          const loc = extractLoc(bit);
          const name = cleanName(bit, loc);
          if (name) {
            pushCourse(courses, {
              name,
              weekday: wd,
              startTime: span[0],
              endTime: span[1],
              sectionStart: pendingSec[0],
              sectionEnd: pendingSec[1],
              weeksText: extractWeeksText(bit, totalWeeks),
              location: loc,
              teacher: extractTeacher(bit),
            }, totalWeeks);
          }
        }
      });
    });
    return courses;
  }

  function isMetaLine(bit) {
    const s = String(bit || '').trim();
    if (!s) return true;
    if (/^星期[一二三四五六日天]$/.test(s) || s === '节次' || s === '时间') return true;
    if (/^教师[:：]/.test(s) || /^老师[:：]/.test(s)) return true;
    if (/^(?:东|西|南|北|中)?校区/.test(s)) return true;
    if (/^教\s*[A-Za-z0-9\-－]/.test(s) || /^[A-Z]教/.test(s)) return true;
    if (/^\d{1,2}\s*[-~～到至,，、\d]*\s*(?:周)?\s*[\(（]?[单双]?[\)）]?$/.test(s)) return true;
    if (/^(?:单周|双周|全周)$/.test(s)) return true;
    return false;
  }

  function attachMeta(last, bit, totalWeeks) {
    if (!last) return;
    const loc = extractLoc(bit);
    if (loc && !last.location) last.location = loc;
    const t = extractTeacher(bit) || (bit.match(/教师[:：]\s*([^\s，,]+)/) || [])[1];
    if (t && !last.teacher) last.teacher = String(t).replace(/^[:：]/, '');
    if (/单|双|\d/.test(bit) && /周|\(单\)|\(双\)|（单）|（双）|单周|双周|^\d/.test(bit)) {
      const wt = extractWeeksText(bit, totalWeeks);
      const isDefault = !last.weeksText || /^1-\d+周$/.test(last.weeksText);
      if (isDefault || /单|双/.test(bit)) {
        last.weeksText = wt;
        last.weeks = parseWeeks(last.weeksText, totalWeeks || 20);
      }
    }
  }

  /**
   * 教务系统栅格导出：单元格内「课名★\n1-15(单)\n东校区 教8-517\n教师:田鹏志」
   * 并夹杂「星期一」「1-2」节次行。
   */
  function parseOfficialTable(text, totalWeeks) {
    const src = String(text || '').replace(/\r/g, '\n');
    const courses = [];
    const cols = src.split(/(?=(?:星期)[一二三四五六日天])/);
    cols.forEach((col) => {
      const day = col.match(/星期([一二三四五六日天])/);
      if (!day) return;
      const wd = WD[day[1]];
      const bits = col.split(/\n+/).map((s) => s.trim()).filter(Boolean);
      let pendingSec = null;
      bits.forEach((bit) => {
        if (/^星期[一二三四五六日天]$/.test(bit) || bit === '节次') return;
        const secOnly = bit.match(/^(\d{1,2})\s*[-~～到至]\s*(\d{1,2})$/);
        if (secOnly) {
          pendingSec = [+secOnly[1], +secOnly[2]];
          return;
        }
        if (isMetaLine(bit)) {
          if (courses.length) {
            const last = courses[courses.length - 1];
            if (last.weekday === wd) attachMeta(last, bit, totalWeeks);
          }
          return;
        }
        const locInline = extractLoc(bit);
        const name = cleanName(bit.replace(/[★●◇◆○]/g, ''), locInline);
        if (!name || name.length < 2 || !/[\u4e00-\u9fff]{2,}/.test(name) || /校区|教室/.test(name)) {
          if (courses.length) attachMeta(courses[courses.length - 1], bit, totalWeeks);
          return;
        }
        if (!pendingSec) return;
        const sec = pendingSec;
        const span = sectionSpan(sec[0], sec[1]);
        pushCourse(courses, {
          name,
          weekday: wd,
          startTime: span[0],
          endTime: span[1],
          sectionStart: sec[0],
          sectionEnd: sec[1],
          weeksText: extractWeeksText(bit, totalWeeks),
          location: locInline,
          teacher: extractTeacher(bit) || '',
        }, totalWeeks);
      });
    });
    return courses;
  }

  function parseText(text, totalWeeks) {
    const src = String(text || '');
    const courses = [];
    src.split(/\n+/).map((s) => s.trim()).filter(Boolean).forEach((line) => {
      const one = parseLine(line, totalWeeks);
      if (one) pushCourse(courses, one, totalWeeks);
    });
    if (courses.length < 2) {
      parseBlocks(src, totalWeeks).forEach((c) => pushCourse(courses, c, totalWeeks));
    }
    if (courses.length < 2) {
      parseOfficialTable(src, totalWeeks).forEach((c) => pushCourse(courses, c, totalWeeks));
    }
    const multi = src.match(/[\u4e00-\u9fffA-Za-z0-9]{2,20}(?:[^\n]{0,40}(?:周|星期)[一二三四五六日天][^\n]{0,30}){2,}/g) || [];
    multi.forEach((block) => {
      const nameHit = block.match(/^([\u4e00-\u9fffA-Za-z0-9（）()]{2,20})/);
      const name = nameHit ? cleanName(nameHit[1]) : '';
      const weeksText = extractWeeksText(block, totalWeeks);
      const loc = extractLoc(block);
      const re = /(?:周|星期)([一二三四五六日天])[^\n]{0,8}?第?\s*(\d{1,2})\s*[-~～到至]?\s*(\d{1,2})?\s*节/g;
      let m;
      while ((m = re.exec(block))) {
        const a = +m[2];
        const b = m[3] ? +m[3] : a;
        const span = sectionSpan(a, b);
        if (name) {
          pushCourse(courses, {
            name, weekday: WD[m[1]], startTime: span[0], endTime: span[1],
            sectionStart: a, sectionEnd: b, weeksText, location: loc,
          }, totalWeeks);
        }
      }
    });
    const seen = new Set();
    return courses.filter((c) => {
      const k = c.name + '|' + c.weekday + '|' + (c.sectionStart || c.startTime) + '|' + c.weeksText;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function summarize(courses) {
    return (courses || []).map((c) => {
      const sec = c.sectionStart
        ? ('第' + c.sectionStart + (c.sectionEnd && c.sectionEnd !== c.sectionStart ? '-' + c.sectionEnd : '') + '节')
        : ((c.startTime || '') + '-' + (c.endTime || ''));
      return '周' + WD_NAME[c.weekday - 1] + ' ' + sec + ' ' + c.name
        + (c.weeksText ? ' ' + c.weeksText : '') + (c.location ? ' @' + c.location : '');
    }).join('\n');
  }

  return {
    PERIOD, PERIOD_JIAOWU, PERIOD_LEGACY, PRESETS, WD_NAME,
    termOf, weekOf, weekday, parseWeeks, courseWeeks, occurs, onDate, onWeekday,
    parseText, parseBlocks, parseOfficialTable, defaultWeek1, mondayOf, iso,
    dateOfWeekDay, weekSpan, summarize, sectionSpan, sectionsFromTimes,
    setPeriodPreset, useTermPeriods, periodTable,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Timetable;
if (typeof window !== 'undefined') window.Timetable = Timetable;
