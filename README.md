# Surveyboard

勘点任务台 demo：Next.js + shadcn/ui + React Flow + 高德 JS API 2.0。

点击地图添加点，左侧列表、地图、任务流程和右侧属性会同步选中。

## 环境

- Node 22（仓库带 `.nvmrc`）
- 个人学习用途的高德 Web Key（配额内免费）

```bash
nvm use
pnpm install
```

复制 `.env.example` 为 `.env.local`，填入高德 Key：

```
NEXT_PUBLIC_AMAP_KEY=
NEXT_PUBLIC_AMAP_SECURITY_CODE=
```

Key 在 [高德开放平台控制台](https://console.amap.com/) 创建，平台选 Web 端（JS API）。若开启了安全密钥，把 JS 安全密钥填到 `NEXT_PUBLIC_AMAP_SECURITY_CODE`。本地开发请在控制台把 `localhost` 加进白名单。

```bash
pnpm dev
```

浏览器打开 http://localhost:3000 。
