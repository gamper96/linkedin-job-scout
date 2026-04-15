#!/usr/bin/env node

/**
 * ─────────────────────────────────────────
 *  LinkedIn Job Scout
 *  Searches LinkedIn daily for your target
 *  roles, filters by language, matches with
 *  Claude AI, and emails you the results.
 * ─────────────────────────────────────────
 */

const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');
const pdfParse  = require('pdf-parse');
const mammoth   = require('mammoth');

// ─── Load config ─────────────────────────────────────────────────────────────
const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ config.json not found. Copy config.example.json to config.json and fill in your details.');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// ─── Build search queries from config ────────────────────────────────────────
const SEARCH_QUERIES = config.roles.map(role => ({ keywords: role, label: role }));
const GEO_ID = config.linkedinGeoId || '91000000'; // default = European Union

// ─── Language filter patterns ─────────────────────────────────────────────────
const NON_ENGLISH_REQUIRED_PATTERNS = [
  /fluent\s+in\s+(german|french|italian|dutch|spanish|portuguese|polish|czech|hungarian|romanian|slovak|bulgarian)/i,
  /native\s+(german|french|italian|dutch|spanish|portuguese|polish|czech|hungarian|romanian)/i,
  /(german|french|italian|dutch|spanish|portuguese|polish|czech|hungarian|romanian)\s+speaker/i,
  /(german|french|italian|dutch|spanish|portuguese|polish)\s+(is\s+)?(required|mandatory|essential|a\s+must)/i,
  /proficien(t|cy)\s+in\s+(german|french|italian|dutch|spanish|portuguese|polish)/i,
  /business\s+(level\s+)?(german|french|italian|dutch|spanish|portuguese|polish)/i,
  /verhandlungssicher/i,
  /deutschkenntnisse/i,
  /muttersprach/i,
  /langue\s+française\s+(requise|obligatoire)/i,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function extractResumeText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf')  { const d = await pdfParse(fs.readFileSync(filePath)); return d.text; }
  if (ext === '.docx') { const r = await mammoth.extractRawText({ path: filePath }); return r.value; }
  if (ext === '.txt')  { return fs.readFileSync(filePath, 'utf8'); }
  throw new Error(`Unsupported resume format: ${ext}. Use PDF, DOCX, or TXT.`);
}

function buildSearchUrl(keywords, start = 0) {
  const p = new URLSearchParams({
    keywords,
    f_TPR: 'r86400',       // last 24 hours
    geoId: GEO_ID,
    sortBy: 'R',
    start: String(start),
    refresh: 'true',
    origin: 'JOB_SEARCH_PAGE_JOB_FILTER',
  });
  return `https://www.linkedin.com/jobs/search/?${p.toString()}`;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const randomDelay = (a = 1500, b = 4000) => sleep(Math.floor(Math.random() * (b - a) + a));

function isEnglishDescription(desc) {
  if (/[\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF]/u.test(desc)) return false;
  const accented = (desc.match(/[àáâãäåæçèéêëìíîïðñòóôõöùúûüýþÿ]/gi) || []).length;
  return (accented / desc.split(/\s+/).length) <= 0.05;
}

function requiresNonEnglish(desc) {
  return NON_ENGLISH_REQUIRED_PATTERNS.some(p => p.test(desc));
}

// ─── Scraper ──────────────────────────────────────────────────────────────────

async function scrapeLinkedIn() {
  console.log('🚀 Launching browser...');

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: path.join(__dirname, 'browser-profile'),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Login check
  console.log('🔐 Checking LinkedIn login...');
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);

  const isLoggedIn = await page.evaluate(() => !document.querySelector('input[name="session_key"]'));
  if (!isLoggedIn) {
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('⚠️  Please log into LinkedIn in the browser window, then press Enter here...');
    await new Promise(r => process.stdin.once('data', r));
    console.log('✅ Continuing...');
  } else {
    console.log('✅ Already logged in.');
  }

  const allJobs = [];

  // Search each role
  for (const query of SEARCH_QUERIES) {
    console.log(`\n🔍 Searching: "${query.label}"...`);
    let start = 0, hasMore = true;

    while (hasMore && start < 150) {
      console.log(`   📄 Page offset ${start}...`);
      try {
        await page.goto(buildSearchUrl(query.keywords, start), { waitUntil: 'domcontentloaded', timeout: 60000 });
        await randomDelay();

        const jobs = await page.evaluate((ql) => {
          return Array.from(document.querySelectorAll('[data-occludable-job-id]')).map(card => {
            const titleEl  = card.querySelector('[class*="job-card-list__title"], [class*="job-card-container__link"]');
            const companyEl = card.querySelector('[class*="subtitle"], [class*="company-name"]');
            const locationEl = card.querySelector('[class*="metadata-item"]');
            const linkEl   = card.querySelector('a[href*="/jobs/view/"]');
            const timeEl   = card.querySelector('time');
            const title = titleEl?.getAttribute('aria-label') || titleEl?.innerText?.trim();
            const link  = linkEl?.href?.split('?')[0];
            if (!title || !link) return null;
            return {
              title,
              company:  companyEl?.innerText?.trim(),
              location: locationEl?.innerText?.trim(),
              link,
              postedAt: timeEl?.getAttribute('datetime') || timeEl?.innerText?.trim(),
              searchQuery: ql,
            };
          }).filter(Boolean);
        }, query.label);

        if (jobs.length === 0) { hasMore = false; }
        else { allJobs.push(...jobs); start += 25; await randomDelay(2000, 5000); }
      } catch (e) {
        console.log(`   ⚠️  Page error: ${e.message}`);
        hasMore = false;
      }
    }
  }

  // Deduplicate
  const seen = new Set();
  const uniqueJobs = allJobs.filter(j => { if (seen.has(j.link)) return false; seen.add(j.link); return true; });
  console.log(`\n✅ Found ${uniqueJobs.length} unique job listings.`);
  console.log('\n📖 Fetching descriptions and filtering...');

  const jobsWithDetails = [];

  for (let i = 0; i < uniqueJobs.length; i++) {
    const job = uniqueJobs[i];
    console.log(`   [${i + 1}/${uniqueJobs.length}] ${job.title} @ ${job.company}`);

    try {
      await page.goto(job.link, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await randomDelay(1500, 3000);

      // Click "... more" to expand description
      await page.evaluate(() => {
        document.querySelectorAll('a, button, span').forEach(el => {
          if (el.innerText && el.innerText.trim() === 'more') el.click();
        });
      });
      await sleep(1200);

      // Extract description — try multiple strategies
      const description = await page.evaluate(() => {
        // Strategy 1: "About the job" section
        for (const el of document.querySelectorAll('section, div, article')) {
          const heading = el.querySelector('h2, h3');
          if (heading && heading.innerText.toLowerCase().includes('about the job')) {
            const text = el.innerText.replace(/\.\.\.\s*more/gi, '').trim();
            if (text.length > 150) return text;
          }
        }
        // Strategy 2: known LinkedIn selectors
        const selectors = [
          '.jobs-description__content',
          '.show-more-less-html__markup',
          '.description__text',
          '.jobs-description',
          '[class*="jobs-unified-top-card"]',
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.innerText.trim().length > 150) return el.innerText.trim();
        }
        // Strategy 3: largest text block on page
        let best = '', bestLen = 0;
        document.querySelectorAll('p, div, section').forEach(el => {
          const t = el.innerText?.trim() || '';
          if (t.length > bestLen && t.length < 15000 && el.children.length < 20) {
            best = t; bestLen = t.length;
          }
        });
        return best;
      });

      if (description.length < 150) {
        console.log('      ⏭  Skipped (empty description)');
        continue;
      }
      if (!isEnglishDescription(description)) {
        console.log('      ⏭  Skipped (non-English description)');
        continue;
      }
      if (requiresNonEnglish(description)) {
        console.log('      ⏭  Skipped (requires non-English language)');
        continue;
      }

      console.log('      ✅ Passed all filters');
      jobsWithDetails.push({ ...job, description });

    } catch (e) {
      console.log(`      ⚠️  Failed: ${e.message}`);
    }

    await randomDelay();
  }

  await browser.close();
  console.log(`\n✅ ${jobsWithDetails.length} jobs passed all filters.`);
  return jobsWithDetails;
}

// ─── AI Matching ──────────────────────────────────────────────────────────────

async function matchJobsWithClaude(jobs, resumeText) {
  console.log('\n🤖 Matching with Claude AI...');
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const matched = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    console.log(`   [${i + 1}/${jobs.length}] ${job.title} @ ${job.company}...`);

    try {
      const res = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `You are a career coach. Evaluate how well this resume matches the job.

RESUME:
${resumeText}

JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description.substring(0, 3000)}

Respond in JSON only (no markdown, no extra text):
{
  "match_score": <integer 0-100>,
  "is_relevant": <true if score >= ${config.matchThreshold || 55}>,
  "match_summary": "<2-3 sentences on why this is or isn't a good fit>",
  "key_matching_skills": ["skill1", "skill2", "skill3"],
  "missing_requirements": ["gap1", "gap2"]
}`,
        }],
      });

      const json = JSON.parse(res.content[0].text.trim().replace(/```json|```/g, '').trim());
      if (json.is_relevant) {
        matched.push({ ...job, ai: json });
        console.log(`      ✅ Score: ${json.match_score}/100`);
      } else {
        console.log(`      ❌ Not relevant (${json.match_score}/100)`);
      }
    } catch (e) {
      console.log(`      ⚠️  AI error: ${e.message}`);
    }

    await sleep(500);
  }

  matched.sort((a, b) => b.ai.match_score - a.ai.match_score);
  console.log(`\n✅ ${matched.length} relevant jobs found.`);
  return matched;
}

// ─── Email ────────────────────────────────────────────────────────────────────

function buildEmailHtml(jobs, runDate) {
  if (jobs.length === 0) {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2>🎯 LinkedIn Job Scout — ${runDate}</h2>
        <p style="color:#6b7280">No relevant jobs found today matching your profile. Check back tomorrow!</p>
      </div>`;
  }

  const scoreLabel = s => s >= 80 ? '🟢 Strong match' : s >= 65 ? '🟡 Good match' : '🟠 Partial match';
  const scoreColor = s => s >= 80 ? '#16a34a' : s >= 65 ? '#d97706' : '#9a3412';

  const cards = jobs.map((job, i) => {
    const s = job.ai.match_score;
    const skills = (job.ai.key_matching_skills || [])
      .map(x => `<span style="background:#dbeafe;color:#1d4ed8;padding:3px 10px;border-radius:12px;font-size:12px;margin:2px;display:inline-block">${x}</span>`)
      .join(' ');
    const gaps = (job.ai.missing_requirements || []).slice(0, 3)
      .map(x => `<li style="color:#6b7280;font-size:13px;margin-bottom:3px">${x}</li>`)
      .join('');

    return `
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:22px;margin-bottom:18px;background:white">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1;padding-right:16px">
          <div style="font-size:12px;color:#9ca3af;margin-bottom:4px">#${i + 1} &nbsp;·&nbsp; ${job.searchQuery}</div>
          <h3 style="margin:0 0 6px;font-size:17px;line-height:1.3">
            <a href="${job.link}" style="color:#1d4ed8;text-decoration:none">${job.title}</a>
          </h3>
          <p style="margin:0;color:#4b5563;font-size:14px">
            🏢 <strong>${job.company || 'Unknown'}</strong> &nbsp;·&nbsp; 📍 ${job.location || 'EU'}
          </p>
          ${job.postedAt ? `<p style="margin:4px 0 0;color:#9ca3af;font-size:12px">⏰ ${job.postedAt}</p>` : ''}
        </div>
        <div style="text-align:center;min-width:70px">
          <div style="font-size:32px;font-weight:bold;color:${scoreColor(s)};line-height:1">${s}</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:2px">/ 100</div>
          <div style="font-size:11px;color:${scoreColor(s)};margin-top:4px">${scoreLabel(s)}</div>
        </div>
      </div>

      <p style="margin:14px 0 8px;color:#374151;font-size:14px;line-height:1.6;border-left:3px solid #e5e7eb;padding-left:12px">
        ${job.ai.match_summary}
      </p>

      ${skills ? `<div style="margin-top:10px"><div style="font-size:11px;color:#9ca3af;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.5px">Matching skills</div>${skills}</div>` : ''}

      ${gaps ? `
      <div style="margin-top:12px">
        <div style="font-size:11px;color:#9ca3af;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.5px">Gaps to address</div>
        <ul style="margin:0;padding-left:18px">${gaps}</ul>
      </div>` : ''}

      <div style="margin-top:16px">
        <a href="${job.link}" style="background:#1d4ed8;color:white;padding:9px 20px;border-radius:7px;text-decoration:none;font-size:13px;font-weight:bold;display:inline-block">
          View & Apply →
        </a>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
<div style="max-width:680px;margin:0 auto;padding:24px">

  <div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <h1 style="margin:0 0 4px;font-size:22px;color:#111827">🎯 LinkedIn Job Scout</h1>
    <p style="margin:0;color:#6b7280;font-size:14px">
      ${runDate} &nbsp;·&nbsp; <strong>${jobs.length} relevant job${jobs.length !== 1 ? 's' : ''}</strong> found
      &nbsp;·&nbsp; Roles: ${config.roles.join(', ')}
    </p>
  </div>

  ${cards}

  <div style="text-align:center;padding:16px;color:#9ca3af;font-size:12px">
    LinkedIn Job Scout &nbsp;·&nbsp; EU Region &nbsp;·&nbsp; Last 24h &nbsp;·&nbsp; English only
  </div>

</div>
</body></html>`;
}

async function sendEmailDigest(jobs) {
  const runDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  console.log('\n📧 Sending email digest...');

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: config.email.user, pass: config.email.password },
  });

  await transporter.sendMail({
    from: `"LinkedIn Job Scout" <${config.email.user}>`,
    to: config.email.to,
    subject: `🎯 ${jobs.length} Relevant Jobs — ${runDate}`,
    html: buildEmailHtml(jobs, runDate),
  });

  console.log(`✅ Email sent to ${config.email.to}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('════════════════════════════════════════════');
  console.log('        LinkedIn Job Scout — Starting       ');
  console.log('════════════════════════════════════════════\n');

  // Validate config
  const required = ['anthropicApiKey', 'roles', 'resumePath', 'email'];
  for (const key of required) {
    if (!config[key]) { console.error(`❌ Missing "${key}" in config.json`); process.exit(1); }
  }
  if (!fs.existsSync(config.resumePath)) {
    console.error(`❌ Resume file not found: ${config.resumePath}`); process.exit(1);
  }

  console.log(`📄 Loading resume: ${config.resumePath}`);
  const resumeText = await extractResumeText(config.resumePath);
  console.log(`✅ Resume loaded (${resumeText.length} characters)\n`);
  console.log(`🎯 Roles: ${config.roles.join(', ')}`);
  console.log(`📍 Region: ${config.location || 'European Union'}\n`);

  const jobs = await scrapeLinkedIn();

  if (jobs.length === 0) {
    console.log('⚠️  No jobs passed filters today.');
    await sendEmailDigest([]);
    return;
  }

  const relevant = await matchJobsWithClaude(jobs, resumeText);

  // Save results
  const outFile = path.join(__dirname, `results-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(outFile, JSON.stringify(relevant, null, 2));
  console.log(`\n💾 Results saved to ${outFile}`);

  await sendEmailDigest(relevant);
  console.log('\n🎉 Done! Job scout complete.');
}

main().catch(e => { console.error('\n💥 Fatal error:', e.message); process.exit(1); });
