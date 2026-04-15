# 🎯 LinkedIn Job Scout

> Automatically searches LinkedIn every day for your target roles, matches them against your resume using Claude AI, and sends you a ranked email digest every morning.
> ⚠️ **Disclaimer:** This entire project was built with [Claude AI](https://anthropic.com) by author with no coding background. The author is not a developer and cannot provide technical support. Please review all code carefully before running it on your machine. Use at your own risk.

## ✨ What it does

| Step | Action |
|---|---|
| 🔍 | Searches LinkedIn for your target roles posted in the last 24 hours |
| 🌍 | Filters by your region (EU, UK, US, or any country) |
| 🗣️ | Skips non-English job postings automatically |
| 🚫 | Skips jobs that require German, French, Dutch, etc. |
| 🤖 | Claude AI scores each job against your resume (0–100) |
| 📧 | Sends you a ranked email digest every morning |

## 📧 Email digest

Each job shows a match score out of 100, an AI explanation, matching skills, skill gaps, and a direct apply link.

- 🟢 **80–100** — Strong match, apply right away
- 🟡 **65–79** — Good match, worth a look
- 🟠 **55–64** — Partial match, review carefully

## 🚀 Quick start

**Prerequisites:** [Node.js 18+](https://nodejs.org), LinkedIn account, Gmail account, [Anthropic API key](https://console.anthropic.com) (~$0.10/day)

**1. Clone the repo**
```bash
git clone https://github.com/YOUR_USERNAME/linkedin-job-scout.git
cd linkedin-job-scout
```

**2. Install dependencies**
```bash
npm install
```

**3. Create your config file**
```bash
cp config.example.json config.json
```

**4. Add your resume**

Copy your PDF or Word resume into the folder and rename it to `my-resume.pdf`

**5. Run**
```bash
node index.js
```

> On the first run a browser window opens. Log into LinkedIn manually, then press Enter in the terminal. Your session is saved for all future runs.

## ⚙️ Configuration

Edit `config.json`:

```json
{
  "anthropicApiKey": "sk-ant-...",
  "roles": ["Procurement Manager", "Vendor Manager", "Partnerships Manager"],
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

**Common region IDs**

| Region | ID |
|---|---|
| European Union | `91000000` |
| United Kingdom | `101165590` |
| United States | `103644278` |
| Germany | `101282230` |
| Netherlands | `102890719` |
| France | `105015875` |
| Spain | `105646813` |

## 📅 Run automatically every day

```bash
node scheduler.js
```

Runs at **8:00 AM** daily. Change the time by editing `RUN_HOUR` and `RUN_MINUTE` in `scheduler.js`.

## 🔒 Security

`config.json` and `browser-profile/` are in `.gitignore` — your API keys, passwords, and LinkedIn session are **never uploaded to GitHub**.

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| `node: command not found` | Install Node.js from nodejs.org |
| 0 jobs found | Re-run — LinkedIn occasionally blocks automated browsing |
| Email not sending | App Password must have no spaces, Gmail 2FA must be on |
| Browser closes immediately | Delete `browser-profile/` folder and log in again |
| `Invalid API key` | Re-copy your key from console.anthropic.com |

For full beginner setup instructions see [SETUP-GUIDE.md](SETUP-GUIDE.md)

## 📄 License

MIT — free to use, modify, and share.

---

*Built with [Puppeteer](https://pptr.dev) · [Claude AI](https://anthropic.com) · [Nodemailer](https://nodemailer.com)*
