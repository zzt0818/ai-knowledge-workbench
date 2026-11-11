/* ============================================================
   知识卡内容 · 基础部分（原「基础能力」七条）
   覆盖：模型核心概念 / 幻觉 / 提示设计 / Python 工程 / 异步 / 接口 / 部署
   每个知识点 6 段：概念 / 比喻 / 案例 / 实操 / 问答 / 自测
   ============================================================ */
(function () {
  const C = window.DATA.content;

  C['python-eng'] = {
    concept: [
      'Agent 项目的本质是「一个 Python 服务 + 若干次 LLM 调用」。企业看 Python，看的不是你会不会写循环，而是你能不能把一个项目组织到别人敢接手：依赖可复现、接口自解释、配置与代码分离、出错能定位。',
      '要求是「基础语法与工程能力要扎实」——重音在后半句。基础语法一周能补，工程能力是靠习惯养出来的，也是行家一眼能看出来的分水岭。'
    ],
    analogy: [
      '像图纸的<b>制图规范</b>。谁都会画线，但只有按规范画的图，别人才敢照着施工，出了问题也能追到哪一笔画错了。',
      '会写 Python 是「会画线」，工程化是「能交图」。别人翻你 GitHub 的速度，就跟师傅翻你的图册一样快。'
    ],
    cases: [
      '<b>依赖没锁版本</b>：开发时 langchain 0.2.x，三个月后同事 pip install 装出 0.3.x，API 全变了，线上报错本地复现不了。requirements.txt 只写 <code>langchain</code> 就等于没写。',
      '<b>配置硬编码</b>：API Key 直接写死在 <code>main.py</code>，换环境得改代码，密钥还进了 Git 历史。正确做法是 <code>.env</code> + <code>pydantic-settings</code>，并把 <code>.env</code> 写进 <code>.gitignore</code>。',
      '<b>没有类型注解</b>：一个接收 6 个参数的函数，看签名不知道传什么，三个月后连自己都要读实现。'
    ],
    practice: {
      steps: [
        '<b>建项目骨架</b>：<code>app/</code>(业务) / <code>core/</code>(配置·日志) / <code>tests/</code>，顶层放 <code>pyproject.toml</code>。',
        '<b>锁依赖</b>：用 <code>uv</code> 或 <code>poetry</code>，生成带精确版本与哈希的 lock 文件，而不是手写 requirements.txt。',
        '<b>配置外置</b>：所有可变项（Key、模型名、超时）走环境变量，代码里只留默认值。',
        '<b>结构化日志</b>：用 <code>structlog</code> 或标准 logging 输出 JSON，每条日志带 <code>trace_id</code>，LLM 调用日志额外带 token 数与耗时。'
      ],
      lang: 'python',
      code: [
        '# core/config.py —— 配置外置 + 启动即校验',
        'from pydantic_settings import BaseSettings',
        'from pydantic import SecretStr',
        '',
        'class Settings(BaseSettings):',
        '    deepseek_api_key: SecretStr      # 缺失时启动直接报错，而不是运行时才炸',
        '    model: str = "deepseek-chat"',
        '    request_timeout: int = 60',
        '    log_level: str = "INFO"',
        '',
        '    model_config = {"env_file": ".env"}',
        '',
        'settings = Settings()',
        '',
        '# ---------- app/services/llm.py ----------',
        'import logging, time',
        'from typing import Protocol',
        '',
        'log = logging.getLogger(__name__)',
        '',
        'class ChatModel(Protocol):          # 用 Protocol 声明接口，换供应商不用改调用方',
        '    async def chat(self, prompt: str) -> str: ...',
        '',
        'async def ask(model: ChatModel, prompt: str) -> str:',
        '    t0 = time.perf_counter()',
        '    try:',
        '        out = await model.chat(prompt)',
        '        log.info("llm.ok", extra={"ms": int((time.perf_counter()-t0)*1000)})',
        '        return out',
        '    except Exception:',
        '        log.exception("llm.fail", extra={"ms": int((time.perf_counter()-t0)*1000)})',
        '        raise'
      ].join('\n'),
      expect: '启动时若缺 DEEPSEEK_API_KEY，进程直接退出并报清楚缺哪个变量；调用 LLM 后日志里能看到一次 llm.ok 及其耗时毫秒数。',
      pitfalls: [
        '把 <code>requirements.txt</code> 当成锁文件——它只声明"至少这些"，不保证可复现。',
        '用 <code>print</code> 当日志。生产环境要的是可检索的结构化字段，不是一屏散文。',
        '所有代码堆在一个 <code>main.py</code> 里。文件超过 300 行就该按职责拆了。'
      ]
    },
    interview: [
      { q: '你的 Agent 项目怎么组织代码？', a: '按「配置 / 能力 / 编排 / 接口」四层拆：<code>core</code> 放配置与日志，<code>services</code> 放 LLM 与工具封装，<code>graph</code> 放编排逻辑，<code>api</code> 只做协议转换。<strong>这样拆的目的是让改动面是局部的：新增一个工具或换一个模型，都不用动别的地方。</strong>' },
      { q: '遇到过依赖冲突吗？怎么解决？', a: '答具体案例：某次 langchain 升级导致 <code>AgentExecutor</code> 回调签名变化。做法是锁死版本 + 用 lock 文件 + 升级前跑一遍回归测试。<strong>重点不在冲突本身，而在你有没有「可回退」的机制。</strong>' }
    ],
    quiz: [
      { q: '为什么说 requirements.txt 不等于依赖锁定？', a: '它只约束包名和最低版本，不记录传递依赖，也不保证哈希一致。换台机器、换个时间安装可能装出不同版本树。真锁要用 lock 文件（uv.lock / poetry.lock）。' },
      { q: '配置为什么不能写在代码里？说出至少两个理由。', a: '① 不同环境（本地/测试/生产）值不同，写死就得改代码，容易出错；② 密钥进代码就会进 Git 历史，一旦泄露无法撤回，只能全部轮换。' },
      { q: '给 LLM 调用日志加哪几个字段最有价值？', a: 'trace_id（串起整条链路）、模型名、输入输出 token 数、耗时毫秒、是否重试。有了这几个就能算成本、定位慢在哪一步。' }
    ]
  };

  C['async-io'] = {
    concept: [
      'Agent 的一次任务往往要串起十几次甚至几十次 LLM 调用和工具执行。如果用同步写法，每个请求都独占一个线程，几十个并发就把服务拖死。异步的本质是：<strong>在等网络 IO 的时候把 CPU 让出来</strong>。',
      '要分清两件事：<code>asyncio</code> 解决的是「等」的效率（IO 密集），多进程解决的是「算」的效率（CPU 密集）。LLM 调用是典型的 IO 密集，所以异步是第一选择。'
    ],
    analogy: [
      '像<b>餐厅里一个服务员看十张桌子</b>。同步是「给 A 桌点完菜就站在旁边等厨房出菜」，异步是「A 桌的单子递进厨房，转身去 B 桌点单，谁的菜好了谁端过去」。',
      '服务员还是那一个人，但翻台率差十倍。这就是 Agent 项目里绕不开异步的原因。'
    ],
    cases: [
      '<b>串行 vs 并发检索</b>：RAG 里要查 3 个数据源，串行 3×800ms = 2400ms；<code>asyncio.gather</code> 并发后 ≈ 800ms。用户体感完全不同。',
      '<b>同步阻塞拖垮服务</b>：在 FastAPI 的 async 路由里调了同步的 <code>requests.post</code>，事件循环被整个卡住，所有请求排队。必须换 <code>httpx.AsyncClient</code>。',
      '<b>没有限流被上游封禁</b>：并发 200 个请求直接打到模型 API，触发 429。要用 <code>Semaphore</code> 把并发压在阈值内。'
    ],
    practice: {
      steps: [
        '<b>并发发起多个请求</b>：用 <code>asyncio.gather</code> 一次发起，而不是 for 循环里 await。',
        '<b>加并发闸门</b>：<code>asyncio.Semaphore(8)</code> 限制同时进行的外部调用数。',
        '<b>加超时</b>：每个请求用 <code>asyncio.wait_for</code> 包一层，避免单个慢请求拖住整批。',
        '<b>加异常隔离</b>：<code>return_exceptions=True</code>，让一个源失败不影响其他源。'
      ],
      lang: 'python',
      code: [
        'import asyncio, httpx',
        '',
        'SEM = asyncio.Semaphore(8)          # 全局并发闸门，保护上游',
        '',
        'async def fetch(client, url, timeout=8.0):',
        '    async with SEM:',
        '        try:',
        '            r = await asyncio.wait_for(client.get(url), timeout=timeout)',
        '            return {"ok": True, "url": url, "data": r.json()}',
        '        except asyncio.TimeoutError:',
        '            return {"ok": False, "url": url, "err": "timeout"}',
        '',
        'async def multi_search(urls):',
        '    async with httpx.AsyncClient() as client:',
        '        # 关键：并发发起 + 异常不互相拖累',
        '        return await asyncio.gather(',
        '            *(fetch(client, u) for u in urls),',
        '            return_exceptions=True,',
        '        )',
        '',
        'async def main():',
        '    t0 = asyncio.get_event_loop().time()',
        '    res = await multi_search([f"https://api.example.com/s{i}" for i in range(12)])',
        '    ok = sum(1 for r in res if isinstance(r, dict) and r["ok"])',
        '    print(f"{ok}/12 成功, 耗时 {asyncio.get_event_loop().time()-t0:.2f}s")',
        '',
        'asyncio.run(main())'
      ].join('\n'),
      expect: '12 个请求总耗时接近单个请求耗时（而非 12 倍）；失败的请求以 dict 形式返回而不是抛异常中断整批。',
      pitfalls: [
        '在 async 函数里调用同步阻塞库（<code>requests</code>、<code>time.sleep</code>、<code>open()</code> 读大文件）。要换异步版本或丢进 <code>run_in_executor</code>。',
        '写了 <code>async def</code> 但函数体内没有 <code>await</code>，等于白写。',
        '无限并发。<code>gather</code> 一千个请求不叫优化，叫压测上游。'
      ]
    },
    interview: [
      { q: 'asyncio 和线程池有什么区别？', a: 'asyncio 是单线程事件循环，靠协作式切换（函数主动 await 让出），切换开销极小，适合海量 IO 等待；线程是抢占式、真有并行，但受 GIL 限制，且切换与内存成本高。<strong>结论：IO 密集用 asyncio，CPU 密集用多进程。</strong>' },
      { q: '你的 Agent 服务怎么处理并发？', a: '讲三层：接口层用 async 路由；调用层用 <code>Semaphore</code> 限流 + <code>wait_for</code> 超时；上游不稳时加指数退避重试。<strong>再补一句量化：优化后单实例并发从 N 提升到 M，P99 从 X 降到 Y。</strong>' }
    ],
    quiz: [
      { q: '为什么在 async 路由里用 requests 会导致服务卡死？', a: '<code>requests</code> 是同步阻塞调用，会占住事件循环线程，期间其他所有协程都无法推进。必须用 <code>httpx.AsyncClient</code> 或 <code>aiohttp</code>。' },
      { q: '一个 async 函数体内没有任何 await，会有什么问题？', a: '它会被当作普通同步函数执行，完全阻塞事件循环，等于放弃了异步的好处。要么加 await，要么用 <code>run_in_executor</code> 隔离。' },
      { q: 'asyncio.gather 里某个任务抛异常会怎样？', a: '默认会立刻向调用方抛出，其他已发起的任务继续跑但结果被丢弃。需要加 <code>return_exceptions=True</code> 才能拿到全部结果并逐条判断成败。' }
    ]
  };

  C['api-service'] = {
    concept: [
      'FastAPI 是把你的 Agent 能力暴露给外界的那层壳。做 Agent 项目基本都会碰到这一层接口框架。它做三件事：定义接口契约、校验入参、把结果（尤其是流式结果）稳定地发出去。',
      '对 Agent 而言最关键的是<strong>流式返回</strong>。大模型吐字要几秒钟，如果等服务端全部生成完再一次性返回，用户面对的是长时间白屏。SSE（Server-Sent Events）让每个 token 一产生就推给前端。'
    ],
    analogy: [
      '像<b>餐厅传菜窗口</b>。不用等一整桌菜全做好才一起端出去，做好一道递一道——客人看得到进度，也不会饿着等。',
      'SSE 就是这个传菜口。而且它是单向的「厨房→客人」，够用且简单，不必上 WebSocket 这种双向对讲机。'
    ],
    cases: [
      '<b>流式与非流式的体感差</b>：同一个 800 token 的回答，非流式是「转圈 6 秒 → 整段出现」，流式是「0.8 秒后开始逐字蹦」。首字延迟（TTFT）比总耗时更影响感知。',
      '<b>无入参校验被打崩</b>：前端传来 <code>{"message": null}</code>，代码里直接 <code>.strip()</code> 崩掉。用 Pydantic 声明 <code>message: str = Field(min_length=1, max_length=4000)</code>，非法请求在进业务前就被挡掉。',
      '<b>流中断没兜底</b>：模型生成到一半网络断了，前端一直转圈。要在生成器里 try/except，并主动发一个 <code>event: error</code> 让前端收尾。'
    ],
    practice: {
      steps: [
        '<b>定义请求模型</b>：用 Pydantic 约束字段类型与长度，非法请求自动 422。',
        '<b>写异步生成器</b>：<code>async def gen()</code>，内部 <code>yield</code> 每一片增量内容。',
        '<b>包成 SSE</b>：用 <code>StreamingResponse</code> + <code>media_type="text/event-stream"</code>。',
        '<b>加防缓冲头</b>：<code>X-Accel-Buffering: no</code>，否则 Nginx 会把流攒起来再发。',
        '<b>加心跳与错误事件</b>：空闲时发注释行保活，异常时发 error 事件。'
      ],
      lang: 'python',
      code: [
        'from fastapi import FastAPI',
        'from fastapi.responses import StreamingResponse',
        'from pydantic import BaseModel, Field',
        '',
        'app = FastAPI()',
        '',
        'class AskIn(BaseModel):',
        '    message: str = Field(min_length=1, max_length=4000)',
        '    session_id: str | None = None',
        '',
        'async def sse(payload: dict) -> str:',
        '    """按 SSE 规范拼帧：event / data / 双换行结束"""',
        '    return f"data: {json.dumps(payload, ensure_ascii=False)}\\n\\n"',
        '',
        '@app.post("/ask/stream")',
        'async def ask_stream(body: AskIn):',
        '    async def gen():',
        '        try:',
        '            async for piece in llm_stream(body.message):   # 你的模型流',
        '                yield await sse({"type": "delta", "text": piece})',
        '            yield await sse({"type": "done"})',
        '        except Exception as e:',
        '            # 流中途出错必须显式告知前端，否则对面永远转圈',
        '            yield await sse({"type": "error", "msg": str(e)[:200]})',
        '',
        '    return StreamingResponse(',
        '        gen(),',
        '        media_type="text/event-stream",',
        '        headers={',
        '            "Cache-Control": "no-cache",',
        '            "X-Accel-Buffering": "no",   # 关掉 Nginx 缓冲，否则流会被攒住',
        '        },',
        '    )'
      ].join('\n'),
      expect: '用 curl 调用时能看到 data: 帧陆续打印出来，而不是等待数秒后一次性出现；传入空字符串时收到 422 而不是 500。',
      pitfalls: [
        '用普通 <code>return</code> 而不是 <code>yield</code>，结果就是「生成完才返回」，白做流式。',
        '忘了 <code>X-Accel-Buffering: no</code>，本地测正常、上线后有 Nginx 就变成非流式。',
        'SSE 帧格式写错。必须是 <code>data: xxx</code> 加两个换行，少一个换行前端解析不出来。'
      ]
    },
    interview: [
      { q: '流式输出为什么用 SSE 而不是 WebSocket？', a: '需求是单向的「服务端持续推、客户端只接收」，SSE 基于普通 HTTP、自动重连、实现成本极低。WebSocket 是双向长连接，适合需要客户端频繁上行的场景（如实时协作）。<strong>选型原则：能力够用就别加复杂度。</strong>' },
      { q: '前端怎么消费你的流？', a: '<code>fetch</code> 拿到 <code>response.body.getReader()</code>，按 <code>\\n\\n</code> 切帧解析，遇到 <code>done</code> 收尾、遇到 <code>error</code> 提示。<strong>补充：用 EventSource 也可以，但它不支持 POST，所以带请求体的场景一般手写解析。</strong>' }
    ],
    quiz: [
      { q: '为什么本地测试流式正常，部署到 Nginx 后面就变成一次性返回？', a: 'Nginx 默认会缓冲响应体，把流攒够一块才发。加 <code>X-Accel-Buffering: no</code> 响应头，或在 Nginx 配置里对该路由关闭 <code>proxy_buffering</code>。' },
      { q: 'SSE 的一帧标准格式是什么？', a: '<code>data: &lt;内容&gt;\\n\\n</code>（两个换行表示帧结束）。也可以带 <code>event:</code> 指定事件名、<code>id:</code> 指定序号用于断线续传。' },
      { q: '为什么要在流末尾显式发一个 done 事件？', a: '客户端无法从「连接关闭」区分「正常完成」和「中途断开」，显式 done 才能让前端确定地把 loading 状态收掉。' }
    ]
  };

  C['deployment'] = {
    concept: [
      '项目最后一定会碰到部署，否则很难真正跑起来。部署是把「我电脑上能跑」变成「别人也能访问」。对 Agent 项目来说，部署要多解决三件事：密钥安全、并发承载、以及模型不可用时的降级。',
      '最朴素的部署路径是：本地 → Docker 容器 → 一台服务器或云容器服务。不必一上来就上 K8s，但至少要能一条命令把所有依赖起起来。'
    ],
    analogy: [
      '像<b>把图纸变成量产件</b>。原型阶段可以手工焊一块板子，量产必须把工艺、供电、散热都固定下来，还要考虑某颗元件断供时的替代方案。',
      '<code>docker-compose up</code> 就是你的「工艺文件」：一条命令确定地复现整套环境。'
    ],
    cases: [
      '<b>密钥进了镜像</b>：Dockerfile 里写 <code>ENV OPENAI_KEY=sk-xxx</code>，镜像一推仓库，密钥就等于公开了。正确做法是运行时注入环境变量。',
      '<b>换机器跑不起来</b>：依赖系统里的 Python 版本和 C 库，换台机器全崩。容器把运行环境打包，才是真正可搬运。',
      '<b>单点模型挂了整个服务不可用</b>：主模型 API 超时，请求全部失败。要有多模型降级链：主模型 → 备用模型 → 本地 Ollama → 规则兜底。'
    ],
    practice: {
      steps: [
        '<b>写 Dockerfile</b>：多阶段构建，基础镜像选 <code>python:3.12-slim</code>，先 COPY 依赖文件再装包以利用层缓存。',
        '<b>写 compose</b>：把 API、Redis、向量库一起编排，用环境变量注入密钥。',
        '<b>加健康检查</b>：暴露 <code>/healthz</code>，容器和负载均衡都靠它判断存活。',
        '<b>配置降级链</b>：主模型失败自动切备用，全部失败时返回明确错误而不是挂起。',
        '<b>加资源限制</b>：给容器设 CPU/内存上限，避免一个进程吃满整台机器。'
      ],
      lang: 'dockerfile',
      code: [
        '# ---------- Dockerfile ----------',
        'FROM python:3.12-slim AS base',
        'WORKDIR /app',
        '',
        '# 先只拷依赖清单，装完包再拷代码 —— 改代码不会让依赖层缓存失效',
        'COPY pyproject.toml uv.lock ./',
        'RUN pip install uv && uv sync --frozen --no-dev',
        '',
        'COPY app ./app',
        'ENV PYTHONUNBUFFERED=1',
        'EXPOSE 8000',
        'HEALTHCHECK --interval=30s --timeout=3s \\',
        '  CMD python -c "import urllib.request;urllib.request.urlopen(\'http://localhost:8000/healthz\')"',
        'CMD ["uv","run","uvicorn","app.main:app","--host","0.0.0.0","--port","8000"]',
        '',
        '# ---------- docker-compose.yml ----------',
        'services:',
        '  api:',
        '    build: .',
        '    ports: ["8000:8000"]',
        '    environment:',
        '      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}   # 运行时注入，绝不写进镜像',
        '      - REDIS_URL=redis://redis:6379/0',
        '    depends_on: [redis]',
        '    deploy:',
        '      resources:',
        '        limits: { cpus: "2", memory: 2G }',
        '  redis:',
        '    image: redis:7-alpine',
        '    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru'
      ].join('\n'),
      expect: '新机器上 <code>docker compose up</code> 一条命令起完整服务；<code>/healthz</code> 返回 200；把密钥从 .env 删掉后容器启动报错而不是静默运行。',
      pitfalls: [
        '密钥写进 Dockerfile 的 ENV 或 COPY 进镜像。必须运行时注入。',
        '用 <code>latest</code> 标签。要固定版本号，否则重建时的基础环境和昨天不一样。',
        '不设资源上限。容器内存泄漏会把宿主机拖死，连 SSH 都进不去。'
      ]
    },
    interview: [
      { q: '你的项目怎么部署的？', a: '讲清链路：Docker 多阶段构建 → compose 编排 API + Redis + 向量库 → 环境变量注入密钥 → <code>/healthz</code> 做存活探针。<strong>再补一句取舍：单机 compose 是为了控制成本，量上来再换托管容器服务。</strong>' },
      { q: '模型服务挂了你的系统会怎样？', a: '有多级降级：主模型超时切备用模型，再失败走本地 Ollama，最后兜底返回规则化提示。同时把降级事件打点上报，便于告警。<strong>关键是承认「模型一定会挂」，而不是假设它永远可用。</strong>' }
    ],
    quiz: [
      { q: '为什么 Dockerfile 要先 COPY 依赖清单再 COPY 代码？', a: 'Docker 逐层缓存。依赖安装耗时最长，先拷清单能让这一层在代码变动时命中缓存，只有改依赖时才重装，构建时间从几分钟降到几秒。' },
      { q: '健康检查接口该检查什么？', a: '至少确认进程存活和关键外部依赖可达（数据库/Redis）。但不应把重型推理也放进去，否则探针超时会导致容器被反复重启。' },
      { q: '什么是多模型降级链？', a: '为同一个能力准备多个可替换的模型提供方，按优先级依次尝试，前一个失败自动切下一个，全部失败才返回错误。目的是把上游故障从「服务不可用」降级为「质量下降」。' }
    ]
  };

  C['llm-core'] = {
    concept: [
      '大模型原理知道核心概念就够了——Token、Embedding、上下文窗口、模型幻觉这几样理解清楚，后面大部分问题都绕不开它们。',
      '<strong>Token</strong> 是模型处理文本的最小单位，不等于字也不等于词，计费和上下文上限都按它算。<strong>Embedding</strong> 是把文本映射成一串数字向量，语义相近的文本向量距离也近——这是 RAG 检索的地基。<strong>上下文窗口</strong> 是模型一次能「看到」的 token 总量上限，超出就必须截断或压缩。'
    ],
    analogy: [
      '<b>Token</b> 像快递计费单位：不是按「几件货」算，而是按「几格货架」算，同样一件货可能占一格也可能占两格。',
      '<b>Embedding</b> 像一个巨大的语义坐标图。把每句话都钉在图上的某个位置，意思相近的句子自然钉得近——找相关资料就是在目标点附近捞邻居。',
      '<b>上下文窗口</b> 像一张工作台。台面就那么大，资料铺满了就放不下新东西；想继续干活，要么清台面，要么把资料压缩着放。'
    ],
    cases: [
      '<b>中文 Token 估算偏差</b>：英文大约 1 token ≈ 4 字符，中文大约 1 个汉字 ≈ 0.6~1 token（视分词器而定）。按字符数估成本会严重失准，必须用对应模型的分词器实测。',
      '<b>Embedding 选错模型</b>：用英文语料训练的 embedding 做中文检索，召回质量断崖式下跌。中文场景要选中文优化过的模型。',
      '<b>上下文塞满导致答非所问</b>：把 50 页文档原文全塞进 prompt，中间部分被「注意力稀释」，模型只答得出开头和结尾。这也叫 lost-in-the-middle。'
    ],
    practice: {
      steps: [
        '<b>实测 token 数</b>：用 <code>tiktoken</code> 或模型自带分词器，对自己的中文语料统计真实 token 数。',
        '<b>算成本</b>：按输入输出分开计价，乘以预估调用量，得出单次会话成本。',
        '<b>验 embedding</b>：取几句语义相近和无关的中文，算余弦相似度，看排序是否符合直觉。',
        '<b>测上下文边界</b>：构造「关键信息放在长文档中间」的测试，观察模型能否答对。'
      ],
      lang: 'python',
      code: [
        '# pip install tiktoken numpy',
        'import tiktoken, numpy as np',
        '',
        'enc = tiktoken.get_encoding("cl100k_base")',
        '',
        '# 1) 中文 token 估算：别再用「字数」拍脑袋',
        'zh = "向量数据库的召回率取决于切片策略和重排模型的配合"',
        'en = "Recall depends on chunking strategy and the reranker."',
        'print("中文", len(zh), "字 ->", len(enc.encode(zh)), "token")',
        'print("英文", len(en), "字符 ->", len(enc.encode(en)), "token")',
        '',
        '# 2) 成本估算（示例价，按实际模型单价替换）',
        'IN_PRICE, OUT_PRICE = 1.0, 2.0      # 元 / 百万 token',
        'calls, in_tok, out_tok = 50_000, 1800, 400',
        'cost = calls * (in_tok*IN_PRICE + out_tok*OUT_PRICE) / 1e6',
        'print(f"预估成本 {cost:.1f} 元")',
        '',
        '# 3) embedding 相似度直觉验证',
        'def cos(a, b):',
        '    a, b = np.array(a, float), np.array(b, float)',
        '    return float(a @ b / (np.linalg.norm(a)*np.linalg.norm(b)))',
        '',
        'v = {"切片":[1,0,0.2], "chunk":[0.95,0.05,0.18], "下雨":[0,1,0]}',
        'print("切片~chunk", round(cos(v["切片"], v["chunk"]), 3))   # 应接近 1',
        'print("切片~下雨", round(cos(v["切片"], v["下雨"]), 3))      # 应接近 0'
      ].join('\n'),
      expect: '看到中英文 token/字符比不同（中文通常在 0.6~1.0 之间）；相似度输出中「切片~chunk」显著高于「切片~下雨」。',
      pitfalls: [
        '用字符数除 4 来估中文 token，误差能到两倍以上。',
        '以为上下文窗口越大越好。窗口越大单次成本越高、中间信息越容易丢。',
        '把 embedding 当成万能语义匹配。它对否定、数字、专有名词不敏感，必要时还得混合关键词检索。'
      ]
    },
    interview: [
      { q: 'Token 是什么？为什么按它计费？', a: 'Token 是分词器切出的最小语义单元，可能是字、词或词的一部分。按它计费是因为模型的算力消耗正比于序列长度——注意力机制的计算量随 token 数平方增长，所以计费单位必须和算力单位对齐。' },
      { q: 'Embedding 在 RAG 里起什么作用？', a: '它把文本和查询都映射到同一个向量空间，检索就变成「在空间里找最近邻」。<strong>优点是能匹配同义不同词的说法（"报销流程"能命中"费用申请步骤"），缺点是丢掉了精确关键词信息，所以工业上常配一路 BM25 做混合检索。</strong>' },
      { q: '上下文窗口不够用怎么办？', a: '三条路：① 检索式——只把相关片段塞进去，而不是全文；② 压缩式——对历史做摘要、滚动更新；③ 分层式——短期保留原始对话，长期转为结构化记忆。<strong>实际项目里通常是三者组合。</strong>' }
    ],
    quiz: [
      { q: '1 个汉字大约等于几个 token？', a: '取决于分词器，常见中文场景在 0.6~1.0 之间。必须用目标模型的分词器实测，不能按 1:1 假设，更不能按字符数/4。' },
      { q: '为什么上下文窗口大不代表应该塞满？', a: '三个原因：成本随 token 线性增长；注意力被稀释导致中间信息丢失（lost-in-the-middle）；无关内容会干扰模型判断。精准投喂比海量投喂有效。' },
      { q: 'Embedding 检索有什么天然短板？', a: '对否定词（"不含添加剂"）、精确数字、专有名词、缩写不敏感，容易召回语义相近但关键条件不符的内容。解决办法是混合检索 + 元数据过滤 + 重排。' }
    ]
  };

  C['hallucination'] = {
    concept: [
      '幻觉是指模型生成了<strong>读起来通顺、但事实错误或凭空捏造</strong>的内容。它不是 bug，是机制决定的：模型本质是在做「下一个 token 的概率预测」，它的目标是「像真的」，不是「是真的」。',
      'Agent 项目里幻觉的杀伤力被放大——因为模型不只是说话，它还会触发工具调用、写数据库。一个编造的参数可能直接导致错误操作。所以它属于「必须理解清楚」的那一类。'
    ],
    analogy: [
      '像一个<b>从没去过现场但记性极好的转述者</b>。他能把听来的二手信息讲得绘声绘色、细节丰满，但那些细节可能是他自己补的。',
      '他并无恶意，甚至非常自信——这正是危险之处。你要做的不是让他"保证说实话"，而是给他一本可查的账本，并要求他每次都指着账本说。'
    ],
    cases: [
      '<b>编造 API 参数</b>：让模型调用内部接口，它凭空生成了一个不存在的 <code>filter_type</code> 字段，工具执行失败但模型在下一轮坚称"调用成功了"。',
      '<b>文档里没有的答案</b>：用户问合同里有没有某条款，原文没有，模型却答"第三条约定…"。在法务场景这是事故。',
      '<b>引用编号张冠李戴</b>：模型给出了 [1][2] 引用标记，但对应的原文片段并不支持它的结论。'
    ],
    practice: {
      steps: [
        '<b>强制基于证据回答</b>：prompt 里明确「只能依据下方资料作答，资料中没有的必须说不知道」。',
        '<b>要求给出出处</b>：让模型输出答案的同时输出引用的片段编号，便于程序校验。',
        '<b>程序化校验引用</b>：把模型给的引用编号与检索结果比对，编号不存在就判定为编造。',
        '<b>关键字段二次校验</b>：金额、日期、编号类内容用规则或另一次模型调用交叉验证。',
        '<b>无依据时降级</b>：检索得分低于阈值时直接返回「未找到相关资料」，不交给模型自由发挥。'
      ],
      lang: 'python',
      code: [
        'import re',
        '',
        'SYSTEM = """你是严谨的资料问答助手。规则：',
        '1. 只能依据 <资料> 中的内容作答，不得引入外部知识。',
        '2. 每句结论后面必须标注来源片段编号，格式 [S1]、[S2]。',
        '3. 若资料不足以回答，只输出：未找到相关资料。',
        '"""',
        '',
        'def build_prompt(question, chunks):',
        '    doc = "\\n".join(f"[S{i+1}] {c}" for i, c in enumerate(chunks))',
        '    return f"<资料>\\n{doc}\\n</资料>\\n\\n问题：{question}"',
        '',
        'def verify(answer, chunks):',
        '    """校验幻觉：引用编号是否真实存在 + 是否给了结论却零引用"""',
        '    cited = set(int(x) for x in re.findall(r"\\[S(\\d+)\\]", answer))',
        '    invalid = {c for c in cited if c < 1 or c > len(chunks)}',
        '    no_cite = bool(answer.strip()) and not cited',
        '    return {',
        '        "cited": sorted(cited),',
        '        "invalid_citations": sorted(invalid),   # 编造的引用编号',
        '        "answer_without_evidence": no_cite,      # 无出处的断言',
        '        "verdict": "reject" if (invalid or no_cite) else "pass",',
        '    }',
        '',
        'chunks = ["报销需在费用发生后 30 日内提交", "超期需部门负责人书面说明"]',
        'ans = "报销须在 30 日内提交 [S1]，超期需书面说明 [S3]。"   # S3 不存在',
        'print(verify(ans, chunks))',
        '# -> invalid_citations: [3], verdict: reject'
      ].join('\n'),
      expect: '示例输出中 invalid_citations 为 [3]，verdict 为 reject——说明程序成功识别出模型编造的引用。',
      pitfalls: [
        '只在 prompt 里写「不要编造」。模型没有"不编造"的开关，只能靠证据约束 + 程序校验。',
        '把温度调低当成防幻觉手段。降低温度只减少随机性，不解决无据生成。',
        '用另一个模型来判断是否幻觉而不给原文，等于让两个转述者互相背书。'
      ]
    },
    interview: [
      { q: '你怎么解决大模型幻觉？', a: '分三层答：<strong>输入层</strong>——用 RAG 把答案限定在检索到的证据内，低分召回直接拒答；<strong>输出层</strong>——要求带引用编号，程序校验编号真实性；<strong>兜底层</strong>——金额/日期等关键字段用规则二次校验。<strong>最后补一句：幻觉无法根除，目标是把它从"静默错误"变成"可检测错误"。</strong>' },
      { q: '幻觉的根本原因是什么？', a: '模型的训练目标是最大化下一个 token 的似然，即"生成像人写的文本"，而不是"陈述事实"。它没有内置的事实核查机制，缺乏知识时会用最符合语言模式的词填上，表面看完全合理。' },
      { q: '怎么衡量一个系统的幻觉率？', a: '构造一批「答案在资料中存在」和「答案明确不存在」的测试集，前者看 Faithfulness（结论是否被引用片段支持），后者看拒答率。指标上可以用 RAGAs 的 Faithfulness，或人工标注一批做基准。' }
    ],
    quiz: [
      { q: '把 temperature 调到 0 能消除幻觉吗？', a: '不能。低温只让输出更确定、更少随机发挥，不改变「模型不知道时会凭概率编」的本质。防幻觉要靠证据约束和校验机制。' },
      { q: '为什么让模型"输出引用编号"能降低幻觉？', a: '因为它把不可验证的自由文本变成了可程序化校验的结构（编号必须在检索结果范围内）。这既是约束（模型知道会被检查），也是检测手段（越界编号直接暴露编造）。' },
      { q: '检索结果和问题不相关时应该怎么做？', a: '不要硬答。先设相似度阈值，低于阈值直接返回「未找到相关资料」；同时把这批低分查询记下来，用于优化切片策略或补充知识库。' }
    ]
  };

  C['prompt-design'] = {
    concept: [
      'Prompt 设计可以拆成三个可练的点：<strong>控制输出格式</strong>（能被程序解析）、<strong>设计角色</strong>（限定专业视角与语气）、<strong>提高稳定性</strong>（同样输入得到稳定质量的输出）。',
      'Prompt 不是写作，是<strong>接口设计</strong>。它和函数签名一样：约定输入什么、输出什么结构、越界行为如何。把它当成散文来写，系统就没法稳定。'
    ],
    analogy: [
      '像给外包工人<b>下工单</b>。说「帮我弄一下那个东西」必然返工；说清「按这个模板填、字段必须是这三种取值之一、拿不准就留空并标注」，结果就稳定。',
      '而且工单要能验收——输出格式就是你的验收标准。'
    ],
    cases: [
      '<b>格式不稳定导致解析崩</b>：让模型"返回 JSON"，它有时包 <code>```json</code> 代码块、有时加"好的，以下是结果："前缀，<code>json.loads</code> 直接失败。',
      '<b>角色没设导致跑偏</b>：问合同风险，模型给出了营销建议。加上角色与边界（"你是法务审核助手，只从条款风险角度回答"）后收敛。',
      '<b>同一输入两次结果差很多</b>：因为 prompt 里全是主观描述（"尽量简洁""注意专业"），模型无所适从。改成硬约束（"不超过 3 句、每句不超过 40 字"）后稳定。'
    ],
    practice: {
      steps: [
        '<b>定角色与边界</b>：一句话说清身份 + 只做什么 + 不做什么。',
        '<b>给少量示例</b>：2~3 个输入输出样例，比一段抽象描述有效得多。',
        '<b>硬约束格式</b>：明确字段名、类型、取值枚举、缺失时填什么。',
        '<b>用结构化输出兜底</b>：优先用模型原生的 JSON Mode 或 Function Calling，而不是靠"求"它输出 JSON。',
        '<b>加校验与重试</b>：解析失败时把错误信息回灌给模型，让它自己修一次。'
      ],
      lang: 'python',
      code: [
        'import json',
        'from pydantic import BaseModel, ValidationError',
        'from typing import Literal',
        '',
        'class Extract(BaseModel):',
        '    name: str',
        '    amount: float',
        '    category: Literal["差旅", "办公", "招待", "其他"]',
        '    confidence: float',
        '',
        'PROMPT = """你是费用单据信息抽取器。只输出 JSON，不要任何解释。',
        '',
        '字段与取值：',
        '- name: 报销人姓名，字符串；未提及填空字符串',
        '- amount: 金额数字，不带货币符号；未提及填 0',
        '- category: 只能是 差旅 / 办公 / 招待 / 其他 之一；无法判断填 其他',
        '- confidence: 0 到 1 的浮点数，表示你对本次抽取的把握',
        '',
        '示例：',
        '输入：张伟 上周去上海出差 机票和住宿一共 3280 元',
        '输出：{"name":"张伟","amount":3280,"category":"差旅","confidence":0.95}',
        '',
        '输入：{text}',
        '"""',
        '',
        'def extract(llm, text, retries=1):',
        '    prompt = PROMPT.replace("{text}", text)',
        '    for i in range(retries + 1):',
        '        raw = llm(prompt, json_mode=True)          # 优先用原生 JSON 输出',
        '        try:',
        '            return Extract(**json.loads(raw))',
        '        except (json.JSONDecodeError, ValidationError) as e:',
        '            if i == retries:',
        '                raise',
        '            # 关键：把错误回灌，让模型带着反馈自我修正',
        '            prompt = f"{prompt}\\n\\n你上次的输出有误：{e}\\n请只输出修正后的 JSON。"',
        '',
        'print(extract(fake_llm, "李娜在上海请客户吃饭花了 1860 元"))',
        '# -> name=李娜  amount=1860.0  category=招待'
      ].join('\n'),
      expect: '抽取结果直接是可用对象（字段类型正确、category 在枚举内）；遇到非法输出时自动重试一次而不是抛异常给用户。',
      pitfalls: [
        '用"请尽量返回 JSON"这种软措辞。要配合 JSON Mode / Function Calling 这类原生约束。',
        '示例给太多。3 个以内的代表性样例足够，堆十几个反而让模型抓不住重点。',
        '不做解析校验。模型偶尔会输出 NaN、单引号、尾随逗号，必须有兜底重试。'
      ]
    },
    interview: [
      { q: '你怎么保证模型输出能被程序稳定解析？', a: '三层：① 格式层——用 Function Calling / JSON Mode 让模型在解码阶段就受结构约束；② 提示层——明确字段名、类型、枚举和缺省值，并给 2~3 个样例；③ 校验层——用 Pydantic 校验，失败时把错误回灌给模型重试一次。<strong>只靠 prompt 里写"返回 JSON"是最不可靠的做法。</strong>' },
      { q: '同一个 prompt 结果不稳定，你怎么排查？', a: '先区分是模型随机性还是 prompt 歧义。固定 temperature 为 0 连续跑 10 次：结果仍发散说明是 prompt 有歧义（主观描述多、约束不清）；结果稳定说明是采样参数问题。<strong>再检查输入侧——用户输入的长尾情况往往才是抖动来源。</strong>' }
    ],
    quiz: [
      { q: '为什么 Function Calling 比"在 prompt 里要求输出 JSON"更可靠？', a: 'Function Calling 在模型解码阶段就按声明的 schema 约束生成，且由推理框架保证结构合法；而 prompt 要求只是自然语言请求，模型可以无视或部分遵守，还可能带 markdown 包裹和前置说明。' },
      { q: 'few-shot 示例给几个合适？', a: '通常 2~3 个，覆盖典型情况和边界情况各一即可。示例过多会占用上下文、推高成本，还可能让模型过度模仿某一种样式而丧失泛化。' },
      { q: '解析失败时把错误回灌给模型重试，为什么有效？', a: '因为模型能看到具体的失败原因（比如"category 不是枚举值"），相当于给了一次带反馈的修正机会。比盲目重试同一 prompt 有效得多。' }
    ]
  };

})();
