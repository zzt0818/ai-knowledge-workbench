/* ============================================================
   视图层 · Views
   各视图的内容模板。core.js 负责路由与交互，这里只管长什么样。

   口径：不出现任何编号、版本号、件数。知识点的名字就是它的名字。
   ============================================================ */
(function () {
  const W = window;
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* 段落小标题 */
  const head = (title, tag) =>
    '<div class="sec-head"><h2>' + title + '</h2>' +
    (tag ? '<span class="tag">' + tag + '</span>' : '') + '</div>';

  /* 等级小徽标：入门 / 认识 / 上手 / 搭建 / 开发 */
  const stChip = (n) => {
    const s = W.DATA.stage(n);
    return '<i class="st st' + n + '">' + esc(s.name) + '</i>';
  };

  /* 条目的等级属性交给 core.js 统一收放（见 applyStage 的 [data-st]）。
     没写等级 = 任何档都看得见，不要替它猜一个。 */
  const stAttr = (n) => (n ? ' data-st="' + n + '"' : '');

  /* ================================================================
     1. 总览
     ================================================================ */
  function overview() {
    const D0 = W.DATA;

    const topicCards = D0.topics.map((t) =>
      '<button class="tp" type="button" data-jump-topic="' + t.id + '">' +
        '<span class="tp-hd">' +
          '<b>' + esc(t.name) + '</b>' +
          '<i>' + esc(t.en) + '</i>' +
        '</span>' +
        '<span class="tp-desc">' + esc(t.desc) + '</span>' +
        '<span class="tp-items">' +
          t.points.map((p) => '<em>' + esc(p.title) + '</em>').join('') +
        '</span>' +
      '</button>'
    ).join('');

    /* 入口就一句话：你现在到哪一档。选了之后全站跟着收窄 */
    const stEntry = D0.stages.map((s) =>
      '<button class="stgo" type="button" data-stage-go="' + s.n + '">' +
        '<span class="stgo-n">' + s.n + '</span>' +
        '<span class="stgo-t">' + esc(s.name) + '</span>' +
        '<span class="stgo-w">' + esc(s.who) + '</span>' +
      '</button>'
    ).join('') +
    '<button class="stgo stgo-all" type="button" data-stage-go="0">' +
      '<span class="stgo-n">全</span>' +
      '<span class="stgo-t">全部</span>' +
      '<span class="stgo-w">不筛，全部都看</span>' +
    '</button>';

    return '' +
    /* ---- 开头一段话 ---- */
    '<section class="hero">' +
      '<div class="hero-kicker">AI · Agent · 大模型 · 分档梳理的知识地图</div>' +
      '<h1>Agent 知识库</h1>' +
      '<p class="hero-sub">从「第一次听说 AI」到「自己做模型层的事」，中间隔得挺远，' +
      '一口气全塞给你只会劝退。所以这里按使用者分成了五档 —— ' +
      '每往前一档，多出来的不是更难的知识，而是更靠后的问题。' +
      '选你现在那一档，看不懂的东西会先收起来；想看全，随时切「全部」。</p>' +
      '<div class="hero-tip">' +
        '<span class="kbd">Ctrl</span><span class="kbd">K</span>' +
        '<span>随时检索任意一条内容</span>' +
      '</div>' +
    '</section>' +

    /* ---- 你在哪一档 ---- */
    '<section class="blk">' +
      head('你现在到哪一档', '选了就记住，顶栏随时能改') +
      '<div class="stgo-grid">' + stEntry + '</div>' +
    '</section>' +

    /* ---- 你这行 ----
       没选行业时这一块只出一个选择器；选了之后就地铺开这行的五档场景与利弊。
       不单独开一个「行业」页：会点那一栏的人，本来就已经不需要它了。 */
    '<div data-ind-mount="overview"></div>' +

    /* ---- 知识地图 ---- */
    '<section class="blk">' +
      head('知识地图', '点一块进对应的分区') +
      '<div class="tp-grid">' + topicCards + '</div>' +
    '</section>' +

    /* ---- 我的回顾台 ---- */
    '<section class="blk">' +
      head('我的回顾台', '自动记着，下次打开还在') +
      '<div class="shelf-grid">' +
        '<div class="shelf"><div class="shelf-hd"><span class="tag">收藏</span><span class="shelf-n" data-shelf-n>0</span></div><div class="shelf-body" data-shelf-body></div></div>' +
        '<div class="shelf"><div class="shelf-hd"><span class="tag">最近浏览</span><span class="shelf-n" data-recent-n>0</span></div><div class="shelf-body" data-recent-body></div></div>' +
      '</div>' +
    '</section>' +

    /* ---- 真正要紧的几件事 ---- */
    '<section class="blk">' +
      head('学这套东西，真正要紧的是什么', '四条结论') +
      '<div class="key-grid">' +
        D0.keyPoints.map((r) =>
          '<div class="key"><h4>' + esc(r.t) + '</h4><p>' + esc(r.d) + '</p></div>'
        ).join('') +
      '</div>' +
      '<div class="note-block">' +
      '<b>怎么用这个工作台　</b>' +
      '上面十个视图是十种看法。<b>总览</b>看全局；<b>分级</b>是五个等级的分界线，' +
      '对不上自己在哪一档就先看它；<b>知识库</b>按主题分区看全部知识点，点开就是它的全部内容；' +
      '<b>选型</b>是技术栈速查；<b>架构</b>是常见系统形态；<b>案例</b>是别人怎么做出来的以及用了哪些工具；' +
      '<b>踩坑</b>是生产故障清单；<b>问答</b>按组刷题；<b>路径</b>是把它们排成先后顺序；' +
      '<b>图谱</b>是把这些知识点之间的关联摊开——谁垫在谁下面、怎么一条条走通。' +
      '随手按 <b>Ctrl K</b> 可以直接搜到任意一条。</div>' +
      '<div class="colophon">' +
        '<span data-meta-total></span>' +
        '<span>纯静态 · 单页面 · 打开即用</span>' +
        '<span>收藏与浏览记录自动保存</span>' +
      '</div>' +
    '</section>';
  }

  /* ================================================================
     2. 知识库（按主题分区）
     ================================================================ */
  function library() {
    const D0 = W.DATA;

    /* 标签云：全局收集 */
    const tagSet = {};
    D0.points.forEach((p) => p.tags.forEach((t) => { tagSet[t] = (tagSet[t] || 0) + 1; }));

    const groups = D0.topics.map((t) =>
      '<div class="lg" id="lg-' + t.id + '">' +
        '<div class="lg-hd">' +
          '<h3>' + esc(t.name) + '</h3>' +
          '<span class="lg-en">' + esc(t.en) + '</span>' +
        '</div>' +
        '<p class="lg-desc">' + esc(t.desc) + '</p>' +
        '<div class="kn-list">' +
          t.points.map((p) => {
            const n = D0.noteCount(p.id);
            return '<button class="kn" type="button" data-open="' + p.id + '" ' +
              'data-st="' + p.stage + '" data-tags="' + esc(p.tags.join('|')) + '">' +
              '<span class="kn-title">' + esc(p.title) + '</span>' +
              '<span class="kn-brief">' + esc(p.brief) + '</span>' +
              '<span class="kn-foot">' +
                '<span class="kn-tags">' + p.tags.map((x) => '<i>' + esc(x) + '</i>').join('') + '</span>' +
                '<span class="kn-meta">' + stChip(p.stage) + (n ? ' · 要点 ' + n : '') + '</span>' +
              '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
      '</div>'
    ).join('');

    return '' +
    '<section class="blk">' +
      head('知识库', '按主题分区，点任意一条看它的全部内容') +
      '<p class="lead">每条左上角那个徽标就是它的等级。等级只回答「这是给谁看的」，' +
      '不代表难不难。顶栏切一档，这一页<b>只摊开这一档</b>的条目：' +
      '更早档的收在下面那一行里，点一下就能回到各自的主题下；更高档的不出现，' +
      '想一次看全就切「全部」。</p>' +
      '<div class="flt" data-flt="library">' +
        '<span class="flt-lb">标签</span>' +
        '<button class="chip on" type="button" data-tag="">全部</button>' +
        Object.keys(tagSet).map((t) => '<button class="chip" type="button" data-tag="' + esc(t) + '">' + esc(t) + '</button>').join('') +
        '<span class="flt-fill"></span>' +
        '<span class="flt-cnt" data-flt-cnt>' + D0.points.length + ' 条</span>' +
      '</div>' +
      /* 更早档的那一批收在这一行。默认不摊开 —— 「我切到这一档」的意思就是
         「先只看这一档」；但回看的路不能断，所以给一个可展开的口子，
         摊开后它们回到各自的主题里，位置不变。显隐与条数由 core 的 applyFilter 管。 */
      '<div class="lb-fold" data-lib-fold style="display:none">' +
        '<button class="lb-fold-btn" type="button" data-lib-fold-go>' +
          '<span class="lb-fold-ic" data-lib-fold-ic aria-hidden="true">▸</span>' +
          '<span data-lib-fold-tx>更早档的条目</span>' +
        '</button>' +
      '</div>' +
      /* 两个筛选条件叠起来之后一条不剩（比如某个标签的内容全在更高的档里）。
         说的不是「你该切哪一档」，而是「它们去哪了」+ 一个直接的出口。 */
      '<div class="stk-empty lb-empty" data-lib-empty style="display:none">' +
        '<b data-lib-empty-b>这个标签，在你挑的这一档里还没有条目。</b>' +
        '<p data-lib-empty-p>它名下的条目分散在别的档里 —— 放宽到「全部」，' +
        '这个标签的内容就都在了。</p>' +
        '<button class="pf-go" type="button" data-stage-go="0" data-lib-empty-go>' +
        '看这个标签的全部条目</button>' +
      '</div>' +
      '<div class="lg-wrap">' + groups + '</div>' +
    '</section>';
  }

  /* ================================================================
     3. 分级（五个等级：谁该看、达到什么、过关标准）
     ================================================================ */
  function levels() {
    const D0 = W.DATA;
    const cnt = D0.stageCount();

    const cards = D0.stages.map((s) => {
      const own = D0.atStage(s.n);
      const acc = D0.upToStage(s.n).length;
      return '' +
      '<article class="lv-card lv' + s.n + '" data-lvn="' + s.n + '">' +
        '<div class="lv-hd">' +
          '<span class="lv-n">' + s.n + '</span>' +
          '<div class="lv-tt">' +
            '<h3>' + esc(s.name) + '</h3>' +
            '<span class="lv-en">' + esc(s.en) + '</span>' +
          '</div>' +
          '<div class="lv-fill"></div>' +
          '<span class="lv-cnt">本级 ' + (cnt[s.n] || 0) + ' 条 · 到这一档共 ' + acc + ' 条</span>' +
          '<button class="btn ghost lv-go" type="button" data-stage-go="' + s.n + '">切到这一档</button>' +
        '</div>' +
        '<div class="lv-meta">' +
          '<div><span class="lv-lb">谁</span><p>' + esc(s.who) + '</p></div>' +
          '<div><span class="lv-lb">看它是为了</span><p>' + esc(s.goal) + '</p></div>' +
          '<div><span class="lv-lb">怎么算过关</span><p>' + esc(s.pass) + '</p></div>' +
        '</div>' +
        '<div class="lv-items">' +
          '<span class="lv-lb">这一级新出现的 ' + own.length + ' 条</span>' +
          '<div class="lv-chips">' +
            own.map((p) => '<button class="lv-chip" type="button" data-open="' + p.id + '">' +
              '<b>' + esc(p.title) + '</b><span>' + esc(p.topicName) + '</span></button>').join('') +
          '</div>' +
        '</div>' +
        /* 行业例子：模板只留空壳，内容按"我这行"由 core 的 applyInd 填 */
        '<div data-ind-mount="levels-' + s.n + '"></div>' +
      '</article>';
    }).join('');

    return '' +
    '<section class="blk">' +
      head('分级', D0.stages.length + ' 个等级 · 按"谁该看"划，不是按难易划') +
      '<p class="lead">这套东西从"第一次听说 AI"到"自己做模型层的事"，中间隔得挺远，' +
      '一口气全塞给你只会劝退。所以按使用者分成五档：<b>每往前一档，' +
      '多出来的不是更难的知识，而是更靠后的问题</b>。选你现在的档，' +
      '顶栏切一下，超出这档的内容会收起来 —— 但没删，随时可以切「全部」翻回去。</p>' +
      '<div class="lv-note">' +
        '<b>怎么用这张表　</b>先看「谁」那一行对不对得上自己，' +
        '再看「看它是为了」是不是你现在想解决的问题。对不上就往下一档看，不用从第一档爬。' +
        '每一档最后那句「怎么算过关」是留给自己的检验 —— 说不出来，就说明还没到这一档。' +
      '</div>' +
      '<div data-ind-mount="levels"></div>' +
      '<div class="lv-list">' + cards + '</div>' +
    '</section>';
  }

  /* ================================================================
     行业内容挂载点（由 core 的 applyInd 按"我这行"填内容）

     为什么行业不做成一个独立视图：会点「行业」那一栏的人，本来就已经
     知道自己该看哪一行、值不值得看 —— 也就是说，这个入口对最需要它的
     人（零基础、不知道自己这行能用什么的人）恰好是最没用的。
     所以把它拆成一句话，渗进他真正在读的地方。
     ================================================================ */
  function indMount(key) {
    const I = W.INDUSTRY;
    const Ind = W.AIWB && W.AIWB.Ind;
    if (!I || !Ind || !I.groups || !I.groups.length) return '';
    const g = Ind.group();

    if (key === 'overview') return indHome(Ind, g);
    if (key === 'levels') return indLevelsHead(Ind, g);
    if (key === 'arch') return indArch(Ind, g);
    const m = /^levels-([1-5])$/.exec(key);
    if (m) return indAtStage(Ind, g, Number(m[1]));
    return '';
  }

  /* 总览：没选行业就只有选择器；选了就把这行的五档摊开 —— 利弊成对给 */
  function indHome(Ind, g) {
    if (!g) {
      return '' +
      '<section class="blk ind-home">' +
        head('这些 AI 跟你的行业有什么关系', '选一行，全站相关内容跟着变') +
        '<p class="lead">同一件事，在不同行业里能做什么、代价是什么，差别很大。' +
        '选一行之后，你读每一条知识时都会多出一页<b>「落到你这行」</b>：' +
        '讲这条在你这行对应的是什么、这一档你那行能做什么、这行最容易踩的坑在哪。</p>' +
        '<div class="ind-home-pick">' + Ind.picker() + '</div>' +
        '<div class="ind-home-note">没有完全对口的？<b>选最接近的那个</b>就行 —— ' +
        '同一类活的做法是相通的，代价结构也像。随时能换。</div>' +
      '</section>';
    }
    const ul = (arr) => '<ul>' + (arr || []).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>';
    /* 这里刻意不挂 data-st：这一块要看的正是"从入门到开发"整条轨迹，
       按档裁掉上面的几行，这块就没意义了 */
    const ladder = (g.hi || []).map((h) =>
      '<div class="ind-row">' + stChip(h.st) +
        '<b>' + esc(h.t) + '</b>' + (h.d ? '<em>' + esc(h.d) + '</em>' : '') +
      '</div>').join('');
    return '' +
    '<section class="blk ind-home">' +
      head('你那行：' + g.name, '已按这一行呈现，全站跟着变') +
      '<div class="ind-home-hd">' +
        '<i class="ind-ch">' + esc(g.ch) + '</i>' +
        '<div class="ind-tt"><h3>' + esc(g.name) + '</h3><span>' + esc(g.en) + '</span></div>' +
        '<p class="ind-lead">' + esc(g.lead) + '</p>' +
      '</div>' +
      '<div class="ind-lad">' +
        '<div class="ind-lb">这行从入门到开发，各档能做的事</div>' + ladder +
      '</div>' +
      '<div class="ind-pc">' +
        '<div class="ind-pro"><div class="ind-lb">好处</div>' + ul(g.pro) + '</div>' +
        '<div class="ind-con"><div class="ind-lb">代价</div>' + ul(g.con) + '</div>' +
      '</div>' +
      '<div class="ind-trap"><b>这行最不该踩的坑</b><p>' + esc(g.trap) + '</p></div>' +
      '<div class="ind-swap">' + Ind.picker('<span class="ind-pick-lb">换一行看</span>') + '</div>' +
    '</section>';
  }

  /* 分级视图顶部：一行提示 + 选择器（只在没选时出选择器） */
  function indLevelsHead(Ind, g) {
    if (g) {
      return '<div class="ind-line">行业已按<b>' + esc(g.name) + '</b>呈现 —— ' +
        '每一档下面列的是你那行在这一档能做的事，外加 3 条别的行业做对照。' +
        '<button class="lnk" type="button" data-ind-set="' + esc(g.id) + '">取消</button></div>';
    }
    return '<div class="ind-line ind-line-pick">' +
      '<b>每一档下面都挂了各行业在这一档能做的事。</b>' +
      '选一行之后，这里就只留你那行 + 3 条对照 —— 想看清自己这行的位置，先选一行。' +
      Ind.picker('') + '</div>';
  }

  /* 架构视图那一行的行业提示：搭系统这一步，各行的第一个约束不一样 ——
     金融先管取数鉴权、医疗先管数据不出内网、制造先管参数不出厂门。
     不写这一句，架构视图就是一份跟"我这行"无关的通用文档。 */
  function indArch(Ind, g) {
    if (g) {
      return '<div class="ind-line">' +
        '<b>' + esc(g.name) + '</b>这行搭系统，第一个要立的是：' +
        (g.arch ? esc(g.arch) : '这条还没写进你那行 —— 先按通用顺序来：权限 → 配额 → 可观测 → 评估。') +
        '<button class="lnk" type="button" data-ind-set="' + esc(g.id) + '">取消</button></div>';
    }
    return '<div class="ind-line ind-line-pick">' +
      '<b>搭系统这一步，各行各业的第一个约束不一样：</b>' +
      '金融先管取数鉴权，医疗先管数据不出内网，制造先管参数不出厂门。' +
      '选一行，这里会换成你那行的说法。' +
      Ind.picker('') + '</div>';
  }

  /* 分级视图 · 某一档的行业例子 */
  function indAtStage(Ind, g, n) {
    const rows = [];
    W.INDUSTRY.groups.forEach((x) => (x.hi || []).forEach((h) => {
      if (h.st === n) rows.push({ g: x, h: h });
    }));
    if (!rows.length) return '';

    let list, label;
    if (g) {
      const mine = rows.filter((r) => r.g.id === g.id);
      const others = rows.filter((r) => r.g.id !== g.id);
      list = mine.concat(others.slice(0, 3));
      label = '你那行（' + esc(g.name) + '）这一档能做的，外加 3 条对照';
    } else {
      /* 没选行业时不要五年都是同样四条：按档位错开，让 15 行都有露面的机会 */
      const off = (n - 1) % rows.length;
      list = rows.slice(off).concat(rows.slice(0, off)).slice(0, 4);
      label = '这一档在各行业里的例子 · 共 ' + rows.length + ' 条';
    }

    return '<div class="lv-ind">' +
      '<span class="lv-lb">' + label + '</span>' +
      '<ul class="lv-ind-list">' +
        list.map((x) => '<li' + (g && x.g.id === g.id ? ' class="is-mine"' : '') + '>' +
          '<i class="ind-ch">' + esc(x.g.ch) + '</i>' +
          '<b>' + esc(x.g.name) + '</b>' +
          '<span>' + esc(x.h.t) + '</span>' +
          (x.h.d ? '<em>' + esc(x.h.d) + '</em>' : '') +
        '</li>').join('') +
      '</ul>' +
    '</div>';
  }

  /* ================================================================
     3. 选型速查
     ================================================================ */
  /* 选型速查。这份表整体偏「搭建」级 —— 但处理方式不是挂一句
     「你该切到搭建档」，而是每行标好自己的档位（data-st），
     低档进来就真的看不到那些条目（core.js 的 .st-over 是 display:none）。
     条数一律实时数（data-st-count），不写死：64 项是今天的数，不是永远的。 */
  function stack() {
    const S = W.STACK;
    if (!S) return '<div class="empty">选型数据未加载</div>';
    const total = S.groups.reduce((a, g) => a + g.rows.length, 0);
    return '' +
    '<section class="blk">' +
      head('技术选型速查', S.groups.length + ' 组 · 按等级展开') +
      '<p class="lead">' + S.note + '</p>' +
      '<div class="stk-band">' +
        '<span class="stk-band-n">本档 <b data-st-count=".stk-row">·</b> / ' + total + ' 项</span>' +
        '<span class="stk-band-t">这份表是按等级长的：只列到你现在这一档为止，' +
          '再往后的等你要动手拼系统时自己会出现。</span>' +
      '</div>' +
      /* 一条不剩时的样子（入门档）。写的是「什么时候会有」，
         不是「你该去切哪一档」—— 切档不是用户的任务。
         里面这个小按钮借 .pf-go 的通用样式，但它只带 data-jump-view、
         不带 data-open。所以外部想找「条目上的按钮」时，选择器必须连
         条目容器一起限定（.pf .pf-go 之类），否则会先命中空态里这个 ——
         点了不开抽屉，还不报错。 */
      '<div class="stk-empty" data-st-empty>' +
        '<b>选型是「要动手拼系统」时才需要的事。</b>' +
        '<p>你现在这一档还没走到这一步，所以这里先空着 —— 不是坏了，' +
          '是这 ' + total + ' 项本来就还没轮到。</p>' +
        '<p>现在更值得弄明白的是：模型能干什么、怎么把话问对。' +
          '<button class="pf-go" type="button" data-jump-view="library">去知识库 →</button></p>' +
      '</div>' +
      S.groups.map((g) =>
        '<div class="stk-group" data-st-auto>' +
          '<div class="stk-hd">' +
            '<h3>' + esc(g.name) + ' <span class="tag">' + esc(g.en) + '</span></h3>' +
            '<span class="stk-n">本档 <b data-st-count=".stk-row" data-st-count-in=".stk-group">·</b> / ' +
              g.rows.length + ' 项</span>' +
          '</div>' +
          '<p class="stk-desc">' + esc(g.desc) + '</p>' +
          '<div class="stk-tbl">' +
            '<div class="stk-th"><span>名称 / 形态</span><span>它负责什么</span><span>选型判断与坑</span></div>' +
            g.rows.map((r) =>
              '<div class="stk-row" data-st="' + (r.st || 0) + '">' +
                '<div class="stk-c1"><b>' + esc(r.n) + '</b><i>' + esc(r.v) + '</i></div>' +
                '<div class="stk-c2">' + esc(r.role) + '</div>' +
                '<div class="stk-c3">' + r.take + '</div>' +
              '</div>'
            ).join('') +
          '</div>' +
        '</div>'
      ).join('') +
    '</section>';
  }

  /* ================================================================
     4. 技术架构
     ================================================================ */
  /* 按档视角：同一个位置按当前等级**换一版**内容（数据在 data-arch-stage.js）。
     为什么要换而不是裁：入门的人要看"这条线上有哪几个位置"，搭建的人要看
     "三条线怎么并行" —— 这两段不是同一段内容的长短版，裁不出来。
     容器带 [data-st-swap]，切档由 core.js 的 StageSwap 挑一版显示；
     面板里自带档位芯片（data-stg-chip），用户在这里就能换，不必回顶栏。 */
  function archByStage() {
    const S = W.ARCH_STAGE;
    if (!S || !S.variants || !S.variants.length) return '';
    const chips = W.DATA.stages.map((s) =>
      '<button class="stg" type="button" data-stage-go="' + s.n + '" data-stg-chip="' + s.n +
        '" title="' + esc(s.who) + '">' + esc(s.name) + '</button>').join('') +
      '<button class="stg stg-all" type="button" data-stage-go="0" data-stg-chip="0">全部</button>';

    return '<div class="ar-by" data-st-swap="arch">' +
      '<div class="ar-by-top">' +
        '<span class="ar-by-tt">按你的等级看这份图</span>' +
        '<span class="ar-stg-now" data-st-swap-now></span>' +
      '</div>' +
      '<div class="ar-by-chips"><span class="stg-lb">换档</span>' + chips + '</div>' +
      S.variants.map((v) =>
        '<article class="ar-v" data-st-see="' + v.see.join(',') + '">' +
          '<div class="ar-v-hd">' +
            '<h3>' + esc(v.title) + '</h3>' +
            '<span class="tag">' + esc(v.tag) + '</span>' +
          '</div>' +
          '<p class="ar-v-lead">' + esc(v.lead) + '</p>' +
          '<div class="ar-v-chain">' +
            '<span class="ar-lb">' + esc(v.chainLabel) + '</span>' +
            '<div class="ar-v-stops">' +
              v.chain.map((c, i) => (i ? '<span class="ar-v-arw" aria-hidden="true">→</span>' : '') +
                '<span class="ar-v-stop"><i>' + (i + 1) + '</i>' + esc(c) + '</span>').join('') +
            '</div>' +
          '</div>' +
          '<div class="ar-v-points">' +
            v.points.map((p) =>
              '<div class="ar-v-pt"><b>' + esc(p.t) + '</b><p>' + esc(p.d) + '</p></div>').join('') +
          '</div>' +
          '<div class="ar-v-watch"><span class="ar-lb">这条链上最容易出事的一环</span>' +
            '<p>' + esc(v.watch) + '</p></div>' +
          '<div class="ar-v-up">' +
            '<span>' + esc(v.up) + '</span>' +
            (v.upTo ? '<button class="pf-go" type="button" data-stage-go="' + v.upTo + '">切到「' +
              esc(W.DATA.stageName(v.upTo)) + '」档 →</button>' : '') +
          '</div>' +
        '</article>').join('') +
    '</div>';
  }

  function arch() {
    const A = W.ARCH;
    if (!A) return '<div class="empty">架构数据未加载</div>';
    return '' +
    '<section class="blk">' +
      head('常见技术架构', A.patterns.length + ' 种模式 · ' + A.projects.length + ' 类真实项目') +
      '<p class="lead">' + A.note + '</p>' +
      '<div data-ind-mount="arch"></div>' +
      archByStage() +
      '<div class="ar-cnt">本档 <b data-st-count=".ar-pat">·</b> / ' + A.patterns.length +
        ' 种模式 —— 切档会跟着变；还没出现的那几种，等你要动手搭的时候再看更顺。</div>' +
      '<div data-st-auto>' +
      '<div class="ar-pats">' +
        A.patterns.map((p) =>
          '<article class="ar-pat" id="pat-' + p.id + '"' + stAttr(p.st) + '>' +
            '<div class="ar-hd">' +
              '<h3>' + esc(p.name) + '</h3>' +
              '<span class="tag">' + esc(p.en) + '</span>' +
              (p.st ? stChip(p.st) : '') +
            '</div>' +
            '<p class="ar-kicker">' + esc(p.kicker) + '</p>' +
            '<p class="ar-scene"><b>适用场景</b>' + esc(p.scene) + '</p>' +
            '<div class="ar-flow"><span class="ar-lb">流转</span><ol>' +
              p.flow.map((f) => '<li>' + f + '</li>').join('') +
            '</ol></div>' +
            '<div class="ar-pc">' +
              '<div class="ar-pro"><span class="ar-lb">好处</span><ul>' + p.pros.map((x) => '<li>' + x + '</li>').join('') + '</ul></div>' +
              '<div class="ar-con"><span class="ar-lb">代价</span><ul>' + p.cons.map((x) => '<li>' + x + '</li>').join('') + '</ul></div>' +
            '</div>' +
            '<div class="ar-when"><b>什么时候用　</b>' + p.when + '</div>' +
          '</article>'
        ).join('') +
      '</div>' +
      '</div>' +
      '<div data-st-auto>' +
      '<div class="sec-head"><h2>真实项目拆解</h2><span class="tag">本档 <b data-st-count=".ar-proj">·</b> / ' +
        A.projects.length + ' 类落地形态</span></div>' +
      '<div class="ar-projs">' +
        A.projects.map((p) =>
          '<article class="ar-proj"' + stAttr(p.st) + '>' +
            '<div class="ar-hd">' +
              '<h3>' + esc(p.name) + '</h3>' +
              '<span class="tag">' + esc(p.en) + '</span>' +
              (p.st ? stChip(p.st) : '') +
            '</div>' +
            '<p class="ar-scene">' + esc(p.scene) + '</p>' +
            '<div class="ar-meta">' +
              '<div><span class="ar-lb">规模</span><ul>' + p.scale.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' +
              '<div><span class="ar-lb">技术栈</span><ul>' + p.stack.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' +
            '</div>' +
            '<div class="ar-flow"><span class="ar-lb">数据流</span><ol>' +
              p.flow.map((f) => '<li>' + f + '</li>').join('') +
            '</ol></div>' +
            '<div class="ar-hard"><span class="ar-lb">最难的地方</span><p>' + p.hard + '</p></div>' +
            '<div class="ar-lesson"><span class="ar-lb">结论</span><p>' + p.lesson + '</p></div>' +
          '</article>'
        ).join('') +
      '</div>' +
      '</div>' +
    '</section>';
  }

  /* ================================================================
     5. 生产踩坑
     ================================================================ */
  function pitfalls() {
    const P0 = W.PITFALLS;
    if (!P0) return '<div class="empty">踩坑数据未加载</div>';
    const total = P0.groups.reduce((a, g) => a + g.items.length, 0);
    return '' +
    '<section class="blk">' +
      head('生产踩坑清单', P0.groups.length + ' 组 · ' + total + ' 条') +
      '<p class="lead">' + P0.note + '</p>' +
      '<div class="stk-band">' +
        '<span class="stk-band-n">本档 <b data-st-count=".pf">·</b> / ' +
          total + ' 条</span>' +
        '<span class="stk-band-t">清单按等级长：先出现你现在就会撞上的，' +
          '要搭到那一步才会遇到的等到了再出现 —— 免得一次把人吓退。</span>' +
      '</div>' +
      '<div class="stk-empty" data-st-empty>' +
        '<b>踩坑是动手之后才会遇到的。</b>' +
        '<p>你现在这一档还没到那一步，所以这里先空着。' +
          '真到要搭的时候，这 ' + total + ' 条会按你走到哪一步依次出现。</p>' +
        '<p>想先知道它一般会怎么出错，' +
          '<button class="pf-go" type="button" data-jump-view="library">去知识库 →</button></p>' +
      '</div>' +
      P0.groups.map((g) =>
        '<div class="pf-group" data-st-auto>' +
          '<div class="stk-hd">' +
            '<h3>' + esc(g.name) + ' <span class="tag">' + esc(g.en) + '</span></h3>' +
            '<span class="stk-n">本档 <b data-st-count=".pf" data-st-count-in=".pf-group">·</b> / ' +
              g.items.length + ' 条</span>' +
          '</div>' +
          '<p class="stk-desc">' + esc(g.desc) + '</p>' +
          '<div class="pf-list">' +
            g.items.map((it) =>
              '<div class="pf" data-st="' + (it.st || 0) + '">' +
                '<div class="pf-sym"><span class="pf-mk">!</span><span>' + esc(it.sym) + '</span>' +
                  (it.where ? '<button class="pf-go" type="button" data-open="' + it.where + '">看对应知识点 →</button>' : '') +
                '</div>' +
                '<div class="pf-row"><span class="pf-lb">根因</span><p>' + it.cause + '</p></div>' +
                '<div class="pf-row"><span class="pf-lb">修法</span><p>' + it.fix + '</p></div>' +
              '</div>'
            ).join('') +
          '</div>' +
        '</div>'
      ).join('') +
    '</section>';
  }

  /* ================================================================
     6. 问答库
     ================================================================ */
  function drill() {
    const R = W.DRILL;
    if (!R) return '<div class="empty">问答数据未加载</div>';
    const D0 = W.DATA;
    return '' +
    '<section class="blk">' +
      head('问答库', R.total + ' 题 · ' + R.groups.length + ' 组') +
      '<p class="lead">' + R.note + '</p>' +
      '<div class="flt" data-flt="drill">' +
        '<span class="flt-lb">范围</span>' +
        '<button class="chip on" type="button" data-dkind="">全部</button>' +
        '<button class="chip" type="button" data-dkind="star">仅高频 ★</button>' +
        '<span class="flt-sep"></span>' +
        R.groups.map((g) => '<button class="chip" type="button" data-dgroup="' + g.id + '">' + esc(g.name) + '</button>').join('') +
        '<span class="flt-fill"></span>' +
        '<span class="flt-cnt" data-flt-cnt>' + R.total + ' 题</span>' +
      '</div>' +
      /* 一条都不剩时说明一句。题目的按档收放有两套在管：这一层挂 .st-over，
         applyDrill 另按「范围/分组」设内联 display，两者叠加。
         实际数据里有些题没关联到知识点（data-st=0），applyDrill 对它们一律放行
         ——所以入门档下这一页**不是空的**（还剩几十道通用题），这个空态基本不会出现。
         留着是兜底：哪天通用题也标了档，这里不至于变成一页白。 */
      '<div class="stk-empty" data-st-empty>' +
        '<b>问答也按等级展开。</b>' +
        '<p>你这一档暂时没有对应的题 —— ' + R.total + ' 道里，基础的会先出现，' +
          '越往后走越多。</p>' +
        '<p>想先弄明白基础，' +
          '<button class="pf-go" type="button" data-jump-view="library">去知识库 →</button></p>' +
      '</div>' +
      '<div class="dr-groups">' +
        R.groups.map((g) =>
          '<div class="dr-group" data-group="' + g.id + '">' +
            '<div class="stk-hd">' +
              '<h3>' + esc(g.name) + ' <span class="tag">' + esc(g.en) + '</span></h3>' +
              '<span class="stk-n">' + g.items.length + ' 题</span>' +
            '</div>' +
            '<p class="stk-desc">' + esc(g.desc) + '</p>' +
            '<div class="qa-list">' +
              g.items.map((x) => {
                const fp = D0.get(x.from);
                return '<div class="qa" data-star="' + x.star + '" data-st="' + (fp ? fp.stage : 0) + '">' +
                  '<div class="qa-q" role="button" tabindex="0">' +
                    '<span class="qa-kind">' + esc(D0.topicOf(x.from) || x.kind) + '</span>' +
                    (fp ? '<span class="qa-lv">' + esc(D0.stageName(fp.stage)) + '</span>' : '') +
                    (x.star ? '<span class="qa-star">★</span>' : '') +
                    '<span class="qa-t">' + esc(x.q) + '</span>' +
                  '</div>' +
                  '<div class="qa-a">' + x.a + '</div>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>'
        ).join('') +
      '</div>' +
    '</section>';
  }

  /* ================================================================
     7. 学习路径
     ================================================================ */
  function roadmap() {
    const R = W.ROADMAP;
    if (!R) return '<div class="empty">路径数据未加载</div>';
    return '' +
    '<section class="blk">' +
      head('学习路径', R.phases.length + ' 个阶段') +
      '<p class="lead">' + R.note + '</p>' +
      '<div class="rm-line">' +
        R.phases.map((p) =>
          '<div class="rm-ph">' +
            '<div class="rm-axis"><span class="rm-dot"></span></div>' +
            '<div class="rm-card">' +
              '<div class="rm-hd">' +
                '<h3>' + esc(p.name) + '</h3>' +
                '<span class="tag">' + esc(p.en) + '</span>' +
              '</div>' +
              '<p class="rm-goal">' + esc(p.goal) + '</p>' +
              '<div class="rm-items">' +
                p.items.map((it) =>
                  '<div class="rm-item">' +
                    '<b>' + esc(it.t) + '</b>' +
                    '<span>' + esc(it.d) + '</span>' +
                    (it.out ? '<button class="pf-go" type="button" data-open="' + it.out + '">看对应知识点 →</button>' : '') +
                  '</div>'
                ).join('') +
              '</div>' +
              '<div class="rm-out"><span class="rm-lb">产出物</span><p>' + esc(p.deliverable) + '</p></div>' +
              '<div class="rm-pass"><span class="rm-lb">过关标准</span><p>' + esc(p.pass) + '</p></div>' +
            '</div>' +
          '</div>'
        ).join('') +
      '</div>' +
      '<div class="sec-head"><h2>三条并行提示</h2></div>' +
      '<div class="key-grid key-grid-3">' +
        R.tracks.map((t) =>
          '<div class="key"><h4>' + esc(t.t) + '</h4><p>' + esc(t.d) + '</p></div>'
        ).join('') +
      '</div>' +
    '</section>';
  }

  /* ================================================================
     8. 案例与工具
     ================================================================ */
  function cases() {
    const C = W.CASES;
    if (!C) return '<div class="empty">案例数据未加载</div>';
    const nCase = C.groups.reduce((a, g) => a + g.items.length, 0);
    const nTool = C.toolGroups.reduce((a, g) => a + g.items.length, 0);

    return '' +
    /* ---- 上半：真实做法 ----
       和选型表同一个口径：每条案例自己标档（data-st），低档进来真的看不到，
       而不是在顶上挂一句「这个视图偏搭建级，请切档」。 */
    '<section class="blk">' +
      head('常见 Agent 案例', C.groups.length + ' 类 · ' + nCase + ' 个做法') +
      '<p class="lead">' + C.note + '</p>' +
      '<div class="stk-band">' +
        '<span class="stk-band-n">本档 <b data-st-count=".cs-case">·</b> / ' +
          nCase + ' 个</span>' +
        '<span class="stk-band-t">案例是按等级长的：先出现你现在这一档看得懂、用得上的，' +
          '要动手搭才用得着的那些，到那一档会自己出现。</span>' +
      '</div>' +
      '<div class="stk-empty" data-st-empty>' +
        '<b>案例讲的是「怎么搭起来的、卡在哪、拿什么衡量」。</b>' +
        '<p>你现在这一档还没走到动手这一步，所以这里先空着 —— 这 ' + nCase +
          ' 个案例会在你的等级往前走之后依次出现。</p>' +
        '<p>想先知道 AI 到底能干什么，' +
          '<button class="pf-go" type="button" data-jump-view="library">去知识库 →</button></p>' +
      '</div>' +
      /* 跳转按钮也要跟着档走：某一类整体被收起来之后，那个按钮点下去
         会滚到一个 display:none 的锚点 —— 没反应、不报错、最难查。
         所以 chip 的档位取该组内**最低**的那一条：组还在，按钮就在；
         组被收干净，按钮一起收。整排都收完时连「跳到」两个字也不要留。 */
      '<div class="flt" data-st-auto>' +
        '<span class="flt-lb">跳到</span>' +
        C.groups.map((g) =>
          '<button class="chip" type="button" data-st="' +
            Math.min.apply(null, g.items.map((x) => x.st || 0)) +
            '" data-cs-go="' + g.id + '">' + esc(g.name) + '</button>'
        ).join('') +
      '</div>' +
      C.groups.map((g) =>
        '<div class="cs-group" id="cs-' + g.id + '" data-st-auto>' +
          '<div class="cs-hd">' +
            '<h3>' + esc(g.name) + '</h3>' +
            '<span class="cs-en">' + esc(g.en) + '</span>' +
            '<span class="cs-n">本档 <b data-st-count=".cs-case" data-st-count-in=".cs-group">·</b> / ' +
              g.items.length + ' 个做法</span>' +
          '</div>' +
          '<p class="cs-gdesc">' + esc(g.desc) + '</p>' +
          g.items.map((it) =>
            '<article class="cs-case" data-st="' + (it.st || 0) + '">' +
              '<h4>' + esc(it.t) + '</h4>' +
              '<p class="cs-scene">' + esc(it.scene) + '</p>' +
              '<div class="cs-blk">' +
                '<span class="cs-lb">怎么搭</span>' +
                '<ol class="cs-how">' + it.how.map((h) => '<li>' + esc(h) + '</li>').join('') + '</ol>' +
              '</div>' +
              '<div class="cs-blk cs-blk-hard">' +
                '<span class="cs-lb">卡在哪</span><p>' + esc(it.hard) + '</p>' +
              '</div>' +
              '<div class="cs-blk cs-blk-metric">' +
                '<span class="cs-lb">拿什么衡量</span><p>' + esc(it.metric) + '</p>' +
              '</div>' +
            '</article>'
          ).join('') +
        '</div>'
      ).join('') +
    '</section>' +

    /* ---- 下半：工具分析 ---- */
    '<section class="blk">' +
      head('工具分析', C.toolGroups.length + ' 类 · ' + nTool + ' 个能力') +
      '<p class="lead">' + C.toolNote + '</p>' +
      '<div class="stk-band">' +
        '<span class="stk-band-n">本档 <b data-st-count=".tl-item">·</b> / ' +
          nTool + ' 个</span>' +
        '<span class="stk-band-t">工具按「你什么时候会调它」分档 —— 用得上的那一档才出现，' +
          '免得记一堆暂时用不到的名字。</span>' +
      '</div>' +
      '<div class="stk-empty" data-st-empty>' +
        '<b>这些是模型能调用的原子能力。</b>' +
        '<p>你还不用记它们的名字 —— 等你要自己接一个工具时，' +
          '这 ' + nTool + ' 个会按顺序出现。</p>' +
      '</div>' +
      C.toolGroups.map((g) =>
        '<div class="tl-group" data-st-auto>' +
          '<div class="tl-hd"><h3>' + esc(g.name) + '</h3><span class="cs-en">' + esc(g.en) + '</span></div>' +
          '<div class="tl-list">' +
            g.items.map((it) =>
              '<div class="tl-item" data-st="' + (it.st || 0) + '">' +
                '<h4>' + esc(it.n) + '</h4>' +
                '<div class="tl-row"><span class="tl-lb">能干什么</span><p class="tl-what">' + esc(it.what) + '</p></div>' +
                '<div class="tl-row"><span class="tl-lb">怎么设计</span><p>' + esc(it.design) + '</p></div>' +
                '<div class="tl-row tl-row-bad"><span class="tl-lb">别这么用</span><p>' + esc(it.bad) + '</p></div>' +
              '</div>'
            ).join('') +
          '</div>' +
        '</div>'
      ).join('') +
    '</section>';
  }

  /* ================================================================
     9. 知识图谱（分层框架 / 关联网络 / 学习主线）
     内容多、要算坐标、还要绑交互，所以整块交给 atlas.js，
     这里只负责把外壳放进视图流里。口径与别处一致：不出现编号。
     ================================================================ */
  function atlas() {
    return W.ATLAS ? W.ATLAS.viewHtml()
                   : '<div class="empty">图谱数据未加载</div>';
  }

  /* ================================================================
     11. 发展史（两条线：国外左、国内右）
     内容全在 data-history.js 里；这里只管长什么样。

     两个刻意的选择：
     ① 不标等级（不输出 data-st）。史实不因为你到哪一档而改变 —— 时间线缺一段
        就是断的。所以这一页是全档可见，和站内其它视图口径不同，是有意的。
     ② 每条都答「它改变了什么」。答不出来的事件，收进数据层也没意思。
     ================================================================ */
  function history() {
    const H = W.HISTORY;
    if (!H) return '<div class="empty">发展史数据未加载</div>';

    const nW = H.events.filter((e) => e.side === 'w').length;
    const nC = H.events.filter((e) => e.side === 'c').length;

    /* 类名统一 hist- 前缀：站内工具分析视图已经占了 .tl / .lg / .tl-item 这一族，
       同前缀迟早撞车（撞了的表现是样式静默串线，很难查） */
    const card = (e) =>
      '<div class="hist-ev" data-hist="' + e.k + '">' +
        '<article class="hist-card">' +
          '<div class="hist-top">' +
            '<span class="hist-y">' + esc(e.ym) + '</span>' +
            '<i class="hist-k k-' + e.k + '">' + esc(H.kindMap[e.k].n) + '</i>' +
            '<span class="hist-fill"></span>' +
            (e.link
              ? '<button class="hist-go" type="button" data-open="' + esc(e.link) + '">看知识点 →</button>'
              : '') +
          '</div>' +
          '<b class="hist-t">' + esc(e.t) + '</b>' +
          '<span class="hist-who">' + esc(e.who) + '</span>' +
          /* d 里带 <b> 标签做重点，属于受控的本地数据，原样输出 */
          '<p class="hist-d">' + e.d + '</p>' +
        '</article>' +
        '<span class="hist-node"></span>' +
      '</div>';

    const col = (list, side) =>
      '<div class="hist-col ' + side + '">' +
        '<span class="hist-axis"></span>' +
        (list.length
          ? list.map(card).join('')
          : '<p class="hist-none">' + (side === 'c' ? '这一段国内没有对应动作' : '这一段没有对应动作') + '</p>') +
      '</div>';

    /* 左侧年代轨：一个刻度对应一个年代，点一下直接跳过去。
       必须挂在视图容器直属、不能塞进 .blk —— Anim.enter 会给 .blk 临时加
       transform，而祖先一旦带 transform，position:fixed 就退化成 absolute，
       轨道会跟着页面一起滚走（这条已经在别处踩过，写在这里免得再犯）。 */
    const rail = H.eras.length > 1
      ? '<aside class="hist-rail" aria-label="年代导航">' +
          '<div class="hr-now">' +
            '<b class="hr-now-y">' + esc(H.eras[0].y0) + ' — ' + esc(H.eras[0].y1) + '</b>' +
            '<span class="hr-now-n">' + esc(H.eras[0].name) + '</span>' +
          '</div>' +
          '<div class="hr-track">' +
            '<span class="hr-line"></span>' +
            '<span class="hr-fill"></span>' +
            '<span class="hr-knob"></span>' +
            H.eras.map((era, i) =>
              '<button class="hr-seg" type="button" data-hr-go="' + i + '"' +
                ' data-n="' + esc(era.name) + '"' +
                ' aria-label="跳到 ' + esc(era.y0) + ' 年 ' + esc(era.name) + '">' +
                '<i></i><em>' + esc(era.y0) + '</em>' +
              '</button>').join('') +
          '</div>' +
        '</aside>'
      : '';

    return '' +
    rail +
    '<section class="blk hist-lead">' +
      head('AI 发展史', (nW + nC) + ' 条') +
      '<p class="lead">左边一条线是国外，右边一条线是国内，共用同一条时间轴往下走。' +
        '每条都只回答一个问题：<b>它改变了什么</b> —— 答不出来的事情，不进这条线。' +
        '带箭头的节点可以点开对应的知识点。</p>' +
      /* 厂商区在最底下，隔着一百多条主线，不指一下不容易发现 */
      '<p class="vd-jump">' +
        '<button type="button" data-vd-jump>按厂商看版本 →</button>' +
        '<span>一家一条线：主线里省掉的那些版本，在这块都留着</span>' +
      '</p>' +
      '<div class="hist-lg">' +
        H.kinds.map((k) =>
          '<span class="i"><i class="dot k-' + k.id + '"></i>' +
            '<b>' + esc(k.n) + '</b><em>' + esc(k.d) + '</em></span>'
        ).join('') +
        '<span class="i side"><i class="bar w"></i><b>国外</b></span>' +
        '<span class="i side"><i class="bar c"></i><b>国内</b></span>' +
      '</div>' +
    '</section>' +
    H.eras.map((era) => {
      const g = H.byEra(era.id);
      return '<section class="blk hist-era" data-era="' + era.id + '">' +
        '<header class="hist-eh">' +
          '<div class="hist-el">' +
            '<span class="hist-ey">' + era.y0 + ' — ' + era.y1 + '</span>' +
            '<h3 class="hist-en">' + esc(era.name) + '</h3>' +
            '<span class="hist-ee">' + esc(era.en) + '</span>' +
          '</div>' +
          '<div class="hist-er">' +
            '<span class="hist-ec w">国外 ' + g.w.length + '</span>' +
            '<span class="hist-ec c">国内 ' + g.c.length + '</span>' +
          '</div>' +
          '<p class="hist-eb">' + esc(era.brief) + '</p>' +
        '</header>' +
        '<div class="hist-tl">' + col(g.w, 'w') + col(g.c, 'c') + '</div>' +
      '</section>';
    }).join('') +
    vendorBlock();
  }

  /* ================================================================
     发展史 · 按厂商看
     ----------------------------------------------------------------
     上面那条主线只留里程碑；换一把尺子就是「一家一条线」——
     点开哪家，就把它从第一个模型到最新的版本按时间排出来。
     主线里被精简掉的小版本（Kimi K3、GLM-4.6、MiniMax M1、Seedance 2.5…）
     在这条线上都找得回来。

     一次只展开一家：15 家全摊开是两百多条，反而看不出谁是谁。
     再点自己收起，点别家直接换过去。
     ================================================================ */
  function vendorBlock() {
    const V = W.VENDORS;
    if (!V || !V.list.length) return '';

    const chip = (v) =>
      '<button class="vd-chip" type="button" data-vd="' + esc(v.id) + '">' +
        esc(v.n) + '<i>' + v.vers.length + '</i>' +
      '</button>';

    const grp = (side, label) =>
      '<div class="vd-grp">' +
        '<span class="vd-gn">' + label + '</span>' +
        V.list.filter((v) => v.side === side).map(chip).join('') +
      '</div>';

    const panel = (v) => {
      const first = v.vers[0].ym;
      const last = v.vers[v.vers.length - 1].ym;
      /* 中英文名本来就一样的（OpenAI、Meta、xAI、MiniMax…）不重复写两遍 */
      const same = v.n.replace(/[\s·/]/g, '').toUpperCase() === v.en.replace(/[\s·/]/g, '');
      return '<article class="vd-panel" data-vd-panel="' + esc(v.id) + '">' +
        '<header class="vd-ph">' +
          '<div class="vd-phl">' +
            '<b class="vd-pn">' + esc(v.n) + '</b>' +
            (same ? '' : '<span class="vd-pe">' + esc(v.en) + '</span>') +
          '</div>' +
          '<div class="vd-phr">' +
            '<span class="vd-pc">' + v.vers.length + ' 个版本</span>' +
            '<span class="vd-ps">' + esc(first) + ' → ' + esc(last) + '</span>' +
          '</div>' +
          '<p class="vd-pd">' + esc(v.span) + '</p>' +
        '</header>' +
        '<ol class="vd-tl">' +
          v.vers.map((x) =>
            '<li class="vd-it">' +
              '<span class="vd-nx"></span>' +
              '<span class="vd-d">' + esc(x.ym) + '</span>' +
              '<div class="vd-bd">' +
                '<b class="vd-n">' + esc(x.n) + '</b>' +
                '<span class="vd-x">' + esc(x.d) + '</span>' +
              '</div>' +
            '</li>'
          ).join('') +
        '</ol>' +
      '</article>';
    };

    return '<section class="blk vd">' +
      head('按厂商看', V.list.length + ' 家 · ' + V.total() + ' 个版本') +
      '<p class="lead">上面那条主线只留了里程碑，这里是另一把尺子：' +
        '<b>一家一条线</b>。点开哪家，就把它从第一个模型到最新的版本顺序排出来——' +
        '主线里被精简掉的小版本，也都留在这条线上。</p>' +
      '<div class="vd-chips">' +
        grp('w', '国外') + grp('c', '国内') +
      '</div>' +
      '<div class="vd-panels">' + V.list.map(panel).join('') + '</div>' +
      '<p class="vd-hint">先点上面某一家的名字。</p>' +
    '</section>';
  }

  /* ================================================================
     抽屉内「要点」页签
     ================================================================ */
  /* 与 core.js 的 md() 同一套规则：只吃成对的 **…** */
  function md(s) {
    return String(s).replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  }

  function notesPane(v) {
    const items = (v && v.items) || [];
    if (!items.length) return '<div class="empty">这条暂无要点</div>';
    return '<div class="facts">' +
      items.map((f) =>
        '<div class="fact"><div class="fact-t">' + md(f.t) + '</div>' +
        '<div class="fact-v">' + md(f.v) + '</div></div>'
      ).join('') +
    '</div>';
  }

  /* indMount 是给 core.js 的 applyInd 调的：按「我这行」填行业挂载点 */
  W.VIEWS = {
    indMount: indMount,
    atlas: atlas,
    history: history,
    overview: overview,
    levels: levels,
    library: library,
    stack: stack,
    arch: arch,
    cases: cases,
    pitfalls: pitfalls,
    drill: drill,
    roadmap: roadmap,
    notesPane: notesPane
  };
})();
