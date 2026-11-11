# 《数据可视化技术》个性化学习平台与智能教学管理平台

纯 HTML / CSS / JS，ECharts 已本地化（`vendor/`），双击 `index.html` 即可离线打开（推荐 Chrome / Edge；Firefox 如遇数据不同步，请在目录下执行 `python3 -m http.server` 后访问）。

## 目录
- `index.html` 登录与角色选择　`student.html` 学生端　`teacher.html` 教师端
- `css/style.css` 样式　`vendor/` ECharts 5.5.1 与词云组件
- `js/data.js` 课程章节、知识点、问答知识库、题库、资源
- `js/engine.js` 本地存储、班级学生数据、掌握度统计、预警规则、学习路径算法、问答匹配
- `js/ui.js`、`js/student.js`、`js/teacher.js`
- `screenshots/` 页面截图

## 功能
- 学生端：知识导览、智能问答（本地知识库，可选接入 OpenAI 兼容接口）、学习路径推荐、学习状态评估（含自适应小测验）、资源中心
- 教师端：班级总览看板、学情分析、学生画像与预警（含平时/期末/总评成绩）、资源与题库管理、教学建议生成

数据保存在浏览器 localStorage（前缀 `dvp3_`），升级数据版本后旧缓存会自动清理。侧边栏底部「重置数据」可恢复初始数据。
