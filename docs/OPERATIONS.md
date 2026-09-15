# 运维与上线验收

日常编辑见 [内容维护指南](CONTENT-GUIDE.md)。本文件说明已实现工作流的预期行为和待执行的上线步骤。**真实托管 CMS、GitHub Actions、Pages 部署和失败保留旧站点的验收尚未完成。** 当前源内容含待填写个人资料与默认草稿示例，本地测试通过不代表个人内容已获准发布。

## 上线准备

由仓库维护者在发布前核对以下条件，并记录实际结果；这里不表示配置已经做过：

1. 将经过审查的实现发布到目标仓库 `QiuYu-W/QY-W`，确认默认分支为 `main`，其中包含 `.pages.yml` 和三个工作流。
2. 在 GitHub 仓库 Settings → Secrets and variables → Actions → Variables 中创建仓库变量 `SITE_URL`。使用 Pages 实际地址，例如项目站点地址形式 `https://qiuyu-w.github.io/QY-W`；这是按仓库名推导的候选值，不是已验证线上地址。最终以 Settings → Pages 显示的地址为准。必须完整 HTTPS、无凭据/查询/片段/空白、无末尾 `/`；项目路径的大小写须一致。
3. 在 Settings → Pages 将构建来源设为 GitHub Actions，检查 `github-pages` 环境的部署规则允许 `main`。普通校验和部署构建只需 `contents: read`，部署任务另有 `pages: write`、`id-token: write`，导入工作流需要 `contents: write`。不要为解决失败而扩大为不必要的仓库写权限。
4. 限定 Pages CMS GitHub App 仅访问网站仓库。在验收分支完成一次真实编辑、图片上传、BibTeX 导入和文件差异检查，再进行正式发布。
5. 替换并由所有者确认个人资料、头像、联系方式；只发布获准公开的论文、项目和博客。现有 `example-*` 记录是草稿示例，不能当作真实学术成果。首页取当前语言的最新两篇；要验收两个首页均显示两篇，中文和英文各须有至少两篇获准公开的文章。少于两篇时只显示现有文章或空状态。
6. 先确认真实分支 `CI` 成功，再在可丢弃的验收分支制造一次无效内部链接，确认 CI 失败、日志定位到生成页面，修正后再次通过。此实验不应直接放到生产 `main`。

生产工作流会阻止空白或不合规 `SITE_URL`。分支 CI 没有同样的生产地址入口检查，所以不能仅凭分支 CI 绿色认定部署变量正确。GitHub Pages 的自定义工作流配置参考 [官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 保存到上线的时间和状态

初次使用可预留约 5–15 分钟观察保存、排队、安装、测试和部署；这是操作预算，**不是本站测得的耗时或服务承诺**。记录首轮真实运行的开始/结束时间后再调整预期。运行超过预算时打开日志查看所在阶段，不连续重复保存。

| 触发 | 在 Actions 中观察 | 上线条件 |
| --- | --- | --- |
| 非 `main` 分支保存或拉取请求 | `CI` → `verify` | 只校验，不部署分支预览 |
| `main` 保存或手动部署 | `Deploy GitHub Pages` → `build` → `deploy` | 所有构建检查通过后才上传并部署 |
| CMS 导入按钮 | `Import publications` → `import` | 成功后核对论文提交；`main` 再等部署工作流 |

打开 [仓库 Actions](https://github.com/QiuYu-W/QY-W/actions)，核对分支、提交和运行时间；最新提交旁的状态入口也可查看关联检查。部署运行摘要和 `github-pages` 环境提供实际站点地址。工作流会重新检出当前 `main`，因此快速连续保存时，还要核对构建日志的实际检出提交及页面内容，不能只凭触发运行的旧提交标题确认发布版本。

导入使用 `GITHUB_TOKEN` 提交，不能依赖这个提交触发普通 push 工作流。当前部署通过成功的 `Import publications` 的 `workflow_run` 事件衔接，并限制同仓库 `main`；该监听必须已经位于默认分支。此机制符合 [GitHub 的令牌触发限制](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)，真实导入到部署的事件链仍待验证。

构建或测试失败时不会进入部署任务。已有成功部署时，预期旧站点继续在线；没有首次成功部署时不能据此假定有可用旧站点。部署服务自身故障需检查部署日志与实际 URL。下方清单将“故意失败后保留旧站点”单独列为外部验收。

## 识别失败与修正内容

打开失败运行，找到第一个红色步骤，先读最早错误，再看最后的退出摘要。保存工作流链接、提交号、步骤名称和具体字段/文件，交给维护者时不要附带令牌或敏感材料。

| 失败类型 | 典型线索 | 处理方式 |
| --- | --- | --- |
| 内容格式或 schema | YAML/frontmatter 解析、字段路径、Invalid、Duplicate DOI/key/slug | 按日志修正缺失字段、枚举、日期、缩进或重复标识；草稿也要合法 |
| 构建或类型检查 | `pnpm check`、`pnpm build` 中组件/脚本错误 | 内容错误回 CMS 修正；代码错误由维护者在分支处理 |
| 内部链接或图片 | `verify:dist` 给出引用 HTML 和缺失 URL | 对照原文章/模板纠正 slug、路径、大小写和媒体文件，检查项目基路径 |
| BibTeX | `Unable to parse BibTeX`、missing required、Duplicate、collision、`failed: 1` | 修正上传源文件，再启动新导入；不要重命名为另一个导入文件 |
| 浏览器/无障碍 | Playwright 测试名、断言、axe、超时或横向溢出 | 查看对应页面和 `test-results` 日志；维护者本地复现桌面与手机套件，勿跳过检查 |
| 安装、配置、权限或部署 | install、SITE_URL、403、Pages/environment 错误 | 核对锁文件、工具版本、变量和最小权限；不是靠修改文章解决 |

`verify:dist` 检查生成站点的内部资源，外部 HTTP(S) 链接只提示人工检查，不会联网验证它们是否可达。论文的真实资源链接仍须逐一打开确认。

当前导入工作流先安装 pnpm 10，再设置 Node 24；CI/部署则是 Node 24 后安装 pnpm 11.19.0，仓库元数据要求 pnpm `^11.19.0`。这一现存启动差异尚未在 GitHub 验证。若导入失败在安装阶段，先由维护者检查真实日志和版本选择，在分支修正并重新验证；不要把它误报成 BibTeX 格式错误。

本地浏览器测试默认使用 `127.0.0.1:4338`。若出现 `listen EACCES`，先检查端口占用及 Windows 保留端口范围；当前测试支持环境变量 `PLAYWRIGHT_PORT`，可由维护者选一个已确认空闲、允许绑定的本地端口后重试，无须关闭防火墙或终止其他程序。例如在 PowerShell 设置 `$env:PLAYWRIGHT_PORT='45123'` 后运行 `pnpm test:e2e`，测试完成后用 `Remove-Item Env:PLAYWRIGHT_PORT` 清除此会话设置。示例端口需在每次使用前确认可用。

修正失败的 CMS 编辑：打开原记录、核对失败提交中的差异，仅纠正报告的问题，保存新提交后等待对应的新运行。后台无法载入无效 YAML 时，在 GitHub 对同一文件作最小修复，通过分支/拉取请求检查后合并。修复前保留所需文字；不要反复导入覆盖正在修正的内容。

## 回退具体内容提交

回退会创建新的反向修改提交，保留完整历史。先在 GitHub Commits/文件 History 找到错误提交，记录完整提交号并查看差异，确认涉及哪些内容和媒体。

若错误来自一个已合并的拉取请求，可在该请求底部选择 **Revert**，审查生成的反向拉取请求，等待 CI 通过后合并。它回退整个合并内容，不应拿来撤销其中单独一处修改。操作和可能需要手动处理冲突的情形见 [GitHub 回退拉取请求](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/reverting-a-pull-request)。

普通 CMS 直接提交并不一定有网页 Revert 按钮。简单文字错误可从该提交差异找出改前文本，在当前文件中只恢复那一处，通过 GitHub 编辑器提交到新分支并创建拉取请求；不要把整份旧文件覆盖回去，丢掉之后的合法修改。多文件、重命名或冲突交给维护者，用以下流程精确回退单个普通提交；将 `BAD_COMMIT_SHA` 替换为已核对的完整提交号：

```bash
git status --short
git fetch origin
git switch -c codex/revert-content origin/main
git revert BAD_COMMIT_SHA
pnpm verify
pnpm test:e2e
git push -u origin codex/revert-content
```

执行前工作目录必须干净，分支名需未被占用。冲突时审查每一处并保留之后的合法修改，再 `git add` 和 `git revert --continue`；不确定就 `git revert --abort` 并请维护者处理。以上是给维护者的后续操作说明，本次文档工作没有执行外部 push。合并反向拉取请求后，等待新的 `Deploy GitHub Pages` 成功并检查线上内容。不要强制推送或重写公开历史。若回退的是导入论文提交，同时核对导入源；不修正源文件就再次导入会重新带回旧内容。

## 重新运行失败工作流

临时网络或服务问题可进入 Actions → 对应运行 → **Re-run jobs** → **Re-run failed jobs** 或 **Re-run all jobs**。内容/配置已经修改时，应检查新提交触发的新运行；重新运行旧 CI 事件通常仍使用原提交，不能替代新提交的检查。权限和具体选项见 [GitHub 重新运行工作流](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs?tool=webui)。

本站部署构建显式检出当前 `main`，所以重新运行部署的 build 可能发布更新后的 main；只有重跑 deploy 时则要核对其依赖的已有构建产物。更清晰的方式是在 `Deploy GitHub Pages` 页面选择 **Run workflow** 并选择 `main`，核对新运行的实际检出版本。导入源已更新时使用 CMS 按钮启动新导入；不要把旧导入运行的重试当作新文件验证。

## 限制权限与重新授权

在个人 GitHub Settings → Applications → Installed GitHub Apps 找到 Pages CMS → Configure；组织安装由组织维护者从组织设置进入。Repository access 选择 **Only select repositories**，仅保留 `QiuYu-W/QY-W` 并保存。进入设置时确认正在修改的安装属于正确账号，变更可能影响该安装下的其他仓库。参见 [GitHub 安装管理](https://docs.github.com/en/enterprise-cloud%40latest/apps/using-github-apps/reviewing-and-modifying-installed-github-apps)。

需要收回访问时可 Suspend 或 Uninstall；需要撤销代表本人操作的授权，还应在 Authorized GitHub Apps 撤销 Pages CMS 授权。恢复使用时重新登录官方托管后台，按单仓库范围安装/授权，再用安全内容验证保存和导入。托管 App 的私钥由服务方管理，站点所有者没有要写入此仓库的“CMS 密钥”；重新授权不是让用户手工轮换服务方私钥。若实际泄露了个人访问令牌，应在其签发处立即撤销并检查异常提交，不能靠删文件解决。

## 依赖更新

维护者在干净工作目录从最新 `main` 建立新分支，例如 `codex/update-dependencies`。使用 Node 24 和 pnpm 11.19.0，先读取拟升级包的官方发布说明，按需要小批量更新，不把所有大版本一次合并。

```bash
pnpm outdated
pnpm update
pnpm verify
pnpm test:e2e
pnpm verify:dist
git diff --check
```

`pnpm update` 在现有版本范围内更新；跨大版本需明确选包和版本并检查迁移要求。审查 `package.json` 与 `pnpm-lock.yaml` 的差异，同次提交锁文件；用 `pnpm install --frozen-lockfile` 检查可重现安装。若 Playwright 版本变化，按新版本安装 Chromium 后再测。创建拉取请求、查看真实 CI，通过审查后再合并。仓库脚本 `verify` 包含类型/内容检查、单元测试、构建和内部资源校验，`test:e2e` 包含主站与独立论文夹具的桌面/手机浏览器套件，不应删减为单次构建。

## 增加未来内容类型

软件、数据集、教学等新增类型在独立分支实施。先定义字段及公开边界，在 `src/data` 建立新的独立目录，在 [schemas.ts](../src/lib/schemas.ts) 增加模式，在 [content.config.ts](../src/content.config.ts) 注册集合，并在 [.pages.yml](../.pages.yml) 添加对应编辑器。保留现有 profile、publications、projects、blog 的文件格式和身份标识。

为新类型单独添加中文/英文页面、必要的草稿与唯一标识逻辑和有意义的测试；使用现有 URL 帮助函数处理根站点和项目路径。只有产品需求确认后才把新类型接入导航、首页计数、搜索、RSS 或站点地图，并分别定义是否应被收录。运行完整校验及浏览器测试，检查新旧类型互不影响，更新两份维护文档后审查合并。

## 自定义域名

首次上线可以继续使用默认 Pages 域名，不必购买域名。确需自定义域名时，由有权限的维护者按 [GitHub 当前域名说明](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) 配置，以下步骤尚未执行：

1. 确认域名控制权，先在 GitHub 验证域名并在仓库 Settings → Pages 设置 Custom domain，避免仅添加 DNS 而未关联站点。
2. 在域名服务商设置 DNS：子域名通常用 CNAME 指向 `qiuyu-w.github.io`，不要包含 `https://` 或 `/QY-W`；顶级域名按官方当前说明使用 ALIAS/ANAME 或 A/AAAA 记录，不复制未经核对的旧 IP，不用通配符记录。
3. 在仓库新增 `public/CNAME`，内容仅为真实域名一行（无协议、路径）。Astro 构建会复制它到 `dist/CNAME`。本仓库使用自定义 Actions 部署，GitHub 会忽略构建产物中的 CNAME 文件，其域名设置必须在 Pages 设置中完成；此文件仅用于随仓库记录目标域名。
4. 同步把仓库变量 `SITE_URL` 改为完整 HTTPS 自定义站点地址且无末尾 `/`。若域名直接服务站点根目录，去掉旧 `/QY-W` 项目路径。检查 [Astro 配置](../astro.config.mjs) 的 base 随变量变化。
5. 用新 `SITE_URL` 在本地运行 `pnpm verify`、`pnpm test:e2e`、`pnpm verify:dist`，核对导航、媒体、canonical、RSS 和站点地图，然后按审查流程部署。
6. 等待 DNS 检查及证书可用，再在 Pages 中启用 Enforce HTTPS；通过 HTTPS 打开全部中英文路径并检查旧地址跳转。DNS 生效时间依服务商及缓存而异。回退域名时同步恢复 Pages 设置、DNS、`public/CNAME` 和 `SITE_URL`，重新部署并验证。

## 上线验收记录：全部待真实部署验证

执行前填写：实际 Pages URL：待填写；验收日期/执行者：待填写；实际部署提交：待填写；部署运行链接：待填写。本表所有复选框当前均未完成；每项完成后补日期、提交和截图/日志/观察结果，再勾选。

| 待验收项目 | 在真实环境中记录的证据 |
| --- | --- |
| [ ] 中英文首页、关于、论文、项目、博客可加载 | 在实际站点基地址后检查 `/`、`about/`、`publications/`、`projects/`、`blog/` 及 `en/` 对应路径；记录 HTTP/页面结果 |
| [ ] 语言切换指向真实页面 | 逐个结构页、项目详情及单语博客切换；博客允许回目标语言列表 |
| [ ] 首页有头像、研究陈述、真实计数和最新两篇文章 | 所有者批准内容；按已发布记录核对数量（博客计数含两种语言）及当前首页语言的最新两篇 |
| [ ] 首页没有精选成果、重复 CTA 行或 CV 下载 | 桌面和手机截图及人工查看 |
| [ ] 关于我为批准文本且联系链接正确 | 所有者确认，逐个打开链接 |
| [ ] 论文筛选和全部配置的资源链接可用 | 年份/类型筛选结果；每个外部链接人工核对 |
| [ ] BibTeX 幂等且原子 | 真实验收分支重复导入无重复/新内容提交；损坏一条输入后整批失败且论文目录提交不变；修复后成功；main 导入后部署链路结果 |
| [ ] 同一项目记录生成双语详情 | 文件差异、两条详情 URL 和语言切换 |
| [ ] 博客语言、分类、标签与静态搜索可用 | 实际批准文章的筛选/搜索结果，无脚本时可读列表 |
| [ ] 草稿不在页面、计数、搜索、RSS、sitemap | 用批准的无敏感草稿核对实际生成文件和网站；不以公开仓库不可见为目标 |
| [ ] 桌面与手机 Playwright 套件通过 | 对验收提交保存 `pnpm test:e2e` 完整结果；另人工检查实际部署 URL，当前测试默认针对本地预览 |
| [ ] axe 严重和致命违规为零 | 验收提交测试日志及对实际部署页面的补充检查记录 |
| [ ] 故意失败的构建保留之前部署 | 先记录成功站点版本；由维护者安排可控失败，观察部署任务未执行且线上仍是旧版；随后修复并成功部署；仅分支 CI 失败不等同此项 |
| [ ] Pages CMS GitHub App 仅授权网站仓库 | 真实安装设置中的仓库范围，不保存账号敏感信息 |
| [ ] 未跟踪秘密或保密研究材料 | 所有者核对内容和媒体，维护者检查当前跟踪文件及拟发布历史；记录审查范围与结果，不仅检查文件名 |

另须完成托管编辑专项检查：个人资料仍是单个 YAML 根对象；论文字段/枚举正确保存；项目保留 `bodyZh`/`bodyEn`；博客保存字段头和 Markdown 正文；上传图片写入 `/media/`；BibTeX 原名替换；导入按钮在预期分支启动工作流。记录脱敏截图，按 [截图清单](images/README.md) 补齐三张真实图片。所有者共同核对本清单及真实内容后，才把站点标为生产可用。
