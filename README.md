# QY-W

中英双语学术主页与科研博客，使用 Astro、Pages CMS、GitHub Actions 和 GitHub Pages。

本地实现已包含内容编辑配置、BibTeX 导入、校验和部署工作流。**托管 CMS、真实 GitHub Actions 和已部署网站的上线验收仍待完成**；当前个人资料为待填写占位内容，示例论文、项目和文章为草稿。网站所有者提供并确认真实内容后，才能完成上线验收。实现依据见 [设计说明](docs/superpowers/specs/2026-09-04-research-blog-design.md) 和 [实施计划](docs/superpowers/plans/2026-09-04-research-blog-implementation.md)。

## 内容维护

从 [Pages CMS 托管后台](https://app.pagescms.org/) 使用 GitHub 登录，只向 Pages CMS GitHub App 授权 `QiuYu-W/QY-W`。按照 [内容维护指南](docs/CONTENT-GUIDE.md) 编辑双语个人资料、论文、项目、博客和图片。

保存会产生 Git 提交。工作流发布到仓库并完成配置后，`main` 的保存触发 `Deploy GitHub Pages`，通过校验和浏览器测试后才部署；其他分支只运行 `CI`，不会自动发布预览网站。

在 BibTeX 媒体区上传或替换固定文件 `publications.bib`，再运行“导入或更新 BibTeX”。成功导入会一次性提交论文变更，重复导入相同内容不产生重复记录或新内容提交。`main` 的成功导入通过 `workflow_run` 衔接部署；这条真实线上链路仍待验收。

本仓库公开可读，`draft: true` 只隐藏网站上的文章，GitHub 上的草稿源文件仍然公开。不要上传保密、未公开或受限制的研究材料、令牌及个人敏感信息。

## 本地维护与上线

运行环境：Node.js 24，pnpm 11.19.0。首次准备环境后运行：

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm verify
pnpm test:e2e
```

`pnpm dev` 启动本地开发站点。生产部署必须设置仓库变量 `SITE_URL` 为完整 HTTPS 网站地址，包含项目路径（如有），且不以 `/` 结尾。不要把本地默认地址当成生产地址。

失败处理、回退、权限管理、依赖更新、自定义域名和逐项上线记录见 [运维与上线验收](docs/OPERATIONS.md)。待采集的三张真实后台截图见 [截图采集清单](docs/images/README.md)。本地测试通过不能替代这些外部验收。
