# 📚 Homework Helper

An AI-powered homework helper using Groq (free & fast). Users get **hints first**, then the full answer. Supports text questions + image upload/paste/drag-and-drop.

---

## 🚀 Deploy to Render (free, ~5 minutes)

### Step 1 — Get a free Groq API key
1. Go to https://console.groq.com
2. Sign up for free
3. Click **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_...`)

### Step 2 — Put this project on GitHub
1. Go to https://github.com and create a free account if needed
2. Click **New repository** → name it `homework-helper` → **Create**
3. Upload all these files to the repo (drag & drop them on the GitHub page)

### Step 3 — Deploy on Render
1. Go to https://render.com and sign up free
2. Click **New** → **Web Service**
3. Connect your GitHub account and select your `homework-helper` repo
4. Render will auto-detect the settings from `render.yaml`
5. Click **Advanced** → **Add Environment Variable**:
   - Key: `GROQ_API_KEY`
   - Value: paste your key from Step 1
6. Click **Create Web Service**
7. Wait ~2 minutes for it to build and deploy

### Step 4 — Done! 🎉
Render gives you a free URL like `https://homework-helper-xxxx.onrender.com`
Share it with anyone — no login, no API key needed for users!

---

## 📁 Project Structure

```
homework-helper/
├── api/
│   └── index.js       ← Express backend (keeps your Groq key secret)
├── public/
│   └── index.html     ← Frontend UI
├── package.json
├── render.yaml        ← Render deploy config
└── README.md
```

---

## ⚠️ Free Tier Notes

- **Render free tier** spins down after 15 min of inactivity — first visit after idle takes ~30 seconds to wake up. Upgrade to a paid plan ($7/mo) to avoid this.
- **Groq free tier** has generous rate limits — plenty for personal/school use.

---

## 🛠 Running Locally

```bash
# Install dependencies
npm install

# Set your Groq key
export GROQ_API_KEY=gsk_your_key_here   # Mac/Linux
set GROQ_API_KEY=gsk_your_key_here      # Windows

# Start
npm start

# Open http://localhost:3000
```
