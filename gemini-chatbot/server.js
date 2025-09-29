// server.js (CommonJS 版)
const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 靜態檔案（前端頁面）
app.use(express.static(path.join(__dirname, "public")));

// 準備 Gemini 模型
if (!process.env.GOOGLE_API_KEY) {
  console.error("Missing GOOGLE_API_KEY in .env");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// 使用 gemini-2.5-pro 提供更深入的思考和回答能力
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

// 單次回覆 API：把前端的歷史 + 當前訊息組成 contents 給 Gemini
app.post("/api/chat", async (req, res) => {
  try {
    const { history = [], message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required (string)" });
    }

    const systemPrompt = {
    role: "user",
    parts: [
        { text: `角色：你是一位精通占星學的AI訓練師，結合現代心理學與古老星象知識。

能力與專長：
- 熟悉黃道十二宮、行星相位、宮位解讀等專業占星知識
- 能根據出生日期、時間與地點分析個人星盤
- 精通心理占星學，將占星解讀與心理成長結合
- 能提供個人化的生活指導、關係分析與職業發展建議
- 理解並尊重不同文化中的占星傳統與詮釋

回應方式：
- 提供專業且易懂的占星分析，避免神秘主義或決定論表述
- 強調個人選擇的重要性，星象僅為參考
- 平衡科學思維與占星傳統，實事求是
- 針對問題提供具體、建設性的建議
- 使用溫暖、鼓舞人心的語調，注重心理輔導元素
- 所有回答必須控制在500字以內，簡明扼要

限制：
- 不做絕對預言或宣稱能預知未來
- 不取代專業醫療或心理健康建議
- 避免模糊不清或過於一般化的解讀
- 不強化迷信思維或依賴性行為
- 回答字數必須在500字以內

互動模式：
當用戶提供出生信息時，你將：
1. 確認資料完整性（日期、時間、地點）
2. 提供星盤基本資訊（太陽、月亮、上升星座等）
3. 根據用戶問題提供針對性解讀
4. 結合心理學見解提供成長建議
5. 確保回答精簡，不超過500字` }
    ]
    };


    // history 形如 [{role:'user'|'model', text:'...'}, ...]
    const contents = [
      systemPrompt,
      ...history.map((h) => ({
        role: h.role === "model" ? "model" : "user",
        parts: [{ text: String(h.text || "") }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    const response = await model.generateContent({
      contents,
      generationConfig: {
        temperature: 0.5, // 降低溫度可提高響應速度
        maxOutputTokens: 350, // 大約限制在500字以內（中文約1.5個token/字）
        topK: 40, // 限制可能的下一個詞彙選擇範圍
        topP: 0.9, // 設置較高的值但不要太高，以保持一定的多樣性同時提高速度
      },
    });

    const text = response.response.text();
    return res.json({ reply: text });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: err?.message || "Server error calling Gemini API" });
  }
});

// 啟動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
});
