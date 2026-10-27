ROOMFORM 原生 SketchUp 支援（本機已啟用）

已偵測 D:\sketchup\SketchUp，版本 26.2.243。
在網頁左側「SketchUp 模型交換」可直接：
• 按「匯出原生 SketchUp .skp」下載模型。
• 按「匯入 SKP／DAE／交換檔」選擇 .skp。
使用已安裝的 SketchUpAPI.dll 於獨立 Python 程序執行，無須啟動 SketchUp 視窗或安裝 Ruby 套件，不會修改已開啟的模型。
可用環境變數 SKETCHUP_DIR 修改安裝路徑，ROOMFORM_PYTHON 修改 Python 執行檔。
已用 pp4 做網頁端原生 SKP 匯出、讀回與顯示測試：87 群組、尺寸誤差小於 1mm、基本顏色一致。

限制：交換三角網格與基本顏色／透明度，不包含貼圖、場景、動態元件和牆面語意；隱藏物件與圖層顯示狀態不保留。原生模型由本機 SketchUp 2026 API 儲存，舊版相容性未測試。桌面 GUI 開啟尚未驗證。

以下為其他電腦或不使用本機 API 時的替代流程：

ROOMFORM ↔ SketchUp 使用說明

一、DAE 交換（不需安裝轉接套件）
ROOMFORM 左側「SketchUp 模型交換」→ 匯出 SketchUp 相容 DAE。
在 SketchUp 選 File → Import，選擇 COLLADA (.dae)，匯入後用 Save As 存成 .skp。
反向操作：SketchUp File → Export → 3D Model → COLLADA (.dae)，再於 ROOMFORM 匯入 DAE。

二、原生 SKP 透過桌面版轉接
1. 在 SketchUp 桌面版的 Extension Manager → Install Extension 安裝 roomform_bridge.rbz。
2. ROOMFORM 匯出至 SketchUp 轉接工具，取得 roomform.mesh.json。
3. SketchUp Extensions → ROOMFORM → Import ROOMFORM mesh，選擇交換檔。
4. 幾何會加入目前模型（不清除既有內容）；建議使用空白文件，完成後 File → Save As 儲存 .skp。
5. 反向：先在 SketchUp 開啟 .skp，Extensions → ROOMFORM → Export current SKP to ROOMFORM mesh，然後在 ROOMFORM 匯入輸出的 .mesh.json。

限制
Ruby 套件為選用替代流程；此套件尚未在 SketchUp 桌面介面實測。本機網頁直接轉檔使用原生 API。
保留三角網格、群組、基本顏色與透明度；不交換材質貼圖、場景、尺寸標註、動態元件或牆門窗的語意參數。
匯入物件可整組移動、旋轉、縮放與修改顏色，不能自動還原為可編輯的參數牆面；網格漫遊不含碰撞。
限制：單檔 50MB、150 個頂層群組、100 萬個三角面，模型寬深各不超過 58m、高不超過 5m。
匯入時平移至畫布中央並落地，不保留地理定位。DAE 的單位與 Y/Z 向上會自動換算。
