const Llm = (() => {
  const PLAN_FORMAT = '输出一个 JSON 对象，不要 Markdown。格式：{"title":"","summary":"","phases":[{"name":"","span":"","points":[""]}],"tasks":[{"title":"","date":"YYYY-MM-DD 或空字符串","time":"HH:mm 或空字符串","note":""}] }。tasks 是可以放进日历的具体行动。用户没要求的主题不要加进去，也不要写课程或讲义。';
  const PARSE_FORMAT = '输出一个 JSON 对象，不要 Markdown。格式：{"summary":"","tasks":[{"title":"","date":"YYYY-MM-DD 或空字符串","time":"HH:mm 或空字符串","note":""}],"memos":[{"content":""}]}。用户没提到的日期留空，不要改成今天。一句话里的多件事拆开。明确是备忘、灵感、不想排期的放进 memos。';

  function endpoint(base) {
    let b = String(base || '').trim().replace(/\/+$/, '');
    b = b.replace(/\/chat\/completions$/i, '');
    if (!b) throw new Error('请填写接口地址');
    return b + '/chat/completions';
  }

  function todayLine() {
    const day = Util.localDate();
    return day + ' ' + Util.weekdayLabel(day);
  }

  function systemBase() {
    return '你是「引程」里的规划助手。今天是 ' + todayLine() + '。只做日程和规划，不要写课程、讲义或知识点讲解。日期用 YYYY-MM-DD，时间用 24 小时制 HH:mm，没有就用空字符串。';
  }

  function stripFence(text) {
    let t = String(text || '').trim();
    t = t.replace(/^```(?:json|JSON|js)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const fenced = t.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
    if (fenced) t = fenced[1].trim();
    return t;
  }

  function tryParseObject(slice) {
    try { return JSON.parse(slice); } catch (e) { /* continue */ }
    const fixed = String(slice)
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2018\u2019]/g, "'");
    try { return JSON.parse(fixed); } catch (e2) { return null; }
  }

  /** 从被截断的 agent JSON 里抢救完整的 task 对象 */
  function salvageAgentPayload(text) {
    const raw = String(text || '');
    const tasks = [];
    const re = /\{\s*"title"\s*:\s*"((?:\\.|[^"\\])*)"/g;
    let m;
    while ((m = re.exec(raw)) && tasks.length < 120) {
      const start = m.index;
      let depth = 0;
      let inStr = false;
      let esc = false;
      let end = -1;
      for (let i = start; i < raw.length; i++) {
        const ch = raw[i];
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
      const obj = tryParseObject(raw.slice(start, end + 1));
      if (obj && obj.title) {
        tasks.push({
          title: String(obj.title).slice(0, 80),
          date: String(obj.date || '').slice(0, 10),
          time: String(obj.time || '').slice(0, 5),
          endTime: String(obj.endTime || '').slice(0, 5),
          note: String(obj.note || '').slice(0, 200),
          location: String(obj.location || '').slice(0, 40),
          category: obj.category || 'study',
        });
      }
    }
    if (!tasks.length) return null;
    const replyHit = raw.match(/"reply"\s*:\s*"((?:\\.|[^"\\])*)"/);
    let reply = '先写入已生成的部分；若还没排完，直接说「继续」。';
    if (replyHit) {
      try { reply = JSON.parse('"' + replyHit[1] + '"'); } catch (e) { /* keep */ }
    }
    return {
      reply: String(reply).slice(0, 800),
      actions: [{ type: 'create_tasks', tasks }],
      truncated: true,
      need_continue: true,
    };
  }

  function closeOpenJson(slice) {
    let s = String(slice || '').trim();
    s = s.replace(/,\s*"[^"]*$/, '').replace(/,\s*$/, '');
    const stack = [];
    let inStr = false;
    let esc = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === '{' || ch === '[') stack.push(ch);
      else if (ch === '}' || ch === ']') stack.pop();
    }
    if (inStr) s += '"';
    while (stack.length) {
      const open = stack.pop();
      s += open === '{' ? '}' : ']';
    }
    return tryParseObject(s);
  }

  function extractJson(text, soft) {
    const raw = String(text || '');
    const cleaned = stripFence(raw);
    let parsed = tryParseObject(cleaned);
    let truncated = false;
    if (!parsed || typeof parsed !== 'object') {
      const start = cleaned.indexOf('{');
      if (start >= 0) {
        const end = cleaned.lastIndexOf('}');
        if (end > start) parsed = tryParseObject(cleaned.slice(start, end + 1));
        if (!parsed) {
          parsed = closeOpenJson(cleaned.slice(start));
          if (parsed) truncated = true;
        }
      }
    }
    if (!parsed || typeof parsed !== 'object') {
      const start = raw.indexOf('{');
      if (start >= 0) {
        const end = raw.lastIndexOf('}');
        if (end > start) parsed = tryParseObject(raw.slice(start, end + 1));
        if (!parsed) {
          parsed = closeOpenJson(raw.slice(start));
          if (parsed) truncated = true;
        }
      }
    }
    if ((!parsed || typeof parsed !== 'object') && soft) {
      const salvaged = salvageAgentPayload(raw);
      if (salvaged) return salvaged;
    }
    if (parsed && typeof parsed === 'object') {
      if (truncated) {
        parsed.truncated = true;
        parsed.need_continue = true;
      }
      return parsed;
    }
    if (soft) {
      const reply = cleaned.replace(/^["']|["']$/g, '').trim().slice(0, 800);
      return {
        reply: reply || '我收到了，但没能整理成可执行的安排。能再说具体一点吗？比如日期、时间或要办的事。',
        actions: [],
      };
    }
    throw new Error('模型没有返回可识别的结构');
  }

  async function requestContent(messages, maxTokens, temperature) {
    const s = Store.get().settings;
    if (!String(s.apiKey || '').trim()) {
      const err = new Error('先在「我的」里填写密钥');
      err.code = 'NO_KEY';
      throw err;
    }
    const body = {
      model: s.model || 'gpt-4o-mini',
      messages,
      temperature: temperature == null ? 0.3 : temperature,
      max_tokens: maxTokens || 1600,
    };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 90000);
    let res;
    try {
      res = await fetch(endpoint(s.baseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + s.apiKey.trim(),
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('请求超时，请检查网络或接口地址');
      throw new Error('连不上接口，请检查地址和网络');
    } finally {
      clearTimeout(timer);
    }
    const raw = await res.text();
    if (!res.ok) {
      let msg = '接口返回 ' + res.status;
      try {
        const j = JSON.parse(raw);
        msg = j.error?.message || j.message || msg;
      } catch (e) { /* 用状态码 */ }
      if (res.status === 401 || res.status === 403) msg = '密钥无效或没有权限';
      throw new Error(msg);
    }
    let data;
    try { data = JSON.parse(raw); } catch (e) { throw new Error('接口返回的不是 JSON'); }
    let content = data.choices?.[0]?.message?.content || '';
    if (Array.isArray(content)) content = content.map((p) => p.text || p.content || '').join('');
    const finish = data.choices?.[0]?.finish_reason || data.choices?.[0]?.finishReason || '';
    return {
      content: String(content || '').trim(),
      truncated: finish === 'length' || finish === 'max_tokens',
    };
  }

  async function chat(messages, maxTokens, opts) {
    const pack = await requestContent(messages, maxTokens, 0.3);
    if (!pack.content) throw new Error('模型没有返回内容');
    const parsed = extractJson(pack.content, !!(opts && opts.soft));
    if (pack.truncated) {
      parsed.truncated = true;
      parsed.need_continue = true;
    }
    return parsed;
  }

  function parseTasks(text) {
    return chat([
      { role: 'system', content: systemBase() + PARSE_FORMAT },
      { role: 'user', content: text },
    ], 1400);
  }

  function completePlan(user) {
    return chat([
      { role: 'system', content: systemBase() + PLAN_FORMAT },
      { role: 'user', content: user },
    ], 2600);
  }

  function makePlan(goal, days, intensity) {
    const density = { light: '每天大约 1 项', mid: '每天大约 2 项', heavy: '每天大约 3 项' }[intensity] || '每天大约 2 项';
    return completePlan('周期：从今天起 ' + days + ' 天。密度：' + density + '。日期必须落在这个周期里。\n目标：\n' + goal);
  }

  async function ping() {
    // 连接测试只验证接口可达与鉴权；不依赖模型是否严格输出 JSON
    await requestContent([
      { role: 'system', content: 'Reply with the single word ok' },
      { role: 'user', content: 'ping' },
    ], 32, 0);
    return { ok: true };
  }

  const AGENT_FORMAT = [
    '你是「引程」的规划 Agent，服务大学生的学习与生活日程，不是讲师。不要写讲义或知识点讲解长文。',
    '用户只用对话完成增删改查。任务/目标/备忘/课程带 id，改删必须用 id。',
    '只输出一个 JSON：{"reply":"短回复","actions":[]}。不要 Markdown，不要解释。',
    '不要为了确认而确认。能从上下文、课程表或合理默认值确定的，直接生成 actions；只有缺少会改变写入结果的关键字段时，才用一句简短问题追问，一次只问一个点。',
    '用户已经回答过的问题不要重复问。用户说「时间不固定，找空档」时，根据已有课程和日程选择空闲时段，不再追问固定时间。',
    '用户说「开始 / 写入日程 / 就按这个排 / 重新执行」时，表示确认执行上文方案，必须立即生成 actions，不要重复计划说明。',
    'reply 必须与实际 actions 一致：actions 为空时禁止声称已排好、已写入、已记下、已修改或已完成；只能说还缺什么或提出一个问题。',
    '大学生常见意图与动作：',
    '作业截止/DDL：create_tasks，标题写清科目，date+time 用截止时刻，note 可写「截止」。',
    '考试复习：拆成多天 create_tasks + 可选 set_goals；考试日单独一条。',
    '社团/面试/约饭/讲座/班会：create_tasks，category 用 life。',
    '自习/图书馆：create_tasks，可带 location 与 endTime。',
    '查今天/明天安排：把课表当日课 + 自己日程写进 reply，不必再造 actions。',
    '用户说办了/做完了某事：complete_tasks 勾掉对应日程，日历会显示完成标记。对不上就追问，不要乱勾。',
    '推迟/顺延：「今天的学习推到明天」→ shift_tasks：{"type":"shift_tasks","from":"YYYY-MM-DD","to":"YYYY-MM-DD","match":"学习","onlyOpen":true}。match 可空表示整天。',
    '清空某天：delete_tasks 加 "date"。条件删除：keep/exclude/category。课表不走 delete_tasks。',
    '提醒：set_settings remindLead（分钟）+ notify。',
    '打卡：checkin。备忘：create_memos。目标（四级/考研/奖学金）：set_goals。',
    '饮食：log_food；说不清分量就追问，不要瞎估。完成了：complete_tasks。',
    'create_tasks：{"type":"create_tasks","tasks":[{"title":"","date":"YYYY-MM-DD","time":"HH:mm","endTime":"","note":"","location":"","category":"study|life|work|other"}]}',
    'repeat：仅当「每天内容相同」时使用。{"type":"create_tasks","repeat":{"from":"","to":"","time":"","endTime":"","title":"","weekdays":[1,2,3,4,5],"category":"study","topics":["第1天主题","第2天主题"]}}。有 topics 时每天标题=title：topics[i]，禁止整天同一句。',
    '【长周期学习计划 / 每天内容不同 / 多科目穿插】禁止用 repeat 复制同一标题，禁止一次吐出几十上百条 create_tasks。',
    '必须用 create_study_plan（客户端会按课纲展开成每天不重复的日程）：',
    '{"type":"create_study_plan","from":"YYYY-MM-DD","to":"YYYY-MM-DD","slots":{"1":{"time":"20:00","endTime":"21:00"},"2":{"time":"19:00","endTime":"20:00"},"6":{"time":"10:00","endTime":"11:00"}},"subjects":[{"name":"Agent开发","weekdays":[1,3,5],"topics":["主题A","主题B"]},{"name":"Web开发","weekdays":[2,4],"topics":["…"]},{"name":"深度学习","weekdays":[6,7],"topics":["…"]}]}',
    'topics 每科尽量 20～50 条且互不重复；不够可省略，客户端有内置课纲补齐。slots 的键是星期 1=周一…7=周日。',
    '用户说「继续 / 没排上 / 接着排」：若上次 create_tasks 被截断，从断点日期接着 create_tasks（每天不同）；若是学习计划，优先再发完整 create_study_plan。',
    '单次 create_tasks.tasks 最多约 25 条；超长区间必须 create_study_plan 或分多轮，并在 reply 提示可说「继续」。',
    'update_tasks / delete_tasks / create_memos / delete_memos / set_goals / update_goals / delete_goals / design 同前。',
    'set_term：{"type":"set_term","week1":"YYYY-MM-DD","weeks":20,"title":"","periodPreset":"jiaowu|legacy"}。week1 必须是周一。',
    '课表独立：学期课禁止 create_tasks。必须用 set_courses / update_courses / delete_courses。',
    'set_courses：{"type":"set_courses","mode":"merge|replace","courses":[{"name":"高等数学","weekday":1,"sectionStart":1,"sectionEnd":2,"weeksText":"1-15(单)","location":"教A101","teacher":"张三","color":""}]}',
    '每门课必填：name、weekday(1-7)、sectionStart/sectionEnd（或 HH:mm 的 startTime/endTime）、weeksText。',
    'weeksText 示例：1-16周、1-15(单)、2-16(双)、3,5-16、第15周。单双周必须写进 weeksText。',
    'update_courses：{"type":"update_courses","items":[{"id":"…","sectionStart":5,"sectionEnd":6,"weeksText":"1-15(单)","location":"教8-517"}]} 也可用 name 匹配。',
    'delete_courses：{"type":"delete_courses","ids":["…"]} 或 {"name":"高数"}。',
    '调课/换教室/改单双周/改节次：update_courses。清空整表：set_courses mode=replace courses=[]。',
    '【看图/PDF】只提取明确可见课程，禁止猜改补；不清就追问；默认 merge；禁止把课写成 create_tasks。',
  ].join('\n');

  async function agent(extra) {
    extra = extra || {};
    const history = (Store.get().diy.chat || []).slice(-10).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
    if (history.length && history[history.length - 1].role === 'user') {
      const last = history[history.length - 1];
      let text = last.content;
      if (extra.pdfText) text = '【附件文字】\n' + String(extra.pdfText).slice(0, 8000) + '\n\n【用户说】\n' + text;
      if (extra.continueHint) text += '\n\n【系统续排】' + extra.continueHint;
      if (extra.repairHint) text += '\n\n【系统纠错】' + extra.repairHint;
      if (extra.images && extra.images.length) {
        last.content = [{ type: 'text', text }].concat(extra.images.map((url) => ({
          type: 'image_url',
          image_url: { url },
        })));
      } else {
        last.content = text;
      }
    }
    const pack = await requestContent([
      { role: 'system', content: systemBase() + '\n' + AGENT_FORMAT + '\n' + (extra.context || '') },
      ...history,
    ], extra.maxTokens || 4500, 0.3);
    if (!pack.content) throw new Error('模型没有返回内容');
    const parsed = extractJson(pack.content, true);
    if (pack.truncated) {
      parsed.truncated = true;
      parsed.need_continue = true;
    }
    if (!parsed.reply && (!parsed.actions || !parsed.actions.length)) {
      parsed.reply = '能再说具体一点吗？比如哪一天、几点、要办什么。';
      parsed.actions = parsed.actions || [];
    }
    return parsed;
  }

  async function plainChat(messages, maxTokens) {
    const pack = await requestContent(messages, maxTokens || 500, 0.85);
    if (!pack.content) throw new Error('模型没有返回内容');
    return pack.content.slice(0, 1200);
  }

  function buddyTalk(name, history, context) {
    const sys = [
      '你是「' + name + '」，引程 App 里的陪伴精灵。用口语和用户分享日常，像微信聊天一样短、暖、有点俏皮。',
      '今天是 ' + todayLine() + '。可以关心学习与生活，但不要写讲义，也不要擅自改日程。',
      '每次回复 1～4 句，不要列表堆砌。可偶尔用语气词。',
      name === '奶蛙' && window.Stickers ? Stickers.PROMPT.naiwa : '',
      context ? ('近况：' + context) : '',
    ].filter(Boolean).join('\n');
    const msgs = [{ role: 'system', content: sys }].concat(
      (history || []).slice(-12).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '').slice(0, 600),
      }))
    );
    return plainChat(msgs, 420);
  }

  function fishTalk(history, context) {
    const flavor = (Store.get().settings && Store.get().settings.fishFlavor) || 'qunyou';
    const sys = (window.FishPersona
      ? FishPersona.systemPrompt(flavor, context)
      : [
        '你是「大肥鱼」，DeepSeek 社区梗二创鲸鱼娘。傲娇嘴硬、短句口语。',
        '今天是 ' + todayLine() + '。不要 JSON，不要改日程。',
        context || '',
      ].filter(Boolean).join('\n'));
    const msgs = [{ role: 'system', content: sys }].concat(
      (history || []).slice(-40).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '').slice(0, 600),
      }))
    );
    return plainChat(msgs, 360);
  }

  /** 对照目标与相关日程，输出严厉督学批评 */
  async function goalRoast(pack) {
    const sys = [
      '你是「引程」里的目标督学，不是温柔鸡汤机。今天是 ' + todayLine() + '。',
      '根据用户长线目标与相关日程完成情况，写一段严厉批评或痛骂：可讽刺、挖苦、恨铁不成钢，但禁止人身侮辱、歧视、脏话谩骂家人或外貌。',
      '必须点名具体目标标题，并点出未完成/拖延/空谈的日程；若完成尚可，也要刻薄地指出松懈之处，禁止空洞鼓励。',
      '只输出一个 JSON 对象，不要 Markdown：',
      '{"roast":"80到220字中文批评","goals":[{"id":"目标id","progress":"不超过40字的进展判定","verdict":"slacking|dragging|ok|good"}]}',
      'goals 数组要覆盖传入的每一个目标 id。',
    ].join('\n');
    const res = await requestContent([
      { role: 'system', content: sys },
      { role: 'user', content: String(pack || '').slice(0, 4500) },
    ], 900, 0.78);
    const parsed = extractJson(res.content, true);
    if (!parsed.roast && parsed.reply) parsed.roast = parsed.reply;
    parsed.roast = String(parsed.roast || parsed.reply || '').trim().slice(0, 600);
    parsed.goals = Array.isArray(parsed.goals) ? parsed.goals.slice(0, 12) : [];
    return parsed;
  }

  return {
    parseTasks, makePlan, completePlan, ping, agent, buddyTalk, fishTalk, goalRoast,
    // 测试/调试
    _extractJson: extractJson,
    _salvageAgentPayload: salvageAgentPayload,
  };
})();
