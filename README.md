# Windows Clipboard History

一款以 Electron 開發的 Windows 歷史剪貼簿工具，可自動記錄使用者複製的文字與圖片，並將資料儲存在本機資料庫。

本專案以 **Claude Code + Vibe Coding** 協助開發，實作 Electron、JavaScript、SQLite 等技術整合，並完成 Windows Portable 可執行版本。

## ✨ 主要功能

- 自動記錄複製的文字
- 自動記錄複製的圖片
- 查看歷史剪貼簿內容
- 本機 SQLite 資料庫儲存
- Windows Portable 免安裝
- EXE 可直接執行
- 不需安裝 Node.js 或 Electron
- 剪貼簿資料不會自動上傳至雲端

## 🖥️ 使用方式

### 下載

前往 GitHub Releases：

https://github.com/patrickf127/windows-clipboard-history/releases

下載：

`剪貼簿歷史_1.0.0_可攜版.exe`

### 執行

下載後直接雙擊 EXE 即可使用，不需要安裝。

建議將 EXE 放在獨立資料夾中。

程式產生的剪貼簿資料庫：

`clipboard_data.db`

會儲存在 EXE 所在的資料夾。

## 🔒 隱私與資料安全

本程式所記錄的剪貼簿文字與圖片均儲存在使用者本機。

- 不會自動上傳剪貼簿內容
- 不使用雲端資料庫
- 不需要登入帳號
- 剪貼簿資料儲存在本機 SQLite Database

因此使用者可以自行管理、備份或刪除剪貼簿資料。

## 🛠️ 技術架構

| 技術 | 用途 |
|---|---|
| Electron | Windows Desktop Application |
| JavaScript | 核心程式邏輯 |
| SQLite / sql.js | 本機資料儲存 |
| HTML / CSS | 使用者介面 |
| Node.js | Electron 執行環境 |
| Electron Builder | Windows Portable 打包 |

## 🤖 AI 輔助開發

本專案使用 **Claude Code** 輔助程式開發與問題分析，採用 **Vibe Coding** 開發方式。

主要應用於：

- 程式架構設計
- JavaScript 程式開發
- Bug 分析與修復
- SQLite 資料處理
- Electron 功能整合
- Windows Portable 打包
- 開發流程與程式碼優化

AI 輔助開發並非單純產生程式碼，而是透過需求描述、測試、問題分析與反覆修正完成實際可執行的 Desktop Application。

## 📁 專案結構

```text
windows-clipboard-history/
│
├── main.js                 # Electron 主程式
├── preload.js              # Renderer 與主程式溝通
├── database.js             # SQLite 資料庫處理
├── package.json            # 專案設定
├── package-lock.json
├── start.bat               # 開發環境啟動
├── icon.png                # 程式圖示
│
└── renderer/
    └── ...                 # 使用者介面