const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.use(express.static(path.join(__dirname, "../public")));

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/api/ask", async (req, res) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY not configured on server." });
  }

  const { question, images } = req.body;
  if (!question && (!images || images.length === 0)) {
    return res.status(400).json({ error: "No question or images provided." });
  }

  const userContent = [];
  const hasImages = images && images.length > 0;

  if (hasImages) {
    images.forEach(img => {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${img.mediaType};base64,${img.base64}` }
      });
    });
  }

  userContent.push({
    type: "text",
    text: question || "Please solve this homework problem shown in the image."
  });

  const systemPrompt = `You are a friendly homework tutor. Help students learn, not just copy answers.

Reply in EXACTLY this format:

---HINTS---
(Give exactly 2 short hints. Just enough to nudge the student in the right direction. Do NOT give the answer away.)

---ANSWER---
(Complete, clear answer with full explanation. Show step-by-step working for math/science problems.)`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: hasImages ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile",
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ]
      })
    });

    if (!groqRes.ok) {
      const errData = await groqRes.json().catch(() => ({}));
      return res.status(groqRes.status).json({
        error: errData?.error?.message || `Groq error ${groqRes.status}`
      });
    }

    const data = await groqRes.json();
    const text = data.choices?.[0]?.message?.content || "";
    res.json({ text });

  } catch (err) {
    res.status(500).json({ error: err.message || "Server error" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Homework Helper running on port ${PORT}`));
