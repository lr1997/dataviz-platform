/* 教师端：班级看板 / 学情分析 / 学生画像与预警 / 资源与题库 / 教学建议 */
(function () {
  const DV = window.DV, U = DV.ui, esc = DV.esc, S = DV.store;
  DV.init();
  const $ = (s, el) => (el || document).querySelector(s);
  const SAMPLE = '';
  const pages = [
    { id: 'dash', title: '班级总览看板', icon: '🏠', sub: DV.CLASS_NAME, render: renderDash },
    { id: 'analysis', title: '学情分析', icon: '🔬', sub: '知识点掌握热力图 · 成绩分布 · 常问问题', render: renderAnalysis },
    { id: 'students', title: '学生画像与预警', icon: '👥', sub: '个体画像、学习预警与干预建议', render: renderStudents },
    { id: 'manage', title: '资源与题库管理', icon: '🗂️', sub: '增删改后学生端同步可见', render: renderManage },
    { id: 'advice', title: '教学建议生成', icon: '🧠', sub: '基于班级学情的教学改进与分层路径建议', render: renderAdvice }
  ];
  const go = p => { location.hash = p; };
  const mean = DV.util.mean;
  const warnPill = w => w.level === 'high' ? '<span class="pill bad">高风险</span>' : w.level === 'mid' ? '<span class="pill warn">需关注</span>' : '<span class="pill ok">正常</span>';

  /* ============ 看板 ============ */
  function renderDash(v) {
    const cs = DV.classStats(), ss = DV.students();
    v.innerHTML =
      '<div class="toolbar"><span style="color:var(--ink2)">班级：' + esc(DV.CLASS_NAME) + '</span><span style="color:var(--ink3);font-size:12.5px">共 ' + cs.n + ' 名学生 · 数据实时汇总自学生端学习行为</span></div>' +
      '<div class="grid g4"><div class="card kpi"><span class="ki">👥</span><span class="lab">班级人数</span><span class="val">' + cs.n + '<small>人</small></span><span class="note">本周人均学习 ' + cs.weekHours + ' 小时</span></div>' +
      '<div class="card kpi"><span class="ki">🎯</span><span class="lab">平均掌握度</span><span class="val">' + cs.avg + '<small>%</small></span><span class="note">测验平均分 ' + cs.avgQuiz + '</span></div>' +
      '<div class="card kpi"><span class="ki">🔥</span><span class="lab">7 日活跃率</span><span class="val">' + cs.active + '<small>%</small></span><span class="note">' + cs.activeN + ' / ' + cs.n + ' 人活跃</span></div>' +
      '<div class="card kpi"><span class="ki">🚨</span><span class="lab">预警人数</span><span class="val" style="color:var(--bad)">' + cs.warnN + '<small>人</small></span><span class="note">其中高风险 ' + cs.highN + ' 人</span></div></div>' +
      '<div class="grid g-main mt"><div class="card"><h3>各章节平均掌握度</h3><div class="desc">虚线为班级均值（' + cs.avg + '%）；橙色为相对薄弱模块</div><div class="chart" id="d-ch"></div></div>' +
      '<div class="card"><h3>学习状态分层</h3><div class="desc">按综合掌握度划分</div><div class="chart" id="d-pie"></div></div></div>' +
      '<div class="grid g-main mt"><div class="card"><h3>近 14 天班级活跃趋势</h3><div class="desc">柱：当日学习人数；线：人均学习时长（分钟）</div><div class="chart" id="d-trend"></div></div>' +
      '<div class="card"><h3>🚨 学习预警（前 6）</h3><div class="desc">点击查看学生详情</div><div id="d-warn"></div><div style="margin-top:8px"><button class="btn sm" data-go="students">查看全部预警 →</button></div></div></div>';
    v.querySelector('[data-go]').onclick = () => go('students');
    const chm = DV.CHAPTERS.map(c => ({ c, m: DV.classChMastery(ss, c.id) }));
    U.chart('#d-ch', { tooltip: { trigger: 'axis' }, grid: { left: 40, right: 16, top: 20, bottom: 70 }, xAxis: { type: 'category', data: chm.map(x => x.c.name), axisLabel: { interval: 0, rotate: 30, fontSize: 11 } }, yAxis: { type: 'value', max: 100 },
      series: [{ type: 'bar', barWidth: '55%', data: chm.map(x => ({ value: x.m, itemStyle: { color: DV.masteryColor(x.m), borderRadius: [6, 6, 0, 0] } })), label: { show: true, position: 'top', formatter: '{c}%' }, markLine: { silent: true, symbol: 'none', data: [{ yAxis: cs.avg, name: '平均' }], lineStyle: { type: 'dashed', color: '#6366f1' }, label: { show: false } } }] });
    const lv = [0, 0, 0, 0]; ss.forEach(s => { const o = DV.overall(s); lv[o >= 80 ? 0 : o >= 65 ? 1 : o >= 50 ? 2 : 3]++; });
    U.chart('#d-pie', { tooltip: { trigger: 'item', formatter: '{b}：{c} 人（{d}%）' }, legend: { bottom: 0 }, series: [{ type: 'pie', radius: ['48%', '72%'], center: ['50%', '45%'], itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 6 }, label: { position: 'inside', formatter: p => p.value ? p.value + '人' : '', color: '#fff', fontWeight: 700 },
      data: [{ name: '优秀 ≥80', value: lv[0], itemStyle: { color: '#16a34a' } }, { name: '良好 65-79', value: lv[1], itemStyle: { color: '#2563eb' } }, { name: '一般 50-64', value: lv[2], itemStyle: { color: '#d97706' } }, { name: '需关注 <50', value: lv[3], itemStyle: { color: '#dc2626' } }] }] });
    const days = [...Array(14).keys()].reverse().map(i => DV.daysAgo(i));
    U.chart('#d-trend', { tooltip: { trigger: 'axis' }, legend: { data: ['学习人数', '人均时长'], bottom: 0 }, grid: { left: 40, right: 44, top: 24, bottom: 40 }, xAxis: { type: 'category', data: days.map(d => d.slice(5)) },
      yAxis: [{ type: 'value', name: '人数', max: ss.length }, { type: 'value', name: '分钟', splitLine: { show: false } }],
      series: [{ name: '学习人数', type: 'bar', barWidth: '50%', data: days.map(d => ss.filter(s => (s.study[d] || 0) > 0).length), itemStyle: { color: '#99f6e4', borderRadius: [4, 4, 0, 0] } },
        { name: '人均时长', type: 'line', yAxisIndex: 1, smooth: true, data: days.map(d => Math.round(mean(ss.map(s => s.study[d] || 0)))), itemStyle: { color: '#6366f1' }, lineWidth: 3, lineStyle: { width: 3 } }] });
    const ws = cs.warns.filter(x => x.w.level !== 'none').sort((a, b) => (a.w.level === 'high' ? 0 : 1) - (b.w.level === 'high' ? 0 : 1) || DV.overall(a.s) - DV.overall(b.s)).slice(0, 6);
    $('#d-warn').innerHTML = ws.map(x => '<div class="warn-row" style="cursor:pointer" data-s="' + x.s.id + '"><div class="avatar" style="width:32px;height:32px;font-size:13px">' + esc(x.s.name[0]) + '</div><div style="flex:1;min-width:0"><b>' + esc(x.s.name) + '</b> ' + warnPill(x.w) + '<div style="font-size:12px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(x.w.reasons.join('；')) + '</div></div><b style="color:' + DV.masteryColor(DV.overall(x.s)) + '">' + DV.overall(x.s) + '%</b></div>').join('') || '<div class="empty">暂无预警 🎉</div>';
    $('#d-warn').onclick = e => { const r = e.target.closest('[data-s]'); if (r) openStudent(r.dataset.s); };
  }

  /* ============ 学情分析 ============ */
  function renderAnalysis(v) {
    const ss = DV.students();
    v.innerHTML =
      '<div class="card"><div class="toolbar"><div><h3>知识点掌握热力图 ' + SAMPLE + '</h3><div class="desc" style="margin:0">纵轴：学生（按综合掌握度排序）；横轴：知识点；点击单元格查看学生详情</div></div><div class="grow"></div><div id="hm-tabs"></div></div><div class="chart" id="a-hm"></div></div>' +
      '<div class="grid g2 mt"><div class="card"><h3>成绩分布（总评成绩）</h3><div class="desc">各分数段人数</div><div class="chart sm" id="a-dist"></div></div><div class="card"><h3>历次测验班级平均分</h3><div class="desc">测验成绩走势</div><div class="chart sm" id="a-qline"></div></div></div>' +
      '<div class="grid g2 mt"><div class="card"><h3>常问问题排行（问答记录）</h3><div class="desc">统计自学生端智能问答（共 ' + DV.qalog().length + ' 条）</div><div class="chart" id="a-faq"></div></div><div class="card"><h3>提问关键词词云</h3><div class="desc">反映学生关注的知识点</div><div class="chart" id="a-wc"></div></div></div>' +
      '<div class="card mt"><h3>最近的学生提问</h3><div class="desc">学生端实时提问会出现在这里</div><div class="tbl-wrap"><table id="a-recent"></table></div></div>';
    let level = 'kp';
    function hm() {
      const sorted = ss.slice().sort((a, b) => DV.overall(a) - DV.overall(b));
      const cols = level === 'kp' ? DV.KPS.map(k => ({ id: k.id, name: k.name, ch: k.ch })) : DV.CHAPTERS.map(c => ({ id: c.id, name: c.name, ch: c.id }));
      const data = []; sorted.forEach((s, y) => cols.forEach((c, x) => data.push([x, y, level === 'kp' ? s.mastery[c.id] : DV.chMastery(s, c.id)])));
      $('#a-hm').style.height = Math.max(760, sorted.length * 22 + (level === 'kp' ? 200 : 150)) + 'px';
      const ch = U.chart('#a-hm', {
        tooltip: { position: 'top', formatter: p => esc(sorted[p.value[1]].name) + ' · ' + esc(cols[p.value[0]].name) + '<br/>掌握度：<b>' + p.value[2] + '%</b>' },
        grid: { left: 70, right: 40, top: 10, bottom: level === 'kp' ? 140 : 90 },
        xAxis: { type: 'category', data: cols.map(c => c.name), splitArea: { show: true }, axisLabel: { interval: 0, rotate: 55, fontSize: 10.5, color: '#475569' } },
        yAxis: { type: 'category', data: sorted.map(s => s.name), axisLabel: { fontSize: 10.5, color: '#475569', interval: 0 }, inverse: true },
        visualMap: { min: 0, max: 100, calculable: true, orient: 'vertical', right: 0, top: 'center', inRange: { color: ['#ef4444', '#f59e0b', '#fde68a', '#86efac', '#16a34a'] } },
        series: [{ type: 'heatmap', data, label: { show: level !== 'kp', fontSize: 11 }, itemStyle: { borderColor: '#fff', borderWidth: 1 }, emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,.4)' } } }]
      });
      ch.on('click', p => openStudent(sorted[p.value[1]].id));
    }
    U.tabs($('#hm-tabs'), [['kp', '知识点（33）'], ['ch', '章节（11）']], level, t => { level = t; hm(); });
    hm();
    // 成绩分布
    const edges = [70, 75, 80, 85, 90], binNames = ['<70', '70-74', '75-79', '80-84', '85-89', '≥90'], bins = binNames.map(() => 0);
    ss.forEach(s => { let k = edges.findIndex(e => s.total < e); if (k < 0) k = edges.length; bins[k]++; });
    U.chart('#a-dist', { tooltip: {}, grid: { left: 40, right: 16, top: 24, bottom: 30 }, xAxis: { type: 'category', data: binNames }, yAxis: { type: 'value', name: '人数', minInterval: 1 },
      series: [{ type: 'bar', barWidth: '55%', data: bins.map((b, i) => ({ value: b, itemStyle: { color: ['#ef4444', '#f59e0b', '#06b6d4', '#3b82f6', '#4f46e5', '#16a34a'][i], borderRadius: [6, 6, 0, 0] } })), label: { show: true, position: 'top' } }] });
    const titles = ['第1章 单元测验', '第2-3章 单元测验', '第4章 单元测验', '第5-6章 单元测验', '期中测验'];
    U.chart('#a-qline', { tooltip: { trigger: 'axis' }, grid: { left: 40, right: 20, top: 24, bottom: 50 }, xAxis: { type: 'category', data: titles.map(t => t.replace(' 单元测验', '').replace('测验', '')) , axisLabel: { interval: 0, fontSize: 11 } }, yAxis: { type: 'value', min: 40, max: 100 },
      series: [{ type: 'line', smooth: true, symbolSize: 9, lineStyle: { width: 3 }, itemStyle: { color: '#0d9488' }, areaStyle: { color: 'rgba(13,148,136,.12)' }, label: { show: true, position: 'top' },
        data: titles.map(t => Math.round(mean(ss.map(s => (s.quizzes.find(q => q.title === t) || {}).score).filter(x => x != null)))) }] });
    // FAQ
    const log = DV.qalog(), cnt = {};
    log.forEach(l => { const k = l.kb || ('x:' + l.text); cnt[k] = cnt[k] || { n: 0, text: l.kb ? (DV.KB.find(e => e.id === l.kb) || {}).q : l.text, kp: l.kp }; cnt[k].n++; });
    const top = Object.values(cnt).sort((a, b) => b.n - a.n).slice(0, 10).reverse();
    U.chart('#a-faq', { tooltip: { formatter: p => esc(p.name) + '：' + p.value + ' 次' }, grid: { left: 10, right: 40, top: 10, bottom: 10, containLabel: true }, xAxis: { type: 'value' },
      yAxis: { type: 'category', data: top.map(t => t.text.length > 18 ? t.text.slice(0, 18) + '…' : t.text), axisLabel: { fontSize: 11 } },
      series: [{ type: 'bar', data: top.map(t => t.n), barWidth: '60%', itemStyle: { borderRadius: [0, 6, 6, 0], color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#5eead4' }, { offset: 1, color: '#4f46e5' }]) }, label: { show: true, position: 'right' } }] });
    // 词云
    const wc = {}; log.forEach(l => (l.kws || []).forEach(k => wc[k] = (wc[k] || 0) + 1));
    const words = Object.entries(wc).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 60);
    if (words.length) {
      try { U.chart('#a-wc', { tooltip: { formatter: p => esc(p.name) + '：' + p.value }, series: [{ type: 'wordCloud', shape: 'circle', gridSize: 8, sizeRange: [14, 54], rotationRange: [0, 0], textStyle: { fontFamily: U.FONT, fontWeight: 'bold', color: () => U.PALETTE[Math.floor(Math.random() * U.PALETTE.length)] }, data: words, left: 'center', top: 'center', width: '96%', height: '92%' }] }); } catch (e) { $('#a-wc').innerHTML = '<div class="empty">词云组件加载失败</div>'; }
    }
    const real = log.slice().sort((a, b) => b.ts - a.ts).slice(0, 8);
    $('#a-recent').innerHTML = '<tr><th>时间</th><th>学生</th><th>问题</th><th>关联知识点</th><th>来源</th></tr>' + real.map(l => { const s = DV.getStudent(l.sid) || { name: l.sid }; const k = DV.KP_MAP[l.kp]; return '<tr><td>' + new Date(l.ts).toLocaleString('zh-CN', { hour12: false }).slice(5, 16) + '</td><td>' + esc(s.name) + '</td><td>' + esc(l.text) + '</td><td>' + (k ? esc(k.name) : '-') + '</td><td>' + '<span class="pill ' + (l.src === 'user' ? 'ok' : 'gray') + '">智能问答</span>' + '</td></tr>'; }).join('');
  }

  /* ============ 学生画像与预警 ============ */
  function renderStudents(v) {
    let q = '', flt = 'all', sort = 'warn';
    v.innerHTML = '<div class="card"><div class="toolbar"><input id="s-q" placeholder="搜索姓名/学号…" style="width:200px"><select id="s-f" style="width:140px"><option value="all">全部学生</option><option value="warn">仅预警学生</option><option value="high">仅高风险</option></select><select id="s-s" style="width:150px"><option value="warn">按风险排序</option><option value="ov">按掌握度升序</option><option value="ovd">按掌握度降序</option><option value="id">按学号</option></select><div class="grow"></div>' + SAMPLE + '</div><div class="tbl-wrap"><table id="s-tbl"></table></div></div>';
    function draw() {
      let list = DV.students().map(s => ({ s, w: DV.warn(s), ov: DV.overall(s) })).filter(x => (!q || x.s.name.includes(q) || x.s.id.toLowerCase().includes(q.toLowerCase())) && (flt === 'all' || (flt === 'warn' ? x.w.level !== 'none' : x.w.level === 'high')));
      const rk = x => x.w.level === 'high' ? 0 : x.w.level === 'mid' ? 1 : 2;
      list.sort((a, b) => sort === 'warn' ? rk(a) - rk(b) || a.ov - b.ov : sort === 'ov' ? a.ov - b.ov : sort === 'ovd' ? b.ov - a.ov : a.s.id.localeCompare(b.s.id));
      $('#s-tbl').innerHTML = '<tr><th>学号</th><th>姓名</th><th style="width:170px">综合掌握度</th><th>总评</th><th>近7日时长</th><th>测验均分</th><th>最近活跃</th><th>目标</th><th>预警</th></tr>' +
        list.map(x => { const ia = DV.inactiveDays(x.s); return '<tr class="hov" data-s="' + x.s.id + '"><td>' + x.s.id + '</td><td><b>' + esc(x.s.name) + '</b></td><td><div style="display:flex;align-items:center;gap:8px"><div style="flex:1">' + U.barHtml(x.ov) + '</div><b style="width:36px">' + x.ov + '%</b></div></td><td><b>' + x.s.total + '</b></td><td>' + DV.studyMinutes(x.s, 7) + ' 分钟</td><td>' + DV.quizAvg(x.s) + '</td><td>' + (ia === 0 ? '今天' : ia >= 28 ? '28天以上' : ia + ' 天前') + '</td><td>' + DV.GOALS[x.s.goal].name + '</td><td>' + warnPill(x.w) + '</td></tr>'; }).join('') || '<tr><td colspan="9" class="empty">无匹配学生</td></tr>';
    }
    $('#s-q').oninput = e => { q = e.target.value.trim(); draw(); }; $('#s-f').onchange = e => { flt = e.target.value; draw(); }; $('#s-s').onchange = e => { sort = e.target.value; draw(); };
    $('#s-tbl').onclick = e => { const r = e.target.closest('[data-s]'); if (r) openStudent(r.dataset.s); };
    draw();
  }

  function openStudent(id) {
    const st = DV.getStudent(id); if (!st) return;
    const w = DV.warn(st), ov = DV.overall(st), lv = DV.level(ov), ss = DV.students();
    const log = DV.qalog().filter(l => l.sid === id).sort((a, b) => b.ts - a.ts).slice(0, 5);
    const path = DV.genPath(st, st.goal, { weeklyHours: 6 });
    const weak = DV.weakKps(st, 5, 60);
    const html = '<div class="toolbar"><div class="avatar" style="width:48px;height:48px;font-size:20px">' + esc(st.name[0]) + '</div><div><h2 style="font-size:20px">' + esc(st.name) + ' <span style="font-size:13px;color:var(--ink3)">' + st.id + '</span></h2><div style="color:var(--ink3);font-size:12.5px">' + esc(st.className) + ' · 学习目标：' + DV.GOALS[st.goal].name + '</div></div><div class="grow"></div><button class="btn" data-close>关闭 ✕</button></div>' +
      '<div class="card" style="display:flex;gap:28px;flex-wrap:wrap;margin-bottom:18px"><div><div class="desc" style="margin:0">平时成绩</div><b style="font-size:22px">' + st.usual + '</b></div><div><div class="desc" style="margin:0">期末成绩</div><b style="font-size:22px">' + st.final + '</b></div><div><div class="desc" style="margin:0">总评</div><b style="font-size:22px;color:var(--primary)">' + st.total + '</b></div></div>' +
      '<div class="grid g3"><div class="card kpi"><span class="lab">综合掌握度</span><span class="val" style="color:' + lv.c + '">' + ov + '<small>%</small></span><span class="note">' + lv.t + '</span></div><div class="card kpi"><span class="lab">近 7 日学习</span><span class="val">' + DV.studyMinutes(st, 7) + '<small>分钟</small></span><span class="note">测验均分 ' + DV.quizAvg(st) + '</span></div><div class="card kpi"><span class="lab">预警状态</span><span class="val" style="font-size:22px;padding:6px 0">' + warnPill(w) + '</span><span class="note">' + (w.reasons.length ? '' : '无异常') + '</span></div></div>' +
      (w.reasons.length ? '<div class="card mt" style="border-left:4px solid var(--bad)"><h3>⚠️ 预警原因</h3>' + w.reasons.map(r => '<div class="diag" style="border-color:var(--bad)">' + esc(r) + '</div>').join('') + '</div>' : '') +
      '<div class="grid g2 mt"><div class="card"><h3>能力画像</h3><div class="chart sm" id="p-radar"></div></div><div class="card"><h3>学习时长（近 14 天）</h3><div class="chart sm" id="p-trend"></div></div></div>' +
      '<div class="grid g2 mt"><div class="card"><h3>薄弱知识点</h3>' + (weak.map(x => '<div style="display:flex;align-items:center;gap:10px;margin:8px 0"><span style="width:140px;font-size:13px">' + x.kp.name + '</span><div style="flex:1">' + U.barHtml(x.m) + '</div><b style="width:38px;text-align:right;font-size:13px">' + x.m + '%</b></div>').join('') || '<div style="color:var(--ok)">无低于 60% 的知识点 🎉</div>') + '<div class="sec-t">测验记录</div>' + st.quizzes.slice(-5).map(q => '<span class="pill gray" style="margin:0 6px 6px 0">' + q.date.slice(5) + ' ' + esc(q.title.replace('单元测验', '')) + '：<b>' + q.score + '</b></span>').join('') + '</div>' +
      '<div class="card"><h3>最近提问</h3>' + (log.map(l => '<div class="diag" style="font-size:13px">💬 ' + esc(l.text) + '</div>').join('') || '<div style="color:var(--ink3)">暂无提问记录</div>') + '</div></div>' +
      '<div class="card mt"><h3>🩺 干预与教学建议</h3>' + DV.studentAdvice(st).map(t => '<div class="diag">💡 ' + esc(t) + '</div>').join('') +
      '<div class="sec-t">系统推荐的个性化路径（' + DV.GOALS[st.goal].name + '，前 5 步，共 ' + path.steps.length + ' 步 / 约 ' + path.weeks + ' 周）</div>' + path.steps.slice(0, 5).map(s => '<div class="res-item"><span class="pill info">' + s.order + '</span><div class="t"><b>' + (s.kp ? DV.KP_MAP[s.kp].name : s.title) + '</b><small>' + esc(s.reason) + '</small></div></div>').join('') + '</div>';
    U.drawer(html, (d, reg) => {
      reg(U.chart(d.querySelector('#p-radar'), { tooltip: {}, legend: { bottom: 0, data: [st.name, '班级平均'] }, radar: { radius: '58%', center: ['50%', '47%'], indicator: DV.CHAPTERS.map(c => ({ name: c.short, max: 100 })) },
        series: [{ type: 'radar', data: [{ name: st.name, value: DV.CHAPTERS.map(c => DV.chMastery(st, c.id)), areaStyle: { color: 'rgba(13,148,136,.3)' }, itemStyle: { color: '#0d9488' }, lineStyle: { width: 2.5 } }, { name: '班级平均', value: DV.CHAPTERS.map(c => DV.classChMastery(ss, c.id)), lineStyle: { type: 'dashed' }, itemStyle: { color: '#6366f1' } }] }] }));
      const days = [...Array(14).keys()].reverse().map(i => DV.daysAgo(i));
      reg(U.chart(d.querySelector('#p-trend'), { tooltip: { trigger: 'axis' }, grid: { left: 36, right: 12, top: 20, bottom: 26 }, xAxis: { type: 'category', data: days.map(x => x.slice(5)), axisLabel: { fontSize: 10 } }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: days.map(x => st.study[x] || 0), itemStyle: { color: '#0d9488', borderRadius: [4, 4, 0, 0] } }] }));
    });
  }

  /* ============ 资源与题库 ============ */
  function kpOptions(sel) { return DV.CHAPTERS.map(c => '<optgroup label="' + c.name + '">' + DV.KPS.filter(k => k.ch === c.id).map(k => '<option value="' + k.id + '" ' + (k.id === sel ? 'selected' : '') + '>' + k.name + '</option>').join('') + '</optgroup>').join(''); }
  function renderManage(v) {
    let tab = 'res', ch = '', q = '', lim = 30;
    v.innerHTML = '<div id="m-tabs"></div><div class="card"><div class="toolbar"><select id="m-ch" style="width:190px"><option value="">全部章节</option>' + DV.CHAPTERS.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('') + '</select><input id="m-q" placeholder="搜索…" style="width:200px"><div class="grow"></div><span id="m-n" style="color:var(--ink3)"></span><button class="btn primary" id="m-add">＋ 新增</button></div><div class="tbl-wrap"><table id="m-tbl"></table></div><div class="desc" style="margin-top:8px">提示：此处的修改保存在浏览器 localStorage，学生端（同一浏览器）刷新或切换页面后即可看到。</div></div>';
    U.tabs($('#m-tabs'), [['res', '📚 知识点资源'], ['q', '📝 题库']], tab, t => { tab = t; lim = 30; draw(); });
    function draw() { tab === 'res' ? drawRes() : drawQ(); }
    function drawRes() {
      const all = DV.resources(); const list = all.filter(r => (!ch || (DV.KP_MAP[r.kp] || {}).ch === ch) && (!q || (r.title + r.desc).includes(q)));
      $('#m-n').textContent = '共 ' + list.length + ' / ' + all.length + ' 条'; $('#m-add').textContent = '＋ 新增资源';
      $('#m-tbl').innerHTML = '<tr><th>类型</th><th>标题</th><th>关联知识点</th><th>链接</th><th style="width:120px">操作</th></tr>' + list.slice(0, lim).map(r => { const k = DV.KP_MAP[r.kp]; return '<tr><td>' + U.resTypeIcon(r.type) + ' ' + r.type + '</td><td>' + esc(r.title) + '</td><td>' + (k ? esc(k.name) : '-') + '</td><td>' + (r.url ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">链接</a>' : '<span style="color:var(--ink3)">站内</span>') + '</td><td><button class="btn sm" data-e="' + r.id + '">编辑</button> <button class="btn sm danger" data-d="' + r.id + '">删除</button></td></tr>'; }).join('') + (list.length > lim ? '<tr><td colspan="5" style="text-align:center"><button class="btn sm" data-more="1">显示更多（剩余 ' + (list.length - lim) + '）</button></td></tr>' : '');
    }
    function drawQ() {
      const all = DV.questions(); const list = all.filter(r => (!ch || (DV.KP_MAP[r.kp] || {}).ch === ch) && (!q || r.stem.includes(q)));
      $('#m-n').textContent = '共 ' + list.length + ' / ' + all.length + ' 题'; $('#m-add').textContent = '＋ 新增题目';
      $('#m-tbl').innerHTML = '<tr><th>知识点</th><th>题干</th><th>答案</th><th style="width:120px">操作</th></tr>' + list.slice(0, lim).map(r => { const k = DV.KP_MAP[r.kp]; return '<tr><td>' + (k ? esc(k.name) : '-') + '</td><td>' + esc(r.stem) + '</td><td><span class="pill ok">' + 'ABCD'[r.answer] + '</span></td><td><button class="btn sm" data-e="' + r.id + '">编辑</button> <button class="btn sm danger" data-d="' + r.id + '">删除</button></td></tr>'; }).join('') + (list.length > lim ? '<tr><td colspan="4" style="text-align:center"><button class="btn sm" data-more="1">显示更多（剩余 ' + (list.length - lim) + '）</button></td></tr>' : '');
    }
    function resForm(r) {
      r = r || { kp: 'k1_1', type: '课件', title: '', url: '', desc: '' };
      U.modal({ title: (r.id ? '编辑' : '新增') + '资源', okText: '保存', body: '<label class="f">关联知识点</label><select id="f-kp">' + kpOptions(r.kp) + '</select><label class="f">类型</label><select id="f-type">' + ['课件', '视频', '阅读', '实验', '练习'].map(t => '<option ' + (t === r.type ? 'selected' : '') + '>' + t + '</option>').join('') + '</select><label class="f">标题 *</label><input id="f-title" value="' + esc(r.title) + '"><label class="f">链接（可选，需 http/https 开头）</label><input id="f-url" value="' + esc(r.url) + '" placeholder="https://"><label class="f">说明</label><textarea id="f-desc" rows="3">' + esc(r.desc) + '</textarea>',
        onOk: m => { const title = $('#f-title', m).value.trim(); const url = $('#f-url', m).value.trim(); if (!title) { U.toast('请填写标题'); return false; } if (url && !/^https?:\/\//i.test(url)) { U.toast('链接需以 http:// 或 https:// 开头'); return false; }
          const list = DV.resources(); const o = { id: r.id || DV.uid('r'), kp: $('#f-kp', m).value, type: $('#f-type', m).value, title, url, desc: $('#f-desc', m).value.trim() };
          if (r.id) list[list.findIndex(x => x.id === r.id)] = o; else list.unshift(o); S.set('resources', list); U.toast('已保存，学生端同步可见'); draw(); } });
    }
    function qForm(r) {
      r = r || { kp: 'k1_1', stem: '', options: ['', '', '', ''], answer: 0, explain: '' };
      U.modal({ title: (r.id ? '编辑' : '新增') + '题目', okText: '保存', width: '620px', body: '<label class="f">关联知识点</label><select id="f-kp">' + kpOptions(r.kp) + '</select><label class="f">题干 *</label><textarea id="f-stem" rows="2">' + esc(r.stem) + '</textarea>' +
        [0, 1, 2, 3].map(i => '<label class="f">选项 ' + 'ABCD'[i] + ' *</label><div style="display:flex;gap:8px;align-items:center"><input type="radio" name="f-ans" value="' + i + '" ' + (r.answer === i ? 'checked' : '') + ' style="width:auto"><input id="f-o' + i + '" value="' + esc(r.options[i]) + '"></div>').join('') + '<div class="desc" style="margin-top:4px">选中单选框表示该项为正确答案</div><label class="f">解析</label><textarea id="f-ex" rows="2">' + esc(r.explain) + '</textarea>',
        onOk: m => { const stem = $('#f-stem', m).value.trim(); const opts = [0, 1, 2, 3].map(i => $('#f-o' + i, m).value.trim()); if (!stem || opts.some(o => !o)) { U.toast('请填写题干和全部 4 个选项'); return false; }
          const list = DV.questions(); const o = { id: r.id || DV.uid('t'), kp: $('#f-kp', m).value, stem, options: opts, answer: +m.querySelector('input[name=f-ans]:checked').value, explain: $('#f-ex', m).value.trim() };
          if (r.id) list[list.findIndex(x => x.id === r.id)] = o; else list.unshift(o); S.set('questions', list); U.toast('已保存，学生端小测验同步可用'); draw(); } });
    }
    $('#m-add').onclick = () => tab === 'res' ? resForm() : qForm();
    $('#m-ch').onchange = e => { ch = e.target.value; draw(); }; $('#m-q').oninput = e => { q = e.target.value.trim(); draw(); };
    $('#m-tbl').onclick = e => {
      const b = e.target.closest('button'); if (!b) return; if (b.dataset.more) { lim += 30; return draw(); } const key = tab === 'res' ? 'resources' : 'questions'; const list = DV[key]();
      if (b.dataset.e) { const r = list.find(x => x.id === b.dataset.e); tab === 'res' ? resForm(r) : qForm(r); }
      if (b.dataset.d && confirm('确定删除这一条吗？')) { S.set(key, list.filter(x => x.id !== b.dataset.d)); U.toast('已删除'); draw(); }
    };
    draw();
  }

  /* ============ 教学建议 ============ */
  function renderAdvice(v) {
    v.innerHTML = '<div class="hero"><div><h2>🧠 基于班级学情的教学建议</h2><p>依据掌握度、预警、问答与题库覆盖情况，用规则自动生成；可复制为教案备注。</p></div><div style="display:flex;gap:10px"><button class="btn" id="ad-regen">🔄 重新生成</button><button class="btn" id="ad-copy">📋 复制全文</button></div></div><div id="ad-body"></div>';
    let text = '';
    function draw() {
      const a = DV.classAdvice(), ss = DV.students();
      const groups = [{ name: '帮扶组', cls: 'bad', goal: 'exam', f: o => o < 50, tip: '夯实基础：先补前置知识，安排助教答疑与小组结对' },
        { name: '提升组', cls: 'warn', goal: 'project', f: o => o >= 50 && o < 75, tip: '巩固提升：以项目任务驱动，针对薄弱章节专项练习' },
        { name: '拓展组', cls: 'ok', goal: 'interest', f: o => o >= 75, tip: '拓展挑战：推荐进阶主题与开源作品复现，担任小组导师' }];
      text = '【' + DV.CLASS_NAME + ' 教学建议】\n' + a.items.map((x, i) => (i + 1) + '. [' + x.tag + '] ' + x.title + '：' + x.body).join('\n');
      let html = '<div class="grid g-main"><div class="card"><h3>📌 教学改进建议（' + a.items.length + ' 条）</h3><div class="desc">按优先级排序</div>' +
        a.items.map((x, i) => '<div class="step"><div class="no">' + (i + 1) + '</div><div class="body"><div class="st-name" style="cursor:default">' + esc(x.title) + ' <span class="pill info">' + x.tag + '</span></div><div class="why">' + esc(x.body) + '</div></div></div>').join('') + '</div>' +
        '<div class="card"><h3>班级最薄弱知识点 Top 6</h3><div class="desc">掌握度（%）最低</div><div class="chart" id="ad-weak" style="height:300px"></div></div></div>' +
        '<div class="card mt"><h3>👥 分层教学与学习路径建议 ' + SAMPLE + '</h3><div class="desc">按综合掌握度分组，并为每组推荐路径目标</div><div class="grid g3">' +
        groups.map(g => { const mem = ss.filter(s => g.f(DV.overall(s))); const wk = DV.KPS.map(k => ({ k, m: mean(mem.map(s => s.mastery[k.id])) })).filter(x => mem.length).sort((a, b) => a.m - b.m).slice(0, 3);
          text += '\n【' + g.name + '（' + mem.length + '人）】推荐路径：' + DV.GOALS[g.goal].name + '；' + g.tip + '；共同薄弱：' + wk.map(x => x.k.name).join('、');
          return '<div class="card" style="box-shadow:none;border:1px solid var(--line)"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">' + g.name + '</h3><span class="pill ' + g.cls + '">' + mem.length + ' 人</span></div><div class="desc">推荐路径：' + DV.GOALS[g.goal].icon + ' ' + DV.GOALS[g.goal].name + '</div><div style="font-size:13px;color:var(--ink2);margin-bottom:8px">' + g.tip + '</div><div class="sec-t">共同薄弱点</div>' + (wk.map(x => '<span class="pill gray" style="margin:0 6px 6px 0">' + x.k.name + ' ' + Math.round(x.m) + '%</span>').join('') || '-') + '<div class="sec-t">成员</div><div style="font-size:12.5px;color:var(--ink2)">' + (mem.map(s => '<a data-s="' + s.id + '" style="cursor:pointer">' + esc(s.name) + '</a>').join('、') || '无') + '</div></div>'; }).join('') + '</div></div>';
      $('#ad-body').innerHTML = html;
      $('#ad-body').onclick = e => { const a = e.target.closest('[data-s]'); if (a) openStudent(a.dataset.s); };
      const wk = a.weak.slice().reverse();
      U.chart('#ad-weak', { tooltip: {}, grid: { left: 10, right: 36, top: 8, bottom: 8, containLabel: true }, xAxis: { type: 'value', max: 100 }, yAxis: { type: 'category', data: wk.map(x => x.k.name) },
        series: [{ type: 'bar', data: wk.map(x => ({ value: x.m, itemStyle: { color: DV.masteryColor(x.m), borderRadius: [0, 6, 6, 0] } })), label: { show: true, position: 'right', formatter: '{c}%' }, barWidth: '55%' }] });
    }
    $('#ad-regen').onclick = () => { draw(); U.toast('已根据最新数据重新生成'); };
    $('#ad-copy').onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => U.toast('已复制'), () => { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); U.toast('已复制'); }); };
    draw();
  }
  const shell = U.mountShell({ pages, roleLabel: '👩‍🏫 教师端', subtitle: '智能教学管理平台', userName: '王老师', userSub: '《数据可视化技术》任课教师' });
})();
