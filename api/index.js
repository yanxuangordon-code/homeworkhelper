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
  if (!GROQ_API_KEY) return res.status(500).json({ error: "Server not configured." });

  const { question, images, subject } = req.body;
  if (!question && (!images || images.length === 0))
    return res.status(400).json({ error: "No question or images provided." });

  const hasImages = images && images.length > 0;
  const subjectLine = subject && subject !== 'any' ? `The subject is: ${subject}. ` : '';

  const systemPrompt = `You are a friendly homework tutor. ${subjectLine}Help students learn, not just copy answers.

Reply in EXACTLY this format with no extra text:

---HINTS---
(Exactly 2 short hints. Nudge the student without giving away the answer.)

---ANSWER---
(Complete clear answer with explanation. Show step-by-step working for math/science.)

---DIFFICULTY---
(One word only: Easy, Medium, or Hard)`;

  const userContent = [];
  if (hasImages) {
    images.forEach(img => userContent.push({
      type: "image_url",
      image_url: { url: `data:${img.mediaType};base64,${img.base64}` }
    }));
  }
  userContent.push({ type: "text", text: question || "Please solve this homework problem from the image." });

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
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
      const e = await groqRes.json().catch(() => ({}));
      return res.status(groqRes.status).json({ error: e?.error?.message || `Error ${groqRes.status}` });
    }

    const data = await groqRes.json();
    res.json({ text: data.choices?.[0]?.message?.content || "" });

  } catch (err) {
    res.status(500).json({ error: err.message || "Server error" });
  }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "../public/index.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
