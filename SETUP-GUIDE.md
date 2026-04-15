# 🎯 LinkedIn Job Scout — Setup Guide

Automatically searches LinkedIn every day for your target roles, filters English-only jobs, matches them against your resume using Claude AI, and sends you a ranked email digest.

---

## What you'll need

- A **Mac or Windows** computer
- A **LinkedIn** account
- A **Gmail** account
- An **Anthropic** account (for Claude AI) — costs ~$0.10 per daily run
- About **20 minutes** to set up

---

# PART 1 — Install Node.js (one time only)

Node.js is the engine that runs this script.

**Mac:**
1. Go to **https://nodejs.org**
2. Click the big green **LTS** button → download the `.pkg` file
3. Double-click it → click through the installer → done

**Windows:**
1. Go to **https://nodejs.org**
2. Click the big green **LTS** button → download the `.msi` file
3. Double-click it → click Next through everything → done

**Verify it worked** — open Terminal (Mac) or Command Prompt (Windows) and type:
```
node --version
```
You should see something like `v20.11.0` ✅

---

# PART 2 — Get your API keys

## Anthropic API Key (for Claude AI)

1. Go to **https://console.anthropic.com** → Sign Up
2. Click **API Keys** in the left sidebar → **Create Key**
3. Name it `job-scout` → click Create
4. **Copy the key** (starts with `sk-ant-...`) and save it somewhere — shown only once!
5. Click **Billing** → Add $5 credit (lasts ~50 days)

## Gmail App Password

1. Make sure **2-Step Verification** is ON on your Google account:
   → Go to **https://myaccount.google.com/security** and enable it

2. Create an App Password:
   → Go to **https://myaccount.google.com/apppasswords**
   → App name: `jobscout` → click **Create**
   → **Copy the 16-character code** (e.g. `abcdabcdabcdabcd`) — no spaces!

---

# PART 3 — Set up the script

## Step 1 — Open Terminal (Mac) or Command Prompt (Windows)

**Mac:** Press `Cmd + Space`, type `Terminal`, press Enter

**Windows:** Press the Windows key, type `cmd`, press Enter

## Step 2 — Go to the script folder

**Mac:**
```
cd ~/Downloads/linkedin-job-scout
```

**Windows:**
```
cd %USERPROFILE%\Downloads\linkedin-job-scout
```

## Step 3 — Install dependencies
```
npm install
```
Wait 2–5 minutes. You'll see a lot of text — that's normal ✅

## Step 4 — Add your resume

Copy your resume file (PDF or Word .docx) into the `linkedin-job-scout` folder and rename it to:
```
my-resume.pdf
```
(or `my-resume.docx` if it's a Word file)

## Step 5 — Fill in your details

Open `config.json` with a text editor:

**Mac:** Right-click `config.json` → Open With → TextEdit
**Windows:** Right-click `config.json` → Open With → Notepad

You'll see:

```json
{
  "anthropicApiKey": "sk-ant-YOUR_KEY_HERE",

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
    "password": "yourgmailapppassword",
    "to": "your.email@gmail.com"
  }
}
```

**Replace these values:**

| Field | Replace with |
|---|---|
| `sk-ant-YOUR_KEY_HERE` | Your Anthropic API key |
| `Procurement Manager` etc. | Your target job titles (keep the format) |
| `91000000` | LinkedIn geo ID for your region (see below) |
| `./my-resume.pdf` | Change to `./my-resume.docx` if Word file |
| `55` | Minimum match score (0–100). 55 = good default |
| `your.email@gmail.com` (×2) | Your Gmail address |
| `yourgmailapppassword` | Your 16-char Gmail App Password (no spaces!) |

**Save the file** (Ctrl+S on Windows, Cmd+S on Mac)

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

---

# PART 4 — Run it

## First run (manual)

In Terminal, type:
```
node index.js
```

**What happens:**
1. A Chrome window opens and goes to LinkedIn
2. **Log in to LinkedIn manually** in that window
3. Come back to Terminal and **press Enter**
4. The script runs automatically (15–30 min)
5. You get an email with results ✅

After the first run, your LinkedIn login is saved — future runs are fully automatic.

## Run it every day automatically

```
node scheduler.js
```

Leave Terminal open. It runs at **8:00 AM** every day.
To change the time, open `scheduler.js` and edit `RUN_HOUR` and `RUN_MINUTE`.

**To run in background (Mac/Linux):**
```
nohup node scheduler.js > scout.log 2>&1 &
```

---

# What your email looks like

Every morning you receive a ranked list of jobs:

- **80–100** 🟢 Strong match — apply right away
- **65–79** 🟡 Good match — worth a look
- **55–64** 🟠 Partial match — review carefully

Each job shows:
- Title, company, location, posting date
- Match score and explanation
- Your matching skills highlighted
- Skill gaps to address
- Direct "View & Apply" link

---

# Troubleshooting

| Problem | Solution |
|---|---|
| `node: command not found` | Re-install Node.js and restart computer |
| `npm install` fails | Make sure you're inside the `linkedin-job-scout` folder first |
| LinkedIn keeps asking to log in | Delete the `browser-profile/` folder and log in again |
| Email not sending | Check your App Password has no spaces and 2FA is enabled |
| `Invalid API key` error | Re-copy your Anthropic key from console.anthropic.com |
| No email in inbox | Check your Spam folder |
| 0 jobs found | LinkedIn may have updated their site — create an issue or contact the author |

---

*Built with Node.js, Puppeteer, Claude AI, and Nodemailer*
