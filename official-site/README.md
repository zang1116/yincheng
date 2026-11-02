# 引程官网

正式地址：<https://yincheng-planner.pages.dev/>

## 本地构建

```powershell
npm install
npm run build
```

## 部署

Cloudflare Pages 生产部署：

```powershell
npx wrangler pages deploy public --project-name yincheng-planner --branch main
```

## 下载计数

- 官网下载入口：`/api/download`
- 计数接口：`/api/download-count`
- 持久化存储：Cloudflare KV，绑定 `DOWNLOAD_COUNTER`
- 只有点击下载入口才会增加计数；统计失败不会阻止 APK 下载。

更新 APK 时，同时替换 `download/yincheng-2.3.5.apk` 并更新版本名称与函数中的下载路径。
