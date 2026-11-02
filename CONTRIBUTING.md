# Contributing

感谢参与引程。

## 提交前

```bash
npm install
npm run test:flow
npm run test:study
npm run test:search
node scripts/test-timetable.js
```

涉及页面时，还请在 320px、390px 和桌面视口检查：

- 没有横向溢出；
- 主要按钮触控高度不少于 44px；
- 控制台没有未处理错误；
- 日程写入后能在日历中实际看到。

## 安全

不要提交：

- API Key 或访问令牌；
- `*.jks`、`*.keystore`、`keystore.properties`；
- 本机路径、账号凭据和个人数据库；
- 构建产物、旧安装包和大体积压缩包。

## 代码风格

- 保持原生 JavaScript，避免无必要的新依赖。
- 日期使用本地 `YYYY-MM-DD`，时间使用 `HH:mm`。
- 写入类模型回复必须由实际 action 和落库结果校验。
- 新增行为需要补充对应回归测试。

提交 Pull Request 时，请说明用户问题、实现方式和验证结果。
