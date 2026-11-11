/* 学生端：知识导览 / 智能问答 / 学习路径 / 学习状态评估 / 资源中心 */
(function () {
  const DV = window.DV, U = DV.ui, esc = DV.esc, S = DV.store;
  DV.init();
  const sess = DV.session();
  const sid = sess.role === 'student' && DV.getStudent(sess.sid) ? sess.sid : DV.DEFAULT_SID;
  const me = () => DV.getStudent(sid);
  const $ = (s, el) => (el || document).querySelector(s);
  const goalName = g => DV.GOALS[g].name;

  /* 学习时长自动累计（页面可见时每分钟 +1 分钟） */
  setInterval(() => { if (document.hidden) return; const st = me(); const d = DV.today(); st.study[d] = (st.study[d] || 0) + 1; DV.saveStudent(st); }, 60000);
  window.addEventListener('storage', e => { if (e.key && e.key.startsWith('dvp3_') && /resources|questions/.test(e.key)) U.toast('教师更新了资源/题库，已同步'); });

  const pages = [
    { id: 'kg', title: '知识导览', icon: '🧭', sub: '《数据可视化技术》课程知识图谱 · 点击节点查看知识点详情', render: renderKG },
    { id: 'qa', title: '智能问答', icon: '💬', sub: '课程知识库助教 · 可选接入大模型', render: renderQA },
    { id: 'path', title: '学习路径推荐', icon: '🛤️', sub: '依据前置依赖拓扑排序 + 薄弱点优先生成', render: renderPath },
    { id: 'eval', title: '学习状态评估', icon: '📈', sub: '掌握度雷达 · 学习时长 · 测验成绩 · 诊断建议', render: renderEval },
    { id: 'res', title: '资源中心', icon: '📚', sub: '教师发布的课程资源（与教师端同步）', render: renderRes }
  ];
  const go = (p) => { location.hash = p; };
  const st0 = me();
  const shell = U.mountShell({ pages, roleLabel: '🎓 学生端', subtitle: '个性化学习平台', userName: st0.name, userSub: st0.id + ' · ' + DV.CLASS_NAME });

  /* =============== 知识导览 =============== */
  function renderKG(v) {
    const st = me();
    v.innerHTML =
      '<div class="hero"><div><h2>你好，' + esc(st.name) + ' 👋</h2><p>综合掌握度 <b>' + DV.overall(st) + '%</b> · 当前学习目标「' + goalName(st.goal) + '」。点击图谱节点查看知识点说明、前置知识、掌握度与资源。</p></div>' +
      '<div style="display:flex;gap:10px"><button class="btn" data-go="path">生成学习路径</button><button class="btn" data-go="eval">学习状态评估</button></div></div>' +
      '<div class="kg-wrap"><div class="card"><div class="toolbar"><div><h3>课程知识图谱</h3><div class="desc" style="margin:0">大圆=章节，小圆=知识点；虚线=所属章节，箭头=前置依赖；边框颜色=掌握度</div></div><div class="grow"></div>' +
      '<input id="kg-search" placeholder="搜索知识点…" style="width:160px"><div class="tabs" id="kg-mode" style="margin:0"></div></div>' +
      '<div class="chart tall" id="kg-chart"></div><div class="legend" id="kg-legend"></div></div>' +
      '<div class="card kg-detail" id="kg-detail"></div></div>';
    v.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
    let mode = 'chapter', chart;
    const nodeId = id => id;
    function build() {
      const nodes = [], links = [];
      DV.CHAPTERS.forEach((c, i) => nodes.push({ id: c.id, name: c.name, category: i, symbolSize: 46, kind: 'ch',
        itemStyle: { color: mode === 'chapter' ? c.color : DV.masteryColor(DV.chMastery(st, c.id)), borderColor: '#fff', borderWidth: 3, shadowBlur: 12, shadowColor: 'rgba(0,0,0,.25)' },
        label: { show: true, position: 'inside', formatter: c.short, color: '#fff', fontWeight: 700, fontSize: 12 } }));
      DV.KPS.forEach(k => {
        const m = st.mastery[k.id], c = DV.CH_MAP[k.ch];
        nodes.push({ id: k.id, name: k.name, category: DV.CHAPTERS.findIndex(x => x.id === k.ch), symbolSize: 13 + k.difficulty * 4, kind: 'kp',
          itemStyle: { color: mode === 'chapter' ? c.color : DV.masteryColor(m), borderColor: mode === 'chapter' ? DV.masteryColor(m) : '#fff', borderWidth: mode === 'chapter' ? 3 : 2 },
          label: { show: true, position: 'bottom', fontSize: 10.5, color: '#334155', distance: 3 } });
        links.push({ source: k.ch, target: k.id, lineStyle: { type: 'dashed', color: c.color, opacity: .45, width: 1 }, rel: 'belong', symbol: ['none', 'none'] });
        k.pre.forEach(p => links.push({ source: p, target: k.id, lineStyle: { color: '#64748b', opacity: .55, width: 1.4, curveness: .15 }, rel: 'pre', symbol: ['none', 'arrow'], symbolSize: 7 }));
      });
      return {
        tooltip: { formatter: p => { if (p.dataType !== 'node') return p.data.rel === 'pre' ? '前置：' + (DV.KP_MAP[p.data.source] || {}).name + ' → ' + DV.KP_MAP[p.data.target].name : ''; const d = p.data; return d.kind === 'ch' ? '<b>' + d.name + '</b><br/>章节平均掌握度 ' + DV.chMastery(st, d.id) + '%' : '<b>' + d.name + '</b><br/>掌握度 ' + st.mastery[d.id] + '% · 难度 ' + '★'.repeat(DV.KP_MAP[d.id].difficulty); } },
        series: [{ type: 'graph', layout: 'force', roam: true, draggable: true, data: nodes, links, categories: DV.CHAPTERS.map(c => ({ name: c.name })),
          force: { repulsion: 150, edgeLength: [28, 80], gravity: 0.1, friction: .15, layoutAnimation: true }, edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 7,
          emphasis: { focus: 'adjacency', lineStyle: { width: 3 }, scale: 1.25 }, lineStyle: { opacity: .6 }, labelLayout: { hideOverlap: true } }]
      };
    }
    function draw() { chart = U.chart('#kg-chart', build()); chart.on('click', p => { if (p.dataType === 'node') showDetail(p.data.id); }); }
    U.tabs($('#kg-mode'), [['chapter', '按章节着色'], ['mastery', '按掌握度着色']], mode, t => { mode = t; draw(); legend(); });
    function legend() {
      $('#kg-legend').innerHTML = mode === 'chapter' ? DV.CHAPTERS.map(c => '<span><i style="background:' + c.color + '"></i>' + c.name + '</span>').join('') + '<span>边框色=掌握度</span>' :
        [['≥80% 掌握', '#16a34a'], ['60–79% 良好', '#65a30d'], ['40–59% 待巩固', '#f59e0b'], ['<40% 薄弱', '#ef4444']].map(x => '<span><i style="background:' + x[1] + '"></i>' + x[0] + '</span>').join('');
    }
    $('#kg-search').addEventListener('keydown', e => {
      if (e.key !== 'Enter') return; const q = e.target.value.trim(); if (!q) return;
      const hit = DV.KPS.find(k => k.name.includes(q)) || DV.CHAPTERS.find(c => c.name.includes(q));
      if (!hit) return U.toast('未找到相关知识点'); showDetail(hit.id);
      const idx = chart.getOption().series[0].data.findIndex(n => n.id === hit.id); chart.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: idx });
      setTimeout(() => chart.dispatchAction({ type: 'downplay', seriesIndex: 0, dataIndex: idx }), 2500);
    });
    function showDetail(id) {
      const el = $('#kg-detail'); const kp = DV.KP_MAP[id];
      if (!kp) { // 章节
        const c = DV.CH_MAP[id], ks = DV.KPS.filter(k => k.ch === id), m = DV.chMastery(st, id);
        el.innerHTML = '<span class="pill info">章节</span><h2>' + c.name + '</h2><p style="color:var(--ink2)">' + c.desc + '</p>' +
          '<div class="mastery-ring mt">' + U.ringHtml(m) + '<div><b>章节平均掌握度</b><div style="color:var(--ink3);font-size:12.5px">共 ' + ks.length + ' 个知识点，预计 ' + ks.reduce((a, k) => a + k.hours, 0) + ' 学时</div></div></div>' +
          '<div class="sec-t">本章知识点</div>' + ks.map(k => '<div class="res-item" style="cursor:pointer" data-kp="' + k.id + '"><div class="t"><b>' + k.name + '</b>' + U.barHtml(st.mastery[k.id]) + '</div><span class="pill ' + (st.mastery[k.id] >= 60 ? 'ok' : 'warn') + '">' + st.mastery[k.id] + '%</span></div>').join('');
      } else {
        const m = st.mastery[id], succ = DV.KPS.filter(k => k.pre.includes(id)), res = DV.resources().filter(r => r.kp === id), c = DV.CH_MAP[kp.ch], lv = DV.level(m);
        el.innerHTML = '<span class="pill info" style="background:' + c.color + '22;color:' + c.color + '">' + c.name + '</span> <span class="pill gray">难度 ' + '★'.repeat(kp.difficulty) + '</span> <span class="pill gray">约 ' + kp.hours + ' 学时</span>' +
          '<h2>' + kp.name + '</h2><div class="mastery-ring">' + U.ringHtml(m) + '<div><b>我的掌握度：<span style="color:' + lv.c + '">' + lv.t + '</span></b><div style="color:var(--ink3);font-size:12.5px">' + (m < 60 ? '建议优先复习，并通过小测验检验' : m < 80 ? '继续巩固，距离精通还差一点' : '掌握良好，可尝试拓展') + '</div></div></div>' +
          '<div class="sec-t">知识点说明</div><p style="color:var(--ink2)">' + kp.desc + '</p><ul class="kp-list">' + kp.points.map(p => '<li>' + p + '</li>').join('') + '</ul>' +
          '<div class="sec-t">前置知识</div>' + (kp.pre.length ? kp.pre.map(p => '<span class="pre-chip" data-kp="' + p + '">' + DV.KP_MAP[p].name + ' <em style="color:' + DV.masteryColor(st.mastery[p]) + '">' + st.mastery[p] + '%</em></span>').join('') : '<span style="color:var(--ink3)">无（入门知识点）</span>') +
          (succ.length ? '<div class="sec-t">后续知识</div>' + succ.map(p => '<span class="pre-chip" data-kp="' + p.id + '">' + p.name + '</span>').join('') : '') +
          '<div class="sec-t">相关资源（' + res.length + '）</div>' + (res.map(r => resHtml(r)).join('') || '<div style="color:var(--ink3)">暂无资源</div>') +
          '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn primary sm" id="kd-ask">💬 问问助教</button><button class="btn sm" id="kd-quiz">📝 针对性测验</button></div>';
        const weakPre = kp.pre.filter(p => st.mastery[p] < 60);
        if (weakPre.length) el.insertAdjacentHTML('beforeend', '<div class="diag" style="margin-top:12px">⚠️ 前置知识「' + weakPre.map(p => DV.KP_MAP[p].name).join('、') + '」掌握度偏低，建议先补强。</div>');
        $('#kd-ask').onclick = () => { S.set('prefill', '请讲解一下「' + kp.name + '」'); go('qa'); };
        $('#kd-quiz').onclick = () => { S.set('quizKp', id); S.set('evalTab', 'quiz'); go('eval'); if (location.hash === '#eval') shell.refresh(); };
      }
      el.querySelectorAll('[data-kp]').forEach(b => b.onclick = () => showDetail(b.dataset.kp));
      el.scrollTop = 0;
    }
    const fk = S.get('focusKp'); S.del('focusKp');
    draw(); legend(); showDetail(fk || DV.weakKps(st, 1, 100)[0].kp.id);
  }
  function resHtml(r) {
    return '<div class="res-item"><span style="font-size:20px">' + U.resTypeIcon(r.type) + '</span><div class="t"><b>' + esc(r.title) + '</b><small>' + esc(r.type) + (r.url ? '' : ' · 站内资源') + '</small></div>' +
      (r.url ? '<a class="btn sm" target="_blank" rel="noopener" href="' + esc(r.url) + '">打开</a>' : '<span class="pill gray">站内</span>') + '</div>';
  }

  /* =============== 智能问答 =============== */
  function renderQA(v) {
    const key = 'chat_' + sid;
    let hist = S.get(key, []);
    const cfg = DV.llmConfig();
    v.innerHTML =
      '<div class="chat"><div class="card chat-main"><div class="chat-log" id="chat-log"></div>' +
      '<div class="chat-in"><textarea id="chat-ta" placeholder="输入你的问题，例如：力导向图的原理是什么？（Enter 发送，Shift+Enter 换行）"></textarea><button class="btn primary" id="chat-send">发送</button></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:14px;overflow:auto"><div class="card"><h3>💡 推荐问题</h3><div class="desc">点击即可提问</div><div id="sug"></div></div>' +
      '<div class="card"><h3>⚙️ 回答模式</h3><div class="desc" id="mode-desc"></div><button class="btn sm" id="llm-set">配置大模型 API</button> <button class="btn sm" id="chat-clear">清空对话</button></div></div></div>';
    const log = $('#chat-log'), ta = $('#chat-ta');
    const modeDesc = () => { const c = DV.llmConfig(); $('#mode-desc').innerHTML = c.enabled && c.key ? '当前：<b style="color:var(--ok)">大模型 + 本地知识库增强</b>（' + esc(c.model) + '）。失败时自动回退本地知识库。' : '当前：<b>本地知识库</b>（关键词/相似度匹配）。可选配置 OpenAI 兼容接口。'; };
    modeDesc();
    $('#sug').innerHTML = DV.SUGGEST_QS.map(q => '<button class="sug-q">' + esc(q) + '</button>').join('');
    $('#sug').onclick = e => { const b = e.target.closest('.sug-q'); if (b) ask(b.textContent); };
    function addMsg(m, persist) {
      const d = document.createElement('div'); d.className = 'msg ' + m.role;
      d.innerHTML = '<div class="av">' + (m.role === 'user' ? esc(me().name.slice(0, 1)) : '🤖') + '</div><div><div class="bubble">' + (m.role === 'user' ? esc(m.text).replace(/\n/g, '<br>') : U.md(m.text)) + '</div>' +
        (m.meta ? '<div class="meta">' + m.meta + '</div>' : '') + '</div>';
      log.appendChild(d); log.scrollTop = log.scrollHeight;
      d.querySelectorAll('[data-q]').forEach(b => b.onclick = () => ask(b.dataset.q));
      d.querySelectorAll('[data-kg]').forEach(b => b.onclick = () => go('kg'));
      return d;
    }
    function welcome() { addMsg({ role: 'bot', text: '你好，我是《数据可视化技术》课程助教 🤖\n\n我可以回答**概念原理**、**图表选择**、**ECharts / D3 / Matplotlib 代码**等问题。试试右侧的推荐问题，或直接输入你的问题。' }); }
    if (hist.length) hist.forEach(m => addMsg(m)); else welcome();
    if (hist.length) setTimeout(() => log.scrollTop = log.scrollHeight, 0);
    let busy = false;
    async function ask(text) {
      text = (text || '').trim(); if (!text || busy) return; busy = true; ta.value = '';
      const um = { role: 'user', text }; addMsg(um); hist.push(um);
      const r = DV.matchKB(text); const entry = r && r.best ? r.best.e : null;
      const wait = addMsg({ role: 'bot', text: '' }); wait.querySelector('.bubble').innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
      let bm; const c = DV.llmConfig();
      if (c.enabled && c.key) {
        try {
          const ctxE = (r ? r.top.slice(0, 3).filter(x => x.s > 1).map(x => x.e) : []);
          const ans = await DV.askLLM(hist.slice(0, -1), text, ctxE);
          bm = { role: 'bot', text: ans, meta: '<span class="pill info">大模型 · ' + esc(c.model) + '</span>' + (entry ? '<span class="pill gray">参考知识库：' + esc(entry.q) + '</span>' : '') };
        } catch (e) { bm = null; U.toast('大模型调用失败（' + e.message + '），已回退本地知识库', 3200); }
      } else await new Promise(r => setTimeout(r, 350));
      if (!bm) bm = localAnswer(text, r, entry);
      wait.remove(); addMsg(bm); hist.push(bm); S.set(key, hist.slice(-60)); DV.logQuestion(sid, text, entry); busy = false;
    }
    function localAnswer(text, r, entry) {
      if (/^(你好|您好|hi|hello|嗨)/i.test(text.trim())) return { role: 'bot', text: '你好！有什么关于数据可视化的问题都可以问我 😊', meta: '<span class="pill gray">本地知识库</span>' };
      if (/谢谢|感谢/.test(text)) return { role: 'bot', text: '不客气！继续加油 💪', meta: '<span class="pill gray">本地知识库</span>' };
      if (!entry) {
        const sug = r ? r.top.slice(0, 3).map(x => x.e) : [];
        return { role: 'bot', text: '抱歉，本地知识库暂时没有找到与该问题高度匹配的内容 🤔\n\n你可以：换个关键词（如“力导向”“配色”“ECharts”），或在右侧配置大模型 API 获得更开放的回答。',
          meta: '<span class="pill warn">未匹配</span>' + sug.map(e => '<button class="chip" data-q="' + esc(e.q) + '">' + esc(e.q) + '</button>').join('') };
      }
      const rel = r.top.filter(x => x.e.id !== entry.id).slice(0, 3);
      const kp = entry.kp ? DV.KP_MAP[entry.kp] : null;
      return { role: 'bot', text: entry.a, meta: '<span class="pill gray">本地知识库 · 匹配「' + esc(entry.q) + '」</span>' + (kp ? '<span class="pill info">知识点：' + esc(kp.name) + ' · 我的掌握度 ' + me().mastery[kp.id] + '%</span>' : '') +
        (rel.length ? '<div style="width:100%;margin-top:4px">相关问题：' + rel.map(x => '<button class="chip" style="margin:2px" data-q="' + esc(x.e.q) + '">' + esc(x.e.q) + '</button>').join('') + '</div>' : '') };
    }
    $('#chat-send').onclick = () => ask(ta.value);
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(ta.value); } });
    $('#chat-clear').onclick = () => { hist = []; S.del(key); log.innerHTML = ''; welcome(); };
    $('#llm-set').onclick = () => {
      const c = DV.llmConfig();
      U.modal({ title: '配置大模型 API（可选）', okText: '保存', body:
        '<p style="color:var(--ink3);font-size:12.5px">支持 OpenAI 兼容接口（/chat/completions）。API Key 仅保存在本机浏览器 localStorage，不会上传到任何服务器；未启用时使用本地知识库。若接口不允许浏览器跨域（CORS）访问，请使用支持 CORS 的网关。</p>' +
        '<label class="f">启用</label><select id="m-en"><option value="0">关闭（仅本地知识库）</option><option value="1" ' + (c.enabled ? 'selected' : '') + '>开启</option></select>' +
        '<label class="f">API Base URL</label><input id="m-base" value="' + esc(c.base) + '"><label class="f">API Key</label><input id="m-key" type="password" placeholder="sk-..." value="' + esc(c.key) + '"><label class="f">模型名称</label><input id="m-model" value="' + esc(c.model) + '">',
        onOk: m => { S.set('llm', { enabled: $('#m-en', m).value === '1', base: $('#m-base', m).value.trim(), key: $('#m-key', m).value.trim(), model: $('#m-model', m).value.trim() }); modeDesc(); U.toast('已保存'); } });
    };
    const pre = S.get('prefill'); if (pre) { S.del('prefill'); setTimeout(() => ask(pre), 200); }
  }

  /* =============== 学习路径 =============== */
  function renderPath(v) {
    const st = me();
    let goal = S.get('pathGoal_' + sid, st.goal), weekly = S.get('pathWeekly_' + sid, 6), scope = [], tab = 'timeline';
    v.innerHTML =
      '<div class="grid g-main"><div class="card"><div id="path-ctl"></div></div><div class="card" id="path-sum"></div></div>' +
      '<div class="card mt"><div class="toolbar"><div id="path-tabs"></div><div class="grow"></div><span style="color:var(--ink3);font-size:12.5px" id="path-prog"></span></div><div id="path-body"></div></div>';
    function ctl() {
      $('#path-ctl').innerHTML = '<h3>🎯 学习目标</h3><div class="desc">选择目标后，系统会按规则重新生成路径</div>' +
        '<div class="grid g3">' + Object.entries(DV.GOALS).map(([k, g]) => '<button class="card" data-g="' + k + '" style="text-align:left;cursor:pointer;border:2px solid ' + (goal === k ? 'var(--primary)' : 'var(--line)') + ';background:' + (goal === k ? 'var(--primary-soft)' : '#fff') + '"><div style="font-size:24px">' + g.icon + '</div><b>' + g.name + '</b><div style="font-size:12px;color:var(--ink3)">' + g.desc + '</div></button>').join('') + '</div>' +
        '<label class="f">每周可投入学习时间：<b id="wk-v">' + weekly + '</b> 小时</label><input type="range" id="wk" min="2" max="20" value="' + weekly + '" style="padding:0">' +
        '<label class="f">限定章节（可多选，不选则全部）</label><div class="chips" id="scope">' + DV.CHAPTERS.map(c => '<span class="chip ' + (scope.includes(c.id) ? 'on' : '') + '" data-c="' + c.id + '">' + c.short + '</span>').join('') + '</div>';
      $('#path-ctl').querySelectorAll('[data-g]').forEach(b => b.onclick = () => { goal = b.dataset.g; S.set('pathGoal_' + sid, goal); ctl(); draw(); });
      $('#wk').oninput = e => { weekly = +e.target.value; $('#wk-v').textContent = weekly; };
      $('#wk').onchange = () => { S.set('pathWeekly_' + sid, weekly); draw(); };
      $('#scope').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; const i = scope.indexOf(c.dataset.c); i >= 0 ? scope.splice(i, 1) : scope.push(c.dataset.c); ctl(); draw(); };
    }
    function draw() {
      const s2 = me(); const p = DV.genPath(s2, goal, { weeklyHours: weekly, chapters: scope });
      const doneKey = k => goal + ':' + k; const done = s2.pathDone || {};
      const real = p.steps.filter(x => !x.virtual), nDone = p.steps.filter(x => done[doneKey(x.kp || 'final')]).length;
      const weakN = real.filter(x => x.mastery < 50).length, preN = real.filter(x => x.type === 'prereq').length;
      $('#path-sum').innerHTML = '<h3>📋 路径概览</h3><div class="desc">目标：' + DV.GOALS[goal].icon + ' ' + goalName(goal) + '</div>' +
        '<div class="grid" style="grid-template-columns:1fr 1fr;gap:10px"><div><div class="kpi mini"><span class="lab">学习步骤</span><span class="val">' + p.steps.length + '<small>步</small></span></div></div><div><div class="kpi mini"><span class="lab">预计总时长</span><span class="val">' + p.totalHours + '<small>小时</small></span></div></div>' +
        '<div><div class="kpi mini"><span class="lab">预计周期</span><span class="val">' + p.weeks + '<small>周</small></span></div></div><div><div class="kpi mini"><span class="lab">薄弱点 / 前置补强</span><span class="val">' + weakN + '/' + preN + '</span></div></div></div>' +
        '<div class="sec-t">排序规则</div><div style="font-size:12.5px;color:var(--ink2)">① 筛选目标权重高且未达标（&lt;' + DV.GOALS[goal].threshold + '%）的知识点；② 补入掌握度&lt;60% 的前置知识；③ 按前置依赖做<b>拓扑排序</b>；④ 同层可选时按 <b>薄弱程度 + 目标权重 + 后继数量</b> 优先。</div>';
      $('#path-prog').textContent = '已完成 ' + nDone + ' / ' + p.steps.length;
      const body = $('#path-body');
      if (tab === 'timeline') {
        if (!real.length) { body.innerHTML = '<div class="empty">🎉 当前目标下你的知识点均已达标，已为你安排拓展任务。</div>'; }
        let html = '<div class="timeline">', wk = 0;
        p.steps.forEach(s => {
          if (s.week !== wk) { wk = s.week; html += '<div class="tl-week" style="margin-top:' + (wk > 1 ? 14 : 0) + 'px">第 ' + wk + ' 周</div>'; }
          const k = s.kp ? DV.KP_MAP[s.kp] : null, d = !!done[doneKey(s.kp || 'final')];
          const ph = ['', '夯实基础', '巩固提升', '拓展应用'][s.phase];
          html += '<div class="step ' + (d ? 'done' : '') + '"><div class="no">' + s.order + '</div><div class="body"><div class="st-name" ' + (k ? 'data-kp="' + k.id + '"' : '') + '>' + (k ? k.name : '🏁 ' + s.title) + '</div>' +
            '<div class="why">' + esc(s.reason) + '</div><div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">' + (k ? '<span class="pill ' + (s.mastery < 50 ? 'bad' : s.mastery < 70 ? 'warn' : 'ok') + '">掌握度 ' + s.mastery + '%</span><span class="pill gray">' + DV.CH_MAP[k.ch].short + '</span>' : '') +
            '<span class="pill info">' + ph + '</span><span class="pill gray">约 ' + s.hours + ' 小时</span>' + (s.type === 'prereq' ? '<span class="pill warn">前置补强</span>' : '') + '</div>' +
            (k ? '<div style="margin-top:6px;font-size:12px;color:var(--ink3)">资源：' + (DV.resources().filter(r => r.kp === k.id).slice(0, 3).map(r => U.resTypeIcon(r.type) + esc(r.title)).join(' · ') || '暂无') + '</div>' : '') + '</div>' +
            '<div class="acts"><button class="btn sm ' + (d ? '' : 'primary') + '" data-done="' + (s.kp || 'final') + '">' + (d ? '已完成 ✓' : '标记完成') + '</button></div></div>';
        });
        body.innerHTML = html + '</div>';
        body.querySelectorAll('[data-done]').forEach(b => b.onclick = () => { const x = me(); x.pathDone = x.pathDone || {}; const kk = doneKey(b.dataset.done); x.pathDone[kk] ? delete x.pathDone[kk] : x.pathDone[kk] = true; DV.saveStudent(x); draw(); });
        body.querySelectorAll('[data-kp]').forEach(b => b.onclick = () => { S.set('focusKp', b.dataset.kp); go('kg'); });
      } else {
        body.innerHTML = '<div class="desc">步骤图：从左到右为学习先后顺序，箭头表示前置依赖；节点颜色=当前掌握度，数字=推荐学习顺序</div><div class="chart tall" id="path-graph"></div>';
        const ids = real.map(x => x.kp), layer = {};
        const lay = id => { if (layer[id] != null) return layer[id]; const pres = DV.KP_MAP[id].pre.filter(x => ids.includes(x)); return layer[id] = pres.length ? 1 + Math.max(...pres.map(lay)) : 0; };
        ids.forEach(lay); const cnt = {}, maxL = Math.max(0, ...Object.values(layer));
        const colH = {}; ids.forEach(id => colH[layer[id]] = (colH[layer[id]] || 0) + 1);
        const maxCol = Math.max(1, ...Object.values(colH));
        const W = $('#path-graph').clientWidth, H = $('#path-graph').clientHeight, padX = 90, stepX = maxL ? (W - 2 * padX) / maxL : 0, stepY = Math.min(70, (H - 120) / Math.max(1, maxCol - 1 || 1));
        const nodes = real.map(s => { const l = layer[s.kp]; cnt[l] = (cnt[l] || 0) + 1; const n = colH[l];
          return { id: s.kp, name: s.order + '. ' + DV.KP_MAP[s.kp].name, x: maxL ? padX + l * stepX : W / 2, y: H / 2 + (cnt[l] - 1 - (n - 1) / 2) * stepY, symbolSize: 34, itemStyle: { color: DV.masteryColor(s.mastery), borderColor: '#fff', borderWidth: 2, shadowBlur: 8, shadowColor: 'rgba(0,0,0,.2)' },
            label: { show: true, position: 'bottom', fontSize: 11, color: '#334155' }, mastery: s.mastery, hours: s.hours }; });
        const links = []; real.forEach(s => DV.KP_MAP[s.kp].pre.forEach(p => { if (ids.includes(p)) links.push({ source: p, target: s.kp }); }));
        U.chart('#path-graph', { tooltip: { formatter: p => p.dataType === 'node' ? '<b>' + p.data.name + '</b><br/>掌握度 ' + p.data.mastery + '% · 约 ' + p.data.hours + ' 小时' : '' },
          series: [{ type: 'graph', layout: 'none', roam: true, data: nodes, links, edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 8, lineStyle: { color: '#94a3b8', width: 1.6, curveness: .2 }, emphasis: { focus: 'adjacency' } }] });
      }
    }
    U.tabs($('#path-tabs'), [['timeline', '📅 时间线'], ['graph', '🔀 步骤图']], tab, t => { tab = t; draw(); });
    ctl(); draw();
  }

  /* =============== 学习状态评估 =============== */
  function renderEval(v) {
    let tab = S.get('evalTab', 'overview'); S.del('evalTab');
    v.innerHTML = '<div id="ev-tabs"></div><div id="ev-body"></div>';
    U.tabs($('#ev-tabs'), [['overview', '📊 学习状态总览'], ['quiz', '📝 自适应小测验']], tab, t => { tab = t; draw(); });
    function draw() { tab === 'overview' ? overview($('#ev-body')) : quiz($('#ev-body')); }
    draw();
  }
  function overview(el) {
    const st = me(), ss = DV.students(), ov = DV.overall(st), lv = DV.level(ov), w7 = DV.studyMinutes(st, 7), w7p = DV.studyMinutes(st, 7, 7);
    const weak = DV.weakKps(st, 99, 60);
    el.innerHTML =
      '<div class="grid g4"><div class="card kpi"><span class="ki">🎯</span><span class="lab">综合掌握度</span><span class="val">' + ov + '<small>%</small></span><span class="note">状态：<b style="color:' + lv.c + '">' + lv.t + '</b> · 班级均值 ' + Math.round(DV.util.mean(ss.map(DV.overall))) + '%</span></div>' +
      '<div class="card kpi"><span class="ki">⏱️</span><span class="lab">近 7 天学习时长</span><span class="val">' + w7 + '<small>分钟</small></span><span class="note">较上周 ' + (w7 >= w7p ? '↑ ' : '↓ ') + Math.abs(w7 - w7p) + ' 分钟</span></div>' +
      '<div class="card kpi"><span class="ki">📝</span><span class="lab">测验平均分</span><span class="val">' + DV.quizAvg(st) + '<small>分</small></span><span class="note">共 ' + st.quizzes.length + ' 次测验 · 总评 ' + st.total + '</span></div>' +
      '<div class="card kpi"><span class="ki">⚠️</span><span class="lab">待巩固知识点</span><span class="val">' + weak.length + '<small>个</small></span><span class="note">掌握度低于 60%</span></div></div>' +
      '<div class="grid g2 mt"><div class="card"><h3>🕸️ 各模块掌握度雷达图</h3><div class="desc">与班级平均对比</div><div class="chart" id="ev-radar"></div></div>' +
      '<div class="card"><h3>📆 学习时长趋势（近 14 天）</h3><div class="desc">单位：分钟/天，虚线为班级日均</div><div class="chart" id="ev-trend"></div></div></div>' +
      '<div class="grid g2 mt"><div class="card"><h3>🏆 测验成绩</h3><div class="desc">虚线为及格线（60 分）</div><div class="chart sm" id="ev-quiz"></div></div>' +
      '<div class="card"><h3>🩺 诊断建议</h3><div class="desc">基于掌握度、学习行为与测验结果自动生成</div><div id="ev-diag"></div><div style="display:flex;gap:8px;margin-top:10px"><button class="btn primary sm" id="ev-path">生成学习路径</button><button class="btn sm" id="ev-q">去做小测验</button></div>' +
      '<div class="sec-t">最需关注的知识点</div><div id="ev-weak"></div></div></div>';
    $('#ev-diag').innerHTML = DV.studentAdvice(st).map(t => '<div class="diag">💡 <div>' + esc(t) + '</div></div>').join('');
    $('#ev-weak').innerHTML = weak.slice(0, 5).map(x => '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><span style="width:150px;font-size:13px">' + x.kp.name + '</span><div style="flex:1">' + U.barHtml(x.m) + '</div><b style="width:40px;text-align:right;font-size:13px">' + x.m + '%</b></div>').join('') || '<div style="color:var(--ok)">🎉 没有低于 60% 的知识点</div>';
    $('#ev-path').onclick = () => go('path'); $('#ev-q').onclick = () => { S.set('evalTab', 'quiz'); shell.refresh(); };
    U.chart('#ev-radar', {
      tooltip: {}, legend: { bottom: 0, data: ['我的掌握度', '班级平均'] },
      radar: { radius: '62%', center: ['50%', '47%'], indicator: DV.CHAPTERS.map(c => ({ name: c.short, max: 100 })), axisName: { color: '#475569' }, splitArea: { areaStyle: { color: ['#fff', '#f8fafc'] } } },
      series: [{ type: 'radar', data: [
        { name: '我的掌握度', value: DV.CHAPTERS.map(c => DV.chMastery(st, c.id)), areaStyle: { color: 'rgba(79,70,229,.25)' }, lineStyle: { width: 2.5 }, itemStyle: { color: '#4f46e5' } },
        { name: '班级平均', value: DV.CHAPTERS.map(c => DV.classChMastery(ss, c.id)), lineStyle: { type: 'dashed', width: 2 }, itemStyle: { color: '#06b6d4' } }] }]
    });
    const days = [...Array(14).keys()].reverse().map(i => DV.daysAgo(i));
    const clsAvg = days.map(d => Math.round(DV.util.mean(ss.map(s => s.study[d] || 0))));
    U.chart('#ev-trend', {
      tooltip: { trigger: 'axis' }, legend: { data: ['我的学习时长', '班级日均'], bottom: 0 }, grid: { left: 44, right: 16, top: 24, bottom: 56 },
      xAxis: { type: 'category', data: days.map(d => d.slice(5)), boundaryGap: false }, yAxis: { type: 'value', name: '分钟' },
      series: [{ name: '我的学习时长', type: 'line', smooth: true, data: days.map(d => st.study[d] || 0), areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(79,70,229,.4)' }, { offset: 1, color: 'rgba(79,70,229,.02)' }]) }, itemStyle: { color: '#4f46e5' }, lineStyle: { width: 3 } },
        { name: '班级日均', type: 'line', smooth: true, showSymbol: false, data: clsAvg, lineStyle: { type: 'dashed', color: '#06b6d4' }, itemStyle: { color: '#06b6d4' } }]
    });
    const qs = st.quizzes.slice().sort((a, b) => a.date < b.date ? -1 : 1).slice(-8);
    U.chart('#ev-quiz', {
      tooltip: { trigger: 'axis' }, grid: { left: 36, right: 16, top: 20, bottom: 56 }, xAxis: { type: 'category', data: qs.map(q => q.title.replace('单元测验', '').replace('自适应小测验', '小测')), axisLabel: { interval: 0, rotate: 25, fontSize: 11 } }, yAxis: { type: 'value', max: 100 },
      series: [{ type: 'bar', barWidth: '48%', data: qs.map(q => ({ value: q.score, itemStyle: { color: q.score >= 80 ? '#22c55e' : q.score >= 60 ? '#4f46e5' : '#ef4444', borderRadius: [6, 6, 0, 0] } })), label: { show: true, position: 'top' }, markLine: { silent: true, symbol: 'none', lineStyle: { color: '#f59e0b', type: 'dashed' }, data: [{ yAxis: 60 }], label: { show: false } } }]
    });
  }

  function quiz(el) {
    let mode = 'weak', ch = 'c1', n = 5, qs = [], ans = [], submitted = false;
    const preKp = S.get('quizKp'); S.del('quizKp');
    el.innerHTML = '<div class="card"><div id="qz-cfg"></div></div><div id="qz-body" class="mt"></div>';
    function cfg() {
      const total = DV.questions().length;
      $('#qz-cfg').innerHTML = '<h3>📝 自适应小测验</h3><div class="desc">题库来自教师端（当前共 ' + total + ' 题）。提交后会根据答题情况更新知识点掌握度，并影响学习路径推荐。</div>' +
        '<div class="grid g3"><div><label class="f">选题方式</label><select id="qz-mode"><option value="weak">智能推荐（薄弱点优先）</option><option value="chapter">按章节</option><option value="random">随机</option></select></div>' +
        '<div><label class="f">章节</label><select id="qz-ch" ' + (mode === 'chapter' ? '' : 'disabled') + '>' + DV.CHAPTERS.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('') + '</select></div>' +
        '<div><label class="f">题目数量</label><select id="qz-n">' + [3, 5, 8, 10].map(x => '<option>' + x + '</option>').join('') + '</select></div></div><div style="margin-top:14px"><button class="btn primary" id="qz-go">开始测验</button></div>';
      $('#qz-mode').value = mode; $('#qz-ch').value = ch; $('#qz-n').value = n;
      $('#qz-mode').onchange = e => { mode = e.target.value; $('#qz-ch').disabled = mode !== 'chapter'; };
      $('#qz-ch').onchange = e => ch = e.target.value; $('#qz-n').onchange = e => n = +e.target.value;
      $('#qz-go').onclick = start;
    }
    function start(kpOnly) {
      const st = me();
      if (typeof kpOnly === 'string') { qs = DV.questions().filter(q => q.kp === kpOnly).slice(0, n); if (!qs.length) qs = DV.pickQuiz(st, 'weak', null, n); }
      else qs = DV.pickQuiz(st, mode, ch, n);
      if (!qs.length) { $('#qz-body').innerHTML = '<div class="card empty">所选范围内暂无题目，请更换章节或联系教师补充题库。</div>'; return; }
      ans = qs.map(() => -1); submitted = false; drawQ();
    }
    function drawQ(res) {
      $('#qz-body').innerHTML = (res ? resultHtml(res) : '') + qs.map((q, i) => {
        const kp = DV.KP_MAP[q.kp];
        return '<div class="q-card"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="pill info">第 ' + (i + 1) + ' 题 · ' + (kp ? kp.name : '') + '</span>' + (submitted ? (ans[i] === q.answer ? '<span class="pill ok">回答正确</span>' : '<span class="pill bad">回答错误</span>') : '') + '</div><h4>' + esc(q.stem) + '</h4>' +
          q.options.map((o, j) => '<div class="opt ' + (submitted ? (j === q.answer ? 'right' : (ans[i] === j ? 'wrong' : '')) : (ans[i] === j ? 'sel' : '')) + '" data-i="' + i + '" data-j="' + j + '"><b>' + 'ABCD'[j] + '</b><span>' + esc(o) + '</span></div>').join('') +
          (submitted ? '<div class="diag" style="margin-top:8px">📖 解析：' + esc(q.explain || '暂无') + '</div>' : '') + '</div>';
      }).join('') + (submitted ? '' : '<div style="text-align:right"><button class="btn primary" id="qz-sub">提交答案</button></div>');
      if (!submitted) {
        $('#qz-body').querySelectorAll('.opt').forEach(o => o.onclick = () => { ans[+o.dataset.i] = +o.dataset.j; drawQ(); });
        $('#qz-sub').onclick = () => { if (ans.includes(-1) && !confirm('还有未作答的题目，确定提交吗？')) return; const st = me(); const res = DV.submitQuiz(st, qs, ans); submitted = true; drawQ(res); window.scrollTo(0, 0); };
      } else { $('#qz-again') && ($('#qz-again').onclick = () => { $('#qz-body').innerHTML = ''; cfg(); }); $('#qz-topath') && ($('#qz-topath').onclick = () => go('path')); $('#qz-toev') && ($('#qz-toev').onclick = () => { S.set('evalTab', 'overview'); shell.refresh(); }); }
    }
    function resultHtml(r) {
      const dl = Object.entries(r.deltas).map(([k, d]) => '<span class="pill ' + (d >= 0 ? 'ok' : 'bad') + '">' + DV.KP_MAP[k].name + ' ' + (d >= 0 ? '+' : '') + d + '%</span>').join(' ');
      return '<div class="card" style="border:2px solid var(--primary);margin-bottom:14px"><h3>🎉 测验完成：' + r.score + ' 分（' + r.correct + '/' + r.total + '）</h3><div class="desc">掌握度已更新，学习路径与评估图表将同步变化</div><div style="margin-bottom:10px">' + dl + '</div>' +
        '<button class="btn primary sm" id="qz-topath">查看更新后的学习路径</button> <button class="btn sm" id="qz-toev">查看学习状态</button> <button class="btn sm" id="qz-again">再来一组</button></div>';
    }
    cfg(); if (preKp) { mode = 'weak'; start(preKp); }
  }

  /* =============== 资源中心 =============== */
  function renderRes(v) {
    let ch = '', type = '', q = '';
    v.innerHTML = '<div class="card"><div class="toolbar"><select id="rf-ch" style="width:200px"><option value="">全部章节</option>' + DV.CHAPTERS.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('') + '</select>' +
      '<select id="rf-type" style="width:130px"><option value="">全部类型</option>' + ['课件', '视频', '阅读', '实验', '练习'].map(t => '<option>' + t + '</option>').join('') + '</select><input id="rf-q" placeholder="搜索资源…" style="width:200px"><div class="grow"></div><span id="rf-n" style="color:var(--ink3)"></span></div><div id="rf-list" class="grid g2"></div></div>';
    function draw() {
      const list = DV.resources().filter(r => (!ch || (DV.KP_MAP[r.kp] || {}).ch === ch) && (!type || r.type === type) && (!q || (r.title + r.desc).includes(q)));
      $('#rf-n').textContent = '共 ' + list.length + ' 条';
      $('#rf-list').innerHTML = list.slice(0, 80).map(r => { const k = DV.KP_MAP[r.kp]; return '<div>' + resHtml(r) + '<div style="font-size:11.5px;color:var(--ink3);margin:-2px 0 8px 12px">所属：' + (k ? DV.CH_MAP[k.ch].short + ' · ' + k.name : '未关联') + '</div></div>'; }).join('') || '<div class="empty">没有符合条件的资源</div>';
    }
    $('#rf-ch').onchange = e => { ch = e.target.value; draw(); }; $('#rf-type').onchange = e => { type = e.target.value; draw(); }; $('#rf-q').oninput = e => { q = e.target.value; draw(); };
    draw();
  }
})();
