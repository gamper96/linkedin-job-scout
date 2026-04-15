# 🎯 LinkedIn Job Scout

> Automatically searches LinkedIn daily for your target roles, filters English-only jobs, matches them against your resume using Claude AI, and sends you a ranked email digest every morning.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![Puppeteer](https://img.shields.io/badge/Puppeteer-22-blue)
![Claude AI](https://img.shields.io/badge/Claude-Sonnet-purple)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

---

## ✨ Features

- 🔍 **Daily search** — scrapes LinkedIn for your target roles posted in the last 24 hours
- 🌍 **Any region** — configure any country or region via LinkedIn Geo ID
- 🗣️ **English filter** — automatically skips non-English job postings
- 🚫 **Language requirement filter** — skips jobs that require German, French, Dutch, etc.
- 🤖 **AI matching** — Claude AI scores each job against your resume (0–100)
- 📧 **Email digest** — ranked list of relevant jobs delivered to your inbox
- ⚙️ **Fully configurable** — set your own roles, region, match threshold

## 📧 Example Email Output

Each morning you receive a digest like this:

| Score | Meaning |
|---|---|
| 🟢 80–100 | Strong match — apply right away |
| 🟡 65–79 | Good match — worth a look |
| 🟠 55–64 | Partial match — review carefully |

Each job card shows: title, company, location, match score, AI summary, matching skills, and skill gaps.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js 18+](https://nodejs.org)
- A LinkedIn account
- A Gmail account
- An [Anthropic API key](https://console.anthropic.com) (~$0.10/day)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/linkedin-job-scout.git
cd linkedin-job-scout

# 2. Install dependencies
npm install

# 3. Create your config file
cp config.example.json config.json

# 4. Fill in your details (see Configuration below)
# Edit config.json with your API key, email, roles, etc.

# 5. Add your resume
cp /path/to/your/resume.pdf ./my-resume.pdf

# 6. Run!
node index.js
```

On first run, a browser window will open — **log into LinkedIn manually**, then press Enter in the terminal. Your session is saved for all future runs.

---

## ⚙️ Configuration

Edit `config.json` (copy from `config.example.json`):

```json
{
  "anthropicApiKey": "sk-ant-...",

  "roles": [
    "Procurement Manager",
    "Vendor Manager",
    "Partnerships Manager"
  ],

  "location": "European Union",
  "linkedinGeoId": "91000000",

  "resumePath": "./my-resume.pdf",

  "matchThreshold": 55,

  "email": {
    "user": "your.email@gmail.com",
    "password": "your-gmail-app-password",
    "to": "your.email@gmail.com"
  }
}
```

### Common LinkedIn Region IDs

| Region | ID |
|---|---|
| European Union | `91000000` |
| United Kingdom | `101165590` |
| United States | `103644278` |
| Germany | `101282230` |
| Netherlands | `102890719` |
| France | `105015875` |
| Spain | `105646813` |

### Getting a Gmail App Password
1. Enable **2-Step Verification** at [myaccount.google.com/security](https://myaccount.google.com/security)
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create a new app password → copy the 16-character code (no spaces)

---

## 📅 Running Daily

### Option A — Scheduler script
```bash
node scheduler.js
```
Runs every day at 8:00 AM. Change the time by editing `RUN_HOUR` and `RUN_MINUTE` in `scheduler.js`.

### Option B — Background process (Mac/Linux)
```bash
nohup node scheduler.js > scout.log 2>&1 &
```

### Option C — Cron job
```bash
crontab -e
# Add this line (runs at 8 AM daily):
0 8 * * * cd /path/to/linkedin-job-scout && node index.js >> scout.log 2>&1
```

---

## 📁 Project Structure

```
linkedin-job-scout/
├── index.js              # Main script
├── scheduler.js          # Daily scheduler
├── config.json           # Your personal config (git-ignored)
├── config.example.json   # Config template (safe to share)
├── package.json          # Dependencies
├── SETUP-GUIDE.md        # Detailed beginner setup guide
└── .gitignore            # Keeps your credentials safe
```

---

## 🔒 Privacy & Security

- `config.json` is **git-ignored** — your API keys and email will never be committed
- `browser-profile/` is **git-ignored** — your LinkedIn session stays local
- The script only accesses LinkedIn using **your own account**, just like a normal browser

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---|---|
| `node: command not found` | Install Node.js from nodejs.org |
| Browser closes immediately | Increase timeout — see SETUP-GUIDE.md |
| 0 jobs found | LinkedIn may have updated their HTML selectors |
| Email not sending | Check App Password has no spaces; verify 2FA is on |
| `Invalid API key` | Re-copy your Anthropic key from console.anthropic.com |

For detailed step-by-step setup, see **[SETUP-GUIDE.md](SETUP-GUIDE.md)**.

---

## 📄 License

MIT — free to use, modify, and share.

---

*Built with [Puppeteer](https://pptr.dev), [Claude AI](https://anthropic.com), and [Nodemailer](https://nodemailer.com)*
