const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "../public")));

app.get("/health", (req, res) => res.json({ ok: true }));

// ── /api/ask — get hints + answer ──────────────────────────────────
app.post("/api/ask", async (req, res) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: "Server not configured." });

  const { question, images } = req.body;
  if (!question && (!images || images.length === 0))
    return res.status(400).json({ error: "No question or images provided." });

  const hasImages = images && images.length > 0;

  const systemPrompt = `You are a friendly homework tutor. Help students learn, not just copy answers.

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
      return res.status(groqRes.status).json({ error: e?.error?.message || `Groq error ${groqRes.status}` });
    }
    const data = await groqRes.json();
    res.json({ text: data.choices?.[0]?.message?.content || "" });
  } catch (err) {
    res.status(500).json({ error: err.message || "Server error" });
  }
});

// ── /api/check — grade the user's answer ───────────────────────────
app.post("/api/check", async (req, res) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: "Server not configured." });

  const { question, userAnswer, correctAnswer } = req.body;
  if (!userAnswer) return res.status(400).json({ error: "No answer provided." });

  const systemPrompt = `You are a homework grader. Evaluate the student's answer fairly and helpfully.

Reply in EXACTLY this JSON format (no markdown, no code fences, raw JSON only):
{
  "verdict": "correct" | "partial" | "wrong",
  "feedback": "Your encouraging feedback here. If wrong or partial, explain what was incorrect and guide them toward the right answer without just stating it. Keep it under 4 sentences."
}

Rules:
- "correct" = the answer is right (allow minor wording differences, rounding, etc.)
- "partial" = some parts are right but key parts are missing or wrong
- "wrong" = the answer is incorrect or completely off-track
- Always be encouraging, never harsh.`;

  const userMsg = `Question: ${question || "(see image)"}
Correct answer: ${correctAnswer}
Student's answer: ${userAnswer}`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 400,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg }
        ]
      })
    });
    if (!groqRes.ok) {
      const e = await groqRes.json().catch(() => ({}));
      return res.status(groqRes.status).json({ error: e?.error?.message || `Groq error ${groqRes.status}` });
    }
    const data = await groqRes.json();
    const raw = data.choices?.[0]?.message?.content || '{"verdict":"wrong","feedback":"Could not evaluate."}';
    let parsed;
    try {
      // Strip any accidental markdown fences
      const clean = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = { verdict: "wrong", feedback: raw };
    }
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || "Server error" });
  }
});



// ── /api/followup — answer follow-up questions ─────────────────────
app.post("/api/followup", async (req, res) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: "Server not configured." });

  const { question, answer, followup } = req.body;
  if (!followup) return res.status(400).json({ error: "No follow-up provided." });

  const systemPrompt = `You are a friendly homework tutor. A student just got help with a question and has a follow-up query. Answer it clearly and concisely in 2-4 sentences. Be warm and encouraging. Do not use markdown headers. You may use bullet points sparingly.`;

  const userMsg = `Original question: ${question || "(image-based)"}
Correct answer: ${answer || "(not available)"}
Student's follow-up: ${followup}`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 400,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg }
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
