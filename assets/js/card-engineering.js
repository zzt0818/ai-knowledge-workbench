/* ============================================================
   知识卡内容 · 工程部分（原「工程能力」六条）
   覆盖：框架 / 向量库 / 本地部署 / 性能 / 可观测 / 效果评估
   ============================================================ */
(function () {
  const C = window.DATA.content;

  C['frameworks'] = {
    concept: [
      'LangChain 和 LlamaIndex 至少要精通一个。注意是<strong>精通</strong>——会用 API 不算，要看懂它的抽象为什么这样设计、什么时候该绕开它。',
      '两者分工不同：<strong>LangChain / LangGraph</strong> 强在编排——把模型、工具、状态、循环组织成工作流；<strong>LlamaIndex</strong> 强在数据——索引、检索、查询引擎这一整套 RAG 抽象。真实项目里常见的组合是：用 LlamaIndex 做数据层，用 LangGraph 做编排层。'
    ],
    analogy: [
      '像<b>厨房设备</b>。LangChain 是灶台和流水线，负责把工序串起来；LlamaIndex 是冷藏库和配料台，负责食材的存取与检索。',
      '两者不冲突，配合用最顺手。但你必须至少对其中一台的结构了如指掌——能说出它内部怎么运转，才算"精通"。'
    ],
    cases: [
      '<b>用错抽象导致难调试</b>：整个链路全塞进一条 LCEL 管道，出错时堆栈几十层，定位困难。复杂流程应换 LangGraph 显式建模状态与边。',
      '<b>框架黑盒导致无法优化</b>：检索效果不好，但不知道框架内部切片和打分逻辑，无法插手。至少要知道关键环节在哪一层，才能替换。',
      '<b>重造轮子</b>：手写了一套检索流程，结果和 LlamaIndex 的查询引擎只差一个重排。先用框架跑基线，再针对瓶颈定制。'
    ],
    practice: {
      steps: [
        '<b>先用框架跑通基线</b>：照官方示例搭一个能跑的最小系统，作为对照。',
        '<b>读关键源码</b>：LangGraph 从 <code>StateGraph</code> 与检查点入手；LlamaIndex 从 <code>Retriever</code> 与 <code>QueryEngine</code> 入手。',
        '<b>定位可替换点</b>：找出检索器、重排、prompt 模板这几处，改成自己的实现。',
        '<b>用 LangGraph 显式建模</b>：状态、节点、条件边写清楚，方便调试与断点恢复。',
        '<b>做取舍记录</b>：为什么用框架、哪些地方绕开了它，理由要讲得出来。'
      ],
      lang: 'python',
      code: [
        '# pip install langgraph',
        'from typing import TypedDict, Annotated',
        'from langgraph.graph import StateGraph, START, END',
        'from langgraph.checkpoint.memory import MemorySaver',
        'import operator',
        '',
        'class S(TypedDict):',
        '    question: str',
        '    docs: list',
        '    answer: str',
        '    retries: Annotated[int, operator.add]      # 可累加的字段用 reducer 声明',
        '',
        'def retrieve(state: S):',
        '    return {"docs": search(state["question"], k=5)}',
        '',
        'def grade(state: S):',
        '    """自检：检索结果是否足以回答。不够就走重检索分支"""',
        '    ok = any(d["score"] > 0.5 for d in state["docs"])',
        '    return {"retries": 0 if ok else 1}',
        '',
        'def rewrite(state: S):',
        '    """检索质量差 → 改写查询再试（这就是"反思"节点）"""',
        '    q = llm(f"把问题改写成更适合检索的形式：{state[\'question\']}")',
        '    return {"question": q, "docs": search(q, k=5)}',
        '',
        'def generate(state: S):',
        '    ctx = "\\n".join(f"[S{i+1}] {d[\'text\']}" for i, d in enumerate(state["docs"]))',
        '    return {"answer": llm(f"只依据资料作答并标注引用：\\n{ctx}\\n\\n问：{state[\'question\']}")}',
        '',
        'g = StateGraph(S)',
        'g.add_node("retrieve", retrieve)',
        'g.add_node("grade", grade)',
        'g.add_node("rewrite", rewrite)',
        'g.add_node("generate", generate)',
        '',
        'g.add_edge(START, "retrieve")',
        'g.add_edge("retrieve", "grade")',
        '# 条件边：这是 LangGraph 相对 LCEL 的核心价值 —— 分支显式可见',
        'g.add_conditional_edges("grade",',
        '    lambda s: "rewrite" if s["retries"] else "generate",',
        '    {"rewrite": "rewrite", "generate": "generate"})',
        'g.add_edge("rewrite", "generate")',
        'g.add_edge("generate", END)',
        '',
        '# 检查点：支持断点恢复与人工介入',
        'app = g.compile(checkpointer=MemorySaver())',
        'out = app.invoke({"question": "报销超期怎么办", "docs": [], "answer": "", "retries": 0},',
        '                 config={"configurable": {"thread_id": "u-123"}})',
        'print(out["answer"])'
      ].join('\n'),
      expect: '流程中能看到 retrieve → grade → (rewrite) → generate 的分支走向；用同一 thread_id 再次调用可恢复上下文；每个节点的输入输出都能单独打印检查。',
      pitfalls: [
        '为了用框架而用框架。三五步的简单链路直接写函数更清楚，别硬套。',
        '全用 LCEL 管道处理带分支和循环的复杂流程，结果难以调试。',
        '只会调 API 不懂抽象，检索效果差时完全不知道从哪下手改。'
      ]
    },
    interview: [
      { q: 'LangChain 和 LlamaIndex 有什么区别，你怎么选？', a: '定位不同：LangChain/LangGraph 是<strong>编排框架</strong>，管的是流程、状态、分支、循环和人工介入；LlamaIndex 是<strong>数据框架</strong>，管的是索引、检索、查询引擎这一整套 RAG 抽象。<strong>我的选择是数据层用 LlamaIndex 少写代码，编排层用 LangGraph 把状态和分支显式建模，方便调试和断点恢复。</strong>' },
      { q: '你用过框架，那你能说说它内部怎么运转吗？', a: '以 LangGraph 为例：它是一个状态机，<code>StateGraph</code> 定义状态的结构，节点函数接收状态返回增量更新，边（含条件边）决定流转，checkpointer 在每个节点后存快照以支持断点恢复。<strong>理解到这个层次才能判断什么时候该绕开框架手写。</strong>' }
    ],
    quiz: [
      { q: 'LangGraph 的条件边解决了什么问题？', a: '把「根据中间结果决定走哪条路」的分支逻辑显式建模成图的边，而不是埋在 if/else 里。好处是流程可视、可单测、可断点恢复，也便于插入人工审核节点。' },
      { q: '什么是检查点（checkpointer）？有什么用？', a: '在每个节点执行后把当前状态持久化。作用是支持断点恢复（中断后从上次位置继续）、多轮会话记忆（同一 thread_id 恢复上下文）、以及人工介入（暂停等待审批后再继续）。' },
      { q: '什么情况下不该用框架？', a: '链路短（三步以内）、无分支循环、且需要极致控制时。框架带来抽象价值，也带来调试成本和版本升级风险。判断标准是：抽象带来的收益是否超过理解与维护它的成本。' }
    ]
  };

  C['vector-db'] = {
    concept: [
      '向量数据库要会基本使用和部署。向量库负责存储海量向量并支持快速近邻检索。选型的关键是<strong>规模</strong>：几千条用内存方案就够，上百万条才需要专门的向量库。',
      '常见选择：<code>FAISS</code>（库，无服务，本地快）、<code>Chroma</code>（轻量，适合原型）、<code>Milvus</code> / <code>Qdrant</code>（独立服务，适合生产）、以及<code>pgvector</code>（复用现有 Postgres，适合不想多维护一套系统的场景）。'
    ],
    analogy: [
      '像<b>图书馆的索引系统</b>。书少的时候你自己在书架上找就行（内存暴力比对）；书多了必须有分类号、书目索引和检索台（向量库的索引结构），否则每次找书都要翻遍全馆。',
      '索引结构（HNSW / IVF）就是那个"书目卡"，它牺牲一点点准确率来换取检索速度的数量级提升。'
    ],
    cases: [
      '<b>用暴力检索扛百万级</b>：只做 <code>numpy</code> 全量点积，数据涨到 50 万条时单次检索要几百毫秒，服务直接不可用。必须建 ANN 索引。',
      '<b>HNSW 参数没调好</b>：召回率低。调大 <code>efSearch</code> 能提升召回但增加延迟，需要按业务权衡。',
      '<b>忘了做过滤</b>：用户只该看自己部门的文档，但检索时没加权限过滤，把所有部门的都召回了。元数据过滤必须在检索时下推，不能检索完再筛（会破坏 Top-K 的完整性）。'
    ],
    practice: {
      steps: [
        '<b>按规模选型</b>：万级以下用 FAISS / Chroma；十万级以上用 Milvus / Qdrant；已在用 Postgres 可以上 pgvector。',
        '<b>建 ANN 索引</b>：HNSW 适合高召回低延迟，IVF 适合超大规模省内存。',
        '<b>混合存储元数据</b>：向量和业务字段（来源、部门、时间）放一起，检索时可过滤。',
        '<b>过滤要下推</b>：用库原生的 filter 参数，而不是检索后再筛。',
        '<b>压测召回与延迟</b>：测 Recall@10 和 P99 延迟，找到参数拐点。'
      ],
      lang: 'python',
      code: [
        '# 方案 A：小规模用 FAISS（无需部署服务，本地最快）',
        '# pip install faiss-cpu',
        'import faiss, numpy as np',
        '',
        'dim, N = 1024, 200_000',
        'xb = np.random.rand(N, dim).astype("float32")',
        'faiss.normalize_L2(xb)',
        '',
        'index = faiss.IndexHNSWFlat(dim, 32)      # 32 = 每节点连接数 M',
        'index.hnsw.efConstruction = 200           # 建索引时的搜索深度，越大越准越慢',
        'index.hnsw.efSearch = 64                  # 查询时的搜索深度，可运行时调',
        'index.add(xb)',
        '',
        'q = np.random.rand(1, dim).astype("float32")',
        'faiss.normalize_L2(q)',
        'D, I = index.search(q, 5)                 # D=相似度 I=下标',
        'print("Top5 下标:", I[0], "分数:", D[0].round(3))',
        '',
        '# --- 用 IDMap 把向量下标映射回业务 ID，这是实际项目必须做的一步 ---',
        'idmap = faiss.IndexIDMap2(faiss.IndexHNSWFlat(dim, 32))',
        'ids = np.arange(N, dtype="int64") + 1_000_000',
        'idmap.add_with_ids(xb[:1000], ids[:1000])',
        '_, biz = idmap.search(q, 3)',
        'print("业务ID:", biz[0])',
        '',
        '# 方案 B：生产规模用 Milvus / Qdrant（带元数据过滤 + 持久化）',
        '# from qdrant_client import QdrantClient, models',
        '# cli = QdrantClient(host="localhost", port=6333)',
        '# cli.create_collection("docs",',
        '#     vectors_config=models.VectorParams(size=1024, distance=models.Distance.COSINE),',
        '#     hnsw_config=models.HnswConfigDiff(m=32, ef_construct=200))',
        '#',
        '# cli.upsert("docs", points=[',
        '#     models.PointStruct(id=i, vector=v,',
        '#         payload={"dept": "finance", "src": "policy.pdf", "page": 12})',
        '#     for i, v in enumerate(vecs)])',
        '#',
        '# hits = cli.search("docs", query_vector=qv, limit=5,',
        '#     query_filter=models.Filter(must=[          # 过滤下推到检索引擎',
        '#         models.FieldCondition(key="dept", match=models.MatchValue(value="finance"))]))'
      ].join('\n'),
      expect: '20 万条向量建 HNSW 索引后，单次 Top5 检索在毫秒级完成；通过 IDMap 拿到的是业务 ID 而非内部下标；Qdrant 的示例中过滤条件在检索阶段生效。',
      pitfalls: [
        '不建索引直接暴力检索，数据量上来后延迟不可接受。',
        '用向量下标当业务 ID。重建索引后下标会变，关联关系全断。',
        '先检索 TopK 再用代码过滤。过滤后可能一条不剩，正确做法是把过滤条件下推到检索引擎。'
      ]
    },
    interview: [
      { q: '向量数据库怎么选？', a: '按规模和运维成本选。<strong>万级以内用 FAISS 或 Chroma，无需额外服务，够用且简单</strong>；十万到千万级用 Qdrant / Milvus，需要独立部署但支持持久化、过滤、水平扩展；<strong>如果已经在用 Postgres 且不想多维护一套系统，pgvector 是很务实的折中</strong>。关键判断依据是数据量、是否需要元数据过滤、以及团队的运维能力。' },
      { q: 'HNSW 的 efSearch 参数会影响什么？', a: '它控制查询时在图中搜索的深度。调大能提升召回率，但增加延迟和计算量；调小则相反。<strong>这是一个典型的召回-延迟权衡旋钮，可以在运行时调整而不需要重建索引，通常做法是压测出满足召回要求的最小值。</strong>' }
    ],
    quiz: [
      { q: 'ANN 索引为什么能加速检索？代价是什么？', a: '近似最近邻索引通过构建图结构（HNSW）或聚类分区（IVF）把搜索范围从全量缩小到候选子集。代价是召回率不再是 100%，会漏掉极小部分真实近邻，用少量精度换取数量级的速度提升。' },
      { q: '为什么元数据过滤必须在检索阶段下推？', a: '如果先取 Top-10 再用代码筛掉不符合条件的，筛完可能只剩 1 条甚至 0 条，而真正的正确结果排在第 11 位被丢掉了。下推到检索引擎能保证在这批符合条件的候选里取 Top-K。' },
      { q: '为什么不能用向量库的内部下标当业务 ID？', a: '内部下标随插入顺序变化，删除和重建索引后映射关系会失效，导致向量和数据对不上。必须用独立生成的业务 ID（IndexIDMap 或 payload 中的 id）。' }
    ]
  };

  C['local-llm'] = {
    concept: [
      '本地模型部署和量化值得了解一下。本地部署让模型跑在自己的机器上：<strong>数据不出内网、无按量计费、可离线</strong>。代价是要自己解决显存、算力和运维。',
      '<strong>量化</strong>是把模型参数从高精度（FP16）压缩成低精度（INT8 / INT4），用一点点精度损失换取显存占用减半甚至减到四分之一。这是让大模型能跑在消费级显卡上的关键技术。'
    ],
    analogy: [
      '量化像<b>把无损音频转成高码率 MP3</b>。文件小了一大半，一般人听不出区别，但极其挑剔的场合还是能听出细节缺失。',
      'FP16 是无损，INT4 是 320kbps，INT2 就属于能听出瑕疵了。<b>关键是找到自己的场景能接受的临界点。</b>'
    ],
    cases: [
      '<b>显存算错装不下</b>：7B 模型 FP16 约需 14GB 显存，以为 12GB 卡能跑，结果 OOM。公式是：参数量 × 每参数字节数 + KV Cache 开销。',
      '<b>量化后质量明显下降</b>：把关键任务用的模型量化到 INT4 后，结构化输出开始出错。量化对不同任务的影响不均等，要针对自己的任务实测。',
      '<b>直接上 Ollama 但不懂背后</b>：被问"你们的量化方案是什么"答不上来。至少要知道用的是 GGUF 的哪个量化等级。'
    ],
    practice: {
      steps: [
        '<b>先算显存</b>：参数量(B) × 2（FP16）或 × 0.5（INT4），再给 KV Cache 和激活值留余量。',
        '<b>用 Ollama / vLLM 起服务</b>：Ollama 适合本地开发，vLLM 适合高吞吐生产。',
        '<b>选量化等级</b>：Q4_K_M 通常是质量与体积的良好折中，是社区默认推荐。',
        '<b>对比实测</b>：同一批测试用例跑 FP16 与量化版，比较准确率和延迟，而不是只看感观。',
        '<b>暴露 OpenAI 兼容接口</b>：让上层代码在云模型和本地模型之间可以无感切换。'
      ],
      lang: 'bash',
      code: [
        '# ---------- 1. 先算显存，避免装到一半 OOM ----------',
        '# 权重：参数量(B) × 每参数字节\n',
        '#   FP16  = 2.0 B/参数   INT8 = 1.0   INT4 = 0.5',
        '# KV Cache ≈ 2 × 层数 × 隐藏维度 × 序列长度 × batch × 2字节',
        '#',
        '# 例：7B 模型\n',
        '#   FP16 权重 ≈ 14 GB  → 24GB 卡可跑\n',
        '#   INT4 权重 ≈  4 GB  → 8GB 卡可跑，余量留给 KV Cache',
        '',
        '# ---------- 2. Ollama：本地开发最省事 ----------',
        '# 拉取 4bit 量化版（Q4_K_M 是社区常用折中点）',
        'ollama pull qwen2.5:7b-instruct-q4_K_M',
        '',
        '# 起服务并暴露 OpenAI 兼容接口，上层代码可无感切换云/本地',
        'ollama serve',
        '',
        '# ---------- 3. 用 OpenAI SDK 直连本地模型 ----------',
        'python - <<\'PY\'',
        'from openai import OpenAI',
        'cli = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")',
        'r = cli.chat.completions.create(',
        '    model="qwen2.5:7b-instruct-q4_K_M",',
        '    messages=[{"role": "user", "content": "用一句话解释什么是向量检索"}],',
        ')',
        'print(r.choices[0].message.content)',
        'PY',
        '',
        '# ---------- 4. 生产高吞吐：vLLM（PagedAttention 提升并发）----------',
        '# pip install vllm',
        'python -m vllm.entrypoints.openai.api_server \\',
        '  --model Qwen/Qwen2.5-7B-Instruct \\',
        '  --dtype half \\',
        '  --max-model-len 8192 \\',
        '  --gpu-memory-utilization 0.90 \\',
        '  --port 8000',
        '',
        '# ---------- 5. 量化质量实测：别只看感观 ----------',
        '# 用同一批 30~50 条测试用例，分别跑 FP16 和 Q4，比较：',
        '#   - 结构化输出（JSON 解析成功率）',
        '#   - 任务准确率',
        '#   - 首字延迟 TTFT 与吞吐 tokens/s'
      ].join('\n'),
      expect: 'Ollama 起服务后 OpenAI SDK 能直接调用本地模型；vLLM 启动日志显示显存占用与最大并发；量化对比表能给出准确率与延迟的量化差值。',
      pitfalls: [
        '不算显存直接拉模型，装到一半 OOM，浪费时间反复试。',
        '以为量化一定无损。不同任务对量化的敏感度差异很大，必须用自己的数据实测。',
        '用本地小模型顶替关键生产环节。本地模型胜在成本和数据安全，不在绝对能力上限。'
      ]
    },
    interview: [
      { q: '什么是模型量化？有什么取舍？', a: '把权重从高精度浮点压缩成低精度整数（FP16 → INT8/INT4），显存占用和内存带宽需求成比例下降，推理速度提升。<strong>代价是精度损失，且损失对不同任务影响不均——结构化输出、数学推理这类任务对量化更敏感，开放问答相对耐受。</strong>所以必须用自己的测试集实测，而不是默认"影响很小"。' },
      { q: '什么时候该用本地模型？', a: '三个条件之一成立就值得考虑：<strong>数据不能出内网</strong>（合规要求）、<strong>调用量极大导致按量计费不划算</strong>、<strong>需要离线或极低延迟</strong>。反过来说，如果只是要最强效果且数据可外发，直接用云端旗舰模型性价比更高。实际项目常用混合策略：敏感数据走本地，复杂任务走云端。' }
    ],
    quiz: [
      { q: '7B 模型用 FP16 大概需要多少显存？', a: '权重约 14GB（7B × 2 字节），加上 KV Cache 和激活值，实际需要 16GB 以上显存才比较稳。量化到 INT4 后权重约 4GB，8GB 显卡可用。' },
      { q: 'Q4_K_M 中的 K 和 M 是什么意思？', a: '这是 llama.cpp 的 GGUF 量化命名：K 表示使用了 k-quant 混合量化（对关键层保留更高精度），M 是质量等级（S/M/L，M 为中等）。Q4_K_M 是社区最常用的折中点，体积约为 FP16 的四分之一而质量损失较小。' },
      { q: 'vLLM 的 PagedAttention 解决了什么？', a: '传统实现按最大长度预留 KV Cache 显存，浪费严重。PagedAttention 借鉴操作系统的虚拟内存分页，把 KV Cache 切成小块按需分配，显著减少显存碎片，从而支撑更大的批量和更高的吞吐。' }
    ]
  };

  C['serving'] = {
    concept: [
      '这一层解决的是「能跑」到「跑得动」的差距。Agent 服务的特点是：单次请求要串多次 LLM 调用和工具执行，单次耗时以秒计，成本随调用量线性增长。所以优化手段集中在三处：<strong>少调用、并发跑、缓存住</strong>。',
      '工程能力强的候选人，能在这里给出具体的量化收益——QPS 提升多少、P99 降了多少、成本降了几成。这就是「真正有价值的工程师」的区分点。'
    ],
    analogy: [
      '像<b>高峰期餐厅出餐</b>。想把翻台率提上去，只有三条路：减少不必要的工序（少调用）、几口锅同时开火（并发）、常点的菜提前备好（缓存）。',
      '没有第四条路。加人（加机器）是花钱，不是工程能力。'
    ],
    cases: [
      '<b>重复请求不缓存</b>：同样的制度问题被不同用户问了 200 遍，每次都完整跑一遍 LLM。加语义缓存后这部分成本直接归零。',
      '<b>无意义的多轮调用</b>：简单的分类任务用大模型跑，又慢又贵。应该用更小的模型或规则分流。',
      '<b>逐条处理批量任务</b>：1000 条工单逐条调用，耗时 1000 × 2s。改成批量并发 + 限流后缩短到分钟级。'
    ],
    practice: {
      steps: [
        '<b>先量后优</b>：压测出当前的 QPS、P50/P99 延迟、单次成本，作为基线。',
        '<b>加精确缓存</b>：prompt 哈希做 key，命中直接返回。适合确定性高的场景。',
        '<b>加语义缓存</b>：把 query 向量化后查相似历史问题，设相似度阈值避免误命中。',
        '<b>做模型分级路由</b>：简单任务走小模型，复杂任务才走大模型。',
        '<b>批处理 + 并发闸门</b>：批量任务用协程池并发，配合 Semaphore 控制上游压力。',
        '<b>再压测对比</b>：用同一套场景复测，把提升量化成数字。'
      ],
      lang: 'python',
      code: [
        'import hashlib, asyncio, time',
        'import numpy as np',
        'from dataclasses import dataclass',
        '',
        '@dataclass',
        'class Hit:',
        '    value: str',
        '    score: float',
        '',
        'class SemanticCache:',
        '    """语义缓存：把 query 向量化后查相似历史，命中就跳过 LLM"""',
        '    def __init__(self, embed, vec_store, thr=0.93):',
        '        self.embed, self.store, self.thr = embed, vec_store, thr',
        '        self.hits = self.miss = 0',
        '',
        '    def get(self, q):',
        '        v = self.embed([q])[0]',
        '        r = self.store.search(v, k=1)',
        '        # 阈值是关键：太低会答非所问，0.90~0.95 是常见区间',
        '        if r and r[0].score >= self.thr:',
        '            self.hits += 1',
        '            return r[0].value',
        '        self.miss += 1',
        '        return None',
        '',
        '    def put(self, q, a):',
        '        self.store.add(self.embed([q])[0], a, meta={"ts": time.time()})',
        '',
        '    @property',
        '    def hit_rate(self):',
        '        t = self.hits + self.miss',
        '        return self.hits / t if t else 0.0',
        '',
        '# ---------- 模型分级路由：简单任务别用大模型 ----------',
        'def route(q):',
        '    if len(q) < 20 and any(k in q for k in ("是什么", "定义", "翻译成", "几点了")):',
        '        return "small"          # 便宜快：小模型或规则',
        '    if needs_multi_step(q):',
        '        return "reasoning"      # 贵但强：推理型模型',
        '    return "default"',
        '',
        'PRICE = {"small": 0.2, "default": 1.0, "reasoning": 4.0}   # 相对单价',
        '',
        '# ---------- 批量并发：1000 条任务，控制并发别压垮上游 ----------',
        'async def batch_run(items, worker, concurrency=8):',
        '    sem = asyncio.Semaphore(concurrency)',
        '    async def one(x):',
        '        async with sem:',
        '            return await worker(x)',
        '    return await asyncio.gather(*(one(x) for x in items), return_exceptions=True)',
        '',
        '# ---------- 效果自证：把优化量化成数字 ----------',
        'def report(before, after):',
        '    for k in ("qps", "p99_ms", "cost_per_1k"):',
        '        b, a = before[k], after[k]',
        '        delta = (a - b) / b * 100',
        '        arrow = "↓" if delta < 0 else "↑"',
        '        print(f"{k:12s} {b:>9.1f} -> {a:>9.1f}  {arrow}{abs(delta):.0f}%")',
        '',
        'report({"qps": 12, "p99_ms": 4200, "cost_per_1k": 38.0},',
        '       {"qps": 41, "p99_ms": 1500, "cost_per_1k": 19.4})'
      ].join('\n'),
      expect: '语义缓存命中率可统计；路由函数把简单问题分流到便宜模型；批量任务在受限并发下完成；最终能打印出一张三行对比表，量化出优化收益。',
      pitfalls: [
        '不先压测就优化。没有基线，改完说不清到底有没有变好。',
        '语义缓存阈值设太低，用户问不同的问题却返回同一个答案，体验灾难。',
        '并发不设上限，优化了自己的服务却把上游模型 API 打到限流。'
      ]
    },
    interview: [
      { q: '你说项目性能提升了，具体怎么做的、提升了多少？', a: '按「测—改—复测」讲：<strong>先压出基线（QPS 12 / P99 4.2s / 千次成本 38 元）</strong>；再上三招——语义缓存命中率约 35%（同类问题重复率高）、模型分级路由把简单分类任务导向小模型、批量任务用协程池并发并限制上游并发为 8；<strong>复测后 QPS 提升到 41、P99 降到 1.5s、成本降到 19.4 元。</strong>关键是把每一步的贡献说清楚，而不是笼统说"做了优化"。' },
      { q: '缓存 LLM 结果有什么风险？', a: '三个风险：① 语义缓存阈值不当会误命中，用户问不同问题拿到同一答案；② 知识更新后缓存未失效，返回过时内容；③ 涉及用户隐私的回答被跨用户命中造成信息泄露。<strong>对策是阈值调严、给缓存设 TTL、并把用户身份纳入缓存 key 的隔离维度。</strong>' }
    ],
    quiz: [
      { q: '提升 LLM 服务性能的三个基本方向是什么？', a: '少调用（缓存、模型分级路由、prompt 精简）、并发跑（协程并发 + 并发闸门）、批处理（把多次小请求合并）。三者针对的分别是调用次数、等待时间和单次开销。' },
      { q: '语义缓存的相似度阈值为什么不能设太低？', a: '阈值低意味着"看起来有点像"就算命中。不同用户的问题在向量空间里天然接近（都围绕同一业务领域），过低阈值会导致答非所问，比不缓存更糟。常见区间是 0.90~0.95，需要按业务实测。' },
      { q: '为什么优化前后一定要有量化对比？', a: '一方面证明优化有效，避免自我感觉良好；另一方面能定位是哪一招起了主要作用，判断是否值得继续投入。能给出具体数字的人，可信度远高于只说「做了优化」的。' }
    ]
  };

  C['observability'] = {
    concept: [
      '可观测解决的问题是：<strong>线上效果变差了，你要能查出是哪一步坏了</strong>。Agent 的链路长且不确定（模型输出不稳定、工具会失败、检索质量会波动），没有追踪就只能靠猜。',
      '成本控制是同一件事的另一面：LLM 成本随调用量和 token 数线性增长，必须<strong>看得见</strong>才能<strong>管得住</strong>。核心是记录每次调用的 token 数、模型、耗时，按业务维度聚合。'
    ],
    analogy: [
      '像<b>汽车的仪表盘</b>。油量、水温、故障灯——不是装饰，是让你在抛锚前发现问题。',
      'Agent 的可观测就是这个仪表盘：token 消耗是油量，P99 延迟是水温，工具失败率是故障灯。'
    ],
    cases: [
      '<b>成本突然涨了三倍</b>：查不到原因，因为没按用户和场景打点。加上维度后才发现是某个场景的 prompt 模板被改长了两千字。',
      '<b>回答质量下降但没人发现</b>：没有质量指标，只能等用户投诉。上线了每日抽样评估后，能在指标下滑当天就定位到是上游模型版本更新导致的。',
      '<b>排查一次失败耗时半天</b>：没有 trace_id，无法把一次用户请求关联到它的检索、工具调用、生成各步骤。'
    ],
    practice: {
      steps: [
        '<b>全程 trace_id</b>：一个请求一个 ID，贯穿检索、工具、生成每一步，所有日志都带上。',
        '<b>记录结构化调用日志</b>：模型名、输入输出 token、耗时、是否重试、成本。',
        '<b>定义核心指标</b>：QPS、P50/P99 延迟、工具失败率、缓存命中率、单次平均成本。',
        '<b>加质量抽样</b>：每日抽一批线上请求做人工或模型评估，跟踪 Faithfulness 等质量指标。',
        '<b>设预算告警</b>：按日/周设置 token 与成本阈值，超限告警（走钉钉群机器人 Webhook 之类无需登录的通道）。'
      ],
      lang: 'python',
      code: [
        'import time, uuid, json, logging, functools',
        'from contextvars import ContextVar',
        '',
        'trace_id = ContextVar("trace_id", default="-")',
        'log = logging.getLogger("agent")',
        '',
        '# 单价（元/百万 token），按实际模型替换',
        'PRICE = {"deepseek-chat": (1.0, 2.0), "qwen2.5:7b": (0.0, 0.0)}',
        '',
        'def traced(fn):',
        '    """给每一步加追踪：检索、工具、生成都套上这个装饰器"""',
        '    @functools.wraps(fn)',
        '    async def wrap(*a, **kw):',
        '        tid = trace_id.get()',
        '        t0 = time.perf_counter()',
        '        try:',
        '            out = await fn(*a, **kw)',
        '            log.info(json.dumps({"tid": tid, "step": fn.__name__, "ok": True,',
        '                                 "ms": int((time.perf_counter()-t0)*1000)}, ensure_ascii=False))',
        '            return out',
        '        except Exception as e:',
        '            log.exception(json.dumps({"tid": tid, "step": fn.__name__, "ok": False,',
        '                                      "ms": int((time.perf_counter()-t0)*1000),',
        '                                      "err": type(e).__name__}, ensure_ascii=False))',
        '            raise',
        '    return wrap',
        '',
        'def meter(model, usage, biz):',
        '    """记录 token 与成本，按业务维度聚合"""',
        '    pin, pout = PRICE.get(model, (0, 0))',
        '    it, ot = usage.prompt_tokens, usage.completion_tokens',
        '    cost = (it * pin + ot * pout) / 1e6',
        '    rec = {"tid": trace_id.get(), "model": model, "in": it, "out": ot,',
        '           "cost": round(cost, 6), **biz}',
        '    log.info("llm.usage " + json.dumps(rec, ensure_ascii=False))',
        '    return rec',
        '',
        '# 预算守卫：日成本超限直接熔断，防止跑飞造成账单事故',
        'class Budget:',
        '    def __init__(self, daily_cny):',
        '        self.limit, self.used = daily_cny, 0.0',
        '',
        '    def charge(self, cost):',
        '        self.used += cost',
        '        if self.used > self.limit:',
        '            raise RuntimeError(f"日预算超限 {self.used:.2f}/{self.limit} 元，已熔断")',
        '        if self.used > self.limit * 0.8:',
        '            log.warning(f"预算已用 {self.used/self.limit:.0%}")',
        '',
        '# 一次请求的完整包裹',
        'async def handle(question, biz):',
        '    trace_id.set(uuid.uuid4().hex[:12])',
        '    docs = await retrieve(question)          # 已被 traced 包裹',
        '    ans, usage = await generate(question, docs)',
        '    meter("deepseek-chat", usage, biz)',
        '    return ans'
      ].join('\n'),
      expect: '每条日志都带 tid，能把一次请求的检索、生成等步骤串起来；token 与成本按模型和业务维度记录；日成本超过阈值时抛错熔断而不是继续烧钱。',
      pitfalls: [
        '不打 trace_id，出问题无法把多步日志关联成一次请求。',
        '只记录总成本，不按用户/场景维度拆分，涨了也查不出原因。',
        '没有预算熔断。一次死循环可能产生一笔意外的大额账单。'
      ]
    },
    interview: [
      { q: '线上效果变差了你怎么排查？', a: '三步：① 用指标定位变化的时间点与范围（延迟、失败率、token 数、质量抽样分数）；② 用 trace_id 拉出那个时间段的完整链路，看是检索召回变差、工具失败率升高、还是上游模型版本变了；③ 用评测集本地复现确认。<strong>关键是平时就要有指标和追踪，出了事才有数据可查。</strong>' },
      { q: '你怎么控制 LLM 成本？', a: '四招：<strong>看得见</strong>——每次调用都记 token 与成本，按业务维度聚合；<strong>花得少</strong>——语义缓存、模型分级路由、精简 prompt 与上下文；<strong>管得住</strong>——设日预算与告警，超限熔断；<strong>持续看</strong>——把单次平均成本做成趋势指标，异常上涨立即定位。' }
    ],
    quiz: [
      { q: 'trace_id 的作用是什么？', a: '把一次用户请求涉及的所有步骤（检索、工具调用、模型生成、重试）关联成一条完整链路。出问题时能一次性看到全貌，而不是在茫茫日志里靠时间戳猜测。' },
      { q: '为什么必须设成本熔断？', a: 'Agent 的不确定性可能导致死循环、异常重试或提示注入引发的连环调用，产生远超预期的 token 消耗。熔断把「意外大额账单」这个风险从不可控变成可控。' },
      { q: '哪几个指标最能反映 Agent 服务的健康度？', a: 'P99 延迟（用户体验）、工具调用失败率（外部依赖稳定性）、缓存命中率（成本效率）、单次平均成本、以及质量抽样分数（如 Faithfulness）。前四个看系统，最后一个看效果。' }
    ]
  };

  C['evaluation'] = {
    concept: [
      '评估回答一个问题：<strong>你怎么知道改完之后是变好了还是变差了</strong>。没有评估，所有优化都是凭感觉，而且很容易在一个场景调好的同时把另一个场景改坏。',
      'Agent 的评估比传统模型复杂：输出是开放文本，中间还有检索和工具调用。所以要分层评估——<strong>检索层看召回，生成层看忠实度，端到端看任务成功率</strong>。'
    ],
    analogy: [
      '像一个<b>体检报告</b>。不会只看一个"健康分"，而是分项看：血压、血脂、肝功能。哪项异常就针对哪项处理。',
      '只看端到端准确率就像只看"你健康吗"这一个问题——答"不太健康"之后你还是不知道从哪下手。'
    ],
    cases: [
      '<b>没有评测集导致改坏不自知</b>：为了提升某类问题的召回，把 chunk 调小，结果表格类问题的召回反而崩了。有评测集就能立刻发现。',
      '<b>只看端到端看不出瓶颈</b>：准确率 60%，但不知道是检索没召回还是生成了幻觉。分层的 Recall@K 一测就清楚。',
      '<b>用同一个模型自评</b>：让生成模型自己打分，结果它给自己的错误答案打高分。评估要么用人工标注，要么用不同的模型 + 明确的评分标准。'
    ],
    practice: {
      steps: [
        '<b>先建评测集</b>：50~100 条「问题 + 标准答案 + 依据片段」，覆盖典型场景与边界情况。这是最关键也最容易被跳过的一步。',
        '<b>检索层指标</b>：Recall@K（正确片段是否在前 K 个候选里）、MRR（正确项排得多靠前）。',
        '<b>生成层指标</b>：Faithfulness（结论是否被引用片段支持）、Answer Relevance（是否答到点上）。',
        '<b>端到端指标</b>：任务成功率、平均步数、平均成本、拒答率。',
        '<b>用 LLM-as-Judge 批量评</b>：给定明确评分标准，用另一个模型批量打分，再人工抽检校准。',
        '<b>纳入回归</b>：每次改动都跑一遍，指标下降就回退。'
      ],
      lang: 'python',
      code: [
        'from dataclasses import dataclass',
        'from statistics import mean',
        '',
        '@dataclass',
        'class Case:',
        '    q: str',
        '    gold_chunk_id: str        # 标准答案所在的片段',
        '    gold_answer: str',
        '',
        'def evaluate(cases, retriever, answer_fn, judge):',
        '    rows = []',
        '    for c in cases:',
        '        hits = retriever(c.q, k=5)',
        '        ids = [h["id"] for h in hits]',
        '',
        '        # ---- 检索层：正确片段有没有被召回，排在第几 ----',
        '        recall = 1.0 if c.gold_chunk_id in ids else 0.0',
        '        rank = ids.index(c.gold_chunk_id) + 1 if recall else 0',
        '        mrr = (1.0 / rank) if rank else 0.0',
        '',
        '        # ---- 生成层：忠实度 + 相关性（交给 judge，给明确评分标准）----',
        '        ans = answer_fn(c.q, hits)',
        '        faith = judge.faithfulness(ans, [h["text"] for h in hits])   # 0~1',
        '        relev = judge.relevance(c.q, ans)                            # 0~1',
        '',
        '        # ---- 端到端：是否与标准答案语义一致 ----',
        '        correct = judge.equivalent(ans, c.gold_answer)               # bool',
        '',
        '        rows.append({"q": c.q, "recall@5": recall, "mrr": mrr,',
        '                     "faith": faith, "relev": relev, "correct": correct})',
        '',
        '    n = len(rows)',
        '    return {',
        '        "n": n,',
        '        "recall@5": round(mean(r["recall@5"] for r in rows), 3),',
        '        "mrr": round(mean(r["mrr"] for r in rows), 3),',
        '        "faithfulness": round(mean(r["faith"] for r in rows), 3),',
        '        "relevance": round(mean(r["relev"] for r in rows), 3),',
        '        "accuracy": round(sum(r["correct"] for r in rows) / n, 3),',
        '        "details": rows,',
        '    }',
        '',
        '# ---- 回归门禁：指标低于基线就拒绝合并 ----',
        'BASELINE = {"recall@5": 0.82, "faithfulness": 0.90, "accuracy": 0.75}',
        '',
        'def gate(now, baseline=BASELINE, tol=0.02):',
        '    bad = {k: (baseline[k], now[k]) for k in baseline',
        '           if now[k] < baseline[k] - tol}',
        '    if bad:',
        '        print("❌ 未通过：", bad)',
        '        return False',
        '    print("✅ 全项通过")',
        '    return True'
      ].join('\n'),
      expect: '输出一张分层指标表（检索层 Recall/MRR、生成层 Faithfulness/Relevance、端到端 Accuracy），并能用门禁函数判断本次改动是否可合入。',
      pitfalls: [
        '只用端到端准确率一个指标。看不出瓶颈在哪一层。',
        '评测集只覆盖典型情况，没有边界和负例（答案不存在的提问）。',
        '让生成模型自评自己的输出。要有明确的评分标准，并人工抽检校准 judge 的可靠性。'
      ]
    },
    interview: [
      { q: '你怎么评估一个 RAG 系统？', a: '分三层：<strong>检索层</strong>看 Recall@K 和 MRR——正确片段有没有被召回到、排得多靠前；<strong>生成层</strong>看 Faithfulness（结论是否被引用片段支持，衡量幻觉）和 Answer Relevance（是否答到点）；<strong>端到端</strong>看任务成功率、平均步数与成本、拒答率。<strong>关键是先建 50~100 条评测集，然后把每次改动的结果纳入回归门禁，指标掉了就回退。</strong>' },
      { q: 'LLM-as-Judge 可靠吗？怎么提高可靠性？', a: '有系统性偏差：模型倾向给长回答高分、给自己风格相近的输出高分、排序时对位置敏感。<strong>提高可靠性的做法：给明确的评分标准和锚点示例；用与生成模型不同的模型来评；对排序任务做双向评分取平均消除位置偏差；最后人工抽检一批校准 judge 与人工打分的一致性。</strong>' }
    ],
    quiz: [
      { q: '为什么评估要分层而不是只看端到端？', a: '端到端指标只能告诉你「不好」，不能告诉你「哪里不好」。分层后能直接定位：Recall 低说明检索有问题，Recall 高但 Faithfulness 低说明生成阶段有幻觉，两者都好但准确率低说明评测集或标准答案本身有问题。' },
      { q: 'Recall@K 和 MRR 分别衡量什么？', a: 'Recall@K 衡量正确片段是否出现在前 K 个候选里（覆盖面）；MRR 衡量正确片段排名的倒数均值（排序质量）。前者看有没有找到，后者看排得好不好。' },
      { q: '什么是回归门禁？', a: '把评测指标设成基线阈值，每次代码或配置改动后自动跑评测，任一关键指标低于基线容忍范围就拒绝合入。作用是把「优化 A 场景时改坏 B 场景」这类问题在merge前拦掉。' }
    ]
  };

})();
