/* ============================================================
   要点数据 · Notes
   每个知识点沉淀下来的硬信息：版本号、实测数字、协议与规范变更、
   一线踩坑。正文不标注出处，取用时以官方文档为准。
   由 _dev/gen_notes.js 生成，可直接编辑。
   ============================================================ */
window.NOTES = {
  'python-eng': {
    items: [
      { t: "当前工具链", v: "2026 主流：<code>pyproject.toml</code> 单文件声明依赖 + <code>uv</code>/<code>pip-tools</code> 生成 lock 文件；格式化与 lint 用 <code>ruff</code>，类型检查 <code>mypy</code>。requirements.txt 不写版本号等于没锁。" },
      { t: "配置分离", v: "用 <code>pydantic-settings</code> 从 <code>.env</code> 读配置并做类型校验，密钥永不进 Git 历史——这是翻仓库时最快能看出工程习惯的一项。" },
      { t: "为什么值钱", v: "企业面 Python 不是考语法，是考「别人敢不敢接手」。依赖可复现、配置外置、接口自解释、出错能定位——这四条比会写装饰器重要得多。" }
    ]
  },

  'async-io': {
    items: [
      { t: "同步客户端会堵死事件循环", v: "<code>anthropic.Anthropic()</code> 的 <code>messages.stream()</code> 是同步上下文管理器。在 <code>async</code> 的 FastAPI 路由里直接用它，会阻塞 uvicorn 的事件循环。生产必须换 <code>AsyncAnthropic</code>。低流量时同步客户端看着没事，一上并发就现原形。" },
      { t: "Python 版本有硬下限", v: "LangGraph 的 <code>get_stream_writer()</code> 要在 async 任务之间传播，依赖 <code>ContextVar</code>。Python 3.11+ 才可靠，3.10 及以下会在跨任务时丢掉 writer。别为了兼容降版本。" },
      { t: "超时要分层设，不能一刀切", v: "参考阈值：prompt 预处理 <b>300ms</b>（硬超时，失败即拒）；首 token <b>15s</b>，之后按 2s/100 token 动态计算并支持流式中断；后处理 <b>800ms</b>，可降级跳过非关键校验。用嵌套 context 传递，父 level 超时自动 cancel 子级，避免无效 token 生成。" }
    ]
  },

  'api-service': {
    items: [
      { t: "SSE 的三个响应头", v: "<code>Content-Type: text/event-stream</code>、<code>Cache-Control: no-cache</code>、<code>Connection: keep-alive</code>，再加 <code>X-Accel-Buffering: no</code> 强制关闭 Nginx 缓冲——不加这条，分片会在代理层堆积，前端看到的是「转半天然后整段蹦出来」。" },
      { t: "Nginx 反代必须这样配", v: "<code>proxy_buffering off;</code>、<code>proxy_cache off;</code>、<code>proxy_set_header Connection \"\";</code>、<code>proxy_http_version 1.1;</code>、<code>proxy_read_timeout 300s;</code>。少任何一条，长流式会话都可能被中途掐断。" },
      { t: "心跳不用自己写", v: "<code>sse-starlette</code> 的 <code>EventSourceResponse</code> 自带 <code>: ping</code> 注释行心跳，能保持连接活跃并被负载均衡器正确识别。自建方案则每 30s 发一次心跳。" },
      { t: "错误要分类处理，别一律重试", v: "<code>RateLimitError</code> / <code>APIConnectionError</code> → 指数退避重试（BASE_DELAY 1s，×2）；<code>AuthenticationError</code> / <code>BadRequestError</code> → <b>立即失败不重试</b>，重试只会浪费配额和时间。所有错误混在一起重试是最常见的错误做法。" },
      { t: "别用 500 粗暴断连", v: "流中途出错时不要抛 500 让连接粗暴断开，要在 SSE 流里发一个结构化的错误事件：<code>{\"type\":\"error\",\"error\":\"...\",\"finish_reason\":\"error\"}</code>，让前端能优雅展示并结束。" }
    ]
  },

  'deployment': {
    items: [
      { t: "Dockerfile 最小生产形态", v: "<code>python:3.12-slim</code> + <code>pip install --no-cache-dir</code> + <code>CMD [\"uvicorn\",\"main:app\",\"--host\",\"0.0.0.0\",\"--port\",\"8000\",\"--workers\",\"4\"]</code>。同时必须提供 <code>/health</code> 端点给 K8s 的 readiness / liveness 探针。" },
      { t: "熔断要给出可执行的重连指令", v: "触发超时后推标准错误帧：<code>event: error</code> + <code>data: {\"code\":\"CIRCUIT_OPEN\",\"message\":\"...\",\"retry\":5000}</code>。前端监听 error 事件解析 retry 字段，按指数退避（后续 ×1.5），最多 3 次后走降级 UI。半开状态建议 retry 2000ms，打开状态 5000ms。" },
      { t: "防连接泄漏", v: "SSE 是长连接，不加管理会堆积闲置连接。生成器里要主动检查 <code>await request.is_disconnected()</code>，客户端一走就立即停止推理——否则用户关了页面，你还在替他烧 token。" }
    ]
  },

  'llm-core': {
    items: [
      { t: "Context Rot：长上下文会「腐烂」", v: "Chroma 2025-07 的实验覆盖 18 个前沿模型，结论是所有模型都随输入变长而退化。机制有三个叠加：lost-in-the-middle（Liu et al., TACL 2024，模型只对开头结尾关注好）、注意力稀释、干扰项干扰。" },
      { t: "有效容量只有标称的一半", v: "经验值：推理密集任务只能用标称窗口的 <b>30-50%</b>，检索密集任务 60-80%。把 1M 窗口塞满是既浪费钱又吃质量惩罚的行为。" },
      { t: "长上下文 ≠ 好记忆", v: "上下文窗口是 RAM，长期记忆是硬盘。2026-06 GPT-5 API 默认 128K、Enterprise 档 400K；同期 Chroma 的实验显示同一份长文档、同一个问题，只改变信息在 prompt 里的组织方式，GPT-4o 准确率就从 <b>98.1% 掉到 64.1%</b>——「塞进去」和「检出来」是两件事，中间需要一层筛选。" }
    ]
  },

  'hallucination': {
    items: [
      { t: "幻觉率是任务属性，不是模型属性", v: "同一个模型在两个任务上差异巨大：grounded summarization（给了文档让它忠实复述）最好做到 <b>0.7-3.3%</b>；开放式事实回忆（PersonQA，无来源）o1 是 16%、o3 是 33%、o4-mini 是 48%。所以任何人给你一个不带任务说明的「幻觉率」，都不值得信。" },
      { t: "通用 vs 领域 RAG 的差距", v: "Stanford HAI《AI Index 2026》：通用 LLM 幻觉率 <b>15-30%</b>，领域 RAG 管线可压到 <b>5% 以下</b>。RAG grounding 通常能降幻觉 60-80%——但注意，对「未治理的垃圾语料」做 RAG，仍有一半以上答案在编造。grounding 只在语料干净时成立。" },
      { t: "OpenAI 的官方定性：这是激励问题", v: "OpenAI 2025-09 论文《Why Language Models Hallucinate》指出根因在评测机制——主流基准里「我不知道」得 0 分，和答错同分，于是「猜」在统计上成了最优策略，模型被训练成自信地 bluff。作者给的修法是<b>改评分规则</b>（给恰当的「不知道」部分分、对高置信度错误加重罚），而不是加一个幻觉过滤器。当一个厂商提议重写所有基准的评分时，等于承认这个问题是结构性的。" },
      { t: "最便宜的一档杠杆", v: "开扩展思考（reasoning）模式在引用密集任务上大约把幻觉率砍半：GPT-5.5 Pro 从约 <b>8.3% → 4.2%</b>，Claude Opus 4.7 从约 <b>9.4% → 5.1%</b>。代价是延迟和 token。另外两条几乎免费的：严格的「只依据以下文档回答」提示词 + 强制引用。" },
      { t: "引用 ≠ 已核实", v: "模型可以引用一个真实存在的文档，同时曲解文档说的事——而引用这个动作会让错误<b>更难</b>被发现，不是更容易。所以「要求引用」之后必须跟一层「拿输出回原文核对」的验证 pass，否则你只是信任了一个自己没查过的脚注。" },
      { t: "五层防御的堆叠效果", v: "一线落地顺序：grounding（RAG）→ 提示词约束「只依据上下文」→ 置信度门控（检索分或 logprob 低于阈值就拒答）→ 严格结构化输出（JSON Schema / Pydantic 校验，机械拦截「编造字段」）→ 自校验（逐条断言回查来源）→ 引用 → 每次改动都跑评测。真实案例：韩国制造业客服机器人靠「RAG + 跨模型交叉验证」把幻觉率从 22% 压到 3%，人工升级率降 38%。" },
      { t: "缓解手段的性价比排序", v: "影响「极高」且成本「高」的只有 RAG grounding；「只依据上下文」提示词、置信度拒答、结构化输出校验都是影响高、成本中低；自校验影响中、成本中；引用影响中、成本低。先做 grounding、拒答、评测这三件，它们扛住大部分负载。" }
    ]
  },

  'prompt-design': {
    items: [
      { t: "已经从 Prompt Engineering 变成 Context Engineering", v: "Lance Martin（LangChain）提出的四支柱已被 Anthropic、Manus 采纳：<b>Write</b>（把信息写到窗口外：scratchpad、todo.md、记忆库）、<b>Select</b>（每步只取对的 token：RAG、工具过滤、子代理派发）、<b>Compress</b>（只留任务相关的 token：摘要、Anthropic context editing）、<b>Isolate</b>（拆到子代理和 schema 字段里）。" },
      { t: "Prompt caching 是最大的一档钱", v: "Anthropic 的缓存读约是标准输入价的 <b>10%</b>（≈九折优惠），OpenAI 约 50%。arXiv 2026-02 论文《Don't Break the Cache》在 agentic 负载上实测：策略性控制 cache block 可降 API 成本 <b>41-80%</b>、缩短首 token 时间 <b>13-31%</b>。" },
      { t: "Compaction 的触发点与取舍", v: "在容量用到 <b>70-85%</b> 时触发压缩。Claude Code 的 <code>/compact</code> 明确保留「架构决策、未解决的 bug、实现细节」，丢弃冗余的工具输出。子代理派发本身就是一个压缩原语：子代理在自己的窗口里探索，只回传 1000-2000 token 的摘要。" },
      { t: "反直觉：很多流行提示词是无效的", v: "「你是一位专家」「让我们一步步思考」「我给你 200 美元小费」这类技巧，在严格评测下提升微乎其微甚至为零。在推理模型上「一步步思考」已经是默认行为，手动加进去常常<b>反而有害</b>（干扰模型自己的推理结构）。" },
      { t: "评测先行，但只评真实错误", v: "Hamel Husain 的著名建议「去看你的数据」落到工程上是：读 50-100 条真实生产 trace，自由标注失败，聚成失败分类，为每个高频模式写一个代码评测或 LLM-as-judge 评测。他的警告是——「为<b>你发现的</b>错误写评估器，不要为<b>你想象的</b>错误写」。" }
    ]
  },

  'rag-overview': {
    items: [
      { t: "2026 生产级 RAG 的标准管线", v: "问题 → 查询改写（LLM 生成 2-3 个变体）→ 混合检索（向量 + BM25）取 <b>top 50</b> → 交叉编码器重排到 <b>top 5</b> → 生成（明确要求引用来源）→ 事后忠实度检查（LLM-as-judge），低分则回退「我不知道」。每一层都是叠加的：跳过重排质量掉约 <b>20%</b>，跳过忠实度检查就是把幻觉直接发到线上。" },
      { t: "混合检索 + 重排 = 最大的单点提升", v: "纯向量检索有个盲区：精确匹配。问「错误码 E-4471」「SKU BQ-9903」这类精确串，语义搜索会返回「相关但没用」的邻居；纯关键词反过来漏掉改写。两者并行并用 RRF（倒数排名融合）合并，是让「Demo 能跑」变成「用户敢信」的那一步。" },
      { t: "评测终于成了默认动作", v: "2026 年约 <b>60%</b> 的新 RAG 部署从第一天就带系统化评测（2025 年初还不到 30%）。行业已经吸收了教训：没有测量，每一次优化都是猜。" },
      { t: "Agentic RAG 不是免费的", v: "每个循环多一次 LLM 调用。2026 年公认的反模式是：把一个烂检索器包进 agent，然后花更多的钱、更精巧地答错。正确顺序是先修好基线检索（分块、混合、重排），再用评测证明「加循环」确实有收益。" },
      { t: "GraphRAG 的适用边界", v: "微软的 GraphRAG 在索引期用 LLM 抽实体与关系、建图、用 Leiden 做社区聚类并给每个社区写摘要；查询时同时取局部邻域和社区摘要。多跳企业任务上可达 <b>80-90%</b> 准确率，而纯向量 RAG 掉到 30% 以下；涉及 10+ 实体的查询，向量法常接近 0，图法仍保持 70% 以上。历史问题是贵（索引大语料可达数万美元），LazyGraphRAG（2024 末）把索引成本压到完整版的约 <b>0.1%</b>。2026 的建议不是二选一，而是「向量管广度与查找，图管多跳与聚合，按查询意图路由」。" },
      { t: "每层延迟与成本要有数", v: "三段式重排（检索 50-100 → 交叉编码器压到 10-20 → 便宜快模型做 LLM 相关性过滤到 5-10）合计增加 <b>200-500ms</b>，复杂查询质量提升 <b>25-35%</b>。多出来的那次过滤 LLM 调用，相对主生成调用的成本可以忽略。重排单独看：增加约 200ms，但显著减少「语义相关却事实错误」的输出。" }
    ]
  },

  'doc-parsing': {
    items: [
      { t: "先做版面分析，再做嵌入", v: "正确顺序是先用视觉模型识别结构——标题层级（H1-H4）、正文、表格、图注——然后在结构内部切分。直接按字符数切 PDF 是把结构信息白白扔掉。" },
      { t: "表格必须重建，不能直接嵌入", v: "向量模型对行列关系的捕获能力很差。表格要转成 Markdown / HTML 或键值对再入库，否则「第 3 行第 2 列」这种关系一问就错。" },
      { t: "企业栈的摄取层选型", v: "2026 企业参考架构里，摄取层常用 <code>Unstructured.io</code> 处理 PDF / PPT，编排层 LlamaIndex 或 LangChain，索引层混合（如 Pinecone + ElasticSearch）。" },
      { t: "一个反直觉的实测", v: "2026 的 RAG 审计显示：从<b>治理良好、结构化的</b>数据源检索，比从非结构化堆里检索，编造率降低约 <b>87%</b>。数据质量 >> 模型质量——garbage chunks in, hallucinations out。" }
    ]
  },

  'chunking': {
    items: [
      { t: "2026 的务实默认值", v: "递归字符切分，约 <b>512 token</b>，overlap <b>10-20%</b>。它在端到端基准里常年排在前列，便宜、快、对混合文档类型都有效。先从这个开始，不要一上来就上花哨方案。" },
      { t: "语义切分：更准但贵得多", v: "在相邻句子语义差异大的地方断开。长文上精度更高，但索引速度大约慢 <b>14 倍</b>。升级的判据应该是「你的评测显示检索精度是瓶颈」，而不是「听起来更高级」。" },
      { t: "父子/层级索引：检索用小，给模型用大", v: "索引细粒度小块（如 100 字）保检索精度，命中的时候把小块的<b>父块</b>（如 800 字）交给 LLM 保上下文完整性。这是解决「切太碎丢上下文、切太大稀释信号」两难的标准做法。" },
      { t: "Late chunking：让每个块带上周边信息", v: "先用长上下文嵌入模型嵌入整篇文档，再切分得到的 token 嵌入。这样每个块的向量天然携带了周围信息，对含代词、交叉引用、上下文相关页眉的文档特别有效。" },
      { t: "三条原则", v: "① 按语义单元切（段落是单元、章节是单元，切在句子中间的一千字窗口不是）；② overlap 兜住跨边界的上下文；③ 把父级结构一起存下来，检索命中时能返回父块。" }
    ]
  },

  'retrieval': {
    items: [
      { t: "混合检索是默认，不是可选项", v: "向量检索（dense）管概念，BM25（sparse）管精确串。两者并行、用 RRF 或加权分融合。Qdrant、Weaviate、Pinecone 都原生支持。生产案例里长尾技术术语的召回提升超过 <b>20%</b>。" },
      { t: "两阶段检索的量化收益", v: "第一阶段向量 top-100 快速粗筛，第二阶段用专用重排器（Cohere Rerank / BGE-Reranker）选最终 top-5。重排加约 <b>200ms</b> 延迟，但把「语义相关却事实错误」的输出显著压下去。业界共识：永远要重排。" },
      { t: "HyDE：先编答案再检索", v: "让 LLM 先生成一个「理想答案」的假想文档，然后嵌入<b>它</b>去检索。直觉上很怪，实测常带来 <b>10-15%</b> 的召回提升。适合用户问法和文档用词差距大的场景。" },
      { t: "查询改写不是可选装饰", v: "用户用自己的词提问，文档用的是作者的词。便宜的版本：检索前让 LLM 把查询改写成 2-3 个不同说法，然后取并集。贵的版本：在领域数据上微调一个小改写模型。不改写，就是在让检索器和用户互相猜。" },
      { t: "2026 新选项", v: "ColBERT 式 late-interaction 检索器已经能与「dense + 重排」的管线正面竞争；GraphRAG 的图检索在 2026 便宜到可以真正上生产；agentic 检索让 agent 自己决定要不要检索、检索什么、结果够不够。" }
    ]
  },

  'answer-gen': {
    items: [
      { t: "动态上下文与注意力优化", v: "三件事：裁掉无关块、合并相邻块、把得分最高的块放在 prompt 的<b>开头和结尾</b>——利用首因效应与近因效应（模型对中间部分的注意力最弱，这就是 lost-in-the-middle）。" },
      { t: "拒答是特性不是缺陷", v: "在提示词里明确「只依据以下文档回答，如果文档里没有就说不知道」。这一条的性价比在所有缓解手段里排名前列——成本极低、影响高。一个拒答永远好过一次编造。" },
      { t: "强制引用的正确用法", v: "让答案里每个事实都指向具体的来源 chunk。作用有两个：让 grounding 可被验证；让用户能自己核对。但必须补一层「拿答案回原文核对」的校验——引用本身不证明内容为真。" },
      { t: "RAG Triad（三合一评测框架）", v: "① <b>Context Relevance</b>：检索到的块对不对（precision/recall）；② <b>Groundedness</b>：答案是否完全被检索内容支持（有没有幻觉）；③ <b>Answer Relevance</b>：答案是否真的回答了问题。低 faithfulness 信号指向幻觉，低 relevance 指向检索缺陷。" },
      { t: "消融数据", v: "「答案 → 生成时明确要求引用 + 事后忠实度检查」这条链是防幻觉上线的最后一道闸。跳过重排质量掉约 20%；跳过忠实度检查就是把幻觉发到生产。每一层都是复合收益。" }
    ]
  },

  'tool-calling': {
    items: [
      { t: "MCP 已经是事实标准，而且换了东家", v: "Anthropic 2024-11 提出，2025-12 捐给 Linux 基金会下的 <b>Agentic AI Foundation（AAIF）</b>，OpenAI 与 Block 为联合创始成员，AWS、Google、Microsoft、Cloudflare、GitHub、Bloomberg 为支持成员。联合维护者横跨 Anthropic / Microsoft / OpenAI / Google / Amazon，核心决策通常一致通过——它已经从「某公司的协议」变成中立开放标准。" },
      { t: "采用规模（2026）", v: "Tier 1 SDK（TS/Python/Go/C#）月下载约 <b>5 亿</b>（MCP 官方博客，2026-07），Anthropic 披露 SDK 月下载超 4 亿、年内增长约 4 倍；企业服务器部署 <b>10,000+</b>；Claude 连接器目录收录超 <b>950</b> 个 MCP Server。" },
      { t: "协议形态", v: "JSON-RPC 2.0，两种传输：<b>STDIO</b>（本地，host 把 server 当子进程拉起）与 <b>Streamable HTTP</b>（远程）。原来的 HTTP+SSE 传输在 2025-03 规范修订中已被 Streamable HTTP 取代并进入弃用轨道。服务端暴露三类东西：<b>tools</b>（可调用函数）、<b>resources</b>（可读数据）、<b>prompts</b>（可复用模板）。" },
      { t: "2026-07-28：史上最大更新——转向无状态核心", v: "旧设计里客户端必须与特定 server 实例维持持久会话（initialize 握手 + Mcp-Session-Id 头）。在 K8s / Serverless 环境里节点随时扩缩，持有会话的 Pod 一下线，agent 的工作就断。新规范<b>废弃协议级握手与会话头</b>，每个请求自描述、在 <code>_meta</code> 里带协议版本与客户端能力，可落到 LB 后任意实例，无需共享存储或 sticky routing。MCP Server 因此能像普通 HTTP 服务一样跑在 Cloudflare Workers / AWS Lambda / Netlify Edge 上。" },
      { t: "配套的三个新东西", v: "① <b>MRTR</b>（Multi Round-Trip Requests）：工具执行到一半需要用户确认时，服务端返回 <code>resultType: \"input_required\"</code> 和待回答问题列表，客户端带 <code>inputResponses</code> 在原调用上重试——这是无状态架构下实现「删除前确认」的机制，旧的 elicitation / sampling 已弃用。② <b>Tasks 扩展</b>：面向长耗时异步任务，返回 durable handle，客户端可断开重启后 poll 继续跟踪（AWS 贡献，Bedrock AgentCore 已支持）。③ <b>MCP Apps</b>：服务端可在对话里渲染交互式 UI（表单、仪表盘、可视化），不再只是文本输出。" },
      { t: "网关友好的新头", v: "新增 <code>Mcp-Method</code> 与 <code>Mcp-Name</code> 请求头，网关 / WAF / 限流器可以直接按头做路由和鉴权，<b>不需要解析 JSON body</b>。<code>MCP-Protocol-Version</code> 头显式声明版本，便于多版本共存与灰度。list 类响应（tools/list 等）带 <code>ttlMs</code> 与 <code>cacheScope</code>，客户端可据此做缓存。" },
      { t: "安全与迁移", v: "OAuth 硬化：引入 RFC 9207 <code>iss</code> 校验（兑换 code 前必须验证 issuer，封堵 mix-up 类攻击）；客户端凭证绑定 issuer；DCR 正式弃用、转向 CIMD。规范首次写入<b>正式弃用政策</b>：任何被 deprecate 的特性至少保留 12 个月。真正的风险是工具描述和资源内容里的<b>提示注入</b>——成熟 host 会做工具调用确认并隔离不可信资源。" },
      { t: "MCP vs Function Calling", v: "Function calling 是<b>单个 LLM API 内部</b>的运行时约定——你得在每次调用里重复贴工具定义。MCP 是活在 LLM API <b>之外</b>的传输层协议——起一个 MCP Server，任何兼容客户端（Claude、GPT、Gemini、Cursor、Zed）都能消费。2026 年绝大多数栈是「底层用 function calling，上层用 MCP 做跨模型工具层」。" },
      { t: "工具数量是隐蔽杀手", v: "超过约 <b>30 个</b>工具时，模型「选对工具」的能力会断崖式下跌。这不是模型笨，是注意力机制的天花板。解法不是继续加工具，而是做「先路由后调用」的两级结构。" },
      { t: "协议不是只有 MCP", v: "MCP 管「agent 连工具」；<b>A2A</b>（Linux 基金会）管「agent 连 agent」，用 agent card（JSON 能力清单）做发现；<b>AG-UI</b> 管「agent 事件流回前端」（把 tool call、state update、token stream 统一成 SSE）；<b>A2UI</b> 管「agent 生成界面」（输出声明式 JSON，客户端用自己原生组件渲染，关键是 agent 不直接执行代码）；<b>ACP</b> 管「编辑器连 coding agent」——它之于编辑器，就像 MCP 之于数据源。它们互补，不是竞争。" }
    ]
  },

  'tool-design': {
    items: [
      { t: "工具描述就是 API 契约", v: "参数类型、取值范围、返回结构都要写清。模型是靠描述猜参数的——描述含糊，参数就靠猜。而且描述本身是<b>不可信输入的一部分</b>：2025-2026 的实际攻击面是往工具描述或资源内容里塞提示注入。" },
      { t: "重试要分类，不能一把梭", v: "只对 <code>rate_limit</code> 和 <code>network_error</code> 做指数退避重试；<code>auth_error</code>、<code>token_limit</code>、<code>bad_request</code> 立即失败并上报。把「密钥错了」也重试 3 次，是最典型的浪费配额行为。" },
      { t: "结构化错误优于异常", v: "返回 <code>{ok, error_type, retryable, latency}</code> 这样的结构化结果，模型能据此判断「是重试、换工具、还是换参数」。抛异常则把决策权从模型手里拿走了。" },
      { t: "工具多时的两级结构", v: "不要把所有工具塞进同一个上下文。先用一个轻量的路由步骤（或关键词/向量匹配）缩小候选集，再把 3-5 个相关工具提供给本次推理。这是绕过「30 个工具断崖」的工程解法。" },
      { t: "不可逆动作必须留人工确认点", v: "写操作（发消息、改记录、删数据、提交支付）要设计 human-in-the-loop 暂停。MCP 的新 MRTR 机制就是为这类「执行前确认」设计的；自建系统则要在工具层强制确认令牌。" },
      { t: "长任务别维护脆弱长连接", v: "批处理、长耗时作业改用异步任务模式（返回 durable handle，客户端 poll），而不是维持一条随时会断的长连接。MCP 的 Tasks 扩展就是这个思路的标准化。" }
    ]
  },

  'agent-memory': {
    items: [
      { t: "三代架构演进", v: "<b>Gen1 纯向量 RAG 记忆</b>：原文切块嵌入向量库，缺陷是无时序、无更新、无冲突消解——用户改口后老事实和新事实会一起返回。<b>Gen2 结构化 fact + 双时态</b>：LLM 抽 <code>(主语, 谓语, 宾语, valid_from, valid_to)</code>，同 key 老事实置 invalid。<b>Gen3 Memory Graph</b>：实体 + 边 + episode，图遍历与向量召回用 RRF 融合。三代是「层层包住」而非重写，结构上很像 CPU 缓存 L1/L2/L3——L1 是最热的核心记忆，L2 是结构化事实，L3 是原始素材。" },
      { t: "Mem0 论文的硬数字（LOCOMO 数据集）", v: "同样是把对话历史给它：全量塞进 128K 上下文 vs 用 Mem0 抽结构化 fact 只塞相关的——单跳 F1 <b>27.1 → 38.72</b>（+42%）、多跳 F1 <b>18.3 → 28.64</b>（+56%）、平均 token <b>26k → 1.5k</b>（-94%）、P99 延迟 <b>17s → 1.4s</b>（-91%）。同一个模型，只是把「塞原文」换成「抽事实」。这组数字解释了为什么记忆层在 2026 上半年的融资里被重注。" },
      { t: "Letta（原 MemGPT）的 OS 隐喻", v: "把上下文窗口当 RAM、外部存储当硬盘，让 agent 自己管分页。三层：<b>Core Memory</b>（常驻上下文，agent 可直接读写）、<b>Archival Memory</b>（向量库，靠显式工具调用查）、<b>Recall Memory</b>（可搜索的对话历史）。核心差异是<b>agent 自己决定记什么、忘什么、何时取</b>，代价是更多工具调用、且记忆质量依赖模型判断力。" },
      { t: "Zep / Graphiti 的双时态", v: "不只记「什么为真」，还记「什么时候为真、什么时候变了」。用户改了偏好、换了联系人、修订了需求时，它能推理出哪个版本的事实当时成立。<b>向量库返回最相似的，Graphiti 返回实体当前最准确的</b>。" },
      { t: "延迟差距是选型的分水岭", v: "Mem0 官方数据：Mem0 检索 p50 <b>0.148s</b> / p95 0.200s；LangMem 因为把抽取放到查询时做，p50 <b>17.99s</b> / p95 <b>59.82s</b>。对交互式应用（语音、客服、编码助手）来说，200ms 是「感觉原生」和「感觉在加载」的分界线。" },
      { t: "三代的生产成本对照（3 年 / 100 万条对话）", v: "Gen1 向量 RAG：库 15-30GB、召回 P99 200-400ms、事实准确率 <60%。Gen2 结构化 fact：500MB-2GB、P99 100-250ms、75-85%。Gen3 图 + 向量：2-5GB、P99 150-350ms、85-95%。注意 Gen3 不是「存得更多」而是「存得更贵」——每条记忆要多花 3-5 次 LLM 调用做抽取、归一化、图入库。" },
      { t: "两个必须知道的故障模式", v: "① <b>Context window poisoning</b>：早期轮次注入的恶意内容会在每次调用时被重放，持续影响后续输出，除非显式移除。② <b>Silent truncation</b>：历史涨过窗口后最早的几条被静默截断，<b>没有任何报错</b>；而 system prompt 排在消息数组最前面——它第一个被砍。于是 agent 继续正常回答，只是已经没有指令了。" },
      { t: "上下文工程 ≠ 记忆", v: "上下文工程（窗口管理、摘要、预算分配）解决的是<b>单次会话内</b>的状态；持久记忆解决的是<b>跨会话</b>的状态。两者是相邻的两层，谁也替代不了谁。Mem0 的模式是「退出时写、进入时读」：每轮结束存相关交互，下轮开始检索最相关的注入 system prompt——注意是<b>语义相关的少量</b>，不是把说过的话全倒回去。" },
      { t: "bad policy 比没有 policy 更糟", v: "「存什么、取什么」的策略设计比选哪个库重要得多。坏的策略会把记忆塞满噪声，提高检索歧义，直接损害回答质量。另外必须处理<b>记忆陈旧</b>：用户偏好会变、系统行为会变，需要有更新和丢弃过期记忆的机制。" }
    ]
  },

  'task-planning': {
    items: [
      { t: "ReAct 的出处与实测收益", v: "Yao et al.，arXiv 2210.03629，ICLR 2023。核心是 Thought → Action → Observation 交替：推理指导下一步查什么，观察用来校验「我刚才想得对不对」。在 HotpotQA（多跳问答）与 Fever（事实核查）上，靠与 Wikipedia 交互有效克服了纯 CoT 的幻觉与错误传播；在 ALFWorld 与 WebShop 上，仅用 1-2 个上下文示例就比模仿学习和强化学习分别取得 <b>34%</b> 和 <b>10%</b> 的绝对成功率提升。" },
      { t: "ReAct 的结构性短板", v: "它是<b>无状态的贪心循环</b>：每一步只根据当前上下文选下一个动作，没有全局计划、没有回溯。每步都要把完整历史重新塞进上下文，token 消耗随步数线性甚至超线性增长，且行为对提示词措辞高度敏感。步数一多会出现<b>推理漂移</b>——模型逐渐「忘记」最初目标，迷失在自己产生的推理噪声里。" },
      { t: "Plan-and-Execute 的架构级收益", v: "Planner 一次性生成完整分步计划（用强模型，只调一次），Executor 逐步执行（可用便宜模型甚至规则引擎），另有 Replanner 在偏离预期时调整剩余步骤。生产数据：复杂多步任务成功率约 <b>92% vs ReAct 约 85%</b>——用的是同一个模型，差的是架构。DAG 形式支持并行独立子任务，论文数据显示约 <b>3.6×</b> 提速。代价是前置延迟高、适应性弱（环境一变就依赖重规划）、简单任务上是「大炮打蚊子」。" },
      { t: "判断标准很清晰", v: "任务超过 <b>5 步</b>，且这些步骤在开始时基本可预见 → 用 Plan-and-Execute。否则用 ReAct。反过来硬套是 2026 年 Agent 翻车的头号原因；很多团队花三个月调 prompt、换模型、加工具，根因其实是架构选错了。" },
      { t: "Reflexion / ToT / LATS 的定位", v: "<b>Reflexion</b>（Shinn et al. 2023）：生成 → 批判 → 修订，token 成本 2-3 倍，适合质量敏感任务。实用经验是把轮数设成 <b>3</b>，超过 3 轮还没过就直接转人工——边际收益递减得厉害，有时不如重新来一遍。<b>Tree of Thoughts</b>（Yao et al. 2023）：并行多分支再合并，硬推理有用但极贵，很少成为生产标准。<b>LATS</b>（2023-10）：用蒙特卡洛树搜索把 ReAct、ToT、Reflexion 统一起来。" },
      { t: "2026 生产里没有「纯架构」", v: "主流形态是混合：<b>开头一个显式规划步 + 执行用 ReAct + 不可逆动作前加校验</b>。另外，用推理模型时「交错思考」（Claude Extended Thinking、OpenAI o 系 / GPT-5）让模型能在工具调用之间重新规划，把很多经典的「ReAct-in-a-loop」实现收进<b>一次 API 调用</b>。" },
      { t: "终止纪律是最重要的护栏", v: "无限循环是 2025-2026 最常见的生产 bug 类别。稳健的循环必须组合这几样：hard cap max-iterations（一般任务 <b>10-30</b>，编码类 <b>50-100</b>）、明确的成功判据（比如提供一个 <code>submit_final_answer</code> 工具）、成本上限、重复状态检测（防 tool thrashing：同一个工具、同样参数、同样结果还在调）、以及人工升级路径。" },
      { t: "Deep Agents 的做法：先用 no-op 工具逼它规划", v: "LangChain 的 Deep Agents 内置一个 <code>write_todos</code> 工具——它不做实际的事，作用就是<b>强制 agent 在碰任何真实工具之前，先把完整计划写出来</b>（Claude Code 内部用同一模式）。一线经验：加了这一步之后，「工具循环漂移」几乎消失。原因是会先规划的 agent 会收敛，不规划的就打转。配套的还有自动上下文管理（大工具输出压缩后写文件，agent 只收到摘要）和子代理隔离（每个子代理拿恰好够用的上下文，主 agent 的窗口保持干净）。" },
      { t: "三个反复出现的失败模式", v: "① <b>Context rot</b>：长任务里 early 约束逐渐掉出有效注意力——第 1 步正确记下「只改已发布的配方」，到第 10 步悄悄忽略掉了。② <b>Tool loop drift</b>：没有规划步，agent 一上来就调工具，拿到部分结果、再调更多工具补缺口、再拿部分结果，一路螺旋。③ <b>单体编排</b>：一个图管所有工作流，加第二个流程时要么复制逻辑要么缠在一起。前两个是上下文管理问题，第三个是架构问题——都不是改 system prompt 能解决的。" }
    ]
  },

  'frameworks': {
    items: [
      { t: "2026-08 的十个框架（厂商中立排名）", v: "① <b>LangGraph 1.x</b>（有状态生产工作流综合第一）② <b>Microsoft Agent Framework 1.0</b>（2026-04-03 GA，Semantic Kernel + AutoGen 合并，原生 MCP + A2A）③ <b>Claude Agent SDK</b>（层级子代理最深 5 层，MCP 集成最深）④ <b>OpenAI Agents SDK</b>（2026-03 GA）⑤ <b>Google ADK 2.0</b>（唯一 Python/TS/Java/Go 全对等，原生 A2A）⑥ <b>CrewAI 1.14.7</b> ⑦ <b>LlamaIndex Workflows 1.0</b>（2026-06-22，事件驱动）⑧ <b>Pydantic AI 2.0</b> ⑨ <b>Mastra</b>（TS 优先，周下载约 30 万）⑩ <b>AG2</b>（社区 AutoGen 分支，遗留选项）。十个全都支持 MCP，其中 7 个原生。" },
      { t: "LangGraph 已独立，这点很多人搞错", v: "LangGraph 1.0 于 <b>2025-10-22</b> GA，自 1.0 起是独立库，<b>不再依赖 LangChain</b>。月 PyPI 下载 3800-3920 万。内置 checkpointing（SQLite / Postgres）、time-travel 调试、human-in-the-loop 审批点。学习曲线 1-2 周——这是它的主要成本。" },
      { t: "CrewAI 与 OpenAI Agents SDK 的定位", v: "CrewAI：GitHub 44.6K-46.3K stars、月 4.5 亿 workflows，角色化多 agent，<b>数小时</b>上手，MCP 原生——最快的原型路径。OpenAI Agents SDK：只有四个原语 <b>agents / handoffs / guardrails / tracing</b>，最快从零到能跑的 agent；经 LiteLLM 支持 100+ 模型，2026-02 与 Temporal 合作补上持久化执行。" },
      { t: "MCP 支持已成 table stakes", v: "2026 年不支持 MCP 的框架等于让团队自己写「别人免费拿到」的胶水代码；社区 MCP server 已超 <b>13,000</b> 个。Google Cloud 上了托管 MCP 服务，Microsoft Copilot Studio 也 GA 了 MCP。选框架先看这一条。" },
      { t: "选型原则：架构匹配问题形状", v: "不是选 stars 最多的。真实案例：CrewAI 两天出原型，但遇到需要条件分支和状态回滚的受监管流程时，角色范式表达不干净——务实做法是重建成 LangGraph，约一周。另一条经验：LangGraph 强在可追踪性和显式状态机，OpenAI Agents SDK 强在模型原生的人体工学和快速起步。" },
      { t: "「原型再迁移」是常见模式", v: "很多团队先用轻框架快速验证，到了需要审计、回滚、多模型路由的阶段再迁到 LangGraph。预留这个迁移成本，比一开始就上最重的框架更常见也更划算。" },
      { t: "LlamaIndex 的位置", v: "它的强项是 RAG-grounded agent：Workflows 1.0（2026-06-22）走事件驱动，Python/TS 对等。如果你的核心是「把知识库用好」而不是「编排复杂多 agent」，LlamaIndex 仍是很合适的一把手。" }
    ]
  },

  'vector-db': {
    items: [
      { t: "第一原则：最好的向量库是你已经在跑的那个", v: "在 Postgres 上就先加 pgvector，别急着上新系统——第二个数据库意味着一条同步管线和一份运维负担。在 MongoDB / Redis 上，它们内置的向量检索就能覆盖大多数 RAG 负载。只有当规模、延迟或混合检索质量真的撑不住时，才上专用引擎。" },
      { t: "按向量数量分档（2026）", v: "<b><1M</b>：Chroma、pgvector 或任意托管服务都行，不值得引入复杂度。<b>1M-10M</b>：pgvector + HNSW 仍然可行（约 10-50M 需要分区，pgvectorscale 补 StreamingDiskANN）。<b>100M+ / 十亿级</b>：Milvus（分布式、多索引 HNSW/IVF/ANNOY/DiskANN、K8s Helm 部署）。" },
      { t: "主要选手一句话定位", v: "<b>Qdrant</b>：Rust 写的专用引擎，Apache-2.0，28.4k stars，payload filtering 强、内存高效，自托管/托管/边缘都能跑（<code>docker run -p 6333:6333 qdrant/qdrant</code>）。<b>Weaviate</b>：BSD-3，混合检索与多租户最强。<b>Pinecone</b>：托管 serverless，零运维但不可自托管。<b>Milvus</b>：十亿级、多模态、K8s 原生，代价是运维复杂度。<b>Chroma</b>：最快原型，生产前通常要迁。<b>LanceDB</b>：列式（Lance）存储、多模态、S3 友好。<b>pgvector</b>：不是专用向量库但够用，且与业务数据同库同事务。" },
      { t: "别把准确率押在选库上", v: "RAG 准不准由切分策略、嵌入模型、元数据设计、检索参数、重排、提示词、评测共同决定——数据库只是其中一层。基准测试里的「N 倍快」多为厂商自述，视为方向性参考而非定论。" },
      { t: "企业检索必须做权限", v: "如果用户在 SharePoint 里看不到某份文档，他在 RAG 里也不能召回这份文档的 chunk。做法是把 ACL 写进向量 metadata（如 <code>{\"allowed_groups\": [\"hr\",\"management\"]}</code>），在向量检索<b>之前</b>按用户所属组过滤。事后过滤等于已经泄露了。" },
      { t: "混合检索在各家的支持", v: "Qdrant 用 BM42，Weaviate、Pinecone、Milvus 都有原生混合检索。因为这直接决定长尾术语的召回，2026 年它已经是选型时的必查项而不是加分项。" }
    ]
  },

  'local-llm': {
    items: [
      { t: "2026 的格局一句话", v: "<b>GPU 生产推理：AWQ 已是默认</b>（vLLM / TGI 原生支持，加载最快、精度最优）。<b>本地与端侧：GGUF 统治</b> CPU 与混合 CPU/GPU 推理（Ollama + llama.cpp 让「一句话跑模型」成立）。<b>存量生态：GPTQ</b> 还有大量预量化模型可用，但新模型发布已转向 AWQ。<b>高精度 W8A8</b>：SmoothQuant。另有 EXL2 提供 2.0-8.0 bpw 任意位宽。" },
      { t: "同卡实测（Llama 3 70B / RTX 6000 Pro 96GB）", v: "AWQ 4-bit：38GB / 加载 <b>12s</b> / 吞吐 52 tok/s / ppl 5.82。GPTQ 4-bit：38GB / 25s / 48 / 5.91。GGUF Q4_K_M：38GB / 18s / 42 / 5.88。EXL2 4.0bpw：37GB / 15s / <b>55</b> / <b>5.80</b>。四个格式在 4-bit 下相对 FP16 的质量损失都 <2%。" },
      { t: "GGUF 档位表（Llama 3.1 70B）", v: "BF16 140GB（100%）/ Q8_0 74GB（~99.5%）/ Q6_K 53GB（~99%）/ <b>Q4_K_M 40GB（~98%）</b> / Q4_K_S 38GB（~97.5%）/ Q3_K_M 30GB（~95%）/ Q2_K 25GB（~88%）。<b>Q4_K_M 是 2026 的甜点</b>：约 4× 显存压缩、质量损失 <2%。Q2_K 除非显存被卡死，否则别用——3-bit 以下掉得明显，加显存比激进量化划算。" },
      { t: "引擎和格式是绑定的，先定引擎", v: "vLLM 原生吃 AWQ 与 GPTQ，<b>不吃 GGUF</b>；Ollama / llama.cpp 只吃 GGUF；ExLlamaV2 只用 EXL2。所以要选量化格式，先想清楚用什么推理引擎，顺序反了就得整套重来。" },
      { t: "两个文档里不写的坑", v: "① AWQ 量化后必须用 vLLM 的 <code>--enforce-eager</code> 禁用 CUDA Graph，否则首次推理延迟飙升（RTX 4090 的显存管理特性导致，官方文档没写）。② AWQ 的权重校准依赖特定 GPU 架构——在 4090 上校准的权重换到 A100 上性能会掉约 <b>23%</b>。要在目标卡上校准。" },
      { t: "低成本微调路线", v: "如果确实要微调（注意多数问题应该用更好的 prompt、更完善的 RAG 或更合理的 Agent 设计解决，而不是微调），优先 LoRA 这类参数高效方法：只训练一小部分低秩矩阵、显存占用小、训练快，且可以为不同任务随时切换权重而不必保存整个模型。QLoRA 甚至能在消费级显卡上微调百亿参数模型。" }
    ]
  },

  'serving': {
    items: [
      { t: "为什么是大模型场景选 SSE 而不是 WebSocket", v: "SSE 基于标准 HTTP 长连接，单向推送就够（大模型只需服务端持续输出），<b>原生支持断线重连</b>（默认 3s），兼容所有 HTTP 代理，单连接内存 <1MB。WebSocket 是独立双工协议，部分代理需专门配置、维护状态更重——对「只需要服务端推」的场景是过度设计。" },
      { t: "生产环境的头与代理配置", v: "响应侧：<code>Content-Type: text/event-stream</code> + <code>Cache-Control: no-cache</code> + <code>Connection: keep-alive</code> + <code>X-Accel-Buffering: no</code>。Nginx 侧：<code>proxy_buffering off;</code>、<code>proxy_cache off;</code>、<code>proxy_http_version 1.1;</code>、<code>proxy_read_timeout 300s;</code>。这套配完，才能真正做到「边推理边输出」，而不是等全量生成完再一次性吐出来。" },
      { t: "内存与并发", v: "异步生成器要「来一块数据 yield 一块」，内存占用是常数级。如果写成先累积再一次性返回，单次输出数万字符会让前端内存暴涨、后端响应超时。分片传输能把这部分内存占用降低约 <b>90%</b>。" },
      { t: "心跳是保活的必需品", v: "自建方案每 <b>30s</b> 发一次心跳；用 <code>sse-starlette</code> 的 <code>EventSourceResponse</code> 则自带 <code>: ping</code> 注释行。作用是保持连接活跃、防止代理层因「长时间无数据」把长连接掐掉，同时让负载均衡器正确识别连接还活着。" },
      { t: "防连接泄漏必须显式做", v: "长连接不加管理会堆积闲置连接。生成器里要主动检查 <code>await request.is_disconnected()</code>，客户端断开就立即停止推理。不做这一步，用户关了页面你还在替他付费。" },
      { t: "熔断与限流", v: "熔断后推标准错误帧（<code>event: error</code> + <code>data: {code, message, retry}</code>），前端按 retry 做指数退避（×1.5），最多 3 次后走降级 UI。另外在网关或应用层对 <code>/chat/stream</code> 做令牌桶限流（FastAPI 可接 <code>slowapi</code>），防止单个用户烧光整个团队的模型配额。" },
      { t: "一个真实的成本-延迟战绩", v: "某金融客户坚持用 Llama 2-13B 的金融术语微调版：在财报分析任务上 F1 比 Llama 3-70B 高 1.2%，显存只占 15GB，空余显存还能跑实时风控模型——一卡双用。两周把成本降 50 万、延迟压到 340ms。这类「小模型 + 领域适配」的组合，在预算受限时往往比堆大模型更优。" }
    ]
  },

  'observability': {
    items: [
      { t: "2026 最重要的变化是一个标准，不是某个工具", v: "<b>OpenTelemetry 于 2026-05 从 CNCF 毕业</b>，其 GenAI 语义约定定义了厂商中立的 <code>gen_ai.*</code> span 属性，覆盖模型调用、token 用量、agent 步骤、工具执行。Datadog、MLflow、Langfuse、LangSmith 都已支持，MLflow 更已把 OTel 作为默认追踪基座。按 OTel 埋点的直接收益：换工具时不必重埋代码。<b>注意</b>：GenAI 约定目前仍是实验性、未到稳定版，属性名可能变，迁移期建议新旧名双发。" },
      { t: "市场与采纳的量化", v: "LLM 可观测平台市场 2026 年达 <b>26.9 亿美元</b>（2025 年 19.7 亿），预计 2030 年 92.6 亿，CAGR 36.2%。Gartner 预测到 2028 年，LLM 可观测性投入将占 GenAI 部署的 <b>50%</b>（2026 年初为 15%）。" },
      { t: "一线调研里最刺眼的一组数字", v: "LangChain《State of Agent Engineering》（1300+ 从业者）：<b>57%</b> 已在生产环境运行 agent，近 <b>89%</b> 已部署可观测性——但评测明显滞后：52.4% 只做离线评测、37.3% 做在线评测、<b>29.5% 完全没有评测</b>。同时 32% 把「质量」列为生产部署的首要障碍。看得见 ≠ 做得好。" },
      { t: "Langfuse vs LangSmith：先在开源/托管上做决定", v: "<b>Langfuse</b>：开源（核心 MIT）、可 Docker/K8s 自托管、框架无关、自托管下无按事件计费、数据驻留完全可控。<b>LangSmith</b>：LangChain 的托管平台，在 LangChain / LangGraph 里几乎零代码接入，提供 Polly 助手总结大 trace、Engine 把生产故障聚类成按优先级排序的问题。判据很干脆——「数据必须留在自己机房 / 不要锁定」选 Langfuse，「绝不运维基础设施 + 深度绑定 LangChain」选 LangSmith。" },
      { t: "其他几层怎么补", v: "<b>Arize Phoenix</b>：OTel 原生、源码可用可自托管，评测原语更深，有 RAG 专用质量图与漂移检测。<b>Braintrust</b>：评测优先，把 CI/CD 质量门禁和生产反馈回路放进同一系统。<b>MLflow</b>：trace 数据完全归你、以 OTel GenAI 格式导出，还有 AI Gateway 做路由/限流/兜底。<b>Helicone / Portkey</b>：代理层，几乎零代码改就拿成本与延迟。<b>Datadog</b>：已有 APM 的团队把 LLM span 和基础设施指标放一起看。" },
      { t: "每个请求至少要记什么", v: "request ID、prompt 版本、模型与版本、route、各步耗时、工具调用、token 用量、fallback 状态、最终结果。缺 prompt 版本追踪 = 无法做发布前后对比；缺 trace ID = 事故无法重建。" },
      { t: "仪表盘别只看均值", v: "成本要按<b>模型与 route 维度</b>拆（均值会掩盖又贵又慢的具体路径），延迟要看分位数而不是平均。告警阈值实践：单会话成本 > 中位数 <b>5×</b>、会话时长 > P95 的 <b>2×</b>。" },
      { t: "agent 场景仍未解决的四件事", v: "① <b>语义正确性无法自动判定</b>——你能记录 agent 调了 <code>git_commit</code> 和 commit message，但判不了 message 是否恰当、diff 是否正确。② <b>跨模型 trace 关联是 ad-hoc</b>——一个会话里用 Claude 规划、GPT 生成代码、Gemini 摘要时，OTel 标准化了 span 属性但没标准化跨提供方的 trace context 传播。③ <b>长上下文调试工具缺失</b>——50 轮会话第 40 轮失败、累积 8 万 token 时，trace 技术上完整但实际不可读。④ <b>推理错误的因果归因是研究问题</b>——agent 出了错计划，trace 记录了每一步，但哪一条上下文、哪一句指令、哪一个更早的工具结果该负责？生产工具还没解决。" },
      { t: "2026 生产 LangGraph 的推荐栈", v: "LangSmith（调试）+ Prometheus/Grafana（指标）+ Postgres checkpointer（审计）。埋点开销约 <b>5-15ms/轮</b>（同步操作），对绝大多数负载可忽略。最小可用栈则是：Langfuse 抓 trace（约 30 分钟接入）+ structlog 结构化日志（每行带 trace_id）+ 成本与会话时长打 Prometheus。" }
    ]
  },

  'evaluation': {
    items: [
      { t: "三维度分工，别用一款工具包打全场", v: "<b>RAGAS</b>：探索与金标数据集生成（TestsetGenerator 能读你的语料合成问答对），概念上的 RAG 指标参照系，支持无参考答案评估。<b>DeepEval</b>：CI/CD 质量门——pytest 原生，<code>assert_test</code> 直接让构建失败，40+ 预置指标。<b>TruLens / Langfuse</b>：生产反馈回路与监控，对实时流量持续打分。实践经验：先 RAGAS 探索与造金标，再上 DeepEval 进 CI，最后加 Langfuse 做生产监控——一款工具硬撑全程的结果通常更差。" },
      { t: "LLM-as-judge 的信任边界", v: "与人工判断的相关性约 <b>κ ≈ 0.6-0.8</b>（忠实度任务）——足以做回归检测，<b>不足以宣称绝对质量</b>。前提条件：用比生成者更强的裁判、温度设 0、用结构化评分细则（1-5 分而非自由文本）、随机化答案顺序（治位置偏差：裁判偏好第一个）、限制答案长度（治啰嗦偏差）、用不同家族模型（治自我偏好偏差：裁判偏好同族输出）、每次发布人工抽检 10%。" },
      { t: "一个可执行的金标集建设流程", v: "用 RAGAS 的 <code>TestsetGenerator</code> 从语料合成约 200 条候选 → 领域专家丢掉 30-40% 含糊或错标的 → 剩下 120-140 条入库（<code>golden_v1.parquet</code>）→ <b>像版本化模型权重一样版本化这个文件</b>。换金标集意味着新基线，不是热修。RAG 问答的金标集规模一般 100-300 条，抽取类 500-2000 条，agentic 工具用 50-150 条。" },
      { t: "成本比想象中低，但要知道在哪省钱", v: "用 gpt-4o-mini 做裁判，5 个指标约 <b>$0.001-0.003 / 测试用例</b>；200 题金标集单轮评测<b>不到 $1</b>——放 CI 里跑在经济上完全无关痛痒（即使每周几十次构建）。生产监控才是成本敏感处：常见做法是随机抽样 1-5% 的生产 trace + 100% 低置信输出 + 新功能上线首 48 小时的全部输出。" },
      { t: "CI 成本的三个省钱招", v: "① 裁判模型降级（Claude 3.5 Haiku / GPT-4o-mini 可降本 <b>60-80%</b>，但要在自己的数据上验证过再切）。② 结果缓存——DeepEval 的 <code>--deepeval-cache-file</code> 在稳定金标集上把 CI 成本降 <b>5-10 倍</b>，未变的 (input, output) 对不重复调裁判。③ 只在改动 <code>src/rag/**</code> 或 <code>prompts/</code> 的 PR 上跑评测——没有理由为改一个 README 错字花 $2 的裁判 token。" },
      { t: "RAGAS 的两个实际坑", v: "① <b>返回 NaN</b>：通常是裁判模型没有输出严格 JSON，导致解析函数崩掉。换更强的裁判模型，或给评测调用加解析重试。这是 RAGAS 已知的脆弱点，在小模型或非 OpenAI 裁判上尤其常见。② <b>判定比 DeepEval 严格</b>：RAGAS 对逻辑与精确事实蕴含要求严——任何不被上下文直接支持的断言都会扣分，适合合规测试；但会把「意思对、措辞与原句不同」的答案判为不忠实。DeepEval 更务实，对保义的改写更宽容。没有谁更「正确」，是场景不同。" },
      { t: "传统指标基本可以扔掉", v: "BLEU、ROUGE、METEOR 量的是 n-gram 重叠，不是语义正确性或任务完成度——对现代 LLM 输出基本无用。2026 该用的是任务特定指标，且多数需要模型评分。" },
      { t: "按应用形状选指标", v: "<b>RAG 问答</b>：忠实度、答案相关性、上下文召回（RAGAS + LLM judge，金标 100-300）。<b>摘要</b>：忠实度、覆盖度、简洁度（LLM judge + 人工，50-200）。<b>分类/抽取</b>：F1、精确匹配、JSON 合法性（程序化，500-2000）。<b>Agentic 工具用</b>：工具调用准确率、任务完成度、成本（模拟器 + LLM judge，50-150）。<b>对话助手</b>：有用性、无害性、语气（LLM judge + 人工抽检 10%，200-500）。" },
      { t: "上线门禁的实操阈值", v: "把评测写成 pytest + 阈值，PR 掉到阈值以下自动拦截或标记。常见阈值：faithfulness 低于 <b>0.9</b> 就阻塞部署；answer relevancy 0.8；contextual recall 0.8。同时给评测准备一个小型端到端集（10-50 个代表性任务）起步迭代，只为<b>真实发现的</b>失败模式写子评测——不要为你想象出来的错误写评估器。" }
    ]
  }
};

/* 注入内容层：抽屉的「要点」页签从这里取数 */
(function () {
  var C = window.DATA && window.DATA.content;
  if (!C) return;
  Object.keys(window.NOTES).forEach(function (id) {
    if (C[id]) C[id].notes = window.NOTES[id];
  });
})();
