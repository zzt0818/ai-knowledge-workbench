/* ============================================================
   AI 知识学习工作台 · 引擎
   职责：路由切视图 / 全局检索 / 筛选 / 收藏与浏览记录 / 内容抽屉 / 动效
   内容模板在 views.js，本文件只管行为。
   ============================================================ */
(function () {
  const W = window, D = document;
  const $ = (s, r) => (r || D).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || D).querySelectorAll(s));

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ================= 代码高亮 ================= */
  const PY_KW = /\b(from|import|as|def|class|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|try|except|finally|raise|with|lambda|async|await|yield|pass|break|continue|global|assert|del)\b/g;
  const PH_L = '\uE100', PH_R = '\uE101';
  const ph = (i) => PH_L + String.fromCharCode(0xE000 + i) + PH_R;

  function hl(src, lang) {
    const bag = [];
    let s = String(src).replace(/(#[^\n]*|\/\/[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g, (m) => {
      bag.push(m); return ph(bag.length - 1);
    });
    s = esc(s);
    if (lang === 'bash' || lang === 'dockerfile') {
      s = s.replace(/\b(FROM|RUN|COPY|ENV|CMD|EXPOSE|WORKDIR|HEALTHCHECK|services|image|ports|environment|deploy|limits|build|volumes|depends_on|command)\b/g, '<span class="kw">$1</span>');
      s = s.replace(/^(\s*)([a-z_][\w.\/-]*)/gm, '$1<span class="fn">$2</span>');
      s = s.replace(/(\$[A-Z_]\w*|\$\{[^}]+\})/g, '<span class="nu">$1</span>');
    } else {
      s = s.replace(PY_KW, '<span class="kw">$1</span>');
      s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="nu">$1</span>');
      s = s.replace(/\b([A-Za-z_]\w*)(?=\()/g, '<span class="fn">$1</span>');
    }
    return s.replace(new RegExp(PH_L + '([\\s\\S])' + PH_R, 'g'), (_, c) => {
      const t = esc(bag[c.charCodeAt(0) - 0xE000] || '');
      const isC = t[0] === '#' || t.slice(0, 2) === '//';
      return '<span class="' + (isC ? 'cm' : 'st') + '">' + t + '</span>';
    });
  }

  /* ================= 本机存储：收藏 + 浏览记录 ================= */
  const KEY = 'aiwb.shelf.v1';
  const Store = {
    _d: null,
    read() {
      if (this._d) return this._d;
      try { this._d = JSON.parse(W.localStorage.getItem(KEY)) || null; } catch (e) { this._d = null; }
      if (!this._d || typeof this._d !== 'object') this._d = {};
      if (!this._d.shelf) this._d.shelf = {};
      if (!Array.isArray(this._d.recent)) this._d.recent = [];
      return this._d;
    },
    save() { try { W.localStorage.setItem(KEY, JSON.stringify(this._d)); } catch (e) { /* 隐私模式忽略 */ } },

    isStar(id) { return !!this.read().shelf[id]; },
    toggleStar(id) {
      const d = this.read();
      if (d.shelf[id]) delete d.shelf[id]; else d.shelf[id] = Date.now();
      this.save();
      return !!d.shelf[id];
    },
    starIds() {
      const s = this.read().shelf;
      return Object.keys(s).sort((a, b) => s[b] - s[a]);
    },
    touch(id) {
      const d = this.read();
      d.recent = [id].concat(d.recent.filter((x) => x !== id)).slice(0, 12);
      this.save();
    },
    recentIds() { return this.read().recent.slice(); },

    /* 当前等级：0 = 全部；没存过就是 1（入门）——新人打开不会迎面撞上一堆专业内容。
       选了就记住，老手切到「全部」之后不会再被打回入门。 */
    stageGet() {
      const v = this.read().stage;
      return (typeof v === 'number' && v >= 0 && v <= 5) ? v : 1;
    },
    stageSet(n) { this.read().stage = n; this.save(); },

    /* 我的行业：空串 = 没选。没选时全站不出现行业内容 ——
       别给还没想过这个问题的人添噪音；选了之后各处才按它呈现。 */
    indGet() { const v = this.read().ind; return typeof v === 'string' ? v : ''; },
    indSet(id) { this.read().ind = id; this.save(); }
  };

  /* ================= 等级（顶栏切换 + 全站过滤） =================
     等级回答的是"这条是给谁看的"，不是"这条难不难"。
     选定一档之后：
       · 比它高的条目在各视图里淡出（.st-over），不是删掉 —— 想点还是能点
       · 整个视图都比它高时，在顶部挂一条说明，而不是把视图锁住
     口径：只降低噪音，不替用户做决定。 */
  const Stage = {
    cur: 1,
    load() { this.cur = Store.stageGet(); },
    set(n) {
      this.cur = n;
      Store.stageSet(n);
      renderStages();
      applyStageAll();
    },
    /* 这一档的显示名，给说明文案用 */
    name() { return this.cur === 0 ? '全部' : W.DATA.stageName(this.cur); },
    /* 图谱的「只看本档」：默认关。
       图谱是看关系的，默认把 51/58 个节点压到 .18 等于把图废掉 ——
       而最需要这张图的正是刚入门的人。所以压暗改成显式开关。 */
    focusOn() { return AtlasFocus.on; },
    toggleFocus() { AtlasFocus.on = !AtlasFocus.on; applyStage(); },
    /* 图谱重画之后，新节点还没有本档标记，得让等级层再落一次 */
    refresh() { applyStage(); }
  };

  const AtlasFocus = { on: false };

  /* ================= 行业：不单独开视图，改成「我这行」 =================
     为什么不做一个独立的「行业」页：零基础的人不会去点它 —— 他既不知道
     自己该看哪一行，也不确定值不值得点进去。行业内容正确的落法是**渗进
     他正在读的地方**：这条知识点在他那行对应什么、这一档他那行能做什么、
     接进去之后代价是什么。

     所以这里只维护一个「当前行业」（随浏览器保存），渲染交给各视图自己的
     [data-ind-mount] 占位块；换一行就把全站的占位块重画一遍。
     没选行业时所有占位块输出空串 —— 页面上不留任何痕迹。 */
  const Ind = {
    cur: '',
    load() { this.cur = Store.indGet(); },
    set(id) {
      this.cur = (this.cur === id) ? '' : id;      /* 再点一次同一个 = 取消 */
      Store.indSet(this.cur);
      applyInd();
      if (this.cur) Toast.show('已设为「' + this.name() + '」· 相关处已按这一行呈现');
      else Toast.show('已取消行业 · 行业相关的内容都收起来了');
    },
    group() {
      const gs = (W.INDUSTRY && W.INDUSTRY.groups) || [];
      for (let i = 0; i < gs.length; i++) if (gs[i].id === this.cur) return gs[i];
      return null;
    },
    name() { const g = this.group(); return g ? g.name : ''; },
    /* 某个主题在「我这行」对应的一句话。没选行业、或这行没写这个主题 → 空串 */
    use(topicId) {
      const g = this.group();
      return (g && g.use && g.use[topicId]) || '';
    },

    /* 行业选择芯片。同一个东西出现在总览、分级视图和抽屉三处 ——
       用户在哪读到相关内容，就在哪换得动，不用回一个专门的页面去找。 */
    picker(tag) {
      const gs = (W.INDUSTRY && W.INDUSTRY.groups) || [];
      if (!gs.length) return '';
      const chips = gs.map((g) =>
        '<button class="ind-chip' + (g.id === this.cur ? ' on' : '') + '" type="button" ' +
        'data-ind-set="' + g.id + '" title="' + esc(g.lead) + '">' +
        '<i>' + esc(g.ch) + '</i>' + esc(g.name) + '</button>').join('');
      const t = tag || '<span class="ind-pick-lb">' +
        (this.cur ? '换一行看' : '你是哪一行？选一行，相关内容会跟着变') + '</span>';
      return '<div class="ind-pick">' + t + chips + '</div>';
    },

    /* 抽屉里的「落到你这行」：一条知识点 → 你这行对应的是什么。
       四块：这个主题在你那行的用法、这一档你那行能做的事、好处与代价各一条、
       最后是这行最不该踩的那个坑。利弊是成对给的 —— 只看到利一定会踩坑。 */
    pane(p) {
      const g = this.group();
      if (!g) return '';
      const st = Stage.cur > 0 ? Stage.cur : p.stage;
      const his = g.hi || [];
      let hi = null;
      for (let i = 0; i < his.length; i++) if (his[i].st === st) { hi = his[i]; break; }
      if (!hi) hi = his[0] || null;
      const use = this.use(p.topic);
      return '' +
      '<div class="ind-pane" data-ind="' + g.id + '">' +
        '<div class="ind-pane-hd">' +
          '<i class="ind-ch">' + esc(g.ch) + '</i><b>' + esc(g.name) + '</b>' +
          '<span class="ind-pane-of">这条属于「' + esc(p.topicName) + '」</span>' +
        '</div>' +
        '<div class="ind-pane-use' + (use ? '' : ' is-none') + '">' +
          '<span class="ind-lb">在你这行</span>' +
          '<p>' + (use ? esc(use) :
            '这一条还没写进' + esc(g.name) + '的用法里 —— 它更偏通用。' +
            '真用到的时候它一般是配合别的做法一起出现的，先知道它存在就行。') + '</p>' +
        '</div>' +
        (hi ? '<div class="ind-pane-hi">' +
          '<span class="ind-lb">' + esc(W.DATA.stageName(hi.st)) + '这一档，你那行能做的　' +
            '<i class="st st' + hi.st + '">' + esc(W.DATA.stageName(hi.st)) + '</i></span>' +
          '<b>' + esc(hi.t) + '</b>' + (hi.d ? '<em>' + esc(hi.d) + '</em>' : '') +
        '</div>' : '') +
        '<div class="ind-pane-pc">' +
          '<div><span class="ind-lb">好处</span><p>' + esc((g.pro || [])[0] || '') + '</p></div>' +
          '<div><span class="ind-lb">代价</span><p>' + esc((g.con || [])[0] || '') + '</p></div>' +
        '</div>' +
        '<div class="ind-trap"><b>这行最不该踩的坑</b><p>' + esc(g.trap) + '</p></div>' +
        (g.pts && g.pts.length ? '<div class="ind-pts"><span class="ind-lb">这行常一起看的</span>' +
          g.pts.map((id) => {
            const q = W.DATA.get(id);
            return q ? '<button class="ind-pt" type="button" data-open="' + id + '">' +
              esc(q.title) + '</button>' : '';
          }).join('') + '</div>' : '') +
        '<div class="ind-swap">' + this.picker() + '</div>' +
      '</div>';
    }
  };

  /* ================= 按档替换内容 =================
     等级对内容有两种作用，别混：
       · 量：同一批条目，"够不够看"的问题 —— 用 [data-st] 收起超档的（.st-over）
       · 质：同一个位置，"这一档该看的东西跟上一档不是一件事"—— 用 [data-st-swap]
             容器 + 子项 [data-st-see="4"]，按当前档**换一版**，不是裁一条

     质的那种，典型是架构视图：入门的人要看"这条线上有哪几个位置"，
     搭建的人要看"三条线怎么并行"，这两段内容没法用"收起 / 展开"表达。

     挑法：精确命中优先；没有精确命中就取「不超过当前档的最大一档」
     （3 档看 1-2 档那版，而不是看 4 档那版 —— 宁可给简单的，别给他看不懂的）；
     切到「全部」时取最后一版，也就是最完整的那一版。 */
  const StageSwap = {
    apply(n) {
      $$('[data-st-swap]').forEach((box) => {
        const items = $$('[data-st-see]', box);
        if (!items.length) return;
        const seenOf = (it) => String(it.getAttribute('data-st-see')).split(',')
          .map((x) => Number(x.replace(/\s/g, ''))).filter((x) => !isNaN(x));
        let pick = null;
        items.forEach((it) => { if (seenOf(it).indexOf(n) >= 0 && !pick) pick = it; });
        if (!pick && n > 0) {
          let best = -1;
          items.forEach((it) => {
            const mx = Math.max.apply(null, seenOf(it));
            if (mx <= n && mx > best) { best = mx; pick = it; }
          });
        }
        if (!pick) pick = items[items.length - 1];
        /* 两个类都给：is-off 是"收起来"（CSS 靠它隐藏），is-on 是样式钩子。
           万一 JS 半路出错没跑到这里，CSS 也只认 is-off —— 结果是四版全显示，
           难看但内容在；反过来（默认全隐藏 + is-on 才显示）会一个字都不剩。 */
        items.forEach((it) => {
          it.classList.toggle('is-on', it === pick);
          it.classList.toggle('is-off', it !== pick);
        });

        /* 面板右上角那句话要跟着换，否则用户不知道自己看的是哪一版 */
        const now = $('[data-st-swap-now]', box);
        if (now) {
          now.textContent = n === 0
            ? '全部等级 · 显示最完整的一版'
            : '现在按「' + W.DATA.stageName(n) + '」档呈现 · 换档这里会跟着换';
        }
      });
    }
  };

  /* 行业是全站共用的：换一行，所有视图里挂着的行业占位块一起重画 */
  function applyInd() {
    const V = W.VIEWS;
    if (!V || !V.indMount) return;
    $$('[data-ind-mount]').forEach((el) => {
      el.innerHTML = V.indMount(el.getAttribute('data-ind-mount'));
    });
    if (Drawer.cur) Drawer.refreshInd();
  }

  /* 曾经这里有两张表：VIEW_MIN_STAGE（每个视图最低在哪个等级才有意义）
     和 VIEW_WHY（为什么），用来自动生成一句「这个视图整块都偏搭建级及以上，
     想看得顺一点，把顶栏等级切到搭建」。已经删掉。

     删的理由：那句话把判断推回给用户。等级开关就在顶上，用户已经动过它了，
     页面再回一句「你动得不对」等于什么也没解决。而且它把「看不懂」包装成
     「你档位不对」，掩盖了真正的问题 —— 那些内容本来就没按档分过。

     现在的口径：条目标档位（data-st），超档的不出现（.st-over 直接 display:none），
     整个视图一条不剩时由 data-st-empty 给一块该视图自己的空态说明。
     空态写的是「这里什么时候会有东西」，不是「你去切档」。 */

  function renderStages() {
    const mount = $('#stage-mount');
    if (!mount || !W.DATA.stages) return;
    const chips = W.DATA.stages.map((s) =>
      '<button class="stg' + (Stage.cur === s.n ? ' on' : '') + '" type="button" ' +
      'data-stage="' + s.n + '" title="' + esc(s.who) + '">' + esc(s.name) + '</button>'
    ).join('');
    mount.innerHTML = '<span class="stg-lb">等级</span>' + chips +
      '<button class="stg stg-all' + (Stage.cur === 0 ? ' on' : '') + '" type="button" data-stage="0">全部</button>';
  }

  function bindStages() {
    const mount = $('#stage-mount');
    if (!mount || mount.dataset.bound) return;
    mount.dataset.bound = '1';
    mount.addEventListener('click', (e) => {
      const b = e.target.closest('.stg');
      if (!b) return;
      const n = Number(b.getAttribute('data-stage'));
      Stage.set(n);
      const nm = Stage.name();
      Toast.show(n === 0 ? '已切到全部等级' : '已切到「' + nm + '」档 · 超出这一档的内容会淡出，还能点');
    });
  }

  /* 把等级落到 DOM：给超出档位的元素挂 .st-over（隐藏），并处理按档替换与空态 */
  function applyStageAll() {
    applyStage();
    /* 这两个视图各自带计数，等级一变要跟着重算 */
    const lib = $('[data-sec="library"]');
    if (lib) applyFilter(lib);
    const dr = $('[data-sec="drill"]');
    if (dr) applyDrill(dr, DRILL_FILTER);
    /* 行业区块里的"这一档能做什么"是跟着等级走的，档一变要重画 */
    if (W.VIEWS && W.VIEWS.indMount) applyInd();
  }

  function applyStage() {
    const n = Stage.cur;
    const root = D.documentElement;
    if (n === 0) root.removeAttribute('data-stage');
    else root.setAttribute('data-stage', String(n));

    $$('[data-st]').forEach((el) => {
      const st = Number(el.getAttribute('data-st')) || 0;
      const over = n > 0 && st > n;
      /* 图谱走另一套：节点不能收起来（收掉线就指向空气了），
         也默认不压暗 —— 压暗由「只看本档」这个开关控制，
         本档的节点反过来加重，让「你该看哪些」是加法而不是减法。 */
      if (el.closest('.at-svg')) {
        el.classList.remove('st-over');
        el.classList.toggle('st-on', n > 0 && st === n);
        el.classList.toggle('at-dim', over && AtlasFocus.on);
        return;
      }
      el.classList.toggle('st-over', over);
    });

    /* 按档替换（架构视图那种"换一版"的块） */
    StageSwap.apply(n);

    /* 带档位的清单要报数："本档 4 / 共 7 种"。
       写死数字一定会在加内容那天变成错的，所以让它自己数。
       作用域默认取最近的 .blk —— 一个视图里可能有两份同类清单（模式 / 项目）；
       组内报数（选型表每组一个「本档 N / 共 M」）用 data-st-count-in 指定，
       否则每组都会报整页的总数。 */
    $$('[data-st-count]').forEach((el) => {
      const inSel = el.getAttribute('data-st-count-in');
      const scope = inSel ? (el.closest(inSel) || D) : (el.closest('.blk') || D);
      const all = $$(el.getAttribute('data-st-count'), scope);
      const vis = all.filter((x) => n === 0 || (Number(x.getAttribute('data-st')) || 0) <= n);
      el.textContent = String(vis.length);
    });

    /* 视图内部自带的档位芯片（按档面板那几个），要跟顶栏同一选中态。
       顶栏由 renderStages 重画，管不到这里 —— 只同步状态，不重画。 */
    $$('[data-stg-chip]').forEach((b) => {
      b.classList.toggle('on', Number(b.getAttribute('data-stg-chip')) === n);
    });

    /* 整块会变空的容器：里面按档收完之后一条不剩，就把这块整个收掉。
       只留一个空标题比没有更糟 —— 看着像页面坏了。
       隐藏走内联 display 而不是 [hidden] 属性：块本身常是 flex/grid，
       作者样式会盖掉浏览器给 [hidden] 的默认 display:none。 */
    $$('[data-st-auto]').forEach((el) => {
      const items = $$('[data-st]', el);
      const vis = items.filter((x) => n === 0 || (Number(x.getAttribute('data-st')) || 0) <= n);
      el.style.display = (items.length && !vis.length) ? 'none' : '';
    });

    /* 整个视图一条不剩时的空态（选型表在入门档就是这个样子）。
       只在「选了具体档 且 有内容可收 且 收完一条不剩」时露出来；
       切回「全部」要收回去，所以是显隐而不是一次性插入。 */
    $$('[data-st-empty]').forEach((el) => {
      if ($('[data-st]', el)) { el.style.display = 'none'; return; }
      /* 作用域取最近的 .blk —— 不能取 data-sec：那是 Router 给视图容器
         打的标记，视图内部再复用一个值会让 Router 的查找串线。
         一个视图里可能有多个 .blk（案例页就是上下两块），各算各的正好。 */
      const sec = el.closest('.blk') || D;
      const items = $$('[data-st]', sec);
      const vis = items.filter((x) => n === 0 || (Number(x.getAttribute('data-st')) || 0) <= n);
      el.style.display = (n > 0 && items.length && !vis.length) ? '' : 'none';
    });

    /* 知识库的条数由 applyFilter 重算，这里不重复管 */
  }


  /* ================= 提示条 ================= */
  let toastEl = null, toastT = 0;
  const Toast = {
    show(msg) {
      if (!toastEl) { toastEl = D.createElement('div'); toastEl.className = 'toast'; D.body.appendChild(toastEl); }
      toastEl.textContent = msg;
      requestAnimationFrame(() => toastEl.classList.add('on'));
      clearTimeout(toastT);
      toastT = setTimeout(() => toastEl.classList.remove('on'), 2000);
    }
  };

  /* ================= 动效 ================= */
  const Anim = {
    ok() { return !!W.gsap && !(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches); },
    enter(root) {
      if (!this.ok() || !root) return;
      const g = W.gsap;
      const blocks = root.querySelectorAll('.blk, .hero');
      if (blocks.length) g.from(blocks, { opacity: 0, y: 12, duration: .4, stagger: .06, ease: 'power2.out', clearProps: 'all' });
      const rows = root.querySelectorAll('.kn, .stk-row, .pf, .ar-pat, .tp');
      if (rows.length) g.from(rows, { opacity: 0, x: -8, duration: .3, stagger: .012, delay: .1, ease: 'power2.out', clearProps: 'all' });
    },
    intro() {
      if (!this.ok()) return;
      W.gsap.from('.nav', { yPercent: -100, duration: .5, ease: 'power2.out' });
    }
  };

  /* ================= 检索索引 ================= */
  const Index = { rows: null, build() {
    if (this.rows) return this.rows;
    const rows = [];
    const D0 = W.DATA, strip = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    D0.points.forEach((p) => {
      const c = D0.content[p.id] || {};
      const notes = strip(((c.notes || {}).items || []).map((f) => f.t + ' ' + f.v).join(' '));
      rows.push({
        kind: '知识点', k: p.topicName, t: p.title, sub: p.brief,
        open: p.id,
        hay: (p.title + ' ' + p.brief + ' ' + p.tags.join(' ') + ' ' + p.topicName + ' ' +
              strip((c.concept || []).join(' ')) + ' ' + notes).toLowerCase()
      });
    });

    (W.STACK ? W.STACK.groups : []).forEach((g) => g.rows.forEach((r) => {
      rows.push({ kind: '选型', k: g.name, t: r.n, sub: r.role, open: 'stack',
        hay: (g.name + ' ' + r.n + ' ' + r.v + ' ' + r.role + ' ' + strip(r.take)).toLowerCase() });
    }));

    (W.ARCH ? W.ARCH.patterns : []).forEach((p) => {
      rows.push({ kind: '架构模式', k: '常见技术架构', t: p.name, sub: p.kicker, open: 'arch',
        hay: (p.name + ' ' + p.kicker + ' ' + p.scene + ' ' + p.flow.join(' ') + ' ' + p.pros.join(' ') + ' ' + p.cons.join(' ') + ' ' + p.when).toLowerCase() });
    });
    (W.ARCH ? W.ARCH.projects : []).forEach((p) => {
      rows.push({ kind: '项目拆解', k: '真实项目', t: p.name, sub: p.scene, open: 'arch',
        hay: (p.name + ' ' + p.scene + ' ' + p.scale.join(' ') + ' ' + p.stack.join(' ') + ' ' + p.flow.join(' ') + ' ' + p.hard + ' ' + p.lesson).toLowerCase() });
    });

    /* 案例库：一个做法一条，工具一条，都跳回案例视图 */
    (W.CASES ? W.CASES.groups : []).forEach((g) => g.items.forEach((it) => {
      rows.push({ kind: '案例', k: g.name, t: it.t, sub: strip(it.scene).slice(0, 70), open: 'cases',
        hay: (it.t + ' ' + strip(it.scene) + ' ' + it.how.join(' ') + ' ' + strip(it.hard) + ' ' +
              strip(it.metric) + ' ' + g.name).toLowerCase() });
    }));
    (W.CASES ? W.CASES.toolGroups : []).forEach((g) => g.items.forEach((it) => {
      rows.push({ kind: '工具', k: g.name, t: it.n, sub: strip(it.what).slice(0, 70), open: 'cases',
        hay: (it.n + ' ' + strip(it.what) + ' ' + strip(it.design) + ' ' + strip(it.bad) + ' ' + g.name).toLowerCase() });
    }));

    (W.PITFALLS ? W.PITFALLS.groups : []).forEach((g) => g.items.forEach((it) => {
      rows.push({ kind: '踩坑', k: g.name, t: it.sym, sub: strip(it.cause).slice(0, 70), open: 'pitfalls',
        jump: it.where, hay: (it.sym + ' ' + strip(it.cause) + ' ' + strip(it.fix) + ' ' + g.name).toLowerCase() });
    }));

    (W.DRILL ? W.DRILL.groups : []).forEach((g) => g.items.forEach((x) => {
      rows.push({ kind: '题目', k: g.name + (x.star ? ' ★' : ''), t: x.q, sub: '答案 ' + strip(x.a).slice(0, 62) + '…', open: 'drill',
        hay: (strip(x.q) + ' ' + strip(x.a) + ' ' + g.name + ' ' + x.from).toLowerCase() });
    }));

    (W.ROADMAP ? W.ROADMAP.phases : []).forEach((p) => {
      rows.push({ kind: '路径阶段', k: '学习路径', t: p.name, sub: p.goal, open: 'roadmap',
        hay: (p.name + ' ' + p.goal + ' ' + p.items.map((i) => i.t + ' ' + i.d).join(' ') + ' ' + p.deliverable + ' ' + p.pass).toLowerCase() });
    });

    this.rows = rows;
    return rows;
  }};

  const Finder = {
    init() {
      this.el = $('#finder');
      this.input = $('#finder-input');
      this.body = $('#finder-body');
      this.cnt = $('[data-finder-cnt]');
      this.cur = -1;
      this.list = [];

      this.input.addEventListener('input', () => this.run());
      this.input.addEventListener('keydown', (e) => this.key(e));
      $$('[data-act="finder-close"]').forEach((b) => b.addEventListener('click', () => this.close()));
      this.el.addEventListener('mousedown', (e) => { if (e.target === this.el) this.close(); });
      this.body.addEventListener('click', (e) => {
        const it = e.target.closest('.fd');
        if (it) this.pick(it.getAttribute('data-i'));
      });
    },
    open() {
      this.el.classList.add('on');
      this.input.value = '';
      this.run();
      this.input.focus();
    },
    close() { this.el.classList.remove('on'); },
    isOpen() { return this.el.classList.contains('on'); },
    run() {
      const q = this.input.value.trim().toLowerCase();
      const all = Index.build();
      let hits;
      if (!q) {
        hits = all.filter((r) => r.kind === '知识点').slice(0, 12);
      } else {
        const terms = q.split(/\s+/).filter(Boolean);
        hits = all.filter((r) => terms.every((t) => r.hay.indexOf(t) >= 0));
        hits.sort((a, b) => {
          const ai = a.t.toLowerCase().indexOf(terms[0]), bi = b.t.toLowerCase().indexOf(terms[0]);
          return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
        });
        hits = hits.slice(0, 40);
      }
      this.list = hits;
      this.cur = hits.length ? 0 : -1;
      this.render(q);
    },
    render(q) {
      this.cnt.textContent = q ? (this.list.length + ' 条结果' + (this.list.length >= 40 ? '（已截断）' : '')) : '输入关键词开始检索';
      if (!this.list.length) {
        this.body.innerHTML = '<div class="fd-empty">没有匹配的内容。试试更短的关键词，或换个说法。</div>';
        return;
      }
      this.body.innerHTML = this.list.map((r, i) =>
        '<button class="fd' + (i === this.cur ? ' on' : '') + '" type="button" data-i="' + i + '">' +
          '<span class="fd-k">' + esc(r.kind) + '</span>' +
          '<span class="fd-b"><b>' + esc(r.t) + '</b><i>' + esc(r.sub) + '</i></span>' +
          '<span class="fd-f">' + esc(r.kind + ' · ' + r.k) + '</span>' +
        '</button>'
      ).join('');
    },
    key(e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!this.list.length) return;
        this.cur = (this.cur + (e.key === 'ArrowDown' ? 1 : -1) + this.list.length) % this.list.length;
        $$('.fd', this.body).forEach((el, i) => el.classList.toggle('on', i === this.cur));
        const on = $('.fd.on', this.body);
        if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.cur >= 0) this.pick(this.cur);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    },
    pick(i) {
      const r = this.list[Number(i)];
      if (!r) return;
      this.close();
      if (r.open === 'stack' || r.open === 'arch' || r.open === 'pitfalls' ||
          r.open === 'drill' || r.open === 'roadmap' || r.open === 'cases') {
        Router.go(r.open, { focus: r.t });
      } else {
        Drawer.open(r.open);
      }
    }
  };

  /* ================= 路由 ================= */
  const Router = {
    cur: null,
    init() {
      const keys = W.DATA.views.map((v) => v.k);
      this.keys = keys;

      W.addEventListener('hashchange', () => this.fromHash());

      D.addEventListener('click', (e) => {
        // 注意：必须限定 .tab，否则会命中视图容器 <section data-sec> 外侧的
        // 同名属性，导致点卡片被当成"切视图"而吞掉（2026-09-16 修）
        const t = e.target.closest('.tab[data-view]');
        if (t) { e.preventDefault(); this.go(t.getAttribute('data-view')); return; }
        const jv = e.target.closest('[data-jump-view]');
        if (jv) { this.go(jv.getAttribute('data-jump-view')); return; }
        // 等级入口（总览的大按钮 + 分级视图里的「切到这一档」）
        const sg = e.target.closest('[data-stage-go]');
        if (sg) {
          const n = Number(sg.getAttribute('data-stage-go'));
          Stage.set(n);
          Toast.show(n === 0 ? '已切到全部等级' : '已切到「' + W.DATA.stageName(n) + '」档');
          if (this.cur === 'levels') { this.show('levels'); }
          return;
        }
        // 总览的知识地图：切到知识库，再滚到对应分区
        const jt = e.target.closest('[data-jump-topic]');
        if (jt) {
          const tid = jt.getAttribute('data-jump-topic');
          this.go('library');
          setTimeout(() => {
            const sec = $('[data-sec="library"]');
            const el = sec ? $('#lg-' + tid, sec) : null;
            if (!el) return;
            /* 更早档的条目默认收着，一个主题可能整组都不显示 —— 这时滚过去
               会落在 0 位置（display:none 的元素量不出高度），看着像没反应。
               所以先把它那一批放出来，再滚。 */
            if (el.style.display === 'none') { FOLD.on = true; applyFilter(sec); }
            const nav = parseInt(getComputedStyle(D.documentElement).getPropertyValue('--navh'), 10) || 98;
            const reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
            W.scrollTo({ top: el.getBoundingClientRect().top + W.pageYOffset - nav - 18,
                         behavior: reduce ? 'auto' : 'smooth' });
          }, 90);
          return;
        }
        // 案例视图的「跳到某一类」：本页内滚动，吸顶高度用实测的 --navh，写死会顶到导航下面
        const cs = e.target.closest('[data-cs-go]');
        if (cs) {
          const el = D.getElementById('cs-' + cs.getAttribute('data-cs-go'));
          if (el) {
            const nav = parseInt(getComputedStyle(D.documentElement).getPropertyValue('--navh'), 10) || 98;
            // 系统里关了动效就别再平滑滚 —— 顺手也让无头自检能量出真实位移
            const reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
            W.scrollTo({ top: el.getBoundingClientRect().top + W.pageYOffset - nav - 14,
                         behavior: reduce ? 'auto' : 'smooth' });
          }
          return;
        }
        /* 行业芯片在总览、分级视图和抽屉里都有，所以挂在文档级统一处理 */
        const ind = e.target.closest('[data-ind-set]');
        if (ind) { Ind.set(ind.getAttribute('data-ind-set')); return; }
        const j = e.target.closest('[data-open]');
        if (j) { Drawer.open(j.getAttribute('data-open')); }
      });

      // 装配图层的键盘可达
      D.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const g = e.target.closest && e.target.closest('[data-jump-view]');
        if (g) { e.preventDefault(); this.go(g.getAttribute('data-jump-view')); }
      });

      this.fromHash();
    },
    fromHash() {
      const raw = (location.hash || '').replace(/^#/, '');
      if (!raw) { this.show('overview'); return; }
      const parts = raw.split('/');
      const head = parts[0];
      if (W.DATA.pointMap[head]) {          // #retrieval → 在当前视图上直接开抽屉
        this.show(this.cur || 'overview');
        setTimeout(() => Drawer.open(head), 60);
        return;
      }
      this.show(this.keys.indexOf(head) >= 0 ? head : 'overview');
      if (parts[1] && W.DATA.pointMap[parts[1]]) setTimeout(() => Drawer.open(parts[1]), 80);
    },
    go(key, opt) {
      if (location.hash.replace(/^#/, '') === key) this.show(key);
      else location.hash = key;
      if (opt && opt.focus) setTimeout(() => highlightText(opt.focus), 300);
    },
    show(key) {
      if (!W.VIEWS[key]) key = 'overview';
      const mount = $('#views-mount');
      const first = !this.cur;
      this.cur = key;

      // 懒渲染：只有第一次进入才建 DOM
      // 用 data-sec 而不是 data-view —— 后者已被导航按钮占用，同名会让点击事件串线
      let sec = $('[data-sec="' + key + '"]', mount);
      if (!sec) {
        sec = D.createElement('section');
        sec.className = 'view';
        sec.setAttribute('data-sec', key);
        sec.innerHTML = W.VIEWS[key]();
        mount.appendChild(sec);
        afterMount(key, sec);
      }
      $$('.view', mount).forEach((s) => s.classList.toggle('on', s === sec));

      // 导航高亮（只认标签栏里的按钮）
      $$('#tabs-mount .tab').forEach((b) => b.classList.toggle('on', b.getAttribute('data-view') === key));

      if (!first) Anim.enter(sec);
      window.scrollTo(0, 0);
      refreshShelf();
      refreshCounts();
      /* 等级过滤要在视图渲染之后跑一次：新挂上来的元素还没被算过 */
      applyStage();
      /* 行业占位块同理：模板只留空壳，内容按"我这行"填 */
      if (W.VIEWS.indMount) applyInd();
    }
  };

  /* ================= 发展史的入场动效 =================
     滚到哪一段，哪一段的轴才长出来、卡片从轴那一侧展开、节点依次点亮。

     两个坑，都是实测踩出来的：

     ① 不能用 IntersectionObserver 做首屏触发。视图是 display 切换的，而
        Router.show 的顺序是「先 afterMount、后加 .on」—— bindHistory 跑的那一刻
        这个 section 还是 display:none，元素尺寸全是 0。等它变可见后，IO 的回调
        在无头浏览器里迟迟不交付（实测 1.2 秒后仍未触发），结果是首屏那几段
        永远停在初始态：页面上只有段头和空白的卡片区，而控制台一个错都没有。
        现在改成「scroll 事件 + 每次量一次位置」，首屏用双 rAF 延后到视图真的
        显示出来再检一次 —— 不依赖任何异步交付。

     ② 初始态由 JS 设（不是写在 CSS 里）：没有 GSAP、或用户在系统里关了动效时
        直接不设，元素保持天然可见。把 opacity:0 写进 CSS 才是危险的 ——
        一旦 JS 侧出问题，卡片就永远不出现，而页面上看不出是动画的锅。 */
  function bindHistory(sec) {
    if (!W.gsap || !Anim.ok()) return;
    const g = W.gsap;
    if (sec._histOff) sec._histOff();          /* 重复挂载时先摘掉上一轮的监听 */

    const eras = $$('.hist-era', sec);
    eras.forEach((era) => {
      const evs = $$('.hist-ev', era);
      if (!evs.length) return;
      evs.forEach((el) => {
        const inW = !!el.closest('.hist-col.w');
        /* 左列从靠轴的一侧（右）往外展开，右列对称 —— 像是从轴上长出来 */
        /* y 也留一点：卡片既从轴那一侧横着过来，又轻轻上浮 —— 只有横移
           看起来像抽屉被拉开，加了纵向位移才像长出来。 */
        g.set(el, { opacity: 0, x: inW ? 26 : -26, y: 12 });
      });
      g.set($$('.hist-node', era), { scale: 0, transformOrigin: 'center center' });
      g.set($$('.hist-axis', era), { scaleY: 0, transformOrigin: 'top center' });
      era._tlDone = false;
      era._tlEvs = evs;
      era._tlNodes = $$('.hist-node', era);
      era._tlAxes = $$('.hist-axis', era);
    });

    function play(era) {
      if (!era._tlEvs || era._tlDone) return;
      era._tlDone = true;
      /* 轴先长、卡片跟着出来 —— 顺序反了会看到「卡片挂在半空中」 */
      g.to(era._tlAxes, { scaleY: 1, duration: .85, ease: 'power2.out' });
      g.to(era._tlEvs, { opacity: 1, x: 0, y: 0, duration: .5, ease: 'power2.out', stagger: .055, delay: .12 });
      g.to(era._tlNodes, { scale: 1, duration: .34, ease: 'back.out(2)', stagger: .055, delay: .12 });

      /* 看门狗：GSAP 靠 rAF 推进，而 rAF 在后台标签页里根本不跑。
         用户从别的页面「在新标签页打开」时，动画会永远停在初始态 —— 卡片全隐形，
         页面上只有段头，而且一点报错都没有。2.4 秒后回看一眼，没亮起来就直接归位：
         宁可没有动效，也不能没有内容。 */
      W.setTimeout(() => {
        const first = era._tlEvs[0];
        if (first && parseFloat(first.style.opacity || '1') > .95) return;
        g.set(era._tlEvs, { opacity: 1, x: 0, y: 0 });
        g.set(era._tlNodes, { scale: 1 });
        g.set(era._tlAxes, { scaleY: 1 });
      }, 2400);
    }

    /* 顶部进到视口 90% 处就播。不判「底部是否还在视口内」：
       已经滚过去的那几段（top 是负数）同样要播，否则往回滚看到的是一片空白。 */
    function inView(el) {
      return el.getBoundingClientRect().top <
        (W.innerHeight || D.documentElement.clientHeight) * .9;
    }
    function check() {
      let left = 0;
      eras.forEach((era) => {
        if (era._tlDone || !era._tlEvs) return;
        if (inView(era)) play(era); else left++;
      });
      /* 全播完了就把监听摘掉：不必让别的视图里的滚动也来问一遍 */
      if (!left && sec._histOff) sec._histOff();
    }

    const raf = W.requestAnimationFrame ? W.requestAnimationFrame.bind(W)
                                        : (fn) => W.setTimeout(fn, 16);
    let ticking = false;
    const start = () => {
      check();
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        raf(() => { ticking = false; check(); });
      };
      sec._histOff = () => W.removeEventListener('scroll', onScroll);
      W.addEventListener('scroll', onScroll, { passive: true });
    };
    /* 双 rAF：等 .on 生效、布局算完，再量第一屏 */
    raf(() => raf(start));
  }

  /* 按厂商看：一次只展开一家。
     这里必须独立于 bindHistory —— 那边一开头就 `if (!W.gsap || !Anim.ok()) return;`，
     动效降级时整段不跑，绑在这里的东西会跟着一起静默消失。 */
  function bindVendors(sec) {
    const chips = $$('.vd-chip', sec);
    const panels = $$('.vd-panel', sec);
    if (!chips.length || !panels.length) return;

    const hint = $('.vd-hint', sec);
    const g = (W.gsap && Anim.ok()) ? W.gsap : null;
    let cur = '';

    function play(panel) {
      if (!g) return;
      const items = $$('.vd-it', panel);
      if (!items.length) return;
      g.fromTo(items,
        { opacity: 0, x: -14 },
        { opacity: 1, x: 0, duration: .34, ease: 'power2.out', stagger: .022, overwrite: true });
      /* 看门狗：rAF 在后台标签页不跑，2 秒后没亮起来就直接归位 */
      W.setTimeout(() => {
        const f = items[0];
        if (!f || parseFloat(f.style.opacity || '1') > .95) return;
        g.set(items, { opacity: 1, x: 0 });
      }, 2000);
    }

    function show(id) {
      chips.forEach((c) => c.classList.toggle('on', c.getAttribute('data-vd') === id));
      panels.forEach((p) => p.classList.toggle('on', p.getAttribute('data-vd-panel') === id));
      if (hint) hint.hidden = !!id;
      if (!id) return;
      const panel = panels.filter((p) => p.getAttribute('data-vd-panel') === id)[0];
      if (!panel) return;
      play(panel);
      /* 面板在芯片下方，点靠后那几家时它可能落在屏幕外 ——
         不滚一下，用户看到的就是「点了没反应」。已经在视口里就别动。

         ⚠ 这段千万不要用 requestAnimationFrame 包：无头环境（以及后台标签页）
         rAF 几乎不推进，包进去等于整段不执行，症状就是「点了完全没反应」，
         而且不报错。同步量 rect 是准的（classList 刚改过，读 rect 会强制布局）。*/
      const outOfView = () => {
        const r = panel.getBoundingClientRect();
        const vh = W.innerHeight || D.documentElement.clientHeight;
        return r.top > vh * .72 || r.top < 0;
      };
      if (outOfView()) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        /* 兜底：平滑滚动自己也是靠 rAF 推进的，推不动就 600ms 后直接跳过去——
           宁可生硬，也不能「点了没反应」 */
        W.setTimeout(() => {
          if (outOfView()) panel.scrollIntoView({ block: 'start' });
        }, 600);
      }
    }

    chips.forEach((ch) => {
      ch.addEventListener('click', () => {
        const id = ch.getAttribute('data-vd');
        cur = cur === id ? '' : id;   /* 再点自己就是收起 */
        show(cur);
      });
    });

    /* 页头那个「按厂商看版本」：厂商区在最底下，隔着一百多条主线，
       不指一下根本发现不了。同样挂 setTimeout 兜底，不用 rAF。 */
    const jump = $('[data-vd-jump]', sec);
    const box = $('.vd', sec);
    if (jump && box) {
      jump.addEventListener('click', () => {
        box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        W.setTimeout(() => {
          const r = box.getBoundingClientRect();
          if (r.top > 40 || r.top < -40) box.scrollIntoView({ block: 'start' });
        }, 600);
      });
    }
  }

  /* =================================================================
     发展史 · 年代进度轨 + 段头视差
     -----------------------------------------------------------------
     左侧浮一条竖向年代轨：一个刻度对应一个年代，指示器随滚动连续下移，
     当前段的年份与段名在轨上方亮着，刻度加粗发蓝；点刻度直接跳过去。
     段头做一点视差 —— 比正文慢半拍地飘，让长列表有一页一页翻过去的
     层次，而不是一坨字往下拖。

     四条约束，都是踩过的地方：

     ① 轨道必须挂在视图容器直属，不能塞进 .blk。Anim.enter 会给 .blk
        临时加 transform，祖先一旦有 transform，position:fixed 就退化成
        absolute，轨道会跟着页面滚走。
     ② 判「现在在哪一段」用视线位置（视口 42% 高处），不用「顶部进入」：
        按顶部判出来的段永远比眼睛看到的超前一段。
     ③ 滚动回调走 setTimeout 节流，不用 rAF。无头环境与后台标签页里 rAF
        几乎不推进，包进去等于整段不执行，而且不报错。
     ④ 视差只碰 .hist-eh（段头）。卡片与轴线被 GSAP 管着（x 位移、scaleY），
        同一个元素上两方各写各的 transform，后写的会把前写的抹掉。
     ================================================================= */
  function bindHistoryRail(sec) {
    const rail = $('.hist-rail', sec);
    const eras = $$('.hist-era', sec);
    if (!rail || eras.length < 2) return;

    const segs = $$('.hr-seg', rail);
    const fillBar = $('.hr-fill', rail);
    const knob = $('.hr-knob', rail);
    const nowYear = $('.hr-now-y', rail);
    const nowName = $('.hr-now-n', rail);
    const total = eras.length;
    let activeIndex = -1;
    let lastScrollY = -1;

    /* 各段在文档里的纵向范围。rect 不含 margin，段与段之间那 48px 的缝
       就落进上一段的尾巴里 —— 缝只有 86px，肉眼看不出来，不值得额外补。 */
    function measure() {
      const sy = W.scrollY || W.pageYOffset || 0;
      return eras.map((era) => {
        const r = era.getBoundingClientRect();
        return { top: r.top + sy, height: Math.max(1, r.height) };
      });
    }

    function update() {
      const sy = W.scrollY || W.pageYOffset || 0;
      lastScrollY = sy;                        // 兜底轮询靠它判断「位置变没变」
      const vh = W.innerHeight || D.documentElement.clientHeight;
      const eye = sy + vh * .42;              // 视线落在文档里的位置
      const spans = measure();

      /* ① 当前段：最后一个顶边在视线之上的段 */
      let index = 0;
      for (let i = 0; i < total; i++) if (spans[i].top <= eye) index = i;

      /* ② 连续进度：段内按比例插值，各段在轨上等分。
            等分是有意的 —— 各段条目 6 条到 40 条不等，按真实高度分的话，
            短段的刻度会挤成一条线，反倒看不出走到哪了。 */
      const cur = spans[index];
      const local = Math.min(1, Math.max(0, (eye - cur.top) / cur.height));
      let progress = (index + local) / total;
      if (eye < spans[0].top) progress = 0;
      if (index === total - 1 && local >= 1) progress = 1;

      const pct = (progress * 100).toFixed(2) + '%';
      if (fillBar) fillBar.style.height = pct;
      if (knob) knob.style.top = pct;

      if (index !== activeIndex) {
        activeIndex = index;
        segs.forEach((b, i) => b.classList.toggle('on', i === index));
        const seg = segs[index];
        if (seg) {
          if (nowYear) nowYear.textContent = seg.querySelector('em').textContent;
          if (nowName) nowName.textContent = seg.getAttribute('data-n') || '';
        }
      }

      /* ③ 段头视差：处在本视口里的段头，按它离视口中线的距离偏移，
            最远 ±14px。再大段头就和下面的卡片脱开了。 */
      eras.forEach((era) => {
        const head = era.historyHead || (era.historyHead = $('.hist-eh', era));
        if (!head) return;
        const r = head.getBoundingClientRect();
        if (r.bottom < -120 || r.top > vh + 120) return;   // 视口外的别算
        const away = (vh * .5 - (r.top + r.height / 2)) / (vh * .5);
        const dy = Math.max(-14, Math.min(14, away * 14));
        head.style.transform = 'translateY(' + dy.toFixed(1) + 'px)';
      });
    }

    /* 点刻度直接落到那一段顶部，留 20px 余量，别贴着视口边 */
    rail.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-hr-go]');
      if (!btn) return;
      const era = eras[+btn.getAttribute('data-hr-go')];
      if (!era) return;
      const top = (W.scrollY || 0) + era.getBoundingClientRect().top - 20;
      /* instant 而不是 smooth：html 上有 scroll-behavior:smooth，而无头
         环境里平滑滚动一帧都不推进（量出来永远是原地，看起来像「点了没反应」）。
         这里「点了就到位」本身也比滑半天好用。 */
      W.scrollTo({ top: top, behavior: 'instant' });
      update();
    });

    let pending = 0;
    const onScroll = () => {
      if (pending) return;
      pending = W.setTimeout(() => { pending = 0; update(); }, 60);
    };
    W.addEventListener('scroll', onScroll, { passive: true });
    W.addEventListener('resize', onScroll, { passive: true });

    /* 兜底：有环境不派发 scroll 事件。实测「无头 + 虚拟时间 + 关动效」这个组合下，
       滚动位置明明从 0 走到了 4450，window / document / 捕获层三个监听收到的
       次数全是 0 —— 轨道于是僵在第一段，而控制台一个错都没有。
       真实浏览器不会这样，但轨道不该建立在「事件一定会来」上：每 320ms 看一眼
       滚动位置，变了才重算。正常情况 scroll 事件先到、lastScrollY 已经同步过，
       这里直接跳过，代价接近于零。 */
    const tick = () => {
      if (!sec.classList.contains('on')) return;   // 人在别的视图，别白算
      if ((W.scrollY || W.pageYOffset || 0) === lastScrollY) return;
      update();
    };
    const poll = W.setInterval(tick, 320);

    /* 视图刚挂上时还是 display:none，量出来全是 0。等 .on 生效后再算第一次 */
    W.setTimeout(update, 80);

    sec.historyRailOff = () => {
      W.removeEventListener('scroll', onScroll);
      W.removeEventListener('resize', onScroll);
      W.clearInterval(poll);
    };
  }

/* 视图首次挂载后的收尾：筛选绑定 / 代码高亮 */
  function afterMount(key, sec) {
    if (key === 'library') bindLibrary(sec);
    if (key === 'drill') bindDrill(sec);
    if (key === 'atlas' && W.ATLAS) W.ATLAS.bind(sec);
    if (key === 'history') bindHistory(sec);
    if (key === 'history') bindVendors(sec);
    if (key === 'history') bindHistoryRail(sec);
    paintCode(sec);
    refreshShelf();
    applyStage();
  }

  /* 检索命中后滚动并高亮 */
  function highlightText(text) {
    /* 这里必须把**所有可被检索命中的卡片类**列全，漏一个的表现是
       「点了搜索结果，视图换了但没定位」—— 不报错，所以特别难发现。
       对应关系：选型 .stk-row / 案例 .cs-case / 工具 .tl-item /
       踩坑 .pf / 架构 .ar-pat .ar-proj / 问答 .qa / 路线 .rm-ph。 */
    const nodes = $$('.stk-row, .cs-case, .tl-item, .pf, .ar-pat, .ar-proj, .qa, .rm-ph');
    for (const n of nodes) {
      if (n.textContent.indexOf(text) >= 0) {
        /* 命中项可能不在当前档里（被 .st-over 收起来了）。
           display:none 的元素 scrollIntoView 不动 —— 用户点了搜索结果却
           什么都没发生，是最糟的一种反馈。所以直接切到「全部」，
           并明说为什么，让他知道档位被动过、也能切回去。 */
        if (n.classList.contains('st-over')) {
          Stage.set(0);
          Toast.show('这条不在你选的档里 · 已切到「全部」等级');
        }
        n.classList.add('flash');
        n.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setTimeout(() => n.classList.remove('flash'), 2600);
        return;
      }
    }
  }

  /* ================= 知识库筛选 =================
     两个维度都在这里：标签（用户自己点的）与等级（顶栏的）。
     等级在知识库的口径跟别处不一样，是刻意的：
     切到某一档 = **只摊开这一档**，更早档的收起来（可展开），更高档的不出现。
     别处（选型 / 案例 / 踩坑）低档本来就一条都没有，累计和「只看本档」
     看起来一样；知识库有第 1 档的内容，一累计就混在一起了。 */
  const FILTER = { tag: '' };

  /* 更早档摊开没有。换档就收回 —— 切档的意思是「我换看哪一批」，
     上一批的展开状态跟过来，只会让人以为自己没切干净。 */
  const FOLD = { on: false, stage: null };

  /* 筛选条绑在视图上（列表内容由 views.js 直接渲染，这里只管过滤） */
  function bindLibrary(sec) {
    const flt = $('.flt[data-flt="library"]', sec);
    if (flt && !flt.dataset.bound) {
      flt.dataset.bound = '1';
      flt.addEventListener('click', (e) => {
        const b = e.target.closest('.chip');
        if (!b || !b.hasAttribute('data-tag')) return;
        FILTER.tag = b.getAttribute('data-tag');
        $$('.chip[data-tag]', flt).forEach((x) => x.classList.toggle('on', x === b));
        applyFilter(sec);
      });
    }
    const fold = $('[data-lib-fold]', sec);
    if (fold && !fold.dataset.bound) {
      fold.dataset.bound = '1';
      fold.addEventListener('click', (e) => {
        if (!e.target.closest('[data-lib-fold-go]')) return;
        FOLD.on = !FOLD.on;
        applyFilter(sec);
      });
    }
    applyFilter(sec);
  }

  function applyFilter(sec) {
    if (!sec) return;
    const n = Stage.cur;
    if (FOLD.stage !== n) { FOLD.on = false; FOLD.stage = n; }

    let own = 0, earlier = 0, later = 0;
    $$('.lg', sec).forEach((g) => {
      let gn = 0;
      $$('.kn', g).forEach((r) => {
        const okT = !FILTER.tag ||
          (r.getAttribute('data-tags') || '').split('|').indexOf(FILTER.tag) >= 0;
        const st = Number(r.getAttribute('data-st')) || 0;
        /* 三条去向：本档摊开 / 更早档收着 / 更高档不出现。
           没标档的（st=0）任何档都算本档 —— 不留这个口子，以后加一条忘标档的
           条目就会在任何档下都消失，而页面上完全看不出异常。 */
        let rel = 'own';
        if (n && st) rel = st === n ? 'own' : (st < n ? 'earlier' : 'later');
        if (okT) {
          if (rel === 'own') own++;
          else if (rel === 'earlier') earlier++;
          else later++;
        }
        const show = okT && (rel === 'own' || (rel === 'earlier' && FOLD.on));
        r.style.display = show ? '' : 'none';
        r.classList.toggle('is-earlier', okT && rel === 'earlier');
        if (show) gn++;
      });
      // 整组被筛空就把组一起收起来，不留空标题
      g.style.display = gn ? '' : 'none';
    });

    const c = $('[data-flt-cnt]', sec);
    if (c) {
      c.textContent = n === 0
        ? own + ' 条'
        : '本档 ' + own + ' 条' + (later ? ' · 另有 ' + later + ' 条在更高等级' : '');
    }

    /* 更早档那一行：有得收才出现，条数是实时数的（加内容那天不用回来改文案） */
    const fold = $('[data-lib-fold]', sec);
    if (fold) {
      fold.style.display = (n > 0 && earlier) ? '' : 'none';
      const tx = $('[data-lib-fold-tx]', fold);
      if (tx) {
        tx.textContent = (FOLD.on ? '收起更早档的 ' : '更早档的 ') + earlier + ' 条' +
          (FOLD.on ? '' : ' · 点开看看');
      }
      const btn = $('[data-lib-fold-go]', fold);
      if (btn) btn.classList.toggle('on', FOLD.on);
      /* 三角用字符切，不用 transform 转 —— 转了之后 10px 的 ▾ 看着像个点 */
      const ic = $('[data-lib-fold-ic]', fold);
      if (ic) ic.textContent = FOLD.on ? '▾' : '▸';
    }

    /* 一条都不剩时说明一句。两种空要分开说：
       ① 这一档里没有，但别档有 → 给出口；② 这个标签压根没有条目 → 换个标签。
       「一条都不剩」按**看得见的**算：摊开更早档之后有内容了，这句就要收回去。 */
    const emp = $('[data-lib-empty]', sec);
    if (emp) {
      const total = own + earlier + later;
      const visible = own + (FOLD.on ? earlier : 0);
      emp.style.display = (total && !visible) ? '' : 'none';
      const b = $('[data-lib-empty-b]', emp);
      const p = $('[data-lib-empty-p]', emp);
      const go = $('[data-lib-empty-go]', emp);
      if (b && p && go) {
        if (total) {
          b.textContent = '这个标签，在你挑的这一档里还没有条目。';
          p.textContent = '它名下的条目分散在别的档里 —— 放宽到「全部」，' +
            '这个标签的内容就都在了。';
          go.style.display = '';
        } else {
          b.textContent = '这个标签下还没有条目。';
          p.textContent = '换个标签看看 —— 右上角那个数字会跟着变。';
          go.style.display = 'none';
        }
      }
    }
  }

  /* ================= 问答筛选 =================
     状态放模块级：等级一变要重算计数，得从外面够得着。 */
  const DRILL_FILTER = { star: false, group: '' };

  function bindDrill(sec) {
    const flt = $('.flt[data-flt="drill"]', sec);
    if (!flt) return;
    const state = DRILL_FILTER;
    flt.addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      if (b.hasAttribute('data-dkind')) {
        state.star = b.getAttribute('data-dkind') === 'star';
        $$('.chip[data-dkind]', flt).forEach((x) => x.classList.toggle('on', x === b));
      } else if (b.hasAttribute('data-dgroup')) {
        const g = b.getAttribute('data-dgroup');
        state.group = state.group === g ? '' : g;   // 再点一次取消该组
        $$('.chip[data-dgroup]', flt).forEach((x) =>
          x.classList.toggle('on', !!state.group && x.getAttribute('data-dgroup') === state.group));
      }
      applyDrill(sec, state);
    });
    applyDrill(sec, state);
  }

  function applyDrill(sec, st) {
    if (!sec) return;
    const n = Stage.cur;
    let shown = 0;
    $$('.dr-group', sec).forEach((g) => {
      const gid = g.getAttribute('data-group');
      const gOn = !st.group || st.group === gid;
      let gn = 0;
      $$('.qa', g).forEach((q) => {
        const stq = Number(q.getAttribute('data-st')) || 0;
        const okS = !n || !stq || stq <= n;      // 没标等级的题（通用题）任何档都留着
        const on = gOn && (!st.star || q.getAttribute('data-star') === '1') && okS;
        q.style.display = on ? '' : 'none';
        if (on) gn++;
      });
      // 有星标筛选时，空组也隐藏
      g.style.display = gn ? '' : 'none';
      shown += gn;
    });
    const c = $('[data-flt-cnt]', sec);
    if (c) c.textContent = shown + ' 题';
  }

  /* ================= 我的回顾台 ================= */
  function refreshShelf() {
    const sec = $('[data-sec="overview"]');
    if (!sec) return;
    const sb = $('[data-shelf-body]', sec);
    const rb = $('[data-recent-body]', sec);
    const sn = $('[data-shelf-n]', sec);
    const rn = $('[data-recent-n]', sec);
    if (!sb || !rb) return;

    const D0 = W.DATA;
    const stars = Store.starIds().filter((id) => D0.pointMap[id]);
    const recents = Store.recentIds().filter((id) => D0.pointMap[id]);

    if (sn) sn.textContent = stars.length;
    if (rn) rn.textContent = recents.length;

    sb.innerHTML = stars.length
      ? stars.map(rowHtml).join('')
      : '<p class="shelf-empty">还没有收藏。打开任意一条，点右上角 ☆ 收下——以后从这里直接回到它。</p>';
    rb.innerHTML = recents.length
      ? recents.map(rowHtml).join('')
      : '<p class="shelf-empty">浏览记录是空的。看过的知识点会自动排在这里，最多留 12 条。</p>';
  }

  function rowHtml(id) {
    const p = W.DATA.pointMap[id];
    const n = W.DATA.noteCount(id);
    return '<button class="shelf-row" type="button" data-open="' + id + '">' +
      '<span class="shelf-t">' + esc(p.title) + '</span>' +
      '<span class="shelf-m">' + esc(p.topicName) + (n ? ' · 要点 ' + n : '') + '</span>' +
    '</button>';
  }

  /* ================= 顶栏计数 ================= */
  function refreshCounts() {
    const D0 = W.DATA;
    $$('[data-meta-points]').forEach((el) => { el.textContent = D0.allIds.length; });
    $$('[data-meta-notes]').forEach((el) => { el.textContent = D0.noteTotal(); });
    const dn = W.DRILL ? W.DRILL.total : 0;
    $$('[data-meta-drill]').forEach((el) => { el.textContent = dn; });
    const nCase = W.CASES ? W.CASES.groups.reduce((a, g) => a + g.items.length, 0) : 0;
    const nTool = W.CASES ? W.CASES.toolGroups.reduce((a, g) => a + g.items.length, 0) : 0;
    $$('[data-meta-total]').forEach((el) => {
      el.textContent = '收录 ' + D0.allIds.length + ' 个知识点、' + dn + ' 道问答，' +
        '以及选型速查、常见架构、' + nCase + ' 个真实做法、' + nTool + ' 个工具分析和 ' +
        (W.PITFALLS ? W.PITFALLS.groups.reduce((a, g) => a + g.items.length, 0) : 0) + ' 条踩坑记录。';
    });
  }

  /* ================= 内容抽屉 ================= */
  const PANES = [
    { k: 'concept',   t: '概念', type: 'paras' },
    { k: 'anim',      t: '动画', type: 'anim' },
    { k: 'notes',     t: '要点', type: 'notes' },
    { k: 'ind',       t: '落到你这行', type: 'ind' },
    { k: 'analogy',   t: '通俗', type: 'paras' },
    { k: 'cases',     t: '案例', type: 'cases' },
    { k: 'practice',  t: '实操', type: 'practice' },
    { k: 'interview', t: '问答', type: 'qa', n: 'Q' },
    { k: 'quiz',      t: '自测', type: 'qa', n: 'Q' }
  ];

  const Drawer = {
    cur: null,
    init() {
      this.el = $('.dwg');
      if (!this.el) return;
      const scrim = $('.scrim');
      if (scrim) scrim.addEventListener('click', () => this.close());
      $('[data-act="close"]', this.el).addEventListener('click', () => this.close());

      D.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (Finder.isOpen()) { Finder.close(); return; }
          this.close();
          return;
        }
        if (!this.cur) return;
        if (D.activeElement && /INPUT|TEXTAREA/.test(D.activeElement.tagName)) return;
        if (e.key === 'ArrowLeft') { this.step(-1); }
        else if (e.key === 'ArrowRight') { this.step(1); }
        else if (e.key === '/') { e.preventDefault(); Finder.open(); }
      });

      // Ctrl/Cmd + K 全局检索
      D.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
          e.preventDefault();
          Finder.isOpen() ? Finder.close() : Finder.open();
        }
      });

      $$('[data-act="search"]').forEach((b) => b.addEventListener('click', () => Finder.open()));

      $('.seg', this.el).addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (b) this.tab(b.getAttribute('data-pane'));
      });

      $('[data-act="star"]', this.el).addEventListener('click', () => {
        if (!this.cur) return;
        const on = Store.toggleStar(this.cur);
        this.syncStar(on);
        Toast.show(on ? '已收藏 · ' + W.DATA.get(this.cur).title : '已取消收藏');
        refreshShelf();
      });

      $('[data-act="prev"]', this.el).addEventListener('click', () => this.step(-1));
      $('[data-act="next"]', this.el).addEventListener('click', () => this.step(1));

      // 题目展开：视图区（问答）与抽屉（问答/自测）共用，绑在 document 上，
      // 否则问答里的题点不开（2026-09-16 修）
      D.addEventListener('click', (e) => {
        const q = e.target.closest('.qa-q');
        if (q && !e.target.closest('.cp')) q.parentNode.classList.toggle('open');
      });
      D.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const q = e.target.closest && e.target.closest('.qa-q');
        if (q) { e.preventDefault(); q.parentNode.classList.toggle('open'); }
      });
    },

    open(id, pane) {
      const p = W.DATA.get(id);
      if (!p) return;
      const c = W.DATA.c(id);
      this.cur = id;
      Store.touch(id);

      $('[data-dwg-kicker]', this.el).innerHTML =
        '<i class="st st' + p.stage + '">' + esc(W.DATA.stageName(p.stage)) + '</i>' +
        '<span class="dwg-tp">' + esc(p.topicName) + '</span>';
      $('[data-dwg-title]', this.el).textContent = p.title;
      $('[data-dwg-desc]', this.el).textContent = p.brief;
      this.syncStar(Store.isStar(id));

      $$('.kn').forEach((r) => r.classList.toggle('on', r.getAttribute('data-open') === id));

      const seg = $('.seg', this.el);
      const body = $('.dwg-body', this.el);
      if (W.ANIM) W.ANIM.destroy();   /* 换卡片先把上一条的动画收掉 */

      if (!c) {
        seg.innerHTML = '';
        body.innerHTML = '<div class="empty">这条的内容正在整理中</div>';
      } else {
        const avail = PANES.filter((x) => {
          if (x.k === 'anim') return !!(W.ANIM && W.ANIM.has(id));
          /* 「落到你这行」只有选了行业才出现 —— 没选的人不该看到一个空页签 */
          if (x.k === 'ind') return !!Ind.group();
          return c[x.k] && (Array.isArray(c[x.k]) ? c[x.k].length : true);
        });
        seg.innerHTML = avail.map((x, i) =>
          '<button type="button" data-pane="' + x.k + '"' + (i === 0 ? ' class="on"' : '') + '>' + x.t + '</button>'
        ).join('');
        body.innerHTML = avail.map((x, i) =>
          '<div class="pane' + (i === 0 ? ' on' : '') + '" data-pane="' + x.k + '">' +
            ((x.k === 'notes' || x.k === 'ind') ? '' : '<h4>' + x.t + '</h4>') +
            (x.k === 'ind' ? Ind.pane(p) : renderPane(x, c[x.k])) +
          '</div>'
        ).join('');
        paintCode(body);
        const anHost = $('.pane[data-pane="anim"] .anim-host', body);
        if (anHost && W.ANIM) {
          W.ANIM.mount(id, anHost);
          if (avail[0] && avail[0].k === 'anim') W.ANIM.play();
        }
      }

      this.el.classList.add('open');
      const sc = $('.scrim'); if (sc) sc.classList.add('on');
      body.scrollTop = 0;
      if (pane) this.tab(pane);
      if (W.gsap && Anim.ok()) W.gsap.fromTo(body, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .3, ease: 'power2.out' });
      refreshShelf();
    },

    tab(k) {
      $$('.seg button', this.el).forEach((b) => b.classList.toggle('on', b.getAttribute('data-pane') === k));
      $$('.pane', this.el).forEach((p) => p.classList.toggle('on', p.getAttribute('data-pane') === k));
      const body = $('.dwg-body', this.el); body.scrollTop = 0;
      const on = $('.pane.on', body);
      if (W.ANIM) { if (k === 'anim') W.ANIM.play(); else W.ANIM.pause(); }
      if (on && W.gsap && Anim.ok()) W.gsap.fromTo(on, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .26, ease: 'power2.out' });
    },

    /* 换行业时同步抽屉：这一页受行业影响的不只是内容，还有"出不出现" ——
       没选行业时它整个不在页签里。所以不只是在原地换文案，
       而是按当前页签把这张卡重开一次，避免页签和内容对不上。 */
    refreshInd() {
      if (!this.cur || !this.el) return;
      let key = '';
      $$('.seg button', this.el).forEach((b) => {
        if (b.classList.contains('on')) key = b.getAttribute('data-pane');
      });
      if (key === 'ind' && !Ind.group()) key = '';   /* 行业被取消 → 退回第一个页签 */
      this.open(this.cur, key || undefined);
    },

    syncStar(on) {
      const b = $('[data-act="star"]', this.el);
      b.setAttribute('data-on', on ? '1' : '0');
      b.textContent = on ? '★' : '☆';
      b.title = on ? '取消收藏' : '收藏这条';
    },

    step(dir) {
      const ids = W.DATA.allIds;
      const i = ids.indexOf(this.cur);
      const n = ids[i + dir];
      if (n) this.open(n); else Toast.show(dir > 0 ? '已经是最后一条' : '已经是第一条');
    },

    close() {
      this.el.classList.remove('open');
      const sc = $('.scrim'); if (sc) sc.classList.remove('on');
      $$('.kn').forEach((r) => r.classList.remove('on'));
      if (W.ANIM) W.ANIM.destroy();
      this.cur = null;
    }
  };

  /* ================= 抽屉内各段渲染 ================= */
  /* 正文里允许用 **双星号** 表示加粗。
     老内容直接写 <strong>，新增内容写 **，两种都得认。
     只吃「成对」的 **…**，所以代码里的 0.995 ** age_d、glob 里的 src/rag/** 不会被误伤。 */
  function md(s) {
    return String(s).replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  }

  function renderPane(meta, v) {
    if (meta.type === 'anim') return '<div class="anim-host"></div>';
    if (meta.type === 'notes') return W.VIEWS.notesPane(v);

    if (meta.type === 'paras') return v.map((x) => '<p>' + md(x) + '</p>').join('');

    /* 案例：由浅到深三档。老内容还是纯字符串，兼容成「只有第一档」。 */
    if (meta.type === 'cases') {
      return '<div class="cx-list">' + v.map((x) =>
        (typeof x === 'string')
          ? '<article class="cx cx-flat">' + md(x) + '</article>'
          : '<article class="cx">' +
              '<p class="cx-plain">' + md(x.p) + '</p>' +
              '<div class="cx-row"><span class="cx-lb">换到这里</span><p>' + md(x.s) + '</p></div>' +
              '<div class="cx-row cx-row-deep"><span class="cx-lb">往下挖</span><p>' + md(x.d) + '</p></div>' +
            '</article>'
      ).join('') + '</div>';
    }

    if (meta.type === 'practice') {
      const steps = (v.steps || []).map((s) => '<li>' + md(s) + '</li>').join('');
      const code = v.code
        ? '<pre data-code="' + meta.k + '"><button class="cp" type="button">copy</button><code>' +
          hl(v.code, v.lang || 'python') + '</code></pre>' : '';
      const expect = v.expect ? '<div class="note"><b>预期结果　</b>' + md(v.expect) + '</div>' : '';
      const pits = (v.pitfalls || []).length
        ? '<h4 style="margin-top:20px">常见坑</h4>' + v.pitfalls.map((p) => '<div class="pit"><em>!</em><span>' + md(p) + '</span></div>').join('')
        : '';
      return (steps ? '<h4>操作步骤</h4><ol class="steps">' + steps + '</ol>' : '') + code + expect + pits;
    }

    if (meta.type === 'qa') {
      return v.map((x, i) =>
        '<div class="qa"><div class="qa-q"><span class="qa-n">' + (meta.n ? meta.n + (i + 1) : 'Q') + '</span>' +
        '<span class="qa-t">' + md(x.q) + '</span></div>' +
        '<div class="qa-a">' + md(x.a) + '</div></div>'
      ).join('') + '<p class="hint">点击题目展开参考答案</p>';
    }
    return '';
  }

  /* ================= 代码复制 ================= */
  function paintCode(root) {
    $$('.cp', root || D).forEach((b) => {
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const src = $('code', b.closest('pre')).innerText;
        const done = () => { b.textContent = 'copied'; b.classList.add('ok'); setTimeout(() => { b.textContent = 'copy'; b.classList.remove('ok'); }, 1400); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(src).then(done).catch(() => fallback(src, done));
        } else fallback(src, done);
      });
    });
  }
  function fallback(text, cb) {
    const t = D.createElement('textarea');
    t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    D.body.appendChild(t); t.select();
    try { D.execCommand('copy'); cb(); } catch (e) { Toast.show('复制失败，请手动选择'); }
    D.body.removeChild(t);
  }

  /* ================= 导航栏 ================= */
  function renderTabs() {
    const mount = $('#tabs-mount');
    if (!mount) return;
    mount.innerHTML = W.DATA.views.map((v) =>
      '<button class="tab" type="button" data-view="' + v.k + '">' +
        '<span class="tab-t">' + esc(v.t) + '</span>' +
        '<span class="tab-en">' + esc(v.en) + '</span>' +
      '</button>'
    ).join('');
  }

  /* ================= 启动 ================= */
  function boot() {
    /* 顶栏 + 图纸目录实测高度 → --navh，给长清单的吸顶分组头定位用。
       写死数值在换字体/窄屏换行后会错位，所以量一次写进 :root。 */
    function measureNav() {
      const nav = $('.nav');
      if (nav) D.documentElement.style.setProperty('--navh', nav.offsetHeight + 'px');
    }

    function run() {
      Stage.load();
      Ind.load();       /* 必须早于 Router.init：视图一渲染就要按"我这行"填内容 */
      renderTabs();
      renderStages();
      bindStages();
      measureNav();
      Finder.init();
      Drawer.init();
      Router.init();
      refreshCounts();
      refreshShelf();
      paintCode();
      applyStageAll();
      Anim.intro();
      if (W.addEventListener) W.addEventListener('resize', measureNav);
    }
    if (D.readyState === 'loading') {
      D.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  W.AIWB = {
    $: $, $$: $$, esc: esc, hl: hl, Store: Store, Toast: Toast,
    Drawer: Drawer, Router: Router, Finder: Finder, Anim: Anim, Stage: Stage,
    Ind: Ind, applyInd: applyInd,
    boot: boot, paintCode: paintCode, refreshShelf: refreshShelf, applyStage: applyStageAll
  };
})();
