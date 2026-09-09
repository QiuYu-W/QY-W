# QY-W

Bilingual academic profile and research blog, implemented with Astro, Pages CMS, GitHub Actions, and GitHub Pages.

The implementation follows the approved specification and task plan under `docs/superpowers/`.

## 内容维护

通过 [Pages CMS 托管后台](https://app.pagescms.org/) 使用 GitHub 登录；GitHub App 仅授权 `QiuYu-W/QY-W` 这个网站仓库。后台可维护双语个人资料、论文、科研项目、博客，并上传图片。保存会生成 Git 提交；接入后续 CI 工作流后，内容提交会自动触发校验，检查通过后才能发布。

在 BibTeX 媒体区上传或替换固定文件 `publications.bib`，再运行“导入或更新 BibTeX”。导入工作流先校验和构建，再一次性提交论文变更；重复导入不会产生重复提交。工作流使用 GitHub 内置令牌提交，不能依靠这次提交自动触发其他 `push` 工作流；自动发布衔接在部署配置阶段完成。

操作步骤见[内容维护指南](docs/CONTENT-GUIDE.md)（将在操作文档阶段补齐）。当前托管后台登录、仓库授权和实际保存仍需完成验收。

本仓库公开可读，`draft: true` 只隐藏网站上的文章，GitHub 上的草稿源文件仍然公开。不要上传保密、未公开或受限制的研究材料、令牌及个人敏感信息。
