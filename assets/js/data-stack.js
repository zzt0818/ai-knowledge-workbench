/* ============================================================
   技术选型速查表 · Stack
   八组：模型接入 / 编排框架 / 检索链路 / 向量库 / 记忆层 /
         工具与协议 / 服务化与推理 / 可观测与评估
   每行给三件事：它负责什么、什么时候选它、坑在哪。
   ============================================================ */
window.STACK = {

  note: '选型的通则是「先定问题的形状，再挑工具」。同一类里排在前面的不是星星最多的，' +
        '而是最不容易让你在三个月后推倒重来的。带「慎选」的不代表差，代表有明确的适用边界。',

  groups: [

    /* ---------------- 1 ---------------- */
    {
      id: 'model', ord: '01', name: '模型接入与路由', en: 'MODEL / ROUTING',
      desc: 'Agent 的主脑。真正要决定的不是「用哪家」，而是「哪些步骤值得用贵的」。',
      rows: [
        { st: 4, n: 'OpenAI GPT-5 / o 系列', v: 'API',
          role: '复杂推理、规划、代码生成的主脑',
          take: '贵但稳，适合放在 Planner、评测裁判、关键校验这类调用次数少但对质量敏感的环节。' },
        { st: 4, n: 'Anthropic Claude', v: 'API',
          role: '长上下文、工具调用、子代理编排',
          take: 'Extended Thinking 让模型能在工具调用之间重新规划，很多「ReAct 循环」可以收进一次调用。Agent SDK 的子代理层级最深。' },
        { st: 2, n: 'DeepSeek', v: 'API / 开源权重',
          role: '性价比主力，中文任务强',
          take: '通用问答、抽取、摘要这类高频调用的默认选择。本地部署预算紧张时的第一顺位开源权重。' },
        { st: 3, n: 'Qwen 系列', v: '开源权重',
          role: '中文 + 工具调用 + 可微调',
          take: '要私有化又要中文能力时优先考虑。尺寸档位全，从端侧到 70B 都有对应版本。' },
        { st: 5, n: 'vLLM', v: '自托管',
          role: 'GPU 上的高吞吐推理引擎',
          take: '生产自托管的默认答案。原生吃 AWQ 与 GPTQ，PagedAttention 把并发吞吐拉开一个量级。不吃 GGUF。' },
        { st: 5, n: 'SGLang', v: '自托管',
          role: '结构化输出与前缀复用',
          take: '大量共享 system prompt、或需要严格 JSON/正则约束解码时比 vLLM 更省。' },
        { st: 2, n: 'Ollama', v: '本地 / 端侧',
          role: '一句话把模型跑起来',
          take: '开发和演示环境首选。想吃 GGUF 就只能走 llama.cpp 系。生产高并发不是它的主场。' },
        { st: 4, n: 'LiteLLM', v: '网关',
          role: '统一 100+ 模型的调用接口',
          take: '多模型分级路由、失败自动兜底、统一计费埋点，都在这一层做。别在业务代码里散落各家 SDK。' }
      ]
    },

    /* ---------------- 2 ---------------- */
    {
      id: 'orch', ord: '02', name: '编排框架', en: 'ORCHESTRATION',
      desc: '决定你的 Agent 是一条直线、一张状态机，还是几个角色在开会。选错这一层，三个月后要重写。',
      rows: [
        { st: 4, n: 'LangGraph', v: '1.x（独立库）',
          role: '有状态生产工作流',
          take: '要审计、要回滚、要 human-in-the-loop 审批，选它。内置 checkpointing（SQLite/Postgres）和 time-travel 调试。学习曲线 1–2 周是主要成本。注意：1.0 起已是独立库，不再依赖 LangChain。' },
        { st: 4, n: 'LlamaIndex Workflows', v: '1.0',
          role: '事件驱动的 RAG-grounded agent',
          take: '核心是「把知识库用好」而不是「编排多智能体」时，它仍是很合适的一把手。事件驱动，Python/TS 对等。' },
        { st: 3, n: 'CrewAI', v: '1.14+',
          role: '角色化多智能体',
          take: '最快的原型路径，数小时上手。但遇到需要条件分支和状态回滚的受监管流程，角色范式表达不干净——这是要预留迁移成本的地方。' },
        { st: 3, n: 'OpenAI Agents SDK', v: 'GA',
          role: '最少原语的轻编排',
          take: '只有四个概念：agents / handoffs / guardrails / tracing。从零到能跑最快。经网关可接 100+ 模型。' },
        { st: 5, n: 'Microsoft Agent Framework', v: '1.0',
          role: '企业级，原生 MCP + A2A',
          take: '已有 .NET / Azure 技术栈的团队顺理成章。由 Semantic Kernel 与 AutoGen 合并而来。' },
        { st: 5, n: 'Google ADK', v: '2.0',
          role: '多语言对等 + 原生 A2A',
          take: 'Python / TS / Java / Go 四语言对等是它独有的。要跨语言团队协作时省事。' },
        { st: 4, n: 'Pydantic AI', v: '2.0',
          role: '类型安全的轻量编排',
          take: '已经重度使用 Pydantic 做数据校验的项目，会明显感觉顺手。' },
        { st: 4, n: 'Mastra', v: 'TS 优先',
          role: '前端团队做 Agent',
          take: 'TypeScript 团队不必为了做 Agent 换语言栈。' },
        { st: 5, n: 'AG2', v: '社区分支',
          role: 'AutoGen 的延续',
          take: '遗留项目维护用。新项目建议走 Microsoft Agent Framework。' }
      ]
    },

    /* ---------------- 3 ---------------- */
    {
      id: 'retrieval', ord: '03', name: '检索链路', en: 'RETRIEVAL',
      desc: 'RAG 准不准，八成由这一组决定，而不是由向量库决定。切分、嵌入、重排、改写，每一环都在动召回上限。',
      rows: [
        { st: 3, n: 'docling / Unstructured', v: '解析',
          role: 'PDF、Word、Excel、PPT 结构还原',
          take: '多栏排版、表格、扫描件是企业资料的真实形态，解析质量直接决定后面所有环节的天花板。扫描件要配 OCR。' },
        { st: 3, n: 'PyMuPDF', v: '解析',
          role: 'PDF 快速抽取',
          take: '文本型 PDF 最快最轻。表格复杂时它会丢结构，别硬扛。' },
        { st: 3, n: '语义切分（按标题 / 递归）', v: '切分策略',
          role: '把长文拆成可检索片段',
          take: '切太碎单块缺上下文，切太大向量语义被稀释。默认起手用递归字符切分 + 重叠 10–15%，再按标题层级兜一层。' },
        { st: 3, n: 'BGE-M3 / text-embedding-3 / jina-v3', v: '嵌入模型',
          role: '把文本变成向量',
          take: '中文为主的语料优先 BGE 系；要 multilingual 且不想自托管就选托管方案。换嵌入模型等于全库重算向量，选之前先想清楚。' },
        { st: 4, n: 'Cohere Rerank / BGE-Reranker', v: '重排',
          role: '粗筛后精选 top-5',
          take: '两阶段检索的必备件：向量 top-100 粗筛，重排器选最终 top-5。加约 200ms 延迟，但显著压低「语义相关却事实错误」的输出。永远要重排。' },
        { st: 4, n: 'BM25 / BM42 + RRF 融合', v: '混合检索',
          role: '补向量检索的精确串短板',
          take: '向量管概念，BM25 管精确串（型号、编号、人名）。生产里混合检索是默认不是可选，长尾术语召回提升能超过 20%。Qdrant、Weaviate、Pinecone 都原生支持。' },
        { st: 4, n: '查询改写 / HyDE', v: '前置处理',
          role: '弥合用户用词与文档用词的差距',
          take: '不改写就是在让检索器和用户互相猜。便宜版：让模型把问题改写成 2–3 个说法取并集。HyDE 先编一个假想答案再检索，实测常带来 10–15% 召回提升，适合问法和文档用词差距大的场景。' },
        { st: 5, n: 'GraphRAG', v: '图检索',
          role: '回答需要跨文档串联的问题',
          take: '「把散落在五份文件里的同一条业务线串起来」这类问题，纯向量很难。成本已经降到可以真正上生产的程度。' },
        { st: 5, n: 'ColBERT 式 late-interaction', v: '新选项',
          role: '不依赖重排器的精排检索',
          take: '已经能与「dense + 重排」的管线正面竞争，代价是索引体积。' },
        { st: 5, n: 'ACL 元数据过滤', v: '权限',
          role: '企业文档权限对齐',
          take: '用户在源系统看不到的文档，在 RAG 里也不能召回。把 ACL 写进向量 metadata，在检索之前按用户所属组过滤——事后过滤等于已经泄露了。' }
      ]
    },

    /* ---------------- 4 ---------------- */
    {
      id: 'vector', ord: '04', name: '向量库', en: 'VECTOR STORE',
      desc: '第一原则：最好的向量库是你已经在跑的那个。第二个数据库意味着一条同步管线和一份运维负担。',
      rows: [
        { st: 4, n: 'pgvector / pgvectorscale', v: 'Postgres 扩展',
          role: '与业务数据同库同事务',
          take: '已在 Postgres 上就别急着上新系统。HNSW 索引下百万级仍可行，上千万需要分区。同库意味着事务一致、少一套运维。' },
        { st: 4, n: 'Qdrant', v: 'Rust 专用引擎',
          role: '自托管首选',
          take: 'payload filtering 强、内存高效，自托管 / 托管 / 边缘都能跑（一条 docker run 起本地）。要精细元数据过滤时它的表达力最舒服。' },
        { st: 5, n: 'Milvus', v: '分布式',
          role: '十亿级、多模态',
          take: '多索引（HNSW / IVF / DiskANN）、K8s Helm 部署。代价是运维复杂度，规模没到别上。' },
        { st: 4, n: 'Weaviate', v: '混合检索',
          role: '混合检索与多租户最强',
          take: 'SaaS 形态、需要按租户严格隔离时它的原生支持最省事。' },
        { st: 3, n: 'Pinecone', v: '托管 serverless',
          role: '零运维',
          take: '不想管基础设施、预算能接受按量计费时最省心。代价是不可自托管、数据不在自己机房。' },
        { st: 2, n: 'Chroma', v: '原型',
          role: '最快跑通 Demo',
          take: '原型期很好用，但生产前通常要迁。别把原型选择当长期决策。' },
        { st: 4, n: 'LanceDB', v: '列式存储',
          role: '多模态、S3 友好',
          take: '数据要落在对象存储上、又要多模态检索时合适。' },
        { st: 4, n: 'Elasticsearch / OpenSearch', v: '已有栈',
          role: '向量 + 全文一把梭',
          take: '团队已经有 ES 集群，直接加向量字段是最低成本路径。' }
      ]
    },

    /* ---------------- 5 ---------------- */
    {
      id: 'memory', ord: '05', name: '记忆层', en: 'MEMORY',
      desc: '持久记忆解决跨会话状态，上下文工程解决单次会话状态。两者相邻但谁也替代不了谁。',
      rows: [
        { st: 4, n: 'Mem0', v: '三代演进代表',
          role: 'LLM 抽结构化 fact 存取',
          take: '同样的对话历史，把「塞原文」换成「抽事实只塞相关的」，单跳 F1 从 27.1 升到 38.72、平均 token 从 26k 降到 1.5k、P99 延迟从 17s 降到 1.4s。检索 p50 约 0.15s，是「感觉原生」的那一档。' },
        { st: 5, n: 'Zep / Graphiti', v: '双时态图',
          role: '记住「什么时候为真」',
          take: '用户改了偏好、换了联系人、修订了需求时，能推理出哪个版本的事实当时成立。向量库返回最相似的，它返回实体当前最准确的。' },
        { st: 5, n: 'Letta（原 MemGPT）', v: 'OS 隐喻',
          role: 'agent 自己管记忆分页',
          take: '把上下文窗口当 RAM、外部存储当硬盘，三层 Core / Archival / Recall。agent 自己决定记什么忘什么，代价是更多工具调用，且记忆质量依赖模型判断力。' },
        { st: 5, n: '自研：Redis + Postgres', v: '组合',
          role: '可控性最高',
          take: '短期用 Redis 存会话，长期用 PG 存结构化事实并带 valid_from / valid_to。要审计和合规时这条路最好走。' },
        { st: 5, n: 'Context window poisoning 防护', v: '必做的策略',
          role: '防止恶意内容被反复重放',
          take: '早期轮次注入的内容会在每次调用时被重放，持续影响后续输出——除非显式移除。同时防 silent truncation：历史涨过窗口后最早的几条被静默截断、没有任何报错，而 system prompt 排在消息数组最前面，它第一个被砍。' }
      ]
    },

    /* ---------------- 6 ---------------- */
    {
      id: 'tools', ord: '06', name: '工具与协议', en: 'TOOLS / PROTOCOL',
      desc: 'Agent 能做的事，等于它手里工具的质量。工具设计是工程活，不是把函数签名丢给模型就完事。',
      rows: [
        { st: 3, n: 'MCP', v: '2026 已成 table stakes',
          role: '工具与数据源的统一接入协议',
          take: '不支持 MCP 的框架等于让团队自己写别人免费拿到的胶水代码。社区 MCP server 已超 13000 个，主流框架里 7 个原生支持。选框架先看这一条。' },
        { st: 3, n: 'Function Calling / 结构化输出', v: '基础机制',
          role: '让模型按 schema 选工具、产参数',
          take: '参数校验必须在服务端再做一次。模型编造一个不存在的参数，可能直接导致错误操作。' },
        { st: 4, n: 'OpenAPI 转工具', v: '快速扩面',
          role: '把已有 REST 接口直接变工具',
          take: '接口越多越要收敛——工具描述要控制数量，几十个工具堆给模型，选择准确率会掉。按场景分组、按需下发。' },
        { st: 5, n: 'A2A', v: '跨 agent 互操作',
          role: 'agent 之间互相调用',
          take: '多团队、多厂商的 agent 要协同时才需要。单体应用先别引入。' },
        { st: 4, n: 'Playwright / 无头浏览器', v: '执行器',
          role: '需要真实网页交互的场景',
          take: '比纯 HTTP 抓取更能应付动态页面。要配沙箱和超时，不然一个卡住的页面能拖死整个循环。' },
        { st: 5, n: '沙箱执行（容器 / 受限进程）', v: '安全边界',
          role: '跑模型生成的代码',
          take: '让模型生成代码就要假设代码会出错或恶意。无网络、只读文件系统、资源上限、超时，四样缺一不可。' }
      ]
    },

    /* ---------------- 7 ---------------- */
    {
      id: 'serving', ord: '07', name: '服务化与推理', en: 'SERVING / RUNTIME',
      desc: '把「我电脑上能跑」变成「别人也能访问」。Agent 比普通服务多三件事：长连接、模型不可用的降级、成本可归因。',
      rows: [
        { st: 4, n: 'FastAPI + SSE', v: '接口层',
          role: '流式输出 Agent 回答',
          take: '大模型只需服务端单向推，SSE 就够，别上 WebSocket。生产要配 Content-Type: text/event-stream、X-Accel-Buffering: no，Nginx 侧 proxy_buffering off、proxy_read_timeout 300s——这套配完才是真「边推理边输出」。' },
        { st: 4, n: '心跳与断连检测', v: '必需',
          role: '保活 + 防止替用户付费',
          take: '每 30s 发一次心跳，防止代理层因「长时间无数据」掐掉长连接。生成器里必须检查客户端是否已断开，断就立刻停止推理——用户关了页面你还在烧 token 是最亏的一种浪费。' },
        { st: 4, n: 'Redis', v: '缓存',
          role: '答案缓存、会话状态、限流计数',
          take: '相同问题短时间重复问是常态，缓存命中率高得惊人。会话状态放 Redis 比放进程内存可靠。' },
        { st: 5, n: '任务队列（Celery / Arq / Temporal）', v: '异步',
          role: '长任务不占住 HTTP 连接',
          take: '几分钟量级的 Agent 任务不该挂在前端请求上。Temporal 这类能把「持久化执行」做扎实，agent 中途崩了能从检查点续。' },
        { st: 5, n: '令牌桶限流', v: '防护',
          role: '防单用户烧光团队配额',
          take: '在网关或应用层对 /chat/stream 限流，配合熔断后推标准错误帧 + 指数退避重试，最多 3 次再走降级 UI。' },
        { st: 5, n: 'AWQ', v: '4-bit GPU 量化',
          role: 'GPU 生产推理的默认',
          take: 'vLLM / TGI 原生支持，加载最快、精度最优。两个必知坑：量化后要用 --enforce-eager 禁用 CUDA Graph，否则首次推理延迟飙升；权重校准依赖 GPU 架构，在别的卡上校准的权重换过来性能会掉两成以上，必须在目标卡上校准。' },
        { st: 4, n: 'GGUF', v: 'Q4_K_M 甜点',
          role: '本地与端侧推理',
          take: 'Q4_K_M 是 2026 的甜点：约 4× 显存压缩、质量损失不到 2%。3-bit 以下掉得明显，除非显存被卡死否则别用——加显存比激进量化划算。' },
        { st: 5, n: 'LoRA / QLoRA', v: '低成本微调',
          role: '领域适配',
          take: '大多数问题应该用更好的 prompt、更完善的 RAG 或更合理的 Agent 设计解决，而不是微调。真要微调，LoRA 只训一小部分低秩矩阵，显存小、训练快、权重可随时切换。' }
      ]
    },

    /* ---------------- 8 ---------------- */
    {
      id: 'ops', ord: '08', name: '可观测与评估', en: 'OBSERVABILITY / EVAL',
      desc: '看得见不等于做得好。一线调研里近九成团队上了可观测，但近三成完全没有评测——差距就在这一组。',
      rows: [
        { st: 5, n: 'OpenTelemetry GenAI 语义约定', v: '标准',
          role: '厂商中立的埋点规范',
          take: '定义 gen_ai.* span 属性，覆盖模型调用、token 用量、agent 步骤、工具执行。按它埋点的直接收益：换工具时不必重埋代码。注意目前仍是实验性、属性名可能变，迁移期建议新旧名双发。' },
        { st: 4, n: 'Langfuse', v: '开源核心',
          role: '框架无关的 trace 与成本',
          take: '可 Docker / K8s 自托管，数据驻留完全可控，自托管下无按事件计费。判据很干脆：数据必须留在自己机房就选它。约 30 分钟能接入。' },
        { st: 4, n: 'LangSmith', v: '托管',
          role: 'LangChain / LangGraph 深度集成',
          take: '在 LangGraph 里几乎零代码接入，能总结大 trace、把生产故障聚类成按优先级排序的问题。代价是绑定与托管。' },
        { st: 5, n: 'Arize Phoenix', v: 'OTel 原生',
          role: '评测原语更深',
          take: '有 RAG 专用质量图与漂移检测，可自托管。要「看得深」而不只是「看得见」时合适。' },
        { st: 5, n: 'Braintrust / MLflow', v: '评测优先 / 数据自持',
          role: 'CI 质量门禁 + trace 归你',
          take: 'MLflow 以 OTel GenAI 格式导出 trace，还带 AI Gateway 做路由限流兜底；已有 ML 平台的团队接起来顺。' },
        { st: 4, n: 'RAGAS', v: '探索与造金标',
          role: '无参考答案也能评',
          take: 'TestsetGenerator 能读你的语料合成问答对，用来造金标集最快。已知脆弱点：裁判模型没输出严格 JSON 时会返回 NaN，换更强的裁判或加解析重试。' },
        { st: 5, n: 'DeepEval', v: 'CI 门禁',
          role: 'pytest 原生的质量闸门',
          take: 'assert_test 直接让构建失败，40+ 预置指标。--deepeval-cache-file 在稳定金标集上把 CI 成本降 5–10 倍。只在改动检索或提示词的 PR 上跑评测。' },
        { st: 5, n: 'TruLens / Langfuse 打分', v: '生产回路',
          role: '对线上流量持续评分',
          take: '生产监控才是成本敏感处。常规做法：随机抽 1–5% 流量 + 100% 低置信输出 + 新功能上线首 48 小时全量。' },
        { st: 4, n: 'LLM-as-Judge 使用纪律', v: '方法',
          role: '自动评分',
          take: '与人工判断相关性约 κ 0.6–0.8：够做回归检测，不够宣称绝对质量。前提是裁判比生成者更强、温度 0、结构化评分细则、随机化答案顺序（治位置偏差）、控制长度（治啰嗦偏差）、用不同家族模型（治自我偏好）、每次发布人工抽检 10%。' },
        { st: 5, n: '传统指标的处置', v: '可弃用',
          role: 'BLEU / ROUGE / METEOR',
          take: '它们量的是 n-gram 重叠，不是语义正确性或任务完成度，对现代模型输出基本无用。别为了「有指标」而留着。' }
      ]
    }

  ]
};
