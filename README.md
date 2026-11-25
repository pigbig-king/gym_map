# 健身地图 Gym Map

一个独立的健身房地图应用：发现附近健身房，查看**器械种类与数量**、价格与环境，完成打卡、评分和审核闭环。

> 本项目从 [`pigbig-king/fitness-space-station`](https://github.com/pigbig-king/fitness-space-station) 的「健身地图」模块抽取而来，独立建库；原仓库内容未被修改。

![首页地图](docs/screenshot-home.png)

![健身房详情](docs/screenshot-detail.png)

## 功能

- **全屏地图**：MapLibre GL + 高德栅格瓦片，无需申请高德 JS API Key；地图钉与名称标签使用 DOM Marker，加载稳定。
- **健身房目录**：按城市、区域、名称筛选；列表与地图联动，点击列表定位健身房。
- **器械清单**：每家健身房可维护器械名称、专业名称、序号标签、数量与状态（正常 / 损坏 / 维修中）。
- **地图气泡**：点击地图钉展示器械汇总、价格、环境，并可直接进入详情。
- **打卡**：每个用户每天在同一家健身房只能打卡一次，可取消；提供区域统计和热力图数据。
- **评分与器材评价**：健身房评分（每人一条，可覆盖）与单件器材评价。
- **UGC 提交与审核**：登录用户可在地图上选点提交健身房（含图片上传），提交后为 `PENDING`；管理员通过后才会公开，并给提交者发送站内通知。
- **站内通知**：审核通过 / 驳回结果通知。
- **地理搜索**：内置中国地级市经纬度与合肥区县数据，用于提交页快速定位。
- **PWA 与移动端**：可安装，移动端列表默认收起，界面响应式。
- **安全细节**：地图气泡与名称标签对用户输入做 HTML 转义；JWT 鉴权 + 管理员角色守卫。

## 技术栈

| 层 | 技术 |
|----|------|
| 仓库 | pnpm workspace monorepo |
| 后端 | NestJS 11、Prisma 6、PostgreSQL、JWT / Passport、bcrypt |
| 前端 | React 19、Vite 8、TypeScript、Tailwind CSS 4、React Router 7、TanStack Query |
| 地图 | MapLibre GL JS、高德栅格瓦片 |
| 其他 | class-validator、Multer 图片上传、vite-plugin-pwa、oxlint |

## 目录结构

```
gym_map/
├─ apps/
│  ├─ api/                     # NestJS + Prisma API
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma      # User / Gym / Equipment / CheckIn / Review / Notification
│  │  │  └─ migrations/        # 初始迁移
│  │  └─ src/
│  │     ├─ auth/              # 注册、登录、JWT 守卫
│  │     ├─ users/             # 当前用户资料
│  │     ├─ gyms/              # 地图核心：列表、统计、热力图、详情、打卡、评价、审核
│  │     ├─ geo/               # 城市 / 区县模糊搜索
│  │     ├─ notifications/     # 审核结果通知
│  │     ├─ uploads/           # 图片上传与静态托管
│  │     └─ prisma/            # PrismaService
│  └─ web/
│     └─ src/
│        ├─ components/        # 地图、布局、路由守卫、UI
│        ├─ pages/             # 首页地图、详情、提交、登录注册、通知、审核
│        ├─ contexts/          # 登录态
│        └─ lib/               # API 请求封装
├─ docs/                       # 截图
├─ package.json
└─ pnpm-workspace.yaml
```

## 快速开始

### 环境要求

- Node.js ≥ 20（本项目在 Node 26 下验证）
- pnpm ≥ 10（本项目在 pnpm 12 下验证）
- PostgreSQL ≥ 14（本项目在 PostgreSQL 19 下验证）

### 1. 准备数据库

```bash
createdb gym_map
# 或者在 psql 中：CREATE DATABASE gym_map;
```

### 2. 配置环境变量

```bash
cp apps/api/.env.example apps/api/.env
```

编辑 `apps/api/.env`：

```env
DATABASE_URL="postgresql://postgres:你的密码@localhost:5432/gym_map"
JWT_SECRET="请替换为随机长字符串"
PORT=3000
```

> `.env` 已被 `.gitignore` 忽略，请勿提交真实密码或密钥。

### 3. 安装依赖并初始化数据表

```bash
pnpm install
pnpm --filter api prisma:generate
pnpm --filter api exec prisma migrate deploy
```

### 4. 启动开发环境

```bash
# 终端 1：API（http://localhost:3000/api）
pnpm dev:api

# 终端 2：前端（http://localhost:5173）
pnpm dev
```

打开 <http://localhost:5173>。

### 5. 设置管理员

先在前端注册一个账号，然后把它提升为管理员：

```bash
psql -d gym_map -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'you@example.com';"
```

也可以使用 `pnpm --filter api prisma:studio` 在图形界面中修改 `User.role`。重新登录后顶部会出现「审核」入口，访问 `/admin/gyms` 审核健身房。

## 常用脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` / `pnpm dev:web` | 启动前端开发服务器（5173） |
| `pnpm dev:api` | 启动 API 开发服务器（3000） |
| `pnpm build` | 构建 api 与 web |
| `pnpm build:web` / `pnpm build:api` | 单独构建 |
| `pnpm lint` | 前后端类型检查 / lint |
| `pnpm --filter api prisma:migrate` | 开发环境创建并应用迁移 |
| `pnpm --filter api prisma:studio` | 打开 Prisma Studio |

## API 一览

所有接口前缀为 `/api`；标注「登录」的接口需要 `Authorization: Bearer <token>`。

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/auth/register` | 公开 | 邮箱注册 |
| POST | `/auth/login` | 公开 | 登录，返回 `accessToken` |
| GET / PATCH | `/users/me` | 登录 | 当前用户资料 |
| GET | `/gyms` | 公开 | 健身房列表，支持 `city` / `district` / `q` / `page` / `pageSize`，含器械与计数 |
| GET | `/gyms/stats?city=` | 公开 | 区域统计：健身房数、打卡数、平均评分 |
| GET | `/gyms/heatmap?city=` | 公开 | 热力图数据 `{ lat, lng, weight }` |
| GET | `/gyms/:id` | 公开（可选登录） | 详情；未审核健身房仅提交者 / 管理员可见 |
| POST | `/gyms` | 登录 | 提交健身房（`PENDING`），含器械数组 |
| GET | `/gyms/mine` | 登录 | 我提交的健身房 |
| GET | `/gyms/pending` | ADMIN | 待审核列表 |
| POST / DELETE | `/gyms/:id/check-in` | 登录 | 打卡 / 取消今日打卡 |
| POST | `/gyms/:id/review` | 登录 | 健身房评分（每人一条，upsert） |
| POST | `/gyms/:gymId/equipment/:equipmentId/review` | 登录 | 器材评价 |
| POST | `/gyms/:id/equipment` | 登录 | 新增器械 |
| PATCH / DELETE | `/gyms/:id/equipment/:equipmentId` | 登录 | 修改 / 删除器械 |
| PATCH / DELETE | `/gyms/:id` | ADMIN | 审核 / 删除健身房 |
| POST | `/uploads` | 登录 | 上传图片（≤5MB，返回 `/uploads/<file>`） |
| GET | `/geo/search?q=` | 公开 | 城市 / 区县模糊搜索 |
| GET | `/notifications` | 登录 | 通知列表与未读数 |
| POST | `/notifications/:id/read` / `/notifications/read-all` | 登录 | 标记已读 |

## 地图说明

- 使用 MapLibre GL 渲染，底图为高德栅格瓦片（`webrd01.is.autonavi.com`），**无需高德 JS API Key**。
- 如用于正式产品，请确认瓦片服务的使用条款，或在 `apps/web/src/components/GymMap.tsx` 的 `BASE_STYLE` 中替换为自有 / 合规的瓦片源。
- 地图钉、名称标签和气泡使用 MapLibre `Marker` + DOM 实现，避免 symbol 图层在部分环境下不渲染的问题；气泡内容已做 HTML 转义。
- 首页在拿到列表数据后按健身房范围计算初始中心与缩放；详情页以该健身房为中心。

## 与原仓库的差异

抽取时只保留了地图相关能力，并做了少量必要修正：

- 移除视频、文章、社区、训练计划等无关模块、页面与依赖；Prisma schema 与迁移裁剪为地图领域模型。
- 地图钉改为 DOM Marker，并修复首屏相机不跟随数据的问题。
- 修复审核通知：系统操作（`actorId = null`）现在也能写入通知，并在返回响应前完成写入。
- 新增用户输入 HTML 转义；品牌与文案改为「健身地图」；本地存储键改为 `gym-map.token`。
- 去除未使用的依赖（openai、meilisearch、recharts、react-markdown、lucide-react 等）。

## 部署提示

```bash
pnpm build
# API
cd apps/api && node dist/main
# 前端静态文件在 apps/web/dist
```

生产环境建议用 Nginx 托管 `apps/web/dist`（开启 SPA fallback 到 `index.html`），并将 `/api` 与 `/uploads` 反向代理到 API 服务。

## 说明

本项目仅包含健身地图业务代码，数据与管理员账号需自行准备。欢迎基于此仓库继续扩展地图聚合、营业时间、实时拥挤度等能力。
