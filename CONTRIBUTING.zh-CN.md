# 贡献 OpenLinker Core Web

English documentation: [CONTRIBUTING.md](./CONTRIBUTING.md)

感谢你改进 OpenLinker Core Web。本仓库是面向自托管 OpenLinker Core 部署的开源前端。

## 开发环境

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

本地运行兼容的 `openlinker-core` API，或把 `CORE_API_URL` / `API_URL` 指向测试 Core
部署。

## 范围边界

可以放在这里：

- Core Registry、Agent 详情、Playground、任务、工作流、A2A、MCP/connect、设置、Inbox、
  creator、status 和本地 admin UI
- User Token 契约、本地管理界面及带 scope 的 API/MCP 调用说明
- `/api/v1/*` 下 Core-owned endpoint 的 API proxy 行为
- 开源 Core workflow 的 UI 文案、可访问性和本地化

不要放在这里：

- 钱包、Stripe、提现、价格、财务 admin 和托管计费
- 托管账号、令牌策略 Dashboard 和其他 Hosted-only 产品面
- 私有市场排序或推荐控制

## PR 要求

- 遵循现有 Next.js App Router 和组件模式。
- 服务端 Core 调用应使用现有 API helper 或 proxy 约定。
- 新增 UI primitive 前先复用现有组件。
- 修改已本地化页面时保持 i18n。
- 可见 UI 变化尽量附截图。
- 删除 token、私有 URL、客户数据和 `.env.local`。

## 检查

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:a2a-session
```

如果检查需要运行中的 Core API，请在 PR 中说明 API URL 和跳过的凭证相关流程。

## 安全

重点关注 session、受保护路由、API proxy、token 展示/复制、用户可控 URL 和回调面。
安全漏洞不要发公开 Issue，请看 [SECURITY.zh-CN.md](./SECURITY.zh-CN.md)。

## 许可证

贡献即表示你同意贡献内容使用本仓库的 Apache-2.0 许可证。
