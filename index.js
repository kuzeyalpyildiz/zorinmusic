// Zorin Music — Automated Headless Bootstrapper
// Pre-checks, auto-build, and startup runner

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍  Zorin Music  •  Running Pre-Checks …');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 1. Check Node.js Version
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0], 10);
if (majorVersion < 20) {
    console.error(`❌  Node.js version v20+ required (Current: v${nodeVersion}).`);
    process.exit(1);
}
console.log(`[Pre-Check] ✅ Node.js v${nodeVersion} detected.`);

// 2. Check Environment Config (.env)
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.warn('[Pre-Check] ⚠️  Created .env from .env.example. Please update your DISCORD_TOKEN!');
    } else {
        console.warn('[Pre-Check] ⚠️  No .env file found!');
    }
} else {
    console.log('[Pre-Check] ✅ Config file (.env) present.');
}

// Load env vars
require('dotenv').config();

if (!process.env.DISCORD_TOKEN) {
    console.warn('[Pre-Check] ⚠️  DISCORD_TOKEN is missing in environment variables or .env file!');
}

// 3. Check Dependencies & Build Artifacts
const distPath = path.join(__dirname, 'dist');
const indexJsPath = path.join(distPath, 'index.js');

if (!fs.existsSync(distPath) || !fs.existsSync(indexJsPath)) {
    console.log('[Pre-Check] 🛠️  Build artifacts missing — compiling TypeScript …');
    try {
        execSync('npx tsc', { stdio: 'inherit', cwd: __dirname });
        console.log('[Pre-Check] ✅ Build complete!');
    } catch (err) {
        console.error('❌  Failed to compile TypeScript build:', err.message);
        process.exit(1);
    }
} else {
    console.log('[Pre-Check] ✅ Compiled build (dist/) verified.');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 4. Launch Bot
require('./dist/index.js');
