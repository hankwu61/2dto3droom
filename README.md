# 棲境 ROOMFORM

室內平面圖轉 3D 的可執行網頁 MVP。繁體中文介面，Three.js 建模，Express 視覺辨識代理。

[Blender 模型庫預覽](docs/images/blender-asset-library.png) · [可編輯 Blender 原始模型庫](assets/blender/roomform-furniture-library.blend)

## 啟動

需要 Node.js 22 以上。

```sh
npm install
npm run dev
```

瀏覽 http://127.0.0.1:5173 。正式建置使用 `npm run build`，再執行 `npm start`，瀏覽 http://127.0.0.1:3001 。伺服器預設僅綁定本機。

## 使用方式

1. 首頁提供完整的示範配置，包含牆面、窗戶、開啟的門、沙發、床、桌椅、櫃體及植栽。
2. 上傳 PNG/JPG/WEBP（最大 15 MB），填寫**整張圖片對應的寬度**，單位公尺。圖面應先裁切並校正角度。
3. 本機辨識以深色水平／垂直長線擷取牆面，從牆段間的平行窗框、門扇加四分之一開門弧、帶端框的局部推拉門扇辨識門窗，自動接回所屬牆面並按圖面總寬換算開口位置與寬度；空白缺口不直接當成門。家具仍需手動補上。它適用於清晰、簡單、線條較粗的正交平面圖；文字或家具線條可能誤判，細線、斜牆及掃描雜訊可能漏判。
4. 完整自動辨識：目前使用 `AI_PROVIDER=codex`，透過本機 Codex CLI 的登入狀態辨識圖片。介面選擇「Codex CLI · 完整配置辨識」，或按「使用 Codex CLI 辨識這張圖」。`CODEX_MODEL` 留白時沿用 CLI 預設模型，須支援圖片。使用 ChatGPT 登入時依該帳戶方案計算額度；本整合不注入 API 金鑰。仍可設定 `AI_PROVIDER=antigravity` 搭配 `ANTIGRAVITY_MODEL=claude-opus-4-6-thinking` 使用 Claude，或使用既有 API 供應商；修改 `.env` 後重啟後端。
5. 在 3D 或平面圖選取物件，以操作軸拖曳，或在「物件屬性」精確輸入尺寸、位置及材質。點擊右下角平面導覽縮圖或「⤢ 放大」開啟大圖，可繼續選取物件與編輯；按 Esc、關閉按鈕或點外側收起。新增牆面時依序點擊放大圖的起點與終點；門窗工具點擊牆面；選擇家具後點擊平面圖放置。支援複製、刪除、復原與重做。
6. 「走進空間」：WASD 或方向鍵移動、滑鼠環視、Shift 加速、Esc 返回。牆面與家具提供平面碰撞，窗戶不可穿越，門洞可通行。桌面瀏覽器需支援 Pointer Lock。手機可觀看與編輯，但尚無觸控行走控制。
7. 匯出 GLB，可在 Blender 等軟體開啟；儲存／開啟 JSON 專案；下載 PNG 截圖。JSON 保存幾何配置，不保存原始平面圖片。

## 驗證與限制

`npm test` 驗證圖面資料、門窗重疊和牆線辨識；`npm run build` 驗證前端建置。

這是建模與漫遊 MVP，並非工程級 CAD/BIM 或精準測量系統。AI 辨識結果須核對，不保證複雜圖面的家具類別與位置正確；家具使用參數化示意模型。API 未配置金鑰時不會假裝執行 AI。未包含使用者帳號、多使用者儲存、PDF/DWG 匯入、部署與 API 配額管理。若對外部署，需先補上登入、速率限制及 HTTPS。

### Mistral 連線驗證

`/api/status` 回報是否已設定供應商，不代表推論配額一定可用。HTTP 401/403 表示金鑰或權限問題；429 表示供應商速率或配額限制，請檢查 Mistral Console 後重試。

啟動開發服務後，可執行 `node tests/mistral-smoke.mjs`，以合成平面圖驗證 Mistral 辨識門、窗、床並生成 3D。這是需有效金鑰與可用額度的真實 API 測試，可能產生費用，不包含在 `npm test` 中。

### OpenRouter 連線驗證

啟動服務後，執行 `node tests/openrouter-smoke.mjs`，以合成圖驗證門、窗、床的辨識及 3D 更新。這會呼叫真實 API，可能產生費用，不包含於 `npm test`。HTTP 402 表示可用額度不足，429 表示速率或配額限制。

### 辨識失敗處理

AI 輸出的格式或幾何配置不合規時，伺服器最多再請求一次修正，可能增加一次 API 費用；修正後仍須通過完整驗證，不會直接丟棄無效門窗或家具。支援數字字串與 JSON 程式碼區塊，僅自動校正不超過 1 公分的門窗邊界誤差。缺少家具角度時暫設 0°，並顯示核對提示。

失敗原因會持續顯示於轉換按鈕下方，附追蹤碼。422 表示圖片不可辨識或配置在修正後仍不合規；502 表示上游／網路錯誤；504 表示逾時；402/429 保留額度／速率狀態。後端只記錄追蹤碼與錯誤類別，不記錄 API 金鑰或圖片。可執行 `node tests/error-ui.mjs` 驗證錯誤顯示與重試恢復。

輸出 token 預留量預設為 8192（`AI_MAX_TOKENS` 可調整，範圍 1024–32000）。OpenRouter 會依預留量檢查額度，402 不一定代表餘額為零；可依圖面複雜度降低預留量或增加額度。過低的上限可能導致配置截斷，系統會保留驗證並明確回報。

## 3D 編輯工作區

- 點選 3D 物件、平面圖，或左側物件清單。選取物件顯示橘色外框。
- 工具列：選取 V、移動 M、旋轉 R、縮放 S。拖曳彩色操作軸即可修改；旋轉限定水平 Y 軸，移動限定地面 X/Z。門窗沿所屬牆面投影移動，不提供獨立旋轉。
- 家具可輸入 X/Z、寬／深／高、角度；牆面可輸入兩端座標和高度；門窗可輸入牆面編號、距牆起點、開口寬高、窗台高度、平開／推拉樣式及門鉸／開門側。尺寸以公尺計。
- 家具與牆面提供霧面、程序木紋、織布與金屬，搭配自訂色彩。按「套用尺寸與材質」儲存；色票按鈕會直接套用目前欄位。
- 移動吸附 0.1 公尺、旋轉 15°、縮放比例 0.1，可關閉。格線可以切換。
- 複製、Delete 刪除、Ctrl/Cmd+Z 復原、Ctrl/Cmd+Shift+Z 或 Ctrl+Y 重做。幾何驗證不通過時保留原模型。
- 牆面操作軸移動／縮放會帶動其門窗；數值端點編輯會保留原門窗沿牆距離，若開口超出新牆長則拒絕修改。拖曳結束後同步平面、碰撞資料與專案；不再因每次編輯而重設視角。
- 新增「自訂方塊」家具，可作為櫃體／量體，調整長寬高與材質。JSON 專案保存編輯屬性，GLB 保存生成的幾何與材質。

這是室內參數化建模工具，尚未提供 SketchUp 的任意面推拉、布林運算、群組層級及原生 `.skp` 格式。

`node tests/editor-browser.mjs` 驗證數值、材質、操作軸拖曳、複製、復原重做與匯出；`npm test` 包含幾何變換與資料驗證測試。

### Gemini 連線驗證

啟動開發服務後執行 `node tests/gemini-smoke.mjs`，以合成平面圖驗證門、窗、床辨識及 3D 更新。此測試會呼叫真實 Gemini API，可能產生費用；不包含在 `npm test`。

## Antigravity 帳戶模式

此整合使用 [官方 CLI 的 headless 模式](https://www.antigravity.google/docs/cli/headless/)，不是第三方代理。CLI 透過官方登入流程使用帳戶權限與額度；額度和可能的 AI credits 消耗依 Antigravity 帳戶設定。模型固定為 `claude-opus-4-6-thinking`，不自動切換其他模型或 API。

Windows 預設 CLI 路徑為 `%LOCALAPPDATA%\agy\bin\agy.exe`。可用 `ANTIGRAVITY_CLI_PATH` 指定完整路徑。CLI 安裝依 [官方安裝文件](https://www.antigravity.google/docs/cli/install/)；首次使用請開啟 CLI 並登入有 Claude 使用權限的帳戶。`agy models` 可查模型，互動模式 `/usage` 可查額度。

每次辨識將縮小後的圖片暫存於 `.roomform-antigravity/plan-*`，只交給此工作區的讀圖任務；呼叫時不傳入既有 API 金鑰，不使用自動核准全部工具的參數。完成或失敗後刪除暫存圖片。CLI 自己的歷史紀錄依 Antigravity 設定保存。結果必須通過同一套幾何驗證；CLI 模式會重新對照原圖並進行最多三輪配置驗證與修正。若 CLI 要求登入、讀圖權限或額度不足，畫面會提示，不會改呼叫其他 API。

`node tests/antigravity-smoke.mjs` 是真實 Claude 圖片辨識測試，會使用 Antigravity 額度；`npm test` 中的 CLI 測試使用模擬執行器。

此電腦的 CLI 已加入一條必要讀取規則：`read_file(D:/2Dto3DROOM/.roomform-antigravity)`，位於 `%USERPROFILE%\.gemini\antigravity-cli\settings.json` 的 `permissions.allow`。規則只允許讀取本系統的辨識暫存目錄，不包含 shell 執行或其他目錄。移至其他電腦／路徑時須相應設定。

## pp4 完整估算模型

開啟 `http://127.0.0.1:5173/?project=pp4`，或在左側按「載入 pp4 完整估算模型」。此模型依 pp4.jpg 人工描繪，包含 17 段牆、15 組門窗及 43 個家具／設備／柱體，保留凹凸外輪廓與兩處陽台。家具目錄新增浴缸、馬桶、洗手台、廚櫃、水槽、爐具、冰箱、淋浴間、洗衣機、電視、圓几和柱體。

比例暫採 0.018 m/px：以兒童床約 2m、室內門約 0.9m、玄關門約 1.1m 交叉估算。裁切畫布是 12.6 × 11.52m；不規則輪廓面積約 105.9m²，含陽台和柱體範圍，不是室內淨面積。原圖未提供尺寸，樓高、設備高度、材質及模糊符號屬推估，不是施工測量成果。個別推定項目保存在專案 notes/name。

「兒童床長／校正基準」初值 1.962m；輸入實際長度並按校正，可同步縮放牆、門窗、家具、地板、房間和行走起點的水平座標及尺寸。高度保持獨立，校正可復原。以另一物件為基準時，倍率同樣為實測長度 ÷ 目前模型長度。

「低牆檢視」僅裁切預覽中的高牆、門窗、高櫃與柱體；漫遊和 GLB 匯出保留完整高度。JSON 可重新載入編輯，GLB 可在支援 glTF 的工具使用。

`node scripts/build-pp4.mjs` 重建參數專案；`node tests/pp4-browser.mjs` 驗證 pp4 載入、比例校正、復原、GLB/JSON 匯出和漫遊，並產生 output 下的圖片與模型。不呼叫 AI API。


## Antigravity 自動比例與多輪修正

選擇 Antigravity 辨識後，預設勾選「AI 自動估算比例」。先請模型在整張圖片上標示 2–6 個床長、門洞或廚櫃深度基準；伺服器依影像長寬比計算各基準推導的圖面寬度，排除偏離中位數超過 20% 的樣本，並要求至少兩個一致基準。缺少可靠基準時會要求改用手動寬度，不會偷偷採用預設比例。

之後固定比例建立配置，至少再對照原圖核對一次，配置階段最多三輪。每轮驗證家具類型、數值、尺寸、邊界、門窗牆索引及重疊；另提示疑似牆端縫隙、重複物件與家具輪廓越界。模型也會核對遺漏設備、方向及視覺重疊。硬性錯誤未修正時回傳具體物件與欄位，疑似問題保留在畫面警示。這些檢查不代表已證明完整重建或施工精度。

自動比例共最多四次 CLI 呼叫，每次預設最多 600 秒（以 ANTIGRAVITY_TIMEOUT_SECONDS 設定 30–1800 秒），會使用 Antigravity 額度；手動寬度模式最多三次。原圖每輪均重新提供，沒有改用其他 API。專案 JSON 保留 scale.anchors、排除樣本、比例及 analysis.rounds，方便核對。可關閉自動比例，輸入已知整張圖面寬度。

`node tests/review-browser.mjs` 使用模擬 API 驗證前端流程；`node scripts/check-reviewed-pp4.mjs` 使用真實 Antigravity 額度辨識 pp4，結果保存至 output/pp4-antigravity-reviewed.json。

## SketchUp 交換

左側新增 DAE 匯入／匯出及 mesh JSON 轉接入口。操作說明：`public/sketchup/README.txt`。可安裝的 SketchUp 桌面 Ruby 套件：`public/sketchup/roomform_bridge.rbz`。

原生 .skp 已接上本機 D:\sketchup\SketchUp 的 SketchUp 2026 API，可直接透過網頁匯入／匯出。Ruby 套件為替代流程，尚未在桌面 GUI 驗證。DAE 與 mesh JSON 支援三角網格、群組及基本顏色，不含貼圖、場景、動態元件與牆體語意。匯入網格可按群組變換，暫無網格行走碰撞。

`node tests/sketchup-browser.mjs` 驗證 pp4 DAE 往返的尺寸、三角面與顏色、JSON 匯入、群組編輯和原生 SKP 提示。`npm test` 驗證交換資料及幾何限制。

官方文件：https://help.sketchup.com/en/sketchup/importing-and-exporting-collada-files 、https://ruby.sketchup.com/Sketchup/Entities.html 、https://ruby.sketchup.com/Sketchup/Face.html 。


### 原生 SKP 本機服務

`sketchup-native.js` 使用 `scripts/sketchup_native.py` 載入已安裝的 SketchUpAPI.dll，未複製或散布 DLL。`SKETCHUP_DIR` 可覆寫安裝路徑，`ROOMFORM_PYTHON` 可指定 Python。服務僅綁 localhost；轉檔使用独立程序、120 秒上限、50 MB 檔案上限、單一工作鎖及獨立暫存目錄；結束後清理。

API：GET `/api/sketchup/status`、POST `/api/sketchup/export`（mesh JSON）、POST `/api/sketchup/import`（application/octet-stream SKP）。保留頂層群組與基礎材質，巢狀變換會展開為網格座標；貼圖、場景、動態元件、隱藏狀態與地理定位不保留。匯出採本機 2026 格式，未驗證舊版或桌面 GUI。

`node tests/sketchup-native-browser.mjs` 實測 pp4 原生 SKP 匯出／重新匯入、87 群組、尺寸差 <1mm、基本顏色與網頁顯示。檔案：output/pp4-native.skp。


## 本機專案記憶

左側「我的專案」可切換與重新命名。每次上傳平面圖、載入示範或匯入 JSON／SketchUp 模型均建立獨立專案。圖片尚未辨識時為空白草稿，不沿用上一專案的家具。編輯透過本機 API 自動寫入 SQLite，保存原圖、模型（含比例及辨識報告）、名稱、尺寸輸入和辨識方式。重新整理會還原上次專案，復原／重做歷史在切換時重置，避免跨專案操作。

資料保存在 D:\2Dto3DROOM\data\projects.sqlite，由連至同一後端的瀏覽器共用；清除瀏覽器資料不會刪除 SQLite 專案。需啟動後端才可儲存。頂端「儲存專案」會下載含原圖的 JSON 備份，透過「開啟專案」可重新匯入。儲存失敗會顯示提示，不宣稱已保存。辨識或模型匯入中禁止切換專案。

`node tests/projects-browser.mjs` 驗證兩張圖隔離、原圖、家具、樓高、重新命名、重新整理還原及含圖片備份；測試採獨立瀏覽器，不修改使用者專案。


### SQLite 專案儲存與舊資料搬移

使用 Node.js 24 的內建 node:sqlite（目前環境為 24.13.0），不需另外安裝資料庫服務。預設 `data/projects.sqlite`；可用環境變數 `ROOMFORM_PROJECT_DB` 指定另一檔案。資料表 projects 保存完整專案 JSON（含原圖），settings 保存最近專案，migrations 確保舊資料只搬移一次。寫入採交易與 WAL。資料目錄已排除版本控制。

首次以原本的瀏覽器／網址重新開啟頁面時，會讀取舊 IndexedDB 並逐筆傳送至 SQLite。原 IndexedDB 不刪除；失敗會提示並於下次重試；同一專案再次搬移不覆蓋 SQLite 新編輯。瀏覽器 A 的舊資料不能從瀏覽器 B 讀取，因此請在原瀏覽器開啟一次。搬移後所有連到同一後端的瀏覽器共用新資料庫。

備份可使用畫面「儲存專案」下載個別含圖 JSON；整庫備份請先關閉本程式後複製 data 資料夾，避免漏掉運作中的 WAL 檔案。SQLite 服務離線時顯示錯誤，不退回瀏覽器儲存，也不宣稱寫入成功。

`tests/project-store.test.js` 驗證重開資料庫與重複搬移；`tests/projects-browser.mjs` 使用獨立 SQLite 暫存資料庫與測試 API 連接埠 3002，驗證跨瀏覽器還原、舊 IndexedDB 搬移及編輯保存，不修改使用者正式資料庫。

### CLI 回應格式處理

Antigravity 的說明文字若伴隨完整 JSON，會擷取最後配置物件（支援程式碼區塊或未包區塊的 JSON）；未完成的最後草稿不會退回使用較早版本。若只有說明文字或 JSON 未完成，下一輪使用 CLI conversation_id 接續同一對話，明確要求輸出完整配置。重試仍受原本三輪上限限制，失敗會回報格式錯誤而非幾何錯誤。模型內容不使用 eval，也不自行補造缺失座標。已以模擬 CLI 測試驗證，不能保證模型每次都會完成輸出。

### 門窗自動定位與尺寸

本機模式支援清晰正交圖面的平行窗框與帶門扇／開門弧的平開門。無完整符號、雙扇平開門、斜牆或線條過細時，請使用視覺 AI 並核對結果。本機辨識屬啟發式，仍可能漏判或誤判。輸入正確的整張圖面寬度才能得到正確的公尺尺寸。

視覺 AI 會逐牆檢查門窗、以兩側門框／窗框之間的距離取得開口寬度，辨識推拉樣式與平開門方向。3D 牆體依開口實際寬高挖空；門窗跟隨所屬牆的方向，包括斜牆及反向牆。JSON 門窗新增可選 `height`、`sillHeight`、`style`（`hinged`／`sliding`）、`hinge`（`start`／`end`）、`swing`（`1`／`-1`）。正側為沿牆起點至終點方向的法向量 `(-dz, dx)`。

平面圖通常無法提供垂直高度；未標註時，門高預設 2.2m，窗台 0.9m、窗高 1.3m，並依牆高限制。可在「物件屬性」校正。整體比例校正只縮放水平位置與寬度，高度與窗台保持獨立。舊專案相容上述預設值。

本機辨識分開處理深色牆體與反鋸齒灰色細線，避免窗框／門弧被牆線閾值濾除。若門框包含平行線，優先以完整門扇及門弧確認門型；推拉門須同時有平行門扇、端框與淨空通道。零門窗結果會明確顯示「未辨識到門窗」。

### Antigravity 504 與額度診斷

每輪 CLI 預設等待 600 秒，子程序另保留 5 秒結束時間。可在 `.env` 設定 `ANTIGRAVITY_TIMEOUT_SECONDS=900` 後重啟後端。前端會從 `/api/status` 取得上限，依是否自動比例計算三／四次呼叫的完整等待時間。頁面每 10 秒更新目前階段及本輪已等待秒數；這是階段資訊，不是模型完成百分比。關閉辨識連線會取消正在執行的 CLI。既有 JSON API 保持相容。

`TIMEOUT` 表示 CLI 等待時間用完；`CLI_QUOTA`（429）表示帳戶額度／速率限制，延長 timeout 無效；`CLI_AUTH` 表示需由啟動後端的同一個 Windows 帳戶開啟 CLI 登入；`CLI_PERMISSION` 表示需核准讀圖權限。零輸出／非零退出碼中的錯誤會分開處理，不會一律報逾時。額度請在 CLI 的 `/usage`、`/credits` 查看。關閉自動比例並手動輸入已知寬度，可少一次 CLI 呼叫。

### Codex CLI 帳戶模式

設定 `.env`：

```dotenv
AI_PROVIDER=codex
CODEX_TIMEOUT_SECONDS=600
# 留白沿用 CLI 預設模型，或填入帳戶可用且支援圖片的模型。
CODEX_MODEL=
# 通常可自動尋找；必要時填 codex.exe 或 npm 安裝的 bin/codex.js 完整路徑。
CODEX_CLI_PATH=
```

以啟動 ROOMFORM 後端的同一個 Windows 帳戶執行 `codex login`，再用 `codex login status` 確認登入。透過 ChatGPT 登入時使用該帳戶的 Codex 額度；API 登入則依 API 計費，請確認登入方式。修改設定後重啟 `npm run dev`，重新整理網頁，選擇 Codex CLI 後辨識。

後端可從 PATH、Windows Codex 桌面應用程式的版本化 bin 目錄、或 npm 全域安裝目錄尋找 CLI。使用 `codex exec --image` 附上圖片、`--sandbox read-only --ephemeral` 執行，從 `--output-last-message` 指定的檔案讀取最終 JSON；不解析進度日誌為模型配置，不使用 bypass 參數。暫存圖面與結果在 `.roomform-codex/plan-*`，結束後清除。CLI 沿用自身登入與設定，帳戶憑證不複製到專案。

Codex 支援自動比例及最多三輪建模／核對，位置、門窗邊界、重疊和尺寸必須通過相同幾何驗證。每輪預設上限 600 秒；網頁顯示目前階段與已等待秒數。關閉連線會取消該辨識。額度不足、未登入、逾時與無效 JSON 分開回報。既有 Antigravity 模式亦沿用同一個進度串流。

`node tests/codex-browser.mjs` 使用隔離專案及模擬辨識，驗證網頁流程與進度／錯誤處理；`tests/codex.test.js` 驗證 CLI 參數、圖片、最終輸出、比例、核對及錯誤分類。這些測試不消耗真實模型額度。

### Blender 細節模型

家具、衛浴與門窗使用 Blender 5.2 建立的本機 GLB 模型庫 `public/models/roomform-furniture.glb`，包含全部 19 種家具／設備、平開門框、門扇、窗框及推拉門，共 23 個資產。包含柔化邊緣、坐墊滾邊、被單皺褶、實際凹槽的浴缸／洗手盆／水槽、龍頭、排水口、門鎖、窗把手、金屬與透明玻璃等細節。木紋與織布貼圖由腳本產生，沒有外部模型授權或貼圖下載依賴。

原本的專案 JSON 不需轉換：載入後會自動使用新模型。水平包圍盒精確依家具寬深調整，底部貼齊地面；已指定的高度照原值縮放。門窗沿既有牆面位置、寬高、窗台與開門方向建立。材質編輯保留，五金與玻璃維持各自材質。每個實例使用獨立資源，編輯、復原或刪除不會影響其他物件。模型庫未成功載入時會顯示提示並使用基本模型。

場景使用工作室環境反射、柔和陰影及 ACES 色調映射。GLB 匯出保留詳細網格、貼圖與透明材質；SketchUp 交換檔／DAE 仍依原有格式輸出網格與基本色，不保留貼圖。3D 匯出會等待模型庫載入完成。

Blender 原始庫：`output/roomform-furniture-library.blend`；模型預覽：`output/blender-asset-library.png`。模型資訊與三角面數記錄於 `public/models/manifest.json`。使用 PowerShell 重新建立：

```powershell
& 'D:\Blender 5.2\blender.exe' --background --factory-startup --python scripts/build-blender-assets.py
```

這會重新產生 GLB、manifest、原始 `.blend` 及模型庫預覽。整個模型庫約 6.6 萬三角面、3.2 MB GLB，按材質合併網格減少繪製呼叫；並非每個家具部件各用一個 draw call。`node tests/blender-assets-browser.mjs` 驗證所有類型、尺寸及落地、獨立材質、編輯／復原、門窗與 GLB 貼圖／玻璃及載入失敗回退。
