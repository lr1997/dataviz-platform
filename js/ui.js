/* 通用 UI：路由外壳、弹窗、Toast、Markdown、图表管理 */
(function () {
  const DV = window.DV, esc = DV.esc;
  const U = DV.ui = {};
  U.PALETTE = ['#4f46e5', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#3b82f6', '#f97316'];
  U.FONT = '-apple-system,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif';

  U.toast = function (msg, ms) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), ms || 2200);
  };
  U.modal = function (o) {
    const mask = document.createElement('div'); mask.className = 'mask';
    mask.innerHTML = '<div class="modal" style="' + (o.width ? 'width:' + o.width : '') + '"><h3>' + o.title + '</h3><div class="mbody">' + o.body + '</div><div class="acts">' +
      (o.hideCancel ? '' : '<button class="btn" data-x="cancel">' + (o.cancelText || '取消') + '</button>') + (o.okText === null ? '' : '<button class="btn primary" data-x="ok">' + (o.okText || '确定') + '</button>') + '</div></div>';
    document.body.appendChild(mask);
    const close = () => mask.remove();
    mask.addEventListener('mousedown', e => { if (e.target === mask) close(); });
    mask.querySelector('[data-x=cancel]') && mask.querySelector('[data-x=cancel]').addEventListener('click', close);
    const ok = mask.querySelector('[data-x=ok]');
    ok && ok.addEventListener('click', () => { if (!o.onOk || o.onOk(mask.querySelector('.modal')) !== false) close(); });
    o.onMount && o.onMount(mask.querySelector('.modal'), close);
    return close;
  };
  U.drawer = function (html, onMount) {
    const m = document.createElement('div'); m.className = 'drawer-mask';
    const d = document.createElement('div'); d.className = 'drawer'; d.innerHTML = html;
    document.body.appendChild(m); document.body.appendChild(d);
    const charts = [];
    const close = () => { charts.forEach(c => c.dispose()); m.remove(); d.remove(); };
    m.addEventListener('click', close);
    d.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    onMount && onMount(d, c => { charts.push(c); return c; });
    return close;
  };

  /* ---- 图表 ---- */
  const charts = new Set();
  U.chart = function (el, option, opts) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (!el) return null;
    const old = echarts.getInstanceByDom(el); if (old) { old.dispose(); charts.delete(old); }
    const c = echarts.init(el, null, Object.assign({ renderer: 'canvas' }, opts || {}));
    option.textStyle = Object.assign({ fontFamily: U.FONT }, option.textStyle);
    option.color = option.color || U.PALETTE;
    if (option.animationDuration === undefined) option.animationDuration = 600;
    c.setOption(option); charts.add(c); return c;
  };
  U.disposeCharts = () => { charts.forEach(c => { try { c.dispose(); } catch (e) {} }); charts.clear(); };
  window.addEventListener('resize', () => charts.forEach(c => { try { c.resize(); } catch (e) {} }));

  /* ---- Markdown（简化） ---- */
  function inline(s) {
    return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }
  U.md = function (text) {
    const parts = String(text).split(/```/);
    let html = '';
    parts.forEach((p, i) => {
      if (i % 2 === 1) {
        const nl = p.indexOf('\n'); const lang = p.slice(0, nl).trim(); const code = p.slice(nl + 1).replace(/\n$/, '');
        html += '<pre data-lang="' + esc(lang) + '"><button class="copy-btn" data-copy>复制 ' + esc(lang) + '</button><code>' + esc(code) + '</code></pre>';
      } else {
        const lines = p.split('\n'); let i2 = 0;
        while (i2 < lines.length) {
          const ln = lines[i2];
          if (/^\s*\|.*\|\s*$/.test(ln)) {
            const rows = []; while (i2 < lines.length && /^\s*\|.*\|\s*$/.test(lines[i2])) { rows.push(lines[i2]); i2++; }
            const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
            const body = rows.filter(r => !/^\s*\|[\s:|-]+\|\s*$/.test(r));
            html += '<table>' + body.map((r, j) => '<tr>' + cells(r).map(c => (j === 0 ? '<th>' : '<td>') + inline(c) + (j === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';
          } else if (/^\s*[-*]\s+/.test(ln)) {
            html += '<ul>'; while (i2 < lines.length && /^\s*[-*]\s+/.test(lines[i2])) { html += '<li>' + inline(lines[i2].replace(/^\s*[-*]\s+/, '')) + '</li>'; i2++; } html += '</ul>';
          } else if (/^\s*\d+[.、]\s+/.test(ln)) {
            html += '<ol>'; while (i2 < lines.length && /^\s*\d+[.、]\s+/.test(lines[i2])) { html += '<li>' + inline(lines[i2].replace(/^\s*\d+[.、]\s+/, '')) + '</li>'; i2++; } html += '</ol>';
          } else { if (ln.trim()) html += '<p>' + inline(ln) + '</p>'; i2++; }
        }
      }
    });
    return html;
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const code = b.parentElement.querySelector('code').textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).catch(() => { const t = document.createElement('textarea'); t.value = code; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (x) {} t.remove(); }).then(() => { U.toast('代码已复制'); });
  });

  /* ---- 应用外壳 ---- */
  U.mountShell = function (cfg) {
    const root = document.getElementById('app');
    const sess = DV.session();
    const nm = cfg.userName;
    root.innerHTML =
      '<div class="app"><aside class="sidebar" id="sidebar">' +
      '<div class="brand"><div class="logo">📊</div><div><b>数据可视化技术</b><small>' + cfg.subtitle + '</small></div></div>' +
      '<div class="role-badge"><span>' + cfg.roleLabel + '</span></div>' +
      '<nav class="nav" id="nav">' + cfg.pages.map(p => '<a data-p="' + p.id + '"><span class="ico">' + p.icon + '</span>' + p.title + '</a>').join('') + '</nav>' +
      '<div class="side-foot"><div class="user"><div class="avatar">' + esc(nm.slice(0, 1)) + '</div><div><div>' + esc(nm) + '</div><small style="color:#94a3b8">' + esc(cfg.userSub) + '</small></div></div>' +
      '<a id="switch-role">⇄ 切换角色</a><a id="reset-data">重置数据</a></div></aside>' +
      '<div class="main"><div class="topbar"><button class="menu-btn" id="menu-btn">☰</button><div><h1 id="page-title"></h1><div class="sub" id="page-sub"></div></div><div class="grow"></div><div id="top-actions"></div></div><div class="content" id="view"></div></div></div>';
    const side = document.getElementById('sidebar');
    document.getElementById('menu-btn').onclick = () => side.classList.toggle('open');
    document.getElementById('switch-role').onclick = () => { location.href = 'index.html'; };
    document.getElementById('reset-data').onclick = () => { if (confirm('将清除本地全部数据（学习记录、题库、资源、问答记录）并恢复初始数据，确定吗？')) { DV.resetAll(); location.reload(); } };
    function go() {
      let id = (location.hash || '').replace('#', '') || cfg.pages[0].id;
      let p = cfg.pages.find(x => x.id === id) || cfg.pages[0];
      document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.p === p.id));
      document.getElementById('page-title').textContent = p.title;
      document.getElementById('page-sub').textContent = p.sub || '';
      document.getElementById('top-actions').innerHTML = '';
      side.classList.remove('open');
      U.disposeCharts();
      const v = document.getElementById('view'); v.innerHTML = ''; window.scrollTo(0, 0);
      try { p.render(v); } catch (e) { console.error(e); v.innerHTML = '<div class="card empty">页面渲染出错：' + esc(e.message) + '</div>'; }
    }
    document.getElementById('nav').addEventListener('click', e => { const a = e.target.closest('a'); if (a) location.hash = a.dataset.p; });
    window.addEventListener('hashchange', go);
    go();
    return { refresh: go };
  };
  U.ringHtml = (v, c) => '<div class="ring" style="--p:' + v + ';--c:' + (c || DV.masteryColor(v)) + '" data-v="' + v + '%"></div>';
  U.barHtml = (v, c) => '<div class="bar"><i style="width:' + v + '%;background:' + (c || DV.masteryColor(v)) + '"></i></div>';
  U.tabs = function (el, items, cur, cb) {
    el.className = 'tabs'; el.innerHTML = items.map(i => '<button data-t="' + i[0] + '" class="' + (i[0] === cur ? 'on' : '') + '">' + i[1] + '</button>').join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); cb(b.dataset.t); };
  };
  U.resTypeIcon = t => ({ '课件': '📑', '视频': '🎬', '阅读': '📖', '实验': '🧪', '练习': '✍️' }[t] || '📎');
})();
