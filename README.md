# AI Novel

一个给自己用的中文爽文写作后台，当前第一阶段已经接好：

- `Next.js`
- `Vercel`
- `Supabase Postgres`
- `Prisma`

现在的目标不是做公开小说平台，而是先把这条写作链跑通：

`灵感 -> 故事设定 -> 大纲 -> 章节目录 -> 本章细纲 -> 正文草稿`

## 当前数据库结构

Prisma schema 已包含这些核心表：

- `Project`
- `StoryBible`
- `Outline`
- `Chapter`
- `ChapterBrief`
- `ChapterDraft`
- `Character`
- `WorldRule`
- `Foreshadow`

这些表已经覆盖第一版自用工作流：

- 项目管理
- 故事圣经
- 全书大纲
- 章节目录
- 本章细纲
- 正文多版本草稿
- 角色设定
- 世界规则
- 伏笔追踪

## 本地启动

1. 安装依赖

```bash
npm install
```

2. 复制环境变量模板

```bash
cp .env.example .env
```

3. 在 Supabase 控制台里准备这些值

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

建议：

- `DATABASE_URL` 用运行时连接串
- `DIRECT_URL` 用直连数据库的连接串，方便 Prisma migration
- `OPENAI_MODEL` 不填时默认走 `gpt-5-mini`

4. 生成 Prisma Client

```bash
npm run prisma:generate
```

5. 把 schema 推到数据库

开发阶段可直接：

```bash
npm run prisma:push
```

如果你想保留 migration 记录：

```bash
npm run prisma:migrate
```

6. 启动开发环境

```bash
npm run dev
```

## 常用脚本

```bash
npm run dev
npm run lint
npm run build
npm run prisma:generate
npm run prisma:push
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:studio
```

## 目录说明

- [prisma/schema.prisma](/Users/rms/Desktop/Ai%20Project/Ai%20Novel/prisma/schema.prisma)
- [prisma.config.ts](/Users/rms/Desktop/Ai%20Project/Ai%20Novel/prisma.config.ts)
- [src/lib/prisma.ts](/Users/rms/Desktop/Ai%20Project/Ai%20Novel/src/lib/prisma.ts)
- [src/lib/supabase.ts](/Users/rms/Desktop/Ai%20Project/Ai%20Novel/src/lib/supabase.ts)

## 下一步建议

最顺的下一步是做这三个模块：

1. `projects` 作品列表页
2. `story-bible` 故事设定生成页
3. `chapters` 目录与正文工作台
