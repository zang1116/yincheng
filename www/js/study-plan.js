/**
 * 长周期学习计划：把「科目 + 课纲 + 时段规则」在本地展开成每天不重复的日程。
 * 避免模型一次吐出上百条 create_tasks（易同质化、也易被 max_tokens 截断）。
 */
const StudyPlan = (() => {
  const MAX_TASKS = 180;

  /** 内置课纲：覆盖约一学期每天 1 小时的穿插学习 */
  const CURRICULA = {
    agent: [
      '环境搭建与第一个 LLM 调用', 'API Key 与安全习惯', '对话消息角色与温度',
      'Prompt 设计：系统提示', 'Few-shot 与角色设定', '结构化输出 JSON Schema',
      '工具调用 Function Calling 入门', '写一个计算器工具 demo', '多工具路由与参数校验',
      '多轮对话与上下文窗口', '历史裁剪与摘要压缩', '会话状态机设计',
      'ReAct 推理循环', '规划-执行-观察闭环', '错误重试与兜底话术',
      '本地 Intent 与规则优先', '混合：规则 + LLM 兜底', '记忆：短期与长期',
      '向量检索 RAG 概念', '文档切片与召回评估', 'Agent 评测清单',
      '流式输出与打断', '并发工具调用', '权限与危险操作确认',
      '日志与可观测性', '成本控制：缓存与小模型', '用 DeepSeek/OpenAI 兼容接口',
      '浏览器端 Agent 架构', 'Capacitor/本地存储对接', '日程类 Agent 实战：增删改查',
      '课表类 Agent 实战', '多步任务拆解', '人机确认（HITL）',
      '提示注入与防护', '单元测试 Agent 动作', '端到端回归脚本',
      '做一个「学习助手」小项目', '项目：自动排复习计划', '项目：打卡催学',
      '对比不同模型的工具调用', '微调 vs Prompt 工程取舍', 'Agent 产品化清单',
      '复盘：常见失败模式', '综合练习：从需求到动作 JSON', '巩固：重写第一周 demo',
      '进阶：多 Agent 协作概念', '进阶：工作流编排', '进阶：评测集搭建',
      '实战：修补截断与续写', '实战：批量任务分片', '总复习与作品整理',
    ],
    math: [
      '函数、极限与连续', '函数的定义与常见性质', '初等函数与图像', '数列极限的定义',
      '数列极限的计算', '函数极限与左右极限', '无穷小与无穷大', '等价无穷小替换',
      '夹逼准则', '两个重要极限', '函数连续与间断点', '闭区间连续函数性质',
      '极限与连续巩固', '导数定义与可导性', '求导法则与复合函数求导', '反函数与参数方程求导',
      '高阶导数', '隐函数求导', '微分与线性近似', '微分中值定理',
      '洛必达法则', '泰勒公式', '单调性与极值', '凹凸性与拐点',
      '渐近线', '最值应用', '不等式证明', '一元微分综合复盘',
      '不定积分基本公式', '换元积分法', '分部积分法', '有理函数积分',
      '三角有理式积分', '定积分概念与性质', '牛顿-莱布尼茨公式', '定积分换元与分部积分',
      '变限积分', '定积分几何应用', '反常积分', '一元积分综合复盘',
      '多元函数基础', '偏导数', '全微分', '复合函数链式法则',
      '隐函数偏导', '多元函数极值', '条件极值与拉格朗日乘数法', '二重积分基本概念',
      '直角坐标下的二重积分', '极坐标下的二重积分', '二重积分换序', '多元积分综合复盘',
      '微分方程基本概念', '一阶可分离变量方程', '一阶线性微分方程', '齐次方程',
      '二阶常系数线性微分方程', '微分方程应用', '考研数学二综合小测', '错题归因',
      '重做高频题型', '极限与连续强化', '一元微分强化', '一元积分强化',
      '多元积分强化', '微分方程强化', '综合模拟一', '综合模拟二',
      '真题复盘', '薄弱模块回炉', '阶段总结',
    ],
    web: [
      'HTML 基础与页面骨架', '语义化标签与无障碍入门', '表单与输入控件',
      'CSS 盒模型与选择器', 'Flexbox 布局实战', 'Grid 基础布局',
      '响应式：媒体查询', '移动端适配与 rem/vw', '颜色、字体与设计变量',
      '过渡与简单动画', 'JavaScript 变量与类型', '函数、作用域与闭包',
      '数组与对象常用方法', 'DOM 查询与事件', '事件委托与表单校验',
      'Fetch 请求与 JSON', '本地存储 localStorage', '模块化 ES Module',
      '异步：Promise 与 async/await', '错误处理与调试', 'Vite 脚手架上手',
      '组件化思想（无框架）', 'React 入门：组件与 props', 'React：state 与列表',
      'React：表单受控组件', 'React Router 基础', 'CSS Modules / 实用样式组织',
      '调用后端 REST API', '鉴权 Token 概念', '前端工程：eslint 与格式化',
      '性能：懒加载与拆包概念', '可访问性检查清单', '做一个个人主页',
      '做一个待办清单 Web App', '对接日历 UI 组件', 'PWA / 离线缓存入门',
      'Capacitor 打包概念', '调试真机与 DevTools', '综合：复刻一个设置页',
      '巩固：重写布局练习', '进阶：状态管理取舍', '作品整理与部署静态站',
    ],
    dl: [
      '张量与 NumPy 基础', '形状、广播与索引', '线性代数直觉：矩阵乘法',
      '导数与梯度直觉', '自动求导 autograd', '手写线性回归',
      '损失函数与优化器', '梯度下降变体', '多层感知机 MLP',
      '激活函数与初始化', '反向传播直觉推演', '用 PyTorch 搭两层网络',
      '数据加载 Dataset/DataLoader', '过拟合与正则化', '训练/验证集划分',
      '分类任务：交叉熵', 'CNN 卷积直觉', '池化与特征图',
      '用 CNN 做小图分类', '迁移学习概念', 'RNN/序列入门',
      '注意力机制直觉', 'Transformer 鸟瞰', 'Tokenizer 与词嵌入',
      '微调小语言模型概念', '学习率与训练曲线判读', 'GPU/CPU 训练注意点',
      '保存与加载 checkpoint', '实验记录习惯', '复现：MNIST/小数据集',
      '项目：手写数字分类', '项目：简单文本分类', '对比不同优化器',
      '常见 bug：维度对不上', '可视化：损失与混淆矩阵', '阅读一篇入门论文摘要',
      '巩固：重写线性回归', '进阶：BatchNorm/Dropout', '作品：实验报告整理',
    ],
  };

  const ALIAS = {
    math: ['高等数学', '高数', '数学二', '数二', '考研数学'],
    agent: ['agent', 'Agent', '智能体', '代理人'],
    web: ['web', 'Web', '前端', '网页', 'html', 'HTML', 'css', 'CSS', 'javascript', 'JavaScript', 'JS'],
    dl: ['深度学习', 'deep learning', 'Deep Learning', '神经网络', '机器学习', 'pytorch', 'PyTorch', 'ML', 'DL'],
  };

  function clip(s, n) { return String(s || '').trim().slice(0, n || 80); }

  function validTime(v) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(v || '') ? v : ''; }

  function weekdayOf(dateStr) {
    const d = Util.parseDate(dateStr);
    if (!d) return 0;
    const n = d.getDay();
    return n === 0 ? 7 : n;
  }

  function curriculumKey(name) {
    const s = String(name || '');
    const keys = Object.keys(ALIAS);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (ALIAS[k].some((a) => s.indexOf(a) >= 0)) return k;
    }
    return '';
  }

  function topicsFor(subject) {
    const custom = Array.isArray(subject.topics) ? subject.topics.map((t) => clip(t, 60)).filter(Boolean) : [];
    if (custom.length) return custom;
    const key = curriculumKey(subject.name || subject.id || '');
    return key ? CURRICULA[key].slice() : [];
  }

  function displayName(subject) {
    const raw = clip(subject.name || subject.id, 20);
    if (raw) return raw;
    const key = curriculumKey(subject.name || subject.id || '');
    return ({ math: '考研高数', agent: 'Agent开发', web: 'Web开发', dl: '深度学习' })[key] || '学习';
  }

  function endFrom(start, hours) {
    if (!validTime(start)) return '';
    const h = parseInt(start.slice(0, 2), 10);
    const m = start.slice(3, 5);
    const add = hours && hours > 0 ? hours : 1;
    return Util.pad(Math.min(23, h + add)) + ':' + m;
  }

  /**
   * plan: {
   *   from, to, category?,
   *   slots: { "1": {time,endTime}, ... }  // ISO weekday 1-7
   *   subjects: [{ name, weekdays:[1,3,5], topics?:[] }]
   * }
   */
  function expand(plan) {
    if (!plan || !plan.from || !plan.to || !Array.isArray(plan.subjects) || !plan.subjects.length) {
      return { tasks: [], truncated: false, counts: {} };
    }
    const slots = plan.slots && typeof plan.slots === 'object' ? plan.slots : {};
    const defaultTime = validTime(plan.time) || '20:00';
    const defaultEnd = validTime(plan.endTime) || endFrom(defaultTime, 1);
    const excluded = new Set(Array.isArray(plan.excludeDates) ? plan.excludeDates : []);
    const durationMinutes = Math.max(15, Math.min(240, Number(plan.durationMinutes) || 60));
    const windowStart = validTime(plan.windowStart) || '18:00';
    const windowEnd = validTime(plan.windowEnd) || '22:00';
    const subjects = plan.subjects.map((s) => ({
      name: displayName(s),
      weekdays: (Array.isArray(s.weekdays) ? s.weekdays : []).map(Number).filter((n) => n >= 1 && n <= 7),
      topics: topicsFor(s),
      cursor: 0,
    })).filter((s) => s.weekdays.length);

    // 无 weekdays 时按 round-robin 分配全部日期
    const roundRobin = !subjects.length;
    let rrList = [];
    if (roundRobin) {
      rrList = plan.subjects.map((s) => ({
        name: displayName(s),
        topics: topicsFor(s),
        cursor: 0,
      }));
    }

    const tasks = [];
    const counts = {};
    let d = plan.from;
    let rr = 0;
    while (d && d <= plan.to && tasks.length < MAX_TASKS) {
      const wd = weekdayOf(d);
      if (excluded.has(d)) {
        d = Util.addDaysStr(d, 1);
        continue;
      }
      let sub = null;
      if (roundRobin) {
        if (Object.keys(slots).length && !slots[String(wd)] && !slots[wd]) {
          d = Util.addDaysStr(d, 1);
          continue;
        }
        sub = rrList[rr % rrList.length];
        rr += 1;
      } else {
        sub = subjects.find((s) => s.weekdays.indexOf(wd) >= 0) || null;
      }
      if (!sub) {
        d = Util.addDaysStr(d, 1);
        continue;
      }
      const slot = slots[String(wd)] || slots[wd] || {};
      let time = validTime(slot.time);
      let endTime = validTime(slot.endTime);
      if (!time && plan.windowStart) {
        const found = findOpenSlot(d, durationMinutes, windowStart, windowEnd, plan.busyByDate || {});
        if (!found) {
          d = Util.addDaysStr(d, 1);
          continue;
        }
        time = found.time;
        endTime = found.endTime;
      }
      if (!time) time = defaultTime;
      if (!endTime) endTime = defaultEnd;
      let topic = '';
      if (sub.topics.length) {
        if (sub.cursor < sub.topics.length) {
          topic = sub.topics[sub.cursor];
        } else {
          const base = sub.topics[sub.cursor % sub.topics.length];
          const lap = Math.floor(sub.cursor / sub.topics.length);
          topic = base + (lap ? '（巩固' + lap + '）' : '');
        }
        sub.cursor += 1;
      } else {
        sub.cursor += 1;
        topic = '第' + sub.cursor + '次练习';
      }
      const title = clip(sub.name + '：' + topic, 80);
      tasks.push({
        title,
        date: d,
        time,
        endTime,
        note: clip(topic, 200),
        location: '',
        category: plan.category || 'study',
      });
      counts[sub.name] = (counts[sub.name] || 0) + 1;
      d = Util.addDaysStr(d, 1);
    }
    const truncated = !!(d && d <= plan.to);
    return { tasks, truncated, counts, nextDate: truncated ? d : '' };
  }

  function minutesOf(value) {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || '');
    return m ? +m[1] * 60 + +m[2] : null;
  }

  function addMinutes(value, minutes) {
    const total = minutesOf(value);
    if (total == null) return '';
    const capped = Math.min(23 * 60 + 59, total + minutes);
    return Util.pad(Math.floor(capped / 60)) + ':' + Util.pad(capped % 60);
  }

  function findOpenSlot(date, duration, start, end, busyByDate) {
    const startMin = minutesOf(start);
    const endMin = minutesOf(end);
    if (startMin == null || endMin == null || endMin - startMin < duration) return null;
    const busy = (busyByDate[date] || []).map(([a, b]) => [minutesOf(a), minutesOf(b)])
      .filter(([a, b]) => a != null && b != null).sort((a, b) => a[0] - b[0]);
    for (let t = startMin; t + duration <= endMin; t += 30) {
      const clash = busy.some(([a, b]) => t < b && t + duration > a);
      if (!clash) return { time: addMinutes('00:00', t), endTime: addMinutes('00:00', t + duration) };
    }
    return null;
  }

  /** 从用户话里粗提取科目名 */
  function guessSubjects(text) {
    const raw = String(text || '');
    const found = [];
    const push = (key, name) => {
      if (found.some((f) => f.id === key)) return;
      found.push({ id: key, name });
    };
    if (/高等数学|高数|考研数学|数学二|数二|考研数二/i.test(raw)) push('math', '考研高数');
    if (/agent|智能体|代理人/i.test(raw)) push('agent', 'Agent开发');
    if (/web|前端|网页|html|css|javascript/i.test(raw)) push('web', 'Web开发');
    if (/深度\s*学习|神经网络|机器学习|pytorch|\bDL\b|\bML\b/i.test(raw)) push('dl', '深度学习');
    // 「三门」常见组合
    if (!found.length && /三门|三科|轮换|穿插/.test(raw) && /学/.test(raw)) {
      push('agent', 'Agent开发');
      push('web', 'Web开发');
      push('dl', '深度学习');
    }
    return found;
  }

  function defaultSlotsFromText(text) {
    const raw = String(text || '');
    const evening = raw.match(/(?:每天晚上|每天|晚上|每晚)\s*(\d{1,2})[:：点时](\d{1,2})?\s*(?:-|~|～|到|至)\s*(?:晚上)?\s*(\d{1,2})[:：点时](\d{1,2})?/);
    if (evening) {
      const a = Math.min(23, (+evening[1] < 12 ? +evening[1] + 12 : +evening[1]));
      const b = Math.min(23, (+evening[3] < 12 ? +evening[3] + 12 : +evening[3]));
      const slot = { time: Util.pad(a) + ':' + Util.pad(+(evening[2] || 0)), endTime: Util.pad(b) + ':' + Util.pad(+(evening[4] || 0)) };
      return { 1: slot, 2: slot, 3: slot, 4: slot, 5: slot, 6: slot, 7: slot };
    }
    // 用户对话里的默认时段约定
    if (/周一三五.*20|周一.*三.*五.*20|135.*20:00/.test(raw) || /周一三五/.test(raw)) {
      return {
        1: { time: '20:00', endTime: '21:00' },
        2: { time: '19:00', endTime: '20:00' },
        3: { time: '20:00', endTime: '21:00' },
        4: { time: '19:00', endTime: '20:00' },
        5: { time: '20:00', endTime: '21:00' },
        6: { time: '10:00', endTime: '11:00' },
        7: { time: '10:00', endTime: '11:00' },
      };
    }
    return {
      1: { time: '20:00', endTime: '21:00' },
      2: { time: '19:00', endTime: '20:00' },
      3: { time: '20:00', endTime: '21:00' },
      4: { time: '19:00', endTime: '20:00' },
      5: { time: '20:00', endTime: '21:00' },
      6: { time: '10:00', endTime: '11:00' },
      7: { time: '10:00', endTime: '11:00' },
    };
  }

  /** Agent/Web/DL 经典穿插：一三五 agent，二四 web，周末 dl */
  function classicRotation(subjects) {
    const map = { math: [1, 2, 3, 4, 5, 6, 7], agent: [1, 3, 5], web: [2, 4], dl: [6, 7] };
    return subjects.map((s) => ({
      name: s.name,
      id: s.id,
      weekdays: map[s.id] || [1, 2, 3, 4, 5],
      topics: topicsFor(s),
    }));
  }

  function buildClassicPlan(opts) {
    opts = opts || {};
    const subjects = (opts.subjects && opts.subjects.length)
      ? opts.subjects
      : [
        { id: 'agent', name: 'Agent开发' },
        { id: 'web', name: 'Web开发' },
        { id: 'dl', name: '深度学习' },
      ];
    return {
      from: opts.from,
      to: opts.to,
      category: 'study',
      slots: opts.slots || defaultSlotsFromText(opts.text || ''),
      excludeDates: opts.excludeDates || [],
      durationMinutes: opts.durationMinutes || 60,
      windowStart: opts.windowStart || '',
      windowEnd: opts.windowEnd || '',
      busyByDate: opts.busyByDate || {},
      subjects: classicRotation(subjects),
    };
  }

  return {
    MAX_TASKS,
    CURRICULA,
    expand,
    guessSubjects,
    defaultSlotsFromText,
    classicRotation,
    buildClassicPlan,
    curriculumKey,
    topicsFor,
    findOpenSlot,
  };
})();

if (typeof module !== 'undefined') module.exports = StudyPlan;
if (typeof window !== 'undefined') window.StudyPlan = StudyPlan;
