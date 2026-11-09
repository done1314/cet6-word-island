# 词屿 · 六级词汇

一个无需账号的六级背词网页应用。包含单词卡、显示词义、四档记忆反馈、间隔复习、词库搜索、收藏、进度统计和学习记录导出。学习记录保存在当前浏览器的 `localStorage`。

词库由用户提供的《大学英语六级词汇完整版带音标-顺序版.pdf》提取，原文件有 130 页、编号至 5556。原 PDF 的注音和释义存在部分排版与内容问题，本项目保留原文并在界面提示。词库与《六级词汇闪过》无关，也没有复制其界面或内容。

## 本地运行

在项目目录运行：

```bash
python -m http.server 8000
```

然后打开 `http://localhost:8000`。直接双击 `index.html` 时，浏览器可能拦截本地 JSON 读取。

## 发布到 GitHub Pages

确认你有权公开发布 `data/words.json` 后，在 GitHub 创建公开仓库，把本项目文件推送到默认分支。在仓库的 **Settings → Pages** 中选择 **Deploy from a branch**、默认分支和 **/(root)**，保存。几分钟后访问 `https://你的用户名.github.io/仓库名/`。

本项目为静态网页，不需要构建。发布在 GitHub Pages 后，手机浏览器可以通过“添加到主屏幕”使用。浏览器能否显示安装提示取决于平台和浏览器。

## 数据说明

`data/words.json` 的字段为 `id`、`word`、`pronunciation`、`meaning`。提取脚本保存在 `work/extract_words.py`，未纳入 Git。
