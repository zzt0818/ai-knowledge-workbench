/* ============================================================
   知识图谱 · Atlas
   ------------------------------------------------------------
   这一层回答的是「这些知识点之间是什么关系」——
   知识库按主题排，能查不能看；这里把关系摊开。

   三个入口，同一批知识：
     分层 —— 每个主题一条带，由上往下排，跨层的线就是「递进」
     网络 —— 把所有关联摊成一张网，看谁跟谁挨着
     主线 —— 四条走得通的路线，按顺序点亮

   关系数据（EDGES / ROUTES）是手写的，不是从正文里抽出来的。
   增删知识点时必须回来核对 —— 自检的 atlas_audit() 会盯着
   「有知识点没登记短名」「边指向了不存在的 id」「孤立点」这三件事。
   ============================================================ */
window.ATLAS = (function () {
  var W = window;

  /* ============================================================
     一、短名
     网络图里节点挨得近，标题放不下，用短名；完整标题在悬停与面板里。
     ============================================================ */
  var SHORT = {
    /* 入门两条带：这里刻意不用术语，用他心里那句话。
       这两条带是给完全没接触过的人看的，写成「上下文工程」他就关页面了。 */
    'ai-what': 'AI 是什么',
    'ai-can-do': '能做什么',
    'ai-first-try': '第一次用',
    'ai-ask-well': '怎么问',
    'ai-wrong-why': '为什么会错',
    'ai-limit': '什么别给它',
    'ai-tools-pick': '用哪个',
    'ai-radar': '现在有哪些',
    'ai-check-it': '怎么识破',

    'ai-prompt-basic': '把话说全',
    'ai-give-material': '给它材料',
    'ai-output-format': '要格式',
    'ai-long-chat': '聊久了忘',
    'ai-context-trap': '贴的也害你',
    'ai-skill': '打包做法',
    'ai-mcp': '接上软件',
    'ai-connector': '名字理清',
    'ai-make-it-think': '先想再答',
    'ai-batch-template': '模板批量',
    'ai-workflow-embed': '嵌进流程',
    'ai-review-output': '怎么验收',

    'transformer': '注意力',
    'pretrain-ft': '预训练',
    'llm-core': '核心概念',
    'multimodal': '多模态',
    'reasoning': '推理',
    'hallucination': '幻觉',

    'prompt-design': '提示词',
    'context-eng': '上下文',

    'rag-overview': 'RAG 全貌',
    'doc-parsing': '解析',
    'chunking': '切分',
    'retrieval': '检索',
    'answer-gen': '生成',
    'query-optimize': '改写',
    'advanced-index': '索引',
    'self-correct-rag': '自纠错',

    'agent-loop': '循环',
    'tool-calling': '工具调用',
    'tool-design': '工具设计',
    'agent-memory': '记忆',
    'task-planning': '规划',
    'multi-agent': '多智能体',
    'context-management': '长会话',

    'frameworks': '框架',
    'mcp': 'MCP',
    'vector-db': '向量库',
    'local-llm': '本地模型',
    'graph-orchestration': '图编排',
    'ai-coding-workflow': 'AI 编码',

    'python-eng': 'Python',
    'async-io': '异步',
    'api-service': '接口',
    'deployment': '部署',
    'serving': '并发',
    'observability': '可观测',
    'agent-harness': '底座',

    'evaluation': '评估',
    'eval-method': '评判方法',
    'injection': '注入',
    'agent-guardrail': '护栏'
  };

  /* ============================================================
     二、关系
     三种：
       need —— 前置。不先弄懂前一个，后一个里的机制会看得云里雾里
       link —— 延伸。同一条链上的前后步，或能力被另一处用上
       peer —— 对照。一体两面、容易混、常被放在一起看的那类
     why 是写给人看的一句话，说明这条线凭什么存在。
     ============================================================ */
  var EDGES = [
    /* ---- 入门两条带：从「它是什么」走到「怎么验收」 ----
       这两条带内部大多是「下一步」；对外的线统一指向后面那七条带，
       作用是回答「想更深该往哪走」—— 不然新人看完还是不知道下一步看什么。 */
    ['ai-what', 'ai-can-do', 'link', '先知道它是什么，才谈得上它能替你做什么'],
    ['ai-can-do', 'ai-first-try', 'link', '能做什么说清了，下一步就是自己上手试一次'],
    ['ai-first-try', 'ai-ask-well', 'link', '试过之后最先撞上的，就是「怎么问它才答得好」'],
    ['ai-can-do', 'ai-limit', 'peer', '「能做什么」和「什么别交给它」是一体两面，得一起看'],
    ['ai-can-do', 'ai-tools-pick', 'link', '先明确要它干什么，再挑用什么装'],
    ['ai-wrong-why', 'ai-check-it', 'need', '先接受它会编，才谈得上怎么把它认出来'],
    ['ai-limit', 'ai-check-it', 'link', '知道它在哪儿容易翻车，就知道该往哪儿查'],
    ['ai-tools-pick', 'ai-radar', 'peer', '「用哪个」和「现在有哪些」，是同一张清单的两个看法'],
    ['ai-ask-well', 'ai-prompt-basic', 'need', '会问是底线，把话说全是把这条底线固定下来'],
    ['ai-prompt-basic', 'ai-give-material', 'link', '把话说全之后，紧接着的一条是别让它凭记忆答'],
    ['ai-give-material', 'ai-output-format', 'link', '给足材料，还得规定它怎么把结果还给你'],
    ['ai-output-format', 'ai-batch-template', 'need', '输出格式定下来了，才谈得上套模板批量做'],
    ['ai-long-chat', 'ai-context-trap', 'peer', '聊久了会忘、贴进去的会害你，都是上下文这一件事'],
    ['ai-long-chat', 'ai-give-material', 'link', '它记不住，就得每次把该给的材料重新给对'],
    ['ai-context-trap', 'ai-check-it', 'link', '上下文被带偏之后，先得能看出答得不对劲'],
    ['ai-skill', 'ai-prompt-basic', 'link', '把问法固定下来之后，下一步是把整套做法固定下来'],
    ['ai-skill', 'ai-batch-template', 'link', '做法固定了，批量做才有稳定不变的口径'],
    ['ai-skill', 'ai-review-output', 'link', '固化的做法里要带验收标准，否则只是把糊涂话写成了规矩'],
    ['ai-skill', 'ai-workflow-embed', 'need', '要嵌进日常流程，先得有一份固定的做法可供嵌入'],
    ['ai-skill', 'ai-mcp', 'peer', '一个给的是做法，一个给的是数据和动作 —— 经常被当成一回事'],
    ['ai-skill', 'ai-connector', 'link', '名字理清之后，才知道这一类给的是做法'],
    ['ai-mcp', 'ai-tools-pick', 'link', '「用哪个」再往上一层，就是「怎么让它接上你手上的系统」'],
    ['ai-mcp', 'ai-context-trap', 'peer', '接进来的数据也是上下文，接错范围和贴错东西是一个后果'],
    ['ai-mcp', 'mcp', 'link', '想看规范细节与部署方式，往第 4 档那条走'],
    ['ai-mcp', 'ai-connector', 'link', '名字理清之后，才知道那一类给的是数据与动作'],
    ['ai-connector', 'frameworks', 'link', '自己动手搭的时候，这些名字会一起出现在选型表里'],
    ['ai-check-it', 'ai-review-output', 'need', '能识破一次胡说，才谈得上成套地验收它的产出'],
    ['ai-make-it-think', 'ai-review-output', 'link', '让它先想再答，是为了让结果可核对'],
    ['ai-batch-template', 'ai-review-output', 'peer', '批量做出来和逐条验收，是一件事的两端'],
    ['ai-workflow-embed', 'ai-review-output', 'link', '要嵌进日常流程，得先把验收标准写下来'],

    ['ai-what', 'llm-core', 'link', '想弄清它到底怎么算出来的，往「大模型基础」走'],
    ['ai-first-try', 'prompt-design', 'link', '从「会试」到「能稳定控制输出」，中间隔着提示工程'],
    ['ai-ask-well', 'prompt-design', 'link', '把问法沉淀成可复用的写法，就是提示工程'],
    ['ai-prompt-basic', 'prompt-design', 'link', '那四件必给的信息，就是提示词的最小可用版本'],
    ['ai-output-format', 'prompt-design', 'peer', '要格式和写提示词，本来就是同一件事'],
    ['ai-wrong-why', 'hallucination', 'need', '要理解它为什么编，得先知道它是照着概率猜下一个词'],
    ['ai-check-it', 'hallucination', 'link', '识破它编，靠的是幻觉这条线上那些能检出的手段'],
    ['ai-check-it', 'eval-method', 'link', '判断得准不准，最后要落到评判方法上'],
    ['ai-limit', 'agent-guardrail', 'link', '「什么别交给它」落地就是权限清单与人工接管点'],
    ['ai-can-do', 'agent-loop', 'link', '让它自己动手去做，是 Agent 那条线要解决的事'],
    ['ai-workflow-embed', 'agent-loop', 'link', '嵌进日常流程，最后多半会走成一个自动循环'],
    ['ai-tools-pick', 'frameworks', 'link', '想自己搭一个，先认清市面这些框架各管什么'],
    ['ai-radar', 'local-llm', 'peer', '在线服务和本地跑模型，是「用哪个」的两端'],
    ['ai-give-material', 'context-eng', 'need', '别让它凭记忆答，往上就是上下文工程'],
    ['ai-give-material', 'rag-overview', 'link', '材料多到放不进窗口，就轮到 RAG 上场'],
    ['ai-long-chat', 'context-management', 'link', '会话变长之后具体怎么办，这里有一套做法'],
    ['ai-long-chat', 'agent-memory', 'peer', '让跨轮次记得住：记忆和长会话是一体两面'],
    ['ai-context-trap', 'injection', 'link', '你贴进去的东西会害你，这正是提示注入的入口'],
    ['ai-make-it-think', 'reasoning', 'need', '想让它先想再答，得先知道模型有没有这个能力'],
    ['ai-batch-template', 'evaluation', 'link', '批量产出的质量，只能靠评估说话'],
    ['ai-review-output', 'evaluation', 'need', '验收要成体系，底下就是评估这件事'],

    /* ---- 模型怎么工作：这一层垫在所有东西下面 ---- */
    ['transformer', 'llm-core', 'need', '注意力是 Token 与 Embedding 得以运转的机制'],
    ['transformer', 'pretrain-ft', 'link', '架构长什么样，决定了预训练该怎么练'],
    ['pretrain-ft', 'reasoning', 'link', '后训练这一步对齐出来的，正是"先想再答"的行为'],
    ['pretrain-ft', 'hallucination', 'link', '训练目标就是照着上下文猜下一个词，编是它的默认动作'],
    ['llm-core', 'hallucination', 'need', '概率式生成决定了幻觉清不干净，只能压制与检出'],
    ['llm-core', 'prompt-design', 'need', 'Token 怎么算、窗口有多长，是写提示词之前要知道的事'],
    ['llm-core', 'context-eng', 'need', '窗口就是上下文工程要管理的那个框'],
    ['llm-core', 'retrieval', 'need', 'Embedding 是整套检索的地基'],
    ['multimodal', 'transformer', 'link', '同一套注意力机制，换输入就吃下图片和音频'],
    ['multimodal', 'doc-parsing', 'link', '文档里的图和表，落在这条线上'],
    ['reasoning', 'task-planning', 'link', '会先想一会儿，才谈得上拆解与规划'],
    ['hallucination', 'answer-gen', 'peer', 'RAG 最主要的动机之一，就是把这东西压下去'],
    ['hallucination', 'eval-method', 'peer', '幻觉要能被量出来，靠的是评判方法而不是肉眼'],

    /* ---- 怎么跟它说话 ---- */
    ['prompt-design', 'context-eng', 'link', '提示词只是"放进去的东西"里最先被想到的那一样'],
    ['prompt-design', 'tool-design', 'peer', '工具的名字与描述，写法和提示词是同一件事'],
    ['context-eng', 'rag-overview', 'link', 'RAG 的本质是往上下文里放更准的东西'],
    ['context-eng', 'agent-memory', 'link', '上下文装不下就外置，记忆是它的外部延伸'],
    ['context-eng', 'context-management', 'need', '会话变长，是上下文问题最尖锐的那种形态'],
    ['context-eng', 'injection', 'peer', '你放进去的每一样东西，都可能是别人塞进来的'],

    /* ---- RAG：一条主链，外加三处补丁 ---- */
    ['rag-overview', 'doc-parsing', 'need', '第一步永远是把文档读进来'],
    ['doc-parsing', 'chunking', 'need', '解析出来的文本，才谈得上怎么切'],
    ['chunking', 'retrieval', 'need', '切法决定了召回的上限'],
    ['retrieval', 'answer-gen', 'need', '召回来的片段是回答的原料'],
    ['chunking', 'advanced-index', 'link', '切片补不上的缺口，靠更复杂的索引结构'],
    ['retrieval', 'advanced-index', 'link', '召回精度的另一半在索引与精排上'],
    ['retrieval', 'query-optimize', 'link', '召不回来时，先改问题往往比换模型划算'],
    ['retrieval', 'self-correct-rag', 'need', '先有检索，才谈得上检索之后质检'],
    ['query-optimize', 'self-correct-rag', 'link', '改写是自纠错链路里最先动手的一环'],
    ['answer-gen', 'self-correct-rag', 'link', '答完回查一遍，是这条链的收口'],
    ['retrieval', 'vector-db', 'link', '向量库是检索落地的存储底座'],
    ['vector-db', 'advanced-index', 'link', '索引结构能做成什么样，受向量库支持什么限制'],
    ['chunking', 'evaluation', 'peer', '切分策略好不好，只能拿评估说话'],
    ['retrieval', 'evaluation', 'link', '召回率得测得出，改检索才有方向'],

    /* ---- Agent：从会说到会做 ---- */
    ['agent-loop', 'tool-calling', 'need', '循环要能干活，第一步是能调起工具'],
    ['agent-loop', 'task-planning', 'need', '循环的刹车，就是规划与终止条件'],
    ['agent-loop', 'agent-memory', 'link', '记忆是循环能跨轮次延续的载体'],
    ['agent-loop', 'multi-agent', 'link', '一个循环撑不住时，才轮到拆成多个'],
    ['agent-loop', 'graph-orchestration', 'link', '循环里的分支与重试，用图表达更清楚'],
    ['agent-loop', 'agent-guardrail', 'need', '一旦它自己决定下一步，护栏就不是可选项'],
    ['tool-calling', 'tool-design', 'need', '会调之后，紧接着就是怎么把工具写好'],
    ['tool-calling', 'mcp', 'link', '协议层解决的是工具怎么被普遍接上'],
    ['tool-design', 'mcp', 'peer', '一个管工具怎么写，一个管工具怎么接'],
    ['task-planning', 'multi-agent', 'link', '任务拆开之后，才轮得到分工'],
    ['task-planning', 'graph-orchestration', 'need', '多步流程的编排，需要图这种结构撑住'],
    ['agent-memory', 'context-management', 'link', '长期记忆怎么写、什么时候忘，是一件事的两端'],
    ['tool-calling', 'injection', 'link', '工具返回的内容，是注入最常走的入口'],
    ['agent-loop', 'agent-harness', 'peer', '循环是机制，底座是让它稳定跑起来的环境'],
    ['tool-design', 'agent-guardrail', 'link', '工具能干什么，直接决定权限清单怎么列'],
    ['agent-memory', 'observability', 'peer', '记忆写坏了很难查，得靠可观测兜住'],

    /* ---- 用什么拼 ---- */
    ['frameworks', 'rag-overview', 'link', '框架最常替你搭的，就是这条链'],
    ['frameworks', 'graph-orchestration', 'link', '图编排能力基本绑在框架里'],
    ['frameworks', 'agent-loop', 'peer', '先弄懂循环，才知道框架替你做了什么、藏了什么'],
    ['local-llm', 'deployment', 'link', '要在本地跑起来，部署是绕不开的一步'],
    ['local-llm', 'serving', 'link', '显存与吞吐的限制，直接决定服务怎么设计'],
    ['ai-coding-workflow', 'agent-harness', 'link', '工单、记忆、完成标准，就是编码协作要的那套底座'],
    ['ai-coding-workflow', 'python-eng', 'link', '工单式的改法，前提是工程习惯已经立起来'],

    /* ---- 扛住生产 ---- */
    ['python-eng', 'async-io', 'need', '工程习惯立起来，才写得好异步那一层'],
    ['async-io', 'api-service', 'need', '接口要能并发，先得会异步'],
    ['api-service', 'serving', 'link', '服务化是在接口之上解决吞吐'],
    ['api-service', 'deployment', 'link', '服务要被人调起来，部署是最后一公里'],
    ['deployment', 'serving', 'link', '跑不起来，前面全白做'],
    ['serving', 'observability', 'need', '并发上来之后，看不见就等于失控'],
    ['observability', 'evaluation', 'link', '线上数字与离线评估要对得上，否则两套都不可信'],
    ['observability', 'injection', 'link', '异常的调用链，是发现注入的第一现场'],
    ['deployment', 'agent-guardrail', 'link', '沙箱与权限，最终落在部署这一层'],

    /* ---- 怎么知道它变好了 ---- */
    ['evaluation', 'eval-method', 'need', '先有评估这件事，才谈得上用什么方法评'],
    ['eval-method', 'hallucination', 'link', '让模型给模型打分，最容易在幻觉上失准'],
    ['eval-method', 'self-correct-rag', 'link', '自纠错的门控阈值，取的正是评估指标'],
    ['injection', 'agent-guardrail', 'need', '按现有架构没有银弹，只能靠护栏兜住'],
    ['injection', 'mcp', 'peer', '工具接得越广，能被塞进来的入口就越多'],
    ['agent-guardrail', 'agent-harness', 'link', '权限清单、接管点，都长在底座上']
  ];

  /* ============================================================
     三、主线
     每条是一条真走得通的路。steps 里 why 写的是「走到这一步该拿到什么」。
     ============================================================ */
  var ROUTES = [
    {
      id: 'zero', name: '零基础起步', en: 'GET STARTED',
      note: '完全没接触过的人走这条：先弄明白它是什么、能替你干什么、什么别交给它，' +
            '然后自己上手试一次；再把「怎么问」变成习惯，学会验收它的产出。' +
            '最后两步是往上够一层：把你这套做法固化下来，把它接上你手上的软件。' +
            '走完这十二步，后面那七条带里的话你基本就能听懂了。',
      steps: [
        { id: 'ai-what', why: '先有一句自己的话说清它是什么，不然后面全是听不懂的名词' },
        { id: 'ai-can-do', why: '知道它最擅长干哪几类活，才不会拿它去干它干不了的' },
        { id: 'ai-limit', why: '紧跟着要知道哪些事别交给它 —— 这一条比「能做什么」更省钱' },
        { id: 'ai-first-try', why: '挑一件真事上手试五分钟，胜过看十篇介绍' },
        { id: 'ai-ask-well', why: '同一个问题换个问法，答案质量差一大截' },
        { id: 'ai-prompt-basic', why: '把「怎么问」固定成四件必给的信息，每次都能复用' },
        { id: 'ai-give-material', why: '关键的一步：别让它凭记忆答，把材料给它' },
        { id: 'ai-wrong-why', why: '它会一本正经地说错话，先接受这件事' },
        { id: 'ai-check-it', why: '然后学会怎么把它认出来，这是保命的习惯' },
        { id: 'ai-review-output', why: '把「能用」变成「能验收」，这一步决定别人信不信你交的东西' },
        { id: 'ai-skill', why: '同一套要求交代到第三次，就该把它固化下来，别再每次重说' },
        { id: 'ai-mcp', why: '最后一次跃迁：从"你搬给它"变成"它自己去拿"' }
      ]
    },
    {
      id: 'rag', name: 'RAG 一条链', en: 'RETRIEVAL',
      note: '从「模型能看见什么」开始，到「答错了自己能发现」结束。这条链上每一步都有人栽过，但顺序跳不得。',
      steps: [
        { id: 'llm-core', why: '先认清窗口这个硬边界，后面所有设计都是在绕它' },
        { id: 'context-eng', why: '把"往上下文里放什么"当成一件正经事来做' },
        { id: 'rag-overview', why: '看清楚四步各自管什么，再决定先修哪一段' },
        { id: 'doc-parsing', why: '解析出来的东西决定整条链的天花板' },
        { id: 'chunking', why: '切法定了召回的上限，这里省事后面加倍还' },
        { id: 'retrieval', why: '嵌入、相似度、重排走通一遍，拿到第一版召回' },
        { id: 'query-optimize', why: '召不回来时，先动问题，别急着换模型' },
        { id: 'advanced-index', why: '切片补不上的缺口，用多表示与摘要树补' },
        { id: 'answer-gen', why: '强制引用、编号可核、低分拒答' },
        { id: 'self-correct-rag', why: '答完回查一遍，把错答挡在出门之前' }
      ]
    },
    {
      id: 'agent', name: 'Agent 一条链', en: 'AGENT',
      note: '从「会说」到「会做」。中间隔着工具、循环、规划三道门槛，最后一道是护栏。',
      steps: [
        { id: 'prompt-design', why: '先能稳定地控制输出，才谈得上让模型做判断' },
        { id: 'tool-calling', why: '走通往返一次：定义 schema、选工具、解析、回填' },
        { id: 'tool-design', why: '工具是给模型用的接口，描述写不好它就用错' },
        { id: 'mcp', why: '工具多起来之后，接法本身需要一个标准' },
        { id: 'agent-loop', why: '让它自己决定下一步——分界线从这条循环开始' },
        { id: 'task-planning', why: '循环必须有刹车：迭代上限、终止条件、成本上限' },
        { id: 'graph-orchestration', why: '分支与重试多起来，链式写法就撑不住了' },
        { id: 'agent-memory', why: '跨轮次要记得住，退出时写、进入时读' },
        { id: 'multi-agent', why: '确认一个循环真不够用了，再拆成多个' },
        { id: 'agent-guardrail', why: '权限、沙箱、接管点，围栏得在它跑之前就立好' }
      ]
    },
    {
      id: 'ship', name: '上线一条链', en: 'SHIP',
      note: '决定一个项目是「跑得通的 Demo」还是「敢上线的系统」，差的就是这一条。这些事不出现在演示里。',
      steps: [
        { id: 'python-eng', why: '依赖锁死、lint 通过、类型检查能跑——先有骨架' },
        { id: 'async-io', why: '每一步都在等网络，不会异步吞吐就上不去' },
        { id: 'api-service', why: '把 Agent 包成别人能调的服务，先把接口契约定下来' },
        { id: 'deployment', why: '密钥、配置、启动顺序、模型不可用时的降级' },
        { id: 'serving', why: '流式、心跳、限流、连接池，压出 QPS 与 P99' },
        { id: 'observability', why: '每轮记模型版本、token、各步耗时，成本按维度拆' },
        { id: 'evaluation', why: '把评测写成阈值进 CI，指标掉线自动拦' }
      ]
    },
    {
      id: 'safe', name: '可信一条链', en: 'TRUST',
      note: '幻觉和注入按现有架构都没有彻底解。能做的是把它们关进一个可检出、可接管的流程里。',
      steps: [
        { id: 'llm-core', why: '先接受"它是概率式生成"这个前提，后面才不会找银弹' },
        { id: 'hallucination', why: '分清哪些手段真能压住、哪些只是心理安慰' },
        { id: 'injection', why: '模型分不清指令和数据，这是架构层面的问题' },
        { id: 'agent-guardrail', why: '权限清单、沙箱、验证回路、人工接管点' },
        { id: 'agent-harness', why: '把完成标准写成可执行的，别靠它自觉' },
        { id: 'evaluation', why: '把"变好了"变成可测的数字，而不是感觉' },
        { id: 'eval-method', why: '让模型给模型打分时，先知道它有哪几种偏差' }
      ]
    },
    {
      id: 'mech', name: '机制一条链', en: 'HOW IT WORKS',
      note: '这条线不解决任何具体问题，只回答"它为什么会这样"。这一层看完，' +
            '前面那些工程做法会从"规矩"变成"有原因的选择" —— 为什么必须切分、' +
            '为什么要管上下文、为什么它算数不稳，答案都在这五步里。',
      steps: [
        { id: 'pretrain-ft', why: '先看它是怎么被造出来的：读海量文本、学"下一个词"，能力从这一步长出来' },
        { id: 'transformer', why: '再看这一步是怎么做到的 —— 注意力让它同时看整句，而不是一个词一个词往下读' },
        { id: 'reasoning', why: '然后看"想一步再说"是怎么被训出来的，以及它为什么只在落点明确的题上管用' },
        { id: 'multimodal', why: '同一套机制也吃得下图像与音频 —— 理解这一点，才知道"给它看图"为什么可行' },
        { id: 'context-management', why: '最后回到最贵的那份资源：上下文窗口。机制决定了它必须被治理' }
      ]
    },
    {
      id: 'craft2', name: '上手一条链', en: 'PUT IT TO WORK',
      note: '从"能用"到"每天都在用"，是一条单独的线。这一档不谈模型，只谈手上那几件活：' +
            '怎么要格式、怎么让它先想、怎么验收、怎么一次做一百条、怎么把做法嵌进流程。',
      steps: [
        { id: 'ai-output-format', why: '先让输出长得像你要的东西 —— 格式定下来，返工少一半' },
        { id: 'ai-make-it-think', why: '再让它先给要点再展开，把返工成本压到"改一行"而不是"整篇重写"' },
        { id: 'ai-review-output', why: '接着定验收口径：它这次的产出哪里靠不住，你要说得出' },
        { id: 'ai-batch-template', why: '然后才敢一次做一百条 —— 批量出错是批量级的，验收跟不上就别批量' },
        { id: 'ai-workflow-embed', why: '最后把它放进固定流程 —— 到这一步它才是真的在替你干活' }
      ]
    },
    {
      id: 'kit', name: '工具一条链', en: 'TOOLKIT',
      note: '真动手搭的时候会依次撞上这几块。它们不是"要不要学"的问题，' +
            '而是"什么时候轮到它"：先挑框架，再接外部软件，然后落检索、上编排，' +
            '数据不能出门就换本地模型，而写代码这件事本身也该换一套做法。',
      steps: [
        { id: 'frameworks', why: '先挑框架 —— 这一带里别的东西最后都要装进它，先定它才不返工' },
        { id: 'mcp', why: '再接外部软件：接法需要一个标准，不然每加一个工具都要手写一遍胶水' },
        { id: 'vector-db', why: '检索要落地就绕不开向量库 —— 选哪个、和业务库放不放在一起' },
        { id: 'graph-orchestration', why: '分支与重试多起来，链式写法撑不住，就该换成图编排' },
        { id: 'local-llm', why: '数据不许出内网时，本地部署与量化是唯一的退路' },
        { id: 'ai-coding-workflow', why: '最后把写代码本身也换掉：怎么和它分工、怎么验收它写的代码' }
      ]
    }
  ];

  /* ============================================================
     四、关系类型的外观
     ============================================================ */
  var KIND = {
    need: { t: '前置', d: '不先弄懂前者，后者的机制会看不懂' },
    link: { t: '延伸', d: '同一条链上的前后步，或能力被别处用上' },
    peer: { t: '对照', d: '一体两面、容易混、常被放在一起看' }
  };

  /* 九个主题各一个颜色。它同时出现在分层图的节点色条和网络图的圆点上，
     所以两个视图里"哪几个点是一伙的"能对上。
     前面七个是老的，末尾两个（入门那两条带）选的是色环上空着的两段：
     玫红和橄榄绿 —— 不跟已有的七个撞脸，扫一眼就能分清。 */
  var TOPIC_COLOR = {
    'start': '#BE185D',
    'craft': '#4D7C0F',
    'llm-basics': '#2563EB',
    'prompting': '#7C3AED',
    'rag': '#0891B2',
    'agent': '#059669',
    'toolchain': '#EA580C',
    'engineering': '#A16207',
    'safety': '#DC2626'
  };
  var TCOL = function (t) { return TOPIC_COLOR[t] || '#94A3B8'; };

  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  /* ============================================================
     五、索引：把手写数据整理成好查的形状
     ============================================================ */
  var BUF = null;
  function build() {
    if (BUF) return BUF;
    var D = W.DATA;
    var nodeMap = {}, order = [], topicOf = {}, shortOf = {};
    D.topics.forEach(function (t) {
      t.points.forEach(function (p) {
        nodeMap[p.id] = { id: p.id, title: p.title, topic: t.id, topicName: t.name,
                          stage: p.stage, brief: p.brief };
        order.push(p.id);
        topicOf[p.id] = t.id;
        shortOf[p.id] = SHORT[p.id] || p.title.slice(0, 4);
      });
    });

    var adj = {}, links = [];
    order.forEach(function (id) { adj[id] = []; });
    EDGES.forEach(function (e) {
      var a = e[0], b = e[1], k = e[2], why = e[3];
      if (!nodeMap[a] || !nodeMap[b]) return;      /* 自检会另外报出来 */
      links.push({ a: a, b: b, k: k, why: why });
      adj[a].push({ id: b, k: k, why: why, dir: 'out' });
      adj[b].push({ id: a, k: k, why: why, dir: 'in' });
    });

    BUF = { nodeMap: nodeMap, order: order, topicOf: topicOf, shortOf: shortOf,
            links: links, adj: adj };
    return BUF;
  }

  /* ============================================================
     六、布局 · 分层
     主题由上往下堆。层内按深浅左右排，跨层的线就是递进。
     同层的线（比如「部署 → 并发」）位置本身就说明了先后，
     默认不画，选中某个点时才亮出来 —— 省下的都是噪音。

     尺寸全部按数据算，一个都不写死。写死过一次（7 主题 / 40 点），
     加到 9 主题 / 58 点的时候：横向需要 1274px 而画布只有 1180，
     纵向需要 1004px 而画布只有 816 —— 后两条带整条被裁出画布，
     右边两列被切掉一半。图上看不见，是量坐标才发现的。
     所以这里只留"想要的宽度"和上下限：每行多宽、方块多宽、
     整图多高，全是数出来的。加主题、加点都不会再越界。
     ============================================================ */
  var LAY = {
    W: 1180,                     /* 画布目标宽度（viewBox，显示时等比缩） */
    PAD_T: 30, PAD_L: 148, PAD_R: 26, PAD_B: 30,
    BAND_PAD: 12, BAND_GAP: 8, BAND_MIN: 86,
    NODE_H: 44, NODE_GAP: 9, ROW_GAP: 8,
    NODE_W_MAX: 158, NODE_W_MIN: 96,
    NODE_FS: 12.5                /* 方块里的字：这里放的是短名，一行够用 */
  };

  function layered() {
    var B = build();
    var layers = [], nodes = {};
    var contentW = LAY.W - LAY.PAD_L - LAY.PAD_R;
    var y = LAY.PAD_T;

    W.DATA.topics.forEach(function (t, i) {
      var ids = t.points.map(function (p) { return p.id; });
      var n = ids.length || 1;
      /* 一行放得下就用一行，方块在上下限之间把行宽摊平；
         放不下（知识点多的主题）就折行，不让它顶出画布 */
      var oneRow = (contentW - (n - 1) * LAY.NODE_GAP) / n;
      var perRow, rows, nw;
      if (oneRow >= LAY.NODE_W_MIN) {
        perRow = n; rows = 1;
        nw = Math.min(LAY.NODE_W_MAX, oneRow);
      } else {
        perRow = Math.max(1, Math.floor((contentW + LAY.NODE_GAP) / (LAY.NODE_W_MIN + LAY.NODE_GAP)));
        rows = Math.ceil(n / perRow);
        nw = Math.min(LAY.NODE_W_MAX, (contentW - (perRow - 1) * LAY.NODE_GAP) / perRow);
      }
      var blockH = rows * LAY.NODE_H + (rows - 1) * LAY.ROW_GAP;
      var bandH = Math.max(LAY.BAND_MIN, LAY.BAND_PAD * 2 + blockH);
      var ny0 = y + (bandH - blockH) / 2;

      ids.forEach(function (id, j) {
        var r = Math.floor(j / perRow), c = j % perRow;
        var inRow = Math.min(perRow, ids.length - r * perRow);
        var rowW = inRow * nw + (inRow - 1) * LAY.NODE_GAP;
        var x0 = LAY.PAD_L + Math.max(0, (contentW - rowW) / 2);
        nodes[id] = {
          id: id, x: x0 + c * (nw + LAY.NODE_GAP),
          y: ny0 + r * (LAY.NODE_H + LAY.ROW_GAP),
          w: nw, h: LAY.NODE_H,
          band: i, row: r, bandY: y, bandH: bandH, title: B.nodeMap[id].title
        };
      });
      layers.push({ topic: t, y: y, h: bandH, ids: ids, rows: rows });
      y += bandH + LAY.BAND_GAP;
    });

    var H = y - LAY.BAND_GAP + LAY.PAD_B;
    var links = B.links.map(function (l) {
      return { a: l.a, b: l.b, k: l.k, why: l.why,
               cross: nodes[l.a].band !== nodes[l.b].band };
    });
    return { w: LAY.W, h: H, layers: layers, nodes: nodes,
             ids: B.order, links: links, shortOf: B.shortOf };
  }

  /* ============================================================
     七、布局 · 邻域
     聚焦一个知识点，把它周围的关系摊开：左边是「得先弄懂的」，
     右边是「它延伸出去的」，下边是「拿来对照的」。

     为什么不做整张环形大图：40 个节点配中文标签在环里排不开 ——
     簇内相邻两点只有 47px，标签最宽 46px，必然压在一起（量出来的，不是猜的）。
     聚焦一个点，一次最多八九个邻居，标签放得下，关系也才看得清。
     ============================================================ */
  var EGO = { W: 1140, H: 502, CX: 570, CY: 250, CW: 176, CH: 38, GAP: 11, DX: 292 };

  function ego(centerId) {
    var B = build();
    var center = (centerId && B.nodeMap[centerId]) ? centerId : null;
    /* 没指定就取关联最多的那个：它在网里最靠中间，一眼能看到的邻居最多 */
    if (!center) {
      center = B.order[0];
      B.order.forEach(function (id) {
        if (B.adj[id].length > B.adj[center].length) center = id;
      });
    }

    var pre = [], ext = [], peer = [];
    B.adj[center].forEach(function (x) {
      if (x.k === 'peer') peer.push(x);
      else if (x.dir === 'in') pre.push(x);    /* 别人指着它 → 它是前置 */
      else ext.push(x);                        /* 它指着别人 → 那是延伸 */
    });

    var nodes = {}, links = [];
    nodes[center] = { id: center, x: EGO.CX - EGO.CW / 2, y: EGO.CY - 24,
                      w: EGO.CW, h: 48, center: true };

    function stack(arr, x, side) {
      if (!arr.length) return;
      var total = arr.length * EGO.CH + (arr.length - 1) * EGO.GAP;
      var y0 = EGO.CY - total / 2;
      arr.forEach(function (x2, i) {
        if (nodes[x2.id]) return;                 /* 一对节点之间可能有多条边 */
        nodes[x2.id] = { id: x2.id, x: x, y: y0 + i * (EGO.CH + EGO.GAP),
                         w: EGO.CW, h: EGO.CH, side: side };
        links.push({ a: center, b: x2.id, k: x2.k, why: x2.why, side: side });
      });
    }
    stack(pre, EGO.CX - EGO.DX - EGO.CW, 'left');
    stack(ext, EGO.CX + EGO.DX, 'right');

    /* 对照横铺在下方 */
    if (peer.length) {
      var pw = peer.length * EGO.CW + (peer.length - 1) * 16;
      var px0 = EGO.CX - pw / 2;
      peer.forEach(function (x2, i) {
        if (nodes[x2.id]) return;
        nodes[x2.id] = { id: x2.id, x: px0 + i * (EGO.CW + 16),
                         y: EGO.CY + 150, w: EGO.CW, h: EGO.CH, side: 'bottom' };
        links.push({ a: center, b: x2.id, k: x2.k, why: x2.why, side: 'bottom' });
      });
    }

    /* 高度按内容走：没有「对照」那一排就收掉下方空白 */
    var H = peer.length ? EGO.CY + 150 + EGO.CH + 44 : EGO.CY + 196;
    return { w: EGO.W, h: H, center: center, nodes: nodes, links: links,
             pre: pre, ext: ext, peer: peer, shortOf: B.shortOf };
  }

  /* ============================================================
     八、画线
     ============================================================ */
  /* 分层图：跨层走贝塞尔（上下两端相接），同层从下方绕过去 */
  function pathLayer(n, L, geo) {
    var A = geo.nodes[n.a], Bn = geo.nodes[n.b];
    var ax = A.x + A.w / 2, ay = A.y + A.h / 2;
    var bx = Bn.x + Bn.w / 2, by = Bn.y + Bn.h / 2;
    if (n.cross) {
      var down = by > ay;
      var y1 = down ? A.y + A.h : A.y, y2 = down ? Bn.y : Bn.y + Bn.h;
      var d = Math.max(24, Math.abs(y2 - y1) * 0.36);
      var d1 = down ? d : -d, d2 = down ? -d : d;
      return 'M' + ax + ',' + y1 + 'C' + ax + ',' + (y1 + d1) + ' ' + bx + ',' + (y2 + d2) + ' ' + bx + ',' + y2;
    }
    /* 同层：从层带下沿绕过去，不穿层内的节点。
       层带高度现在是算出来的（有的主题知识点多会折行），
       所以下沿取节点自己记的 bandY + bandH，不能再拿固定值乘层号。 */
    var yb = A.bandY + A.bandH - 14;
    var mx = (ax + bx) / 2;
    return 'M' + ax + ',' + (A.y + A.h) + 'Q' + ax + ',' + yb + ' ' + mx + ',' + yb +
           'Q' + bx + ',' + yb + ' ' + bx + ',' + (Bn.y + Bn.h);
  }

  /* 网络图：弦线。跨主题往圆心方向弯一点，免得一大堆线糊在中心 */
  function pathNet(n, geo) {
    var A = geo.nodes[n.a], Bn = geo.nodes[n.b];
    var mx = (A.x + Bn.x) / 2, my = (A.y + Bn.y) / 2;
    var k = n.cross ? 0.16 : 0.30;
    var cx = mx + (NET.CX - mx) * k, cy = my + (NET.CY - my) * k;
    return 'M' + A.x + ',' + A.y + 'Q' + cx + ',' + cy + ' ' + Bn.x + ',' + Bn.y;
  }

  /* ============================================================
     九、渲染 · 分层
     ============================================================ */
  function svgLayered() {
    var B = build();
    var geo = layered();
    var s = [];
    s.push('<svg class="at-svg at-layer" viewBox="0 0 ' + geo.w + ' ' + geo.h + '" ' +
           'role="img" aria-label="知识分层框架图">');

    /* 层带与层名：三行按层带高度垂直居中（层带高度现在是算出来的，
       不能再拿固定偏移画 —— 折行的主题层带会变高，标签就会飘到顶部） */
    geo.layers.forEach(function (L) {
      var t = L.topic, n = L.ids.length, cy = L.y + L.h / 2;
      s.push('<g class="at-band" data-band="' + t.id + '">' +
        '<rect x="6" y="' + L.y + '" width="' + (geo.w - 12) + '" height="' + L.h + '" rx="8"/>' +
        '<text class="at-band-n" x="22" y="' + (cy - 12) + '">' + esc(t.name) + '</text>' +
        '<text class="at-band-en" x="22" y="' + (cy + 5) + '">' + esc(t.en) + '</text>' +
        '<text class="at-band-c" x="22" y="' + (cy + 21) + '">' + n + ' 条</text>' +
        '</g>');
    });

    /* 线：默认只画跨层，同层的留给选中时 */
    s.push('<g class="at-links">');
    geo.links.forEach(function (l, i) {
      s.push('<path class="at-lk k-' + l.k + (l.cross ? ' cross' : ' same') + '" ' +
             'data-lk="' + i + '" data-a="' + l.a + '" data-b="' + l.b + '" ' +
             'd="' + pathLayer(l, null, geo) + '"/>');
    });
    s.push('</g>');

    /* 节点：方块里放短名，不放完整标题。
       以前放完整标题再按宽度截断，遇到 9 个点一排的主题，
       「第一次用它：五分钟上手」只剩「第一次用它：五…」——
       图就退化成装饰了。短名最长的也就五个字，一行放得下；
       完整标题走悬停（title）与右侧面板。右下角那个小数字是第几档。 */
    s.push('<g class="at-nodes">');
    geo.ids.forEach(function (id) {
      var nd = geo.nodes[id], p = B.nodeMap[id], short = geo.shortOf[id];
      s.push('<g class="at-nd t-' + p.topic + ' st' + p.stage + '" data-at-node="' + id + '" ' +
             'data-st="' + p.stage + '" data-at-topic="' + p.topic + '" ' +
             'transform="translate(' + nd.x + ',' + nd.y + ')">' +
        '<rect class="at-nd-bg" width="' + nd.w + '" height="' + nd.h + '" rx="7"/>' +
        '<rect class="at-nd-bar" width="3" height="' + nd.h + '" rx="1.5" ' +
          'fill="' + TCOL(p.topic) + '"/>' +
        '<text class="at-nd-t" x="' + (nd.w / 2 + 1.5) + '" y="' + (nd.h / 2 + 4.5) + '">' +
          esc(cut(short, nd.w - 26, LAY.NODE_FS)) + '</text>' +
        '<text class="at-nd-s" x="' + (nd.w - 7) + '" y="' + (nd.h - 7) + '">' +
          p.stage + '</text>' +
        '<title>' + esc(p.title) + ' · ' + esc(W.DATA.stageName(p.stage)) + '</title>' +
        '</g>');
    });
    s.push('</g>');
    s.push('</svg>');
    return s.join('');
  }

  /* ============================================================
     十、渲染 · 邻域
     ============================================================ */
  function pathEgo(l, g, E, B) {
    var C = g.nodes[l.a], N = g.nodes[l.b];
    var cx = C.x + C.w / 2, cy = C.y + C.h / 2;
    var nx = N.x + N.w / 2, ny = N.y + N.h / 2;
    if (l.side === 'left') {
      var x1 = C.x, x2 = N.x + N.w;
      return 'M' + x1 + ',' + cy + 'C' + (x1 - 54) + ',' + cy + ' ' +
             (x2 + 54) + ',' + ny + ' ' + x2 + ',' + ny;
    }
    if (l.side === 'right') {
      var x1 = C.x + C.w, x2 = N.x;
      return 'M' + x1 + ',' + cy + 'C' + (x1 + 54) + ',' + cy + ' ' +
             (x2 - 54) + ',' + ny + ' ' + x2 + ',' + ny;
    }
    var y1 = C.y + C.h, y2 = N.y;
    return 'M' + cx + ',' + y1 + 'C' + cx + ',' + (y1 + 52) + ' ' +
           nx + ',' + (y2 - 52) + ' ' + nx + ',' + y2;
  }

  function cardEgo(nd, B) {
    var p = B.nodeMap[nd.id];
    var isC = !!nd.center;
    var tag = isC ? (B.adj[nd.id].length + ' 条关联')
                  : (nd.side === 'left' ? '要先弄懂' :
                     nd.side === 'right' ? '从这里延伸' : '放在一起看');
    var t1 = esc(cut(p.title, nd.w - (isC ? 44 : 30), isC ? 14 : 12.5));
    var t2 = esc(p.topicName + ' · ' + tag);
    var ox = isC ? nd.w / 2 : 15;
    var anc = isC ? 'middle' : 'start';
    return '<g class="at-ego' + (isC ? ' is-center' : '') + ' t-' + p.topic + '" ' +
             'data-at-node="' + nd.id + '" transform="translate(' + nd.x + ',' + nd.y + ')">' +
      '<rect class="at-ego-bg" width="' + nd.w + '" height="' + nd.h + '" rx="8"/>' +
      (isC ? '' : '<rect class="at-ego-bar" width="3.5" height="' + nd.h + '" rx="1.75" ' +
                  'fill="' + TCOL(p.topic) + '"/>') +
      '<text class="at-ego-t" x="' + ox + '" y="' + (nd.h / 2 - 2) + '" ' +
        'text-anchor="' + anc + '">' + t1 + '</text>' +
      '<text class="at-ego-k" x="' + ox + '" y="' + (nd.h / 2 + 13) + '" ' +
        'text-anchor="' + anc + '">' + t2 + '</text>' +
      '<title>' + esc(p.title) + '</title>' +
    '</g>';
  }

  function svgEgo(g) {
    var B = build();
    var E = EGO;
    var s = [];
    /* 根用 at-egomap，不要用 at-ego —— 卡片才是 at-ego。
       两个同名过一次，结果选择器命中了 SVG 本身，点击换中心静默失效。 */
    s.push('<svg class="at-svg at-egomap" viewBox="0 0 ' + g.w + ' ' + g.h + '" ' +
           'role="img" aria-label="知识邻域图">');

    /* 三个方向的区域说明 */
    s.push('<g class="at-zones">');
    if (g.pre.length) {
      s.push('<text class="at-zone" x="' + (E.CX - E.DX - E.CW / 2) + '" y="' +
             (E.CY - 150) + '">先弄懂这些</text>');
    }
    if (g.ext.length) {
      s.push('<text class="at-zone" x="' + (E.CX + E.DX + E.CW / 2) + '" y="' +
             (E.CY - 150) + '">从它延伸出去</text>');
    }
    if (g.peer.length) {
      s.push('<text class="at-zone" x="' + E.CX + '" y="' + (E.CY + 132) + '">放在一起对照</text>');
    }
    s.push('</g>');

    /* 线：先画，压在卡片下面 */
    s.push('<g class="at-links">');
    g.links.forEach(function (l, i) {
      s.push('<path class="at-lk k-' + l.k + '" data-lk="' + i + '" ' +
             'data-a="' + l.a + '" data-b="' + l.b + '" d="' + pathEgo(l, g, E, B) + '"/>');
    });
    s.push('</g>');

    /* 卡片：中心最后画，压在连线上 */
    s.push('<g class="at-nodes">');
    g.links.forEach(function (l) { s.push(cardEgo(g.nodes[l.b], B)); });
    s.push(cardEgo(g.nodes[g.center], B));
    s.push('</g>');
    s.push('</svg>');
    return s.join('');
  }

  /* ============================================================
     十一、渲染 · 主线
     不用 SVG：一条路是线性的，横排卡片比曲线更好读。
     ============================================================ */
  function htmlRoutes(active) {
    var B = build();
    var s = [];
    s.push('<div class="at-routes">');
    ROUTES.forEach(function (r) {
      var on = active === r.id;
      s.push('<article class="at-route' + (on ? ' on' : '') + '" data-at-route="' + r.id + '">' +
        '<div class="at-rt-hd">' +
          '<h3>' + esc(r.name) + '</h3>' +
          '<span class="tag">' + esc(r.en) + '</span>' +
          '<span class="at-rt-n">' + r.steps.length + ' 步</span>' +
        '</div>' +
        '<p class="at-rt-note">' + esc(r.note) + '</p>' +
        '<div class="at-steps">' +
        r.steps.map(function (st, i) {
          var p = B.nodeMap[st.id];
          if (!p) return '';
          return '<div class="at-step" data-at-node="' + st.id + '">' +
            '<div class="at-step-n">' + (i + 1) + '</div>' +
            '<button class="at-step-b" type="button" data-at-open="' + st.id + '">' +
              '<b>' + esc(p.title) + '</b>' +
              '<i>' + esc(p.topicName) + '</i>' +
            '</button>' +
            '<p class="at-step-w">' + esc(st.why) + '</p>' +
          '</div>';
        }).join('') +
        '</div>' +
      '</article>');
    });
    s.push('</div>');
    return s.join('');
  }

  /* ============================================================
     十二、侧栏：选中一个点时，把它的关系列出来
     ============================================================ */
  function side(id) {
    var B = build();
    if (!id) {
      return '<div class="at-side-empty">' +
        '<b>点一个知识点，看它跟谁有关系</b>' +
        '<p>左边每个方块（或圆点）都是一个知识点。点下去，这里会列出它的前置、延伸和对照，' +
        '以及每条线为什么成立。图上同时会把这些关系点亮，其余淡出。</p>' +
        '<p class="at-side-tip">想直接看这条知识点的全部内容，展开面板顶部那个按钮，' +
        '或者在下一节的「主线」里按顺序走一遍。</p>' +
      '</div>';
    }
    var p = B.nodeMap[id];
    /* 分组口径跟邻域图严格一致：先按方向（谁垫着我 / 我垫着谁 / 一起看），
       组内再按关系类型排，强依赖在前。
       只按类型分过一次，结果标题写着「前置」、里面却混着"这条 → 别处"的条目，
       跟左边那张图对不上 —— 同一件事在两个地方必须长一个样。 */
    var pre = [], ext = [], peer = [];
    B.adj[id].forEach(function (x) {
      if (x.k === 'peer') peer.push(x);
      else if (x.dir === 'in') pre.push(x);     /* 别人指着它 → 它是我的前置 */
      else ext.push(x);
    });
    var ord = { need: 0, link: 1, peer: 2 };
    var byType = function (a, b) { return ord[a.k] - ord[b.k]; };
    pre.sort(byType); ext.sort(byType);
    var total = pre.length + ext.length + peer.length;

    function wrap(arr, title, desc, k) {
      if (!arr.length) return '';
      return '<div class="at-rel-g">' +
        '<div class="at-rel-hd"><span class="at-lk-k k-' + k + '"></span>' +
          '<b>' + title + '</b><i>' + arr.length + ' 条</i>' +
          '<em>' + desc + '</em></div>' +
        arr.map(function (x) {
          var q = B.nodeMap[x.id];
          return '<button class="at-rel" type="button" data-at-jump="' + x.id + '">' +
            '<span class="at-rel-t">' + esc(q.title) + '</span>' +
            /* 只放主题名 + 一条色线表示关系强弱。
               写「主题 · 前置」会把类型名和组名（从这里延伸）读打架 ——
               "前置"说的是关系类型，方向决定谁是谁的前置，两回事。 */
            '<span class="at-rel-k"><i class="at-lk-k k-' + x.k + '"></i>' +
              esc(q.topicName) + '</span>' +
            '<span class="at-rel-w">' + esc(x.why) + '</span>' +
          '</button>';
        }).join('') +
      '</div>';
    }

    return '<div class="at-side-hd">' +
        '<div class="at-side-tt">' +
          '<span class="tag">' + esc(p.topicName) + '</span>' +
          '<h3>' + esc(p.title) + '</h3>' +
        '</div>' +
        '<button class="btn at-side-open" type="button" data-at-open="' + id + '">' +
          '打开这条知识点 →</button>' +
      '</div>' +
      '<p class="at-side-brief">' + esc(p.brief) + '</p>' +
      '<div class="at-rel-wrap">' +
        wrap(pre, '先弄懂这些', '不先看懂它们，这条里的机制会糊', 'need') +
        wrap(ext, '从这里延伸', '这条弄明白了，自然往下走', 'link') +
        wrap(peer, '放在一起看', '一体两面、容易混、常被摆在一起', 'peer') +
        (total ? '' : '<div class="at-side-empty"><p>这条目前没有登记关联。</p></div>') +
      '</div>';
  }

  /* 节点里的标题按实际字宽截断：中文一个字约等于字号，ASCII 只有 0.58 倍。
     早先按「每字 13px」一刀切，对英文严重高估 —— Transformer 只显示出 "Transf…"。
     少数仍放不下的长标题，靠 <title> 悬停和下方面板补全。 */
  function cut(s, maxPx, fs) {
    fs = fs || 12.5;
    var w = 0, i = 0;
    for (; i < s.length; i++) {
      w += (s.charCodeAt(i) < 128) ? fs * 0.58 : fs;
      if (w > maxPx) break;
    }
    return i < s.length ? s.slice(0, Math.max(1, i - 1)) + '…' : s;
  }

  /* ============================================================
     十三、视图外壳
     ============================================================ */
  function viewHtml() {
    var B = build();
    return '' +
    '<section class="blk">' +
      '<div class="sec-head"><h2>知识图谱</h2>' +
        '<span class="tag">' + B.order.length + ' 个知识点 · ' + B.links.length +
        ' 条关联 · ' + ROUTES.length + ' 条主线</span></div>' +
      '<p class="lead">知识库是按主题排的，能查不能看。这一页把它们之间的关系摊开：' +
        '谁垫在谁下面、谁和谁是一体两面、一条路从哪儿开始到哪儿结束。' +
        '三个入口，同一批知识。</p>' +

      '<div class="flt at-modes" data-at-modes>' +
        '<span class="flt-lb">看法</span>' +
        '<button class="chip on" type="button" data-at-mode="layer">分层框架</button>' +
        '<button class="chip" type="button" data-at-mode="net">关联网络</button>' +
        '<button class="chip" type="button" data-at-mode="route">学习主线</button>' +
        '<button class="at-focus" type="button" data-at-focus>只看本档</button>' +
        '<span class="flt-fill"></span>' +
        '<span class="at-legend">' +
          '<span class="at-lg"><i class="at-lk-k k-need"></i>前置</span>' +
          '<span class="at-lg"><i class="at-lk-k k-link"></i>延伸</span>' +
          '<span class="at-lg"><i class="at-lk-k k-peer"></i>对照</span>' +
        '</span>' +
      '</div>' +

      '<p class="at-hint" data-at-hint>由上往下是 ' + W.DATA.topics.length + ' 条带，' +
        '最上面两条是给刚入门的人看的，越往下越靠里。同一条带里从左到右是浅到深；' +
        '带与带之间的线，就是「这一层踩在上一层哪儿」。</p>' +

      '<div class="at-stage" data-at-stage>' + svgLayered() + '</div>' +
      '<div class="at-side" data-at-side>' + side(null) + '</div>' +
    '</section>';
  }

  /* ============================================================
     十四、交互
     三种模式的"选中"含义不一样：
       分层 —— 选中一个点，点亮它的线、其余淡出（图不变）
       邻域 —— 选中一个点就是换中心，整张图重画
       主线 —— 主线本身展开/收起，步骤的点选只是标记
     ============================================================ */
  function bind(sec) {
    var stage = sec.querySelector('[data-at-stage]');
    var sideEl = sec.querySelector('[data-at-side]');
    var hint = sec.querySelector('[data-at-hint]');
    var modes = sec.querySelector('[data-at-modes]');
    if (!stage || !sideEl || !modes) return;

    var state = { mode: 'layer', sel: null, route: ROUTES[0].id };

    var HINTS = {
      layer: '由上往下是 ' + W.DATA.topics.length + ' 条带，最上面两条是给刚入门的人看的，越往下越靠里。' +
             '同一条带里从左到右是浅到深；带与带之间的线，就是「这一层踩在上一层哪儿」。' +
             '方块右下角的小数字是它属于第几档。点任意一个方块，看它跟谁有关系。',
      net: '挑一个知识点当中心：左边是要先弄懂的，右边是从它延伸出去的，下面是可以放在一起看的。点任何一个方块就换成以它为中心。',
      route: '四条走得通的路。每一步都写了「走到这儿该拿到什么」，点开就是那条知识点的全部内容。'
    };

    function draw() {
      if (state.mode === 'layer') {
        stage.innerHTML = svgLayered();
      } else if (state.mode === 'net') {
        var g = ego(state.sel);
        state.sel = g.center;              /* 首次进来会自己挑一个最"中间"的点 */
        stage.innerHTML = svgEgo(g);
      } else {
        stage.innerHTML = htmlRoutes(state.route);
      }
      if (hint) hint.textContent = HINTS[state.mode];
      apply();
      /* 重画之后新节点还没有本档标记，也没挂「只看本档」的状态 */
      if (W.AIWB.Stage && W.AIWB.Stage.refresh) W.AIWB.Stage.refresh();
      if (state.syncFb) state.syncFb();
    }

    function apply() {
      var svg = stage.querySelector('.at-svg');
      if (svg) {
        /* 邻域图整张就是围绕中心画的，不需要再淡出谁 */
        var focused = !!state.sel && state.mode === 'layer';
        svg.classList.toggle('focus', focused);
        var keep = {};
        if (focused) keep[state.sel] = 1;
        var lks = stage.querySelectorAll('.at-lk');
        for (var i = 0; i < lks.length; i++) {
          var lk = lks[i];
          var on = focused && (lk.getAttribute('data-a') === state.sel ||
                               lk.getAttribute('data-b') === state.sel);
          lk.classList.toggle('on', on);
          if (on) { keep[lk.getAttribute('data-a')] = 1; keep[lk.getAttribute('data-b')] = 1; }
        }
        var nds = stage.querySelectorAll('[data-at-node]');
        for (var j = 0; j < nds.length; j++) {
          var id = nds[j].getAttribute('data-at-node');
          nds[j].classList.toggle('sel', id === state.sel);
          nds[j].classList.toggle('rel', focused && !!keep[id]);
        }
      }
      var steps = stage.querySelectorAll('.at-step');
      for (var k = 0; k < steps.length; k++) {
        steps[k].classList.toggle('sel', steps[k].getAttribute('data-at-node') === state.sel);
      }
      sideEl.innerHTML = side(state.sel);
    }

    function pick(id) {
      if (state.mode === 'net') {
        if (state.sel === id) return;       /* 已经是中心了，不用重画 */
        state.sel = id;
        stage.innerHTML = svgEgo(ego(id));
      } else {
        state.sel = (state.sel === id) ? null : id;
      }
      apply();
    }

    stage.addEventListener('click', function (e) {
      var open = e.target.closest('[data-at-open]');
      if (open) { W.AIWB.Drawer.open(open.getAttribute('data-at-open')); return; }
      var nd = e.target.closest('[data-at-node]');
      if (nd) { pick(nd.getAttribute('data-at-node')); return; }
      var rt = e.target.closest('[data-at-route]');
      if (rt) {
        var rid = rt.getAttribute('data-at-route');
        state.route = (state.route === rid) ? null : rid;
        state.sel = null;
        draw();
      }
    });

    stage.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var nd = e.target.closest && e.target.closest('[data-at-node]');
      if (nd) { e.preventDefault(); pick(nd.getAttribute('data-at-node')); }
    });

    sideEl.addEventListener('click', function (e) {
      var o = e.target.closest('[data-at-open]');
      if (o) { W.AIWB.Drawer.open(o.getAttribute('data-at-open')); return; }
      var j = e.target.closest('[data-at-jump]');
      if (j) {
        var to = j.getAttribute('data-at-jump');
        if (state.mode === 'net') {
          state.sel = to;
          stage.innerHTML = svgEgo(ego(to));
          apply();
        } else {
          state.sel = to; apply();
        }
      }
    });

    modes.addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (!b) return;
      state.mode = b.getAttribute('data-at-mode');
      state.sel = null;
      var all = modes.querySelectorAll('.chip');
      for (var i = 0; i < all.length; i++) all[i].classList.toggle('on', all[i] === b);
      draw();
    });

    /* 「只看本档」：图谱默认不压暗越档节点。
       以前默认压到 .18，入门档下有 51/58 个节点是一片灰，
       而最需要这张图的恰恰是刚入门的人 —— 默认可读，
       真要聚焦时自己按这个开关。只在分层框架里有效。 */
    var fb = modes.querySelector('[data-at-focus]');
    if (fb) {
      var syncFb = function () {
        var on = !!(W.AIWB.Stage && W.AIWB.Stage.focusOn && W.AIWB.Stage.focusOn());
        fb.classList.toggle('on', on);
        fb.hidden = (state.mode !== 'layer');
        fb.setAttribute('aria-pressed', on ? 'true' : 'false');
      };
      fb.addEventListener('click', function () {
        W.AIWB.Stage.toggleFocus();
        syncFb();
      });
      syncFb();
      state.syncFb = syncFb;
    }

    draw();
  }

  /* ============================================================
     十五、自检用
     ============================================================ */
  function audit() {
    var bad = [];
    var D = W.DATA;
    var ids = D.allIds;
    var known = {};
    ids.forEach(function (id) { known[id] = 0; });

    /* 每个知识点都要有短名 —— 漏了网络图会显示成截断的标题 */
    var missShort = ids.filter(function (id) { return !SHORT[id]; });
    if (missShort.length) bad.push('缺短名：' + missShort.join('、'));

    /* 边必须指向真实存在的知识点 */
    EDGES.forEach(function (e) {
      if (!(e[0] in known)) bad.push('边指向不存在的 id：' + e[0]);
      if (!(e[1] in known)) bad.push('边指向不存在的 id：' + e[1]);
      if (!KIND[e[2]]) bad.push('未知的关系类型：' + e[2]);
      if (!e[3] || String(e[3]).length < 6) bad.push('关系说明太短：' + e[0] + '→' + e[1]);
    });

    /* 自环与重复 */
    var seen = {};
    EDGES.forEach(function (e) {
      if (e[0] === e[1]) bad.push('自己连自己：' + e[0]);
      var key = e[0] + '|' + e[1];
      if (seen[key]) bad.push('重复的边：' + key);
      seen[key] = 1;
    });

    /* 不许有孤立点 */
    EDGES.forEach(function (e) { if (e[0] in known) known[e[0]]++; if (e[1] in known) known[e[1]]++; });
    var lonely = ids.filter(function (id) { return !known[id]; });
    if (lonely.length) bad.push('孤立的知识点（没有任何关联）：' + lonely.join('、'));

    /* 主线里的每一步都得是真知识点，且不重复 */
    ROUTES.forEach(function (r) {
      var s = {}, n = 0;
      r.steps.forEach(function (st) {
        if (!(st.id in known)) bad.push('主线「' + r.name + '」指向不存在的 id：' + st.id);
        if (s[st.id]) bad.push('主线「' + r.name + '」里 ' + st.id + ' 出现两次');
        s[st.id] = 1;
        if (!st.why || String(st.why).length < 6) bad.push('主线「' + r.name + '」有步骤没写理由');
        n++;
      });
      if (n < 5) bad.push('主线「' + r.name + '」只有 ' + n + ' 步，太短');
      if (!r.note || r.note.length < 12) bad.push('主线「' + r.name + '」缺一句说明');
    });

    /* 每个知识点至少被一条主线覆盖（不强制，但值得知道） */
    var inRoute = {};
    ROUTES.forEach(function (r) { r.steps.forEach(function (st) { inRoute[st.id] = 1; }); });
    var off = ids.filter(function (id) { return !inRoute[id] && D.pointMap[id]; });
    /* 这里只作提示，不进 bad —— 有些知识点本来就不在主线上 */

    return { bad: bad, stats: { nodes: ids.length, edges: EDGES.length,
             routes: ROUTES.length, offRoute: off.length } };
  }

  return {
    SHORT: SHORT, EDGES: EDGES, ROUTES: ROUTES, KIND: KIND,
    viewHtml: viewHtml, bind: bind, audit: audit,
    layered: layered, ego: ego,
    stats: function () {
      var B = build();
      return { nodes: B.order.length, edges: B.links.length, routes: ROUTES.length,
               routesSteps: ROUTES.reduce(function (a, r) { return a + r.steps.length; }, 0) };
    }
  };
})();
