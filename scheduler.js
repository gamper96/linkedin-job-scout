#!/usr/bin/env node

/**
 * Runs LinkedIn Job Scout every day at the time you set below.
 * Start it with: node scheduler.js
 * To run in background: nohup node scheduler.js > scout.log 2>&1 &
 */

const { execSync } = require('child_process');
const path = require('path');

const RUN_HOUR   = 8;  // ← change this (0–23)
const RUN_MINUTE = 0;  // ← change this (0–59)

function msUntilNextRun() {
  const now  = new Date();
  const next = new Date();
  next.setHours(RUN_HOUR, RUN_MINUTE, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}

function runScout() {
  console.log(`\n[${new Date().toISOString()}] 🚀 Running LinkedIn Job Scout...`);
  try {
    execSync(`node ${path.join(__dirname, 'index.js')}`, { stdio: 'inherit' });
  } catch (e) {
    console.error('❌ Run failed:', e.message);
  }
}

function scheduleNext() {
  const delay = msUntilNextRun();
  const h = Math.floor(delay / 3600000);
  const m = Math.floor((delay % 3600000) / 60000);
  console.log(`⏰ Next run in ${h}h ${m}m (daily at ${String(RUN_HOUR).padStart(2,'0')}:${String(RUN_MINUTE).padStart(2,'0')})`);
  setTimeout(() => { runScout(); setInterval(runScout, 24 * 60 * 60 * 1000); }, delay);
}

console.log('════════════════════════════════════════════');
console.log('   LinkedIn Job Scout — Daily Scheduler     ');
console.log('════════════════════════════════════════════');
scheduleNext();
