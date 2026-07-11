# 教練管理平台（原型）

多教練共用的訓練/檢測紀錄平台。管理員負責新增與管理教練帳號；每位教練登入後只能看到、操作**自己名下**的選手與訓練/檢測紀錄，教練之間資料完全隔離。

前端畫面直接沿用原本單機版「阻力訓練監控系統」的介面與視覺設計（側邊欄選手清單、模組切換、分析圖表、教練報表等全部保留），差別只在於資料來源從瀏覽器 localStorage 換成後端 API + 資料庫，並且加上登入驗證與多教練帳號管理。

這是一個**真正可以運作的原型**：有資料庫、有登入驗證、有權限隔離，不是靜態畫面 mockup。目的是先把「多人、多租戶、權限隔離」的核心架構打穩，之後工程師可以在這個基礎上擴充功能、正式部署。

## 快速開始（本機）

需要先有一個可連線的 PostgreSQL（本機安裝一份，或用免費的雲端資料庫都可以）。

```bash
npm install
cp .env.example .env      # 填入 DATABASE_URL、JWT_SECRET 等
npm start                  # 啟動伺服器，預設 http://localhost:3000
```

伺服器第一次啟動時會自動建立資料表，並自動建立第一個管理員帳號（不需要額外跑指令）。開瀏覽器進入 `http://localhost:3000`，用種子帳號登入：

- Email: `admin@example.com`
- 密碼: `admin1234`（或你在 `.env` 裡設定的 `SEED_ADMIN_PASSWORD`）

**請登入後盡快換掉這組密碼**（目前重設密碼要透過管理員後台的「重設密碼」按鈕）。

管理員登入後看到的是「教練帳號管理」畫面，可以新增教練帳號；教練登入後看到的就是原本熟悉的阻力訓練監控系統介面（選手管理、新增測試、歷史記錄、分析圖表、教練報表、匯出匯入），只是所有選手、訓練紀錄、檢測紀錄現在都存在伺服器的資料庫裡，而不是瀏覽器本機。

## 架構總覽

```
瀏覽器 (public/index.html：登入畫面 + 教練介面 + 管理員介面，三個畫面同一個檔案切換顯示)
        │  fetch() + JWT (Authorization: Bearer ...)
        ▼
Express API (server.js)
   ├─ /api/auth      登入、取得目前使用者
   ├─ /api/admin     僅 admin 角色可用：管理教練帳號
   └─ /api/athletes  僅 coach 角色可用：選手 + 訓練/檢測紀錄
        │  每一筆查詢都會加上 WHERE coach_id = 目前登入者的 id
        ▼
PostgreSQL 資料庫（透過 node-postgres / pg）
```

`public/index.html` 是同一個檔案裡放了三塊畫面（登入 / 教練介面 / 管理員介面），用 JS 依登入結果切換顯示哪一塊，而不是分成多個頁面——這樣可以完整保留原本單機版的 CSS 與版面配置，改動集中在資料存取層。

### 權限隔離怎麼做到的

不是靠前端隱藏欄位，而是**後端每一條 SQL 查詢都強制帶上 `coach_id`**：

- `routes/athletes.js` 的 `loadOwnedAthlete` middleware，會用 `WHERE id = $1 AND coach_id = $2` 去撈選手，教練 A 永遠查不到教練 B 的選手，即使用猜的 ID 直接打 API 也一樣（回傳 404，不會洩漏「這筆資料存在但你不能看」的訊息）。
- 阻力訓練紀錄、游泳檢測紀錄都掛在選手底下（`athlete_id` 外鍵），所以只要選手歸屬確認了，底下的紀錄自然也隔離好了。
- 這個機制已經用 curl 實際測試過（用真的 PostgreSQL，不是模擬）：教練 B 拿自己的 token 去存取教練 A 的選手 ID，讀取跟寫入都會得到 404。

### 資料表

| 資料表 | 說明 |
|---|---|
| `users` | 管理員與教練共用同一張表，用 `role` 欄位區分（`admin` / `coach`） |
| `athletes` | 選手基本資料，`coach_id` 外鍵指向擁有者教練 |
| `resistance_sessions` | 阻力訓練器（Land Fitness）測試紀錄，`athlete_id` 外鍵 |
| `test_records` | 游泳教練檢測紀錄（計時/划頻划距/體能爆發力），`athlete_id` 外鍵 |

完整欄位定義見 `db/index.js`（伺服器啟動時會自動執行 `CREATE TABLE IF NOT EXISTS`，不需要手動跑 migration）。前端內部欄位名稱維持原本單機版的 camelCase（如 `maxSpeed`、`gripL`），資料庫欄位是 snake_case（如 `max_speed`、`grip_l`），中間由 `public/index.html` 裡的 `mapSessionFromApi` / `mapTestFromApi` 做轉換，這樣原本圖表、分析、教練報表的程式碼幾乎不用改。

## 部署到網路上給別人測試

**推薦：Render，完全免費、不需要信用卡。** 專案裡的 `render.yaml` 已經設定好「免費網頁服務 + 免費 PostgreSQL 資料庫」的組合，用 Render 的 Blueprint 功能一次部署，不用自己一個一個手動設定。

> 早期版本的 `render.yaml` 用的是 SQLite + 付費方案（因為 SQLite 需要「永久保存的硬碟」，而 Render 免費方案的硬碟是暫時性的，重啟就會清空）。現在已經把資料庫換成 PostgreSQL，並改用 Render 真正免費、不用卡的方案（免費網頁服務 + 免費 PostgreSQL）。

**部署步驟：**

1. **把專案推上 GitHub**（私有 repo 也可以）：
   ```bash
   cd coach-platform
   git init
   git add .
   git commit -m "initial commit"
   # 到 github.com 建一個新 repo，再依照它給的指令 git remote add + push
   ```

2. **到 [render.com](https://render.com) 註冊**（免費方案不需要信用卡），選「New +」→「Blueprint」，連接你剛剛的 GitHub repo。Render 會讀取 `render.yaml`，自動建立網頁服務跟 PostgreSQL 資料庫，並把資料庫連線字串自動接好（`DATABASE_URL` 環境變數）。

3. 部署過程中 Render 會自動產生 `JWT_SECRET` 跟 `SEED_ADMIN_PASSWORD`（管理員密碼）這兩組亂數值。**第一次部署完成後**，到 Render 後台該服務的「Environment」頁籤，找到 `SEED_ADMIN_PASSWORD` 的值——這就是你的管理員登入密碼，Email 固定是 `admin@example.com`（可以在部署前先改 `render.yaml` 裡的 `SEED_ADMIN_EMAIL`）。

4. 部署完成後 Render 會給你一個網址（像 `https://coach-platform-xxxx.onrender.com`），把這個網址加上管理員帳密給你的測試教練們就能用了。伺服器第一次啟動時會自動建立資料表跟管理員帳號，不需要額外手動跑指令。

5. 之後每次你要更新程式碼，本機改完後 `git push`，Render 會自動重新部署。

**免費方案的取捨（測試階段通常可以接受）：**
- 網頁服務閒置 15 分鐘後會「睡著」，下一個人來訪問時要多等 30-60 秒喚醒，之後就正常。對「請幾位教練找時間來測試」這種情境通常還好；如果會影響體驗，可以之後把服務升級成 Starter（US$7/月）就不會睡眠。
- 免費 PostgreSQL 建立後 **30 天會到期**，到期前 Render 會寄信提醒，可以在到期前升級成付費方案保留資料，或是趁還沒到期先用「匯出/匯入」功能把資料備份下來。如果只是抓幾週時間給教練測試，這個限制通常不是問題。

**如果只是想先給 1-2 個人快速看一眼、不需要放好幾天**：可以在自己電腦跑 `npm start`（連本機或雲端的 PostgreSQL 都可以），再用 [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/) 或 ngrok 開一個臨時公開網址，完全免費、幾分鐘搞定，但電腦要一直開著、關掉就斷線，不適合放讓 20 位教練陸續測試好幾天的場景。

### 部署到 Netlify

如果你已經在 Netlify 建了網站，也可以部署到那邊，專案已經準備好對應的設定。跟 Render 最大的不同：**Netlify 是靜態網站 + serverless function 平台，不是跑一個持續運行的伺服器**，所以架構上做了這些調整：

- `app.js`：純 API（路由、middleware），不含啟動伺服器的邏輯，兩種部署方式共用
- `server.js`：本機開發跟 Render 用的進入點，載入 `app.js` 再加上靜態檔案服務、`app.listen()`
- `netlify/functions/api.js`：Netlify 用的進入點，用 `serverless-http` 把 `app.js` 包成一個 function
- `netlify.toml`：告訴 Netlify 靜態檔案在 `public/`，並把所有 `/api/*` 的請求導到這個 function

**Netlify 本身不提供資料庫**，所以你需要一個外部的 PostgreSQL 連線字串。免費選項：
- [Neon](https://neon.tech)（推薦——free tier 有內建連線池，跟 serverless function 這種「每次請求可能是新的執行環境」的架構搭配比較不會有連線數爆掉的問題）
- [Supabase](https://supabase.com) 的免費 Postgres
- 或沿用前面 Render 免費方案裡建立的 PostgreSQL（就只用那個資料庫，不用把網頁服務也部署到 Render）

**部署步驟：**

1. 到 Neon（或 Supabase）建立一個免費資料庫，複製它的連線字串（通常長得像 `postgres://user:password@host/dbname?sslmode=require`）
2. 把專案推上 GitHub（同前面 Render 那段的步驟）
3. 在 Netlify 後台把你的 GitHub repo 連接到你的網站（如果網站是空的，選「Import from Git」）；`netlify.toml` 已經幫你把 build 設定寫好了，通常不用再手動調整
4. 到 Netlify 後台的「Site configuration → Environment variables」，新增：
   - `DATABASE_URL` = 你從 Neon/Supabase 複製的連線字串
   - `JWT_SECRET` = 隨便一長串亂數字串（例如用 `openssl rand -hex 32` 產生）
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` = 你想要的管理員帳密（不設定的話會用程式裡的預設值 `admin@example.com` / `admin1234`，正式測試前建議自己設一組）
5. 觸發部署（push 一次 commit，或在 Netlify 後台按 Deploy），完成後你的網站網址就能直接用了

**已知限制（原型階段可以接受，工程師接手時可以優化）**：每個 function 呼叫都可能是全新的執行環境，資料庫連線池沒辦法像傳統伺服器一樣長期重複使用，流量大的時候效能會比 Render/傳統伺服器差一些；这個架構已經實際測試過（登入、管理員新增教練、教練新增選手、寫入紀錄、多教練資料隔離），對現在 20 位教練的測試規模來說沒問題。

## 目前完成的範圍 vs. 之後要做的事

**已完成（可實際運作，且完整保留原介面）：**
- 登入驗證（JWT）、角色區分（admin / coach），三個畫面（登入/教練/管理員）用同一個 HTML 檔案切換
- 管理員：新增/停用/刪除教練帳號、重設教練密碼、平台總覽數字
- 教練：原本單機版的所有功能都還在——選手管理（含身高體重年齡專項）、阻力訓練紀錄（新增測試/歷史記錄/分析圖表/教練報表）、游泳檢測紀錄（新增檢測/檢測歷史/檢測分析）、全隊總覽、匯出/匯入
- 資料隔離已用實際 API 請求（對真的 PostgreSQL）測試驗證
- 可以免費、不需要信用卡部署到 Render 上讓別人測試

**還沒做，適合工程師接手時擴充：**
- 密碼重設目前用瀏覽器 `prompt()`，正式上線建議改成 email 驗證流程
- 免費 PostgreSQL 30 天會到期，正式上線前需要升級成付費方案（Render 或其他代管 Postgres 服務皆可）
- 沒有帳號自助註冊（刻意設計成只有 admin 能建立教練帳號，符合「管理員管教練」的需求）
- 沒有 HTTPS 自訂網域／正式部署設定，這部分請工程師依實際需求處理（Render 本身已提供 HTTPS，若要自訂網域需另外設定）
- 建議正式上線前把 `.env` 的 `JWT_SECRET` 換成長隨機字串（Render Blueprint 已經會自動產生，本機開發記得自己換），並考慮加上 rate limiting 防暴力破解登入
- 「完整選手管理」頁面目前的跨選手比較/常態分佈等統計，運算邏輯還是在前端用當下已載入的資料做（因為資料量不大，原型階段夠用），選手數量若大幅成長，建議把這些聚合計算搬到後端 SQL 做

## 技術選型說明（給接手的工程師）

- **Express + node-postgres（pg）**：標準組合，`db/index.js` 用 `pool.query()` 執行所有 SQL，啟動時自動 `CREATE TABLE IF NOT EXISTS`，不需要額外的 migration 工具。所有路由都是 async/await，用 `middleware/auth.js` 裡的 `ah()` wrapper 包起來，讓 Promise reject 會正確轉成 500 錯誤而不是讓伺服器掛掉。
- **JWT 存在 localStorage**：前端每次 API 請求帶 `Authorization: Bearer <token>`。單純原型夠用；正式上線可考慮改用 httpOnly cookie 降低 XSS 風險。
- **前端沒有用框架**：純 HTML + vanilla JS，維持原本單機版的寫法，方便直接比對改了哪裡；如果後續 UI 複雜度提高，建議換成 React/Vue 等框架重寫前端，後端 API 不需要跟著大改。
- **為什麼從 SQLite 換成 PostgreSQL**：一開始用 SQLite 是因為零設定、單檔案好搬移，但這代表部署時一定要挑「有永久硬碟」的付費方案。換成 PostgreSQL 後可以用 Render（或其他平台）真正免費的資料庫方案，不需要绑信用卡就能先讓別人測試，之後要換代管的 Postgres 服務（AWS RDS、Supabase 等）也更直接。
- **`app.js` / `server.js` 分開**：`app.js` 只定義 API（路由 + middleware），不含啟動伺服器的邏輯；`server.js` 是傳統 Node 伺服器的進入點（本機、Render 用），`netlify/functions/api.js` 是 Netlify serverless function 的進入點，兩者共用同一份 `app.js`。這樣同一份程式碼可以同時部署到「持續運行的伺服器」（Render）跟「serverless function」（Netlify）平台，不用維護兩份 API 邏輯。
