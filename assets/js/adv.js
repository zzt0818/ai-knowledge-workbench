/* ============================================================
   知识扩充 · 注册器 adv.js
   ------------------------------------------------------------
   从外部资料里提炼出来的增量知识，按批次写在 adv-*.js 里，
   由这里统一接进内容层。接到的东西有三处：
     · content：concept / analogy / cases / practice / interview / quiz
     · notes  ：要点页签（第七个页签）
     · drill  ：interview / quiz 同时进问答视图的对应分组

   加载要求：必须排在 data-plain.js 之后。
   为什么：这一层的内容是「已经定稿的完整版」，不需要再被 DEEP / PLAIN
   二次加工，直接覆盖即可（覆盖不追加，避免出现两套讲法）。

   cases 的格式约定：必须是 {p,s,d} 三段式对象数组。
   纯字符串数组会被内容体检判为「老格式」而报错——这是故意设的关卡，
   目的是逼着每条案例都写清「一句话 / 场景 / 往下挖」。

   归属问答大组的映射必须和 data-deep.js 保持一致，否则新题会掉进
   不存在的分组里静默消失。
   ============================================================ */
(function () {
  var C = window.DATA && window.DATA.content;
  if (!C) return;

  /* 主题分区 → 问答大组（与 data-deep.js 的 GROUP_OF 同源） */
  var GROUP_OF = {
    /* 入门/认识两个主题单开一组，别混进专业组：
       2026-09-18 加分级时漏了这两个映射，18 个知识点的问答全部静默掉组
       （gmap 查不到就 return，不报错、不进库）。新增主题必须在这里登记。 */
    'start': 'lite', 'craft': 'lite',
    'llm-basics': 'basics', 'prompting': 'basics', 'engineering': 'basics',
    'rag': 'core', 'agent': 'core',
    'toolchain': 'eng', 'safety': 'eng'
  };
  var PMAP = (window.DATA && window.DATA.pointMap) || {};
  var groups = (window.DRILL && window.DRILL.groups) || [];
  var gmap = {};
  groups.forEach(function (g) { gmap[g.id] = g; });

  /* ids 记录本层注册过的条目。这层的正文本身就是「完整版」，
     不再进 DEEP，所以要把名单暴露出去，让内容体检知道这些条目
     已经自带深度内容，而不是漏写。 */
  var stat = { points: 0, notes: 0, drill: 0, ids: [], orphan: [], nogroup: [] };

  window.__ADV_REG = function (batch) {
    Object.keys(batch).forEach(function (id) {
      var a = batch[id] || {};

      /* 孤儿检测：data.js 的 points 里没登记这个 id，内容写得再全也不会
         出现在知识库与视图里（2026-09-17 实际漏过一个 agent-harness，
         因为两处并行改同一个文件，其中一处被覆盖）。必须排在创建之前，
         否则会往 content 里留一个谁也看不见的空对象。 */
      if (!PMAP[id]) { stat.orphan.push(id); return; }

      /* 新增条目在 card-*.js 里并不存在，这里要就地创建；
         已存在的条目（补写型扩充）则走覆盖。 */
      var t = C[id] || (C[id] = {});

      ['concept', 'analogy', 'cases', 'practice', 'interview', 'quiz']
        .forEach(function (k) { if (a[k]) t[k] = a[k]; });

      if (a.notes && a.notes.length) { t.notes = { items: a.notes }; stat.notes += a.notes.length; }
      stat.points++;
      stat.ids.push(id);

      /* 新条目的问答也进问答视图，题号沿用知识点 id */
      var p = PMAP[id];
      var g = gmap[GROUP_OF[p && p.topic]];
      if (!g) {
        /* 主题没在 GROUP_OF 里登记，或登记到了不存在的组。以前这里直接
           return，题就凭空消失了（不报错、不进库、体检也看不见）。
           现在记下来，由 selfcheck 的体检报成 FAIL。 */
        stat.nogroup.push(id + '@' + (p && p.topic));
        return;
      }
      ['interview', 'quiz'].forEach(function (k) {
        var v = a[k];
        if (!v || !v.length) return;
        g.items = g.items || [];
        v.forEach(function (x, i) {
          g.items.push({
            id: id + '-' + k + '-' + i,
            from: id,
            kind: k === 'interview' ? '问答' : '自测',
            star: 0,
            q: x.q,
            a: x.a
          });
          stat.drill++;
        });
      });
    });

    if (window.DRILL) {
      window.DRILL.total = groups.reduce(function (a2, g) {
        return a2 + (g.items ? g.items.length : 0);
      }, 0);
    }
    window.ADV_STAT = stat;
    window.ADV_IDS = stat.ids;
  };
})();
