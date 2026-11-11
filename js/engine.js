/* 引擎：本地存储、学生数据、统计、预警、路径推荐、问答匹配 */
(function () {
  const DV = window.DV;
  const PFX = 'dvp3_', DATA_VER = 3;
  const S = DV.store = {
    get(k, def) { try { const v = localStorage.getItem(PFX + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) { console.warn('localStorage 写入失败', e); } },
    del(k) { try { localStorage.removeItem(PFX + k); } catch (e) {} }
  };

  /* ---------- 工具 ---------- */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  DV.util = { clamp, mean, mulberry32 };
  const pad = n => String(n).padStart(2, '0');
  DV.dateStr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  DV.today = () => DV.dateStr(new Date());
  DV.daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return DV.dateStr(d); };
  DV.uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  DV.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- 班级学生名册（来自 js/roster.js，成绩与总评原样使用） ---------- */
  // 个别学生的近期学习行为：连续未学习天数
  const BEHAVIOR = { '231123110462': { silent: 8 } };
  const CLASS_NAME = '2023级虚拟现实技术1班';
  DV.CLASS_NAME = CLASS_NAME;
  DV.DEFAULT_SID = '231123110004';

  function genStudents() {
    const r = mulberry32(20261111);
    const classBias = { c5: -9, c7: -7, c9: -7, c11: -4, c3: 3 };
    const arr = DV.ROSTER.map((row, i) => {
      const id = row[0], name = row[1], usual = row[2], final = row[3], total = row[4];
      const beh = BEHAVIOR[id] || {};
      const low = total < 76;
      // 总评越高，能力系数、掌握度与测验成绩越高
      const ability = clamp(0.55 + (total - 72) / 22 * 0.37 + (r() - 0.5) * 0.04, 0.5, 0.95);
      const chIds = DV.CHAPTERS.map(c => c.id);
      const me = id === DV.DEFAULT_SID;
      const weak = me ? ['c5', 'c9', 'c11'] : [chIds[Math.floor(r() * 11)], chIds[Math.floor(r() * 11)]];
      const strong = me ? ['c3', 'c4', 'c10'] : [chIds[Math.floor(r() * 11)]];
      const mastery = {};
      DV.KPS.forEach(k => {
        let m = ability * 100 + 3 + (r() - 0.5) * 22 - (k.difficulty - 1) * 7 + (classBias[k.ch] || 0);
        if (weak.includes(k.ch)) m -= 14; if (strong.includes(k.ch)) m += 9;
        
        mastery[k.id] = Math.round(clamp(m, 4, 98));
      });
      // 学习时长（最近 28 天，分钟）
      const study = {};
      const baseMin = 18 + ability * 80, silentDays = beh.silent || 0;
      const activeP = low ? 0.68 : 0.82;
      for (let d = 27; d >= 0; d--) {
        let m = r() < activeP ? baseMin * (0.4 + r() * 1.2) : 0;
        if (d < silentDays) m = 0;
        
        study[DV.daysAgo(d)] = Math.round(m);
      }
      // 测验成绩
      const quizzes = [];
      const titles = ['第1章 单元测验', '第2-3章 单元测验', '第4章 单元测验', '第5-6章 单元测验', '期中测验'];
      titles.forEach((t, j) => {
        let sc = total + (r() - 0.5) * 14 + (j - 2);
                if (beh.drop && j === 4) sc -= beh.drop;
        quizzes.push({ date: DV.daysAgo(40 - j * 8), title: t, score: Math.round(clamp(sc, 20, 100)), correct: 0, total: 10 });
      });
      quizzes.forEach(q => { q.correct = Math.round(q.score / 10); });
      const goals = ['exam', 'project', 'interest'];
      return { id, name, className: CLASS_NAME, usual, final, total, ability: +ability.toFixed(2), goal: me ? 'exam' : goals[Math.floor(r() * 3)], mastery, study, quizzes, pathDone: {} };
    });
    return arr;
  }

  function genQaLog(students) {
    const r = mulberry32(777);
    const kbs = DV.KB.filter(k => k.kp);
    const cm = {}; DV.KPS.forEach(k => cm[k.id] = mean(students.map(s => s.mastery[k.id])));
    const weights = kbs.map(k => Math.pow(100 - cm[k.kp], 2) + 200);
    const total = weights.reduce((a, b) => a + b, 0);
    const logs = [];
    for (let n = 0; n < 160; n++) {
      let x = r() * total, idx = 0; while (x > weights[idx]) { x -= weights[idx]; idx++; if (idx >= kbs.length - 1) break; }
      const kb = kbs[idx], st = students[Math.floor(r() * students.length)];
      const kws = kb.kw.filter(() => r() < 0.7); if (!kws.length) kws.push(kb.kw[0]);
      logs.push({ id: 'l' + n, sid: st.id, ts: Date.now() - Math.floor(r() * 20 * 86400000), text: kb.q, kb: kb.id, kp: kb.kp, kws, src: 'sim' });
    }
    return logs.sort((a, b) => a.ts - b.ts);
  }

  DV.init = function () {
    // 清理旧版本缓存，数据版本变化时自动重建
    try { Object.keys(localStorage).filter(k => /^dvp\d*_/.test(k) && !k.startsWith(PFX)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    if (S.get('ver') !== DATA_VER) { Object.keys(localStorage).filter(k => k.startsWith(PFX)).forEach(k => localStorage.removeItem(k)); S.set('ver', DATA_VER); }
    if (!S.get('students')) {
      const st = genStudents(); S.set('students', st); S.set('qalog', genQaLog(st));
    }
    if (!S.get('resources')) S.set('resources', DV.SEED_RESOURCES);
    if (!S.get('questions')) S.set('questions', DV.SEED_QUESTIONS);
    if (!S.get('session')) S.set('session', { role: 'student', sid: DV.DEFAULT_SID });
  };
  DV.resetAll = function () { Object.keys(localStorage).filter(k => k.startsWith(PFX)).forEach(k => localStorage.removeItem(k)); };
  DV.students = () => S.get('students', []);
  DV.saveStudents = a => S.set('students', a);
  DV.getStudent = id => DV.students().find(s => s.id === id);
  DV.saveStudent = st => { const a = DV.students(); const i = a.findIndex(s => s.id === st.id); if (i >= 0) a[i] = st; DV.saveStudents(a); };
  DV.resources = () => S.get('resources', []);
  DV.questions = () => S.get('questions', []);
  DV.qalog = () => S.get('qalog', []);
  DV.session = () => S.get('session', { role: 'student', sid: DV.DEFAULT_SID });

  /* ---------- 统计 ---------- */
  DV.overall = st => Math.round(mean(DV.KPS.map(k => st.mastery[k.id])));
  DV.chMastery = (st, ch) => Math.round(mean(DV.KPS.filter(k => k.ch === ch).map(k => st.mastery[k.id])));
  DV.classChMastery = (ss, ch) => Math.round(mean(ss.map(s => DV.chMastery(s, ch))));
  DV.classKpMastery = (ss, kp) => Math.round(mean(ss.map(s => s.mastery[kp])));
  DV.studyMinutes = (st, days, offset) => { let t = 0; for (let d = (offset || 0); d < days + (offset || 0); d++) t += st.study[DV.daysAgo(d)] || 0; return t; };
  DV.inactiveDays = st => { for (let d = 0; d < 28; d++) if ((st.study[DV.daysAgo(d)] || 0) > 0) return d; return 28; };
  DV.quizAvg = st => st.quizzes.length ? Math.round(mean(st.quizzes.map(q => q.score))) : 0;
  DV.weakKps = (st, n, below) => DV.KPS.map(k => ({ kp: k, m: st.mastery[k.id] })).filter(x => x.m < (below || 60)).sort((a, b) => a.m - b.m).slice(0, n || 99);
  DV.level = m => m >= 80 ? { t: '优秀', c: '#16a34a' } : m >= 65 ? { t: '良好', c: '#2563eb' } : m >= 50 ? { t: '一般', c: '#d97706' } : { t: '需关注', c: '#dc2626' };
  DV.masteryColor = m => m >= 80 ? '#16a34a' : m >= 60 ? '#65a30d' : m >= 40 ? '#f59e0b' : '#ef4444';

  DV.rank = function (st) {
    const ss = DV.students().slice().sort((a, b) => DV.overall(b) - DV.overall(a) || a.id.localeCompare(b.id));
    return { rank: ss.findIndex(x => x.id === st.id) + 1, n: ss.length };
  };
  // 预警规则：相对排名靠后 / 期末明显低于平时 / 长期未学习 / 近期学习不足 / 测验下滑 / 薄弱知识点集中
  DV.warn = function (st) {
    const reasons = []; let high = false, mid = 0;
    const ov = DV.overall(st), ia = DV.inactiveDays(st), wk = DV.studyMinutes(st, 7);
    const qs = st.quizzes.slice().sort((a, b) => a.date < b.date ? -1 : 1);
    const rk = DV.rank(st);
    if (rk.rank > rk.n - 3) { mid++; reasons.push('综合掌握度 ' + ov + '%，在班级 ' + rk.n + ' 人中排名第 ' + rk.rank + '（相对靠后）'); }
    if (st.usual - st.final >= 15) { mid++; reasons.push('期末成绩（' + st.final + '）明显低于平时成绩（' + st.usual + '），相差 ' + (st.usual - st.final) + ' 分'); }
    if (ia >= 7) { high = true; reasons.push('已连续 ' + (ia >= 28 ? '28+' : ia) + ' 天未学习'); }
    else if (wk < 60) { mid++; reasons.push('近 7 天学习时长仅 ' + wk + ' 分钟'); }
    if (qs.length >= 2) { const drop = qs[qs.length - 2].score - qs[qs.length - 1].score; if (drop >= 15) { mid++; reasons.push('最近一次测验成绩下滑 ' + drop + ' 分'); } }
    const low = DV.KPS.filter(k => st.mastery[k.id] < 40).length;
    if (low >= 8) { mid++; reasons.push(low + ' 个知识点掌握度低于 40%，薄弱点集中'); }
    return { level: (high || mid >= 2) ? 'high' : mid ? 'mid' : 'none', reasons };
  };

  /* ---------- 学习路径：前置依赖拓扑排序 + 薄弱点优先 ---------- */
  DV.genPath = function (st, goalKey, opt) {
    opt = opt || {};
    const goal = DV.GOALS[goalKey], key = goal.key, thr = goal.threshold;
    const scope = opt.chapters && opt.chapters.length ? new Set(opt.chapters) : null;
    const weekly = opt.weeklyHours || 6;
    const m = id => st.mastery[id];
    const set = new Map(); // kp -> {reasonType}
    DV.KPS.forEach(k => {
      if (scope && !scope.has(k.ch)) return;
      const w = k.w[key];
      if ((w >= 2 || (w >= 1 && m(k.id) < 50)) && m(k.id) < thr) set.set(k.id, { type: 'target' });
    });
    // 前置闭包：前置掌握度 < 60 则纳入
    let changed = true;
    while (changed) {
      changed = false;
      [...set.keys()].forEach(id => DV.KP_MAP[id].pre.forEach(p => { if (!set.has(p) && m(p) < 60) { set.set(p, { type: 'prereq', for: id }); changed = true; } }));
    }
    const ids = [...set.keys()];
    const indeg = {}, children = {};
    ids.forEach(id => { indeg[id] = 0; children[id] = []; });
    ids.forEach(id => DV.KP_MAP[id].pre.forEach(p => { if (set.has(p)) { indeg[id]++; children[p].push(id); } }));
    const unlock = id => { let c = 0; const seen = new Set(); (function dfs(x) { children[x].forEach(y => { if (!seen.has(y)) { seen.add(y); c++; dfs(y); } }); })(id); return c; };
    const prio = id => { const k = DV.KP_MAP[id]; return (100 - m(id)) * 0.55 + k.w[key] * 8 + Math.min(unlock(id), 5) * 4 - k.difficulty * 1.5 + (set.get(id).type === 'prereq' ? 6 : 0); };
    const avail = ids.filter(id => indeg[id] === 0), order = [];
    while (avail.length) {
      avail.sort((a, b) => prio(b) - prio(a));
      const id = avail.shift(); order.push(id);
      children[id].forEach(c => { if (--indeg[c] === 0) avail.push(c); });
    }
    // 排程
    let wk = 1, used = 0; const steps = [];
    const place = (hours) => { if (used > 0 && used + hours > weekly + 0.01) { wk++; used = 0; } used += hours; return wk; };
    order.forEach((id, i) => {
      const k = DV.KP_MAP[id], info = set.get(id), mv = m(id);
      const hours = Math.max(0.5, Math.round(k.hours * (1 - 0.6 * mv / 100) * 2) / 2);
      let reason;
      if (info.type === 'prereq') reason = '前置补强：是「' + DV.KP_MAP[info.for].name + '」的前置知识，当前掌握度 ' + mv + '%';
      else if (mv < 50) reason = '薄弱点优先：掌握度仅 ' + mv + '%，且' + tagText(k, key);
      else reason = '巩固提升：掌握度 ' + mv + '%，距目标 ' + thr + '% 还差 ' + (thr - mv) + '%，' + tagText(k, key);
      const phase = (info.type === 'prereq' || mv < 50) ? 1 : mv < 65 ? 2 : 3;
      steps.push({ kp: id, order: i + 1, phase, reason, hours, week: place(hours), mastery: mv, type: info.type, priority: Math.round(prio(id)) });
    });
    const extra = {
      exam: { title: '综合自测：自适应小测验', desc: '完成「学习状态评估」中的自适应小测验，检验复习成效并更新掌握度。', hours: 1 },
      project: { title: '综合实战项目：构建一个交互式数据看板', desc: '选定一个开放数据集，使用 ECharts/D3 完成多图联动看板，并撰写数据叙事说明。', hours: 6 },
      interest: { title: '拓展创作：复现一个经典可视化作品', desc: '挑选 Observable/ECharts 官方图库中的作品进行复现与改造，并分享心得。', hours: 4 }
    }[goalKey];
    if (steps.length || true) steps.push({ kp: null, order: steps.length + 1, phase: 3, virtual: true, title: extra.title, reason: extra.desc, hours: extra.hours, week: place(extra.hours), mastery: null, type: 'final' });
    const total = steps.reduce((a, s) => a + s.hours, 0);
    return { goal: goalKey, steps, weeks: wk, totalHours: Math.round(total * 2) / 2, targets: ids.length, weekly };
  };
  function tagText(k, key) { const w = k.w[key]; return key === 'exam' ? (w >= 3 ? '属于高频考点' : '属于常考内容') : key === 'proj' ? (w >= 3 ? '是项目中的核心技能' : '对项目实现有帮助') : (w >= 3 ? '属于进阶拓展主题' : '有助于拓宽视野'); }

  /* ---------- 测验 ---------- */
  DV.pickQuiz = function (st, mode, ch, n) {
    n = n || 5;
    let pool = DV.questions().filter(q => DV.KP_MAP[q.kp]);
    if (mode === 'chapter' && ch) pool = pool.filter(q => DV.KP_MAP[q.kp].ch === ch);
    const res = [];
    pool = pool.map(q => ({ q, w: mode === 'weak' || mode === 'chapter' ? (100 - st.mastery[q.kp]) / 100 + 0.15 : 1 }));
    while (res.length < n && pool.length) {
      const tot = pool.reduce((a, b) => a + b.w, 0); let x = Math.random() * tot, i = 0;
      while (i < pool.length - 1 && x > pool[i].w) { x -= pool[i].w; i++; }
      res.push(pool.splice(i, 1)[0].q);
    }
    return res;
  };
  DV.submitQuiz = function (st, qs, answers) {
    let correct = 0; const deltas = {};
    qs.forEach((q, i) => {
      const ok = answers[i] === q.answer; if (ok) correct++;
      const old = st.mastery[q.kp];
      const nv = ok ? old + (100 - old) * 0.22 : old - old * 0.1;
      st.mastery[q.kp] = Math.round(clamp(nv, 3, 99));
      deltas[q.kp] = (deltas[q.kp] || 0) + (st.mastery[q.kp] - old);
    });
    const score = Math.round(correct / qs.length * 100);
    st.quizzes.push({ date: DV.today(), title: '自适应小测验 #' + (st.quizzes.filter(x => x.title.startsWith('自适应')).length + 1), score, correct, total: qs.length });
    DV.saveStudent(st);
    return { score, correct, total: qs.length, deltas };
  };

  /* ---------- 问答匹配 ---------- */
  function norm(s) { return String(s).toLowerCase().replace(/[\s,.;:!?，。；：！？、"'“”‘’（）()\[\]【】\-_/]/g, ''); }
  function bigrams(s) { const g = new Set(); for (let i = 0; i < s.length - 1; i++) g.add(s.substr(i, 2)); if (s.length === 1) g.add(s); return g; }
  function dice(a, b) { if (!a.size || !b.size) return 0; let c = 0; a.forEach(x => { if (b.has(x)) c++; }); return 2 * c / (a.size + b.size); }
  DV.matchKB = function (text) {
    const q = norm(text); if (!q) return null;
    const qb = bigrams(q);
    const scored = DV.KB.map(e => {
      let s = 0;
      e.kw.forEach(k => { const nk = norm(k); if (nk && q.includes(nk)) s += 3 + nk.length * 0.4; });
      const kp = e.kp ? DV.KP_MAP[e.kp] : null;
      if (kp && q.includes(norm(kp.name))) s += 2;
      s += dice(qb, bigrams(norm(e.q + e.kw.join('')))) * 5 + dice(qb, bigrams(norm(e.q))) * 4;
      return { e, s };
    }).sort((a, b) => b.s - a.s);
    return { best: scored[0].s >= 3.2 ? scored[0] : null, top: scored.slice(0, 4) };
  };
  DV.logQuestion = function (sid, text, kbEntry) {
    const log = DV.qalog();
    log.push({ id: DV.uid('l'), sid, ts: Date.now(), text, kb: kbEntry ? kbEntry.id : null, kp: kbEntry ? kbEntry.kp : null, kws: kbEntry ? kbEntry.kw.slice(0, 3) : [], src: 'user' });
    S.set('qalog', log);
  };

  /* ---------- 大模型（OpenAI 兼容，可选） ---------- */
  DV.llmConfig = () => S.get('llm', { enabled: false, base: 'https://api.openai.com/v1', key: '', model: 'gpt-4o-mini' });
  DV.askLLM = async function (history, question, ctxEntries) {
    const c = DV.llmConfig();
    if (!c.enabled || !c.key) throw new Error('未配置');
    const ctx = ctxEntries.map(e => '【' + e.q + '】\n' + e.a).join('\n\n');
    const msgs = [{ role: 'system', content: '你是《数据可视化技术》课程的智能助教，请用简体中文回答，条理清晰，必要时给出 ECharts / D3 / Matplotlib 代码（用 Markdown 代码块）。可参考以下课程知识库内容：\n' + ctx }]
      .concat(history.slice(-6).map(h => ({ role: h.role, content: h.text }))).concat([{ role: 'user', content: question }]);
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 45000);
    try {
      const res = await fetch(c.base.replace(/\/+$/, '') + '/chat/completions', { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.key }, body: JSON.stringify({ model: c.model, messages: msgs, temperature: 0.4 }) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      return j.choices[0].message.content;
    } finally { clearTimeout(to); }
  };

  /* ---------- 教师：班级统计与教学建议 ---------- */
  DV.classStats = function () {
    const ss = DV.students();
    const ws = ss.map(s => ({ s, w: DV.warn(s) }));
    const active7 = ss.filter(s => DV.inactiveDays(s) < 7 && DV.studyMinutes(s, 7) >= 30).length;
    return {
      n: ss.length, avg: Math.round(mean(ss.map(DV.overall))), active: Math.round(active7 / ss.length * 100), activeN: active7,
      warnN: ws.filter(x => x.w.level !== 'none').length, highN: ws.filter(x => x.w.level === 'high').length,
      avgQuiz: Math.round(mean(ss.map(DV.quizAvg))), weekHours: +(mean(ss.map(s => DV.studyMinutes(s, 7))) / 60).toFixed(1), warns: ws
    };
  };
  DV.classAdvice = function () {
    const ss = DV.students();
    const kpStats = DV.KPS.map(k => ({ k, m: DV.classKpMastery(ss, k.id), low: ss.filter(s => s.mastery[k.id] < 50).length })).sort((a, b) => a.m - b.m);
    const weak = kpStats.slice(0, 6);
    const chStats = DV.CHAPTERS.map(c => ({ c, m: DV.classChMastery(ss, c.id) })).sort((a, b) => a.m - b.m);
    const cs = DV.classStats();
    const items = [];
    chStats.slice(0, 3).forEach(x => {
      const top = weak.filter(w => w.k.ch === x.c.id).map(w => w.k.name);
      items.push({ tag: '章节', title: '加强「' + x.c.name + '」的讲授', body: '班级该章节平均掌握度 ' + x.m + '%，为全班最薄弱模块之一。建议增加 1 次课内案例讲解' + (top.length ? '（重点：' + top.join('、') + '）' : '') + '，并布置配套实验与分层练习。' });
    });
    weak.slice(0, 3).forEach(w => {
      const res = DV.resources().filter(r => r.kp === w.k.id).length;
      items.push({ tag: '知识点', title: '针对「' + w.k.name + '」补充讲解', body: '全班平均掌握度 ' + w.m + '%，有 ' + w.low + ' 名学生低于 50%。' + (res < 3 ? '该知识点当前仅 ' + res + ' 条资源，建议补充案例/微课。' : '可结合已有 ' + res + ' 条资源布置课后任务。') + '前置知识：' + (w.k.pre.length ? w.k.pre.map(p => DV.KP_MAP[p].name).join('、') : '无') + '。' });
    });
    const qCount = {}; DV.questions().forEach(q => qCount[q.kp] = (qCount[q.kp] || 0) + 1);
    const noq = DV.KPS.filter(k => !qCount[k.id]).map(k => k.name);
    if (noq.length) items.push({ tag: '题库', title: '补充题库覆盖', body: '以下知识点暂无题目：' + noq.join('、') + '。建议在「资源与题库」中补充，以便学生小测验覆盖。' });
    if (cs.warnN) items.push({ tag: '预警', title: '对 ' + cs.warnN + ' 名预警学生开展一对一跟进', body: '其中高风险 ' + cs.highN + ' 名。建议 48 小时内沟通学习困难，推送个性化学习路径，并安排助教答疑。' });
    if (cs.active < 75) items.push({ tag: '活跃度', title: '提升班级活跃度', body: '近 7 日活跃率 ' + cs.active + '%。可设置周任务打卡、小组挑战，并在课堂上展示优秀作品激励。' });
    return { items, weak, chStats, cs };
  };
  DV.studentAdvice = function (st) {
    const out = [], ov = DV.overall(st), w = DV.warn(st);
    const weak = DV.weakKps(st, 3, 60);
    const chs = DV.CHAPTERS.map(c => ({ c, m: DV.chMastery(st, c.id) })).sort((a, b) => a.m - b.m);
    if (weak.length) out.push('优先补强：' + weak.map(x => '「' + x.kp.name + '」(' + x.m + '%)').join('、') + '，建议先复习其前置知识再做针对性练习。');
    out.push('最薄弱模块为「' + chs[0].c.name + '」(' + chs[0].m + '%)，最强模块为「' + chs[chs.length - 1].c.name + '」(' + chs[chs.length - 1].m + '%)。');
    const wk = DV.studyMinutes(st, 7);
    if (wk < 120) out.push('近 7 天学习 ' + wk + ' 分钟，偏少；建议每周至少安排 3 次、每次 40 分钟的学习。');
    else out.push('近 7 天学习 ' + wk + ' 分钟，保持良好的学习节奏。');
    if (w.level !== 'none') out.push('存在预警：' + w.reasons.join('；') + '。');
    else if (ov >= 80) out.push('整体表现优秀，可尝试「项目实战」或「兴趣拓展」路径。');
    return out;
  };
})();
