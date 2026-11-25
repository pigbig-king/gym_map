# 贡献指南

感谢你愿意帮助改进健身地图。项目采用 pnpm workspace，前端位于 `apps/web`，后端位于 `apps/api`。

## 提交问题

- 提交前先搜索现有 Issue，避免重复讨论。
- 缺陷报告请说明复现步骤、预期结果、实际结果和运行环境；界面问题可附截图。
- 新功能建议先描述要解决的用户问题和使用场景。
- 不要在 Issue、截图或示例数据中公开真实用户资料、密码、令牌或生产数据库内容。
- 报告安全漏洞请遵循 [SECURITY.md](SECURITY.md)，不要公开创建漏洞 Issue。

## 本地开发

请按 [README 快速开始](README.md#快速开始)配置 Node.js、pnpm 和 PostgreSQL，并使用本地开发数据库。不要对生产数据库运行迁移或测试。

常用命令：

```bash
pnpm install
pnpm --filter api prisma:generate
pnpm dev:api
pnpm dev
```

## 提交代码

- 每个 Pull Request 聚焦一个问题，尽量保持改动容易审查。
- 数据库结构改动需要同时提交 Prisma schema 和可部署迁移。
- 新增或调整 API 时同步更新 README 的 API 文档，并覆盖权限、输入校验和错误情况。
- 地图相关改动应保留高德底图署名，并遵守底图服务商的使用条款。
- 不提交 `.env`、密钥、上传文件、真实用户数据、构建产物或个人机器配置。
- 界面改动请检查桌面和窄屏布局；字段变化时说明数据兼容和部署步骤。
- 使用描述清楚的提交标题，例如 `fix: prevent duplicate check-ins` 或 `docs: clarify local setup`。

## 提交前检查

```bash
pnpm --filter api prisma:generate
pnpm lint
pnpm test
pnpm build
```

Pull Request 请说明问题、改动内容、验证结果，以及需要维护者执行的迁移或配置步骤。项目目前没有许可证；维护者添加许可证前，请先不要引入要求项目按特定许可证重新授权的代码或素材。
