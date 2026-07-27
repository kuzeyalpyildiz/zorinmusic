// Zorin Music — Instant Fast-Boot Bootstrapper
// Disable npm/npx package update checks, corepack prompts, and online version lookups on boot

process.env.NODE_NO_WARNINGS = '1';
process.env.NO_UPDATE_NOTIFIER = '1';
process.env.NPM_CONFIG_UPDATE_NOTIFIER = 'false';
process.env.NPM_CONFIG_AUDIT = 'false';
process.env.NPM_CONFIG_FUND = 'false';
process.env.NPM_CONFIG_PREFER_OFFLINE = 'true';
process.env.COREPACK_ENABLE_AUTO_PIN = '0';
process.env.COREPACK_ENABLE_STRICT = '0';
process.env.COREPACK_ENABLE_DOWNLOAD_PROMPT = '0';

const { performance } = require('perf_hooks');
const startTime = performance.now();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const bootMarkerPath = path.join(__dirname, 'boot.txt');
const distPath = path.join(__dirname, 'dist');
const indexJsPath = path.join(distPath, 'index.js');
const nodeModulesPath = path.join(__dirname, 'node_modules');

// Load environment configuration
require('dotenv').config();

// ⚡ FAST-BOOT PATH: If boot.txt, dist/index.js, and node_modules exist, skip pre-checks & compilation
if (fs.existsSync(bootMarkerPath) && fs.existsSync(indexJsPath) && fs.existsSync(nodeModulesPath)) {
    const timeTakenMs = (performance.now() - startTime).toFixed(2);
    console.log(`[Fast-Boot] ⚡ Fast-boot marker (boot.txt) detected. Skipping build pre-checks (${timeTakenMs}ms)! Booting bot…`);
    require('./dist/index.js');
    return;
}

// 🔍 INITIAL PRE-CHECKS & BUILD PATH (Runs on first boot or when boot.txt is deleted)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍  Zorin Music  •  Running Initial Pre-Checks …');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 1. Check Node.js Version
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0], 10);
if (majorVersion < 20) {
    console.error(`❌  Node.js version v20+ required (Current: v${nodeVersion}).`);
    process.exit(1);
}
console.log(`[Pre-Check] ✅ Node.js v${nodeVersion} detected.`);

// 2. Check Node Modules
if (!fs.existsSync(nodeModulesPath)) {
    console.log('[Pre-Check] 📦 node_modules missing — installing dependencies …');
    try {
        execSync('npm install --prefer-offline --no-audit --no-fund', { stdio: 'inherit', cwd: __dirname });
        console.log('[Pre-Check] ✅ Dependencies installed!');
    } catch (err) {
        console.error('❌  Failed to install dependencies:', err.message);
        process.exit(1);
    }
} else {
    console.log('[Pre-Check] ✅ node_modules present.');
}

// 3. Check Environment Config (.env)
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

if (!process.env.DISCORD_TOKEN) {
    console.warn('[Pre-Check] ⚠️  DISCORD_TOKEN is missing in environment variables or .env file!');
}

// 4. Compile TypeScript & Generate boot.txt Marker
const tsBuildInfoPath = path.join(distPath, '.tsbuildinfo');
const localTscPath = path.join(__dirname, 'node_modules', '.bin', 'tsc');

if (!fs.existsSync(distPath) || !fs.existsSync(indexJsPath) || !fs.existsSync(bootMarkerPath)) {
    console.log('[Pre-Check] 🛠️  Compiling TypeScript build …');
    try {
        if (fs.existsSync(tsBuildInfoPath)) {
             console.log('[Pre-Check] 🔄 Performing incremental build …');
        } else {
             console.log('[Pre-Check] 🚀 Performing full build …');
        }
        
        // Execute local tsc binary directly to bypass npx registry version checks
        const tscCommand = fs.existsSync(localTscPath) ? `"${localTscPath}"` : 'npx --no-install tsc';
        execSync(tscCommand, { stdio: 'inherit', cwd: __dirname });
        
        // Write boot.txt marker file
        fs.writeFileSync(bootMarkerPath, `Zorin Music Fast-Boot Marker\nCreated: ${new Date().toISOString()}\nNote: Delete this file anytime to force a full re-compile on next boot.\n`);
        console.log('[Pre-Check] ✅ Build complete & boot.txt marker created!');
    } catch (err) {
        console.error('❌  Failed to compile TypeScript build:', err.message);
        process.exit(1);
    }
} else {
    console.log('[Pre-Check] ✅ Compiled build (dist/) verified.');
}

const timeTakenMs = (performance.now() - startTime).toFixed(2);
console.log(`[Pre-Check] ⏱️  Initial pre-checks & build completed in ${timeTakenMs}ms.`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 5. Launch Bot
require('./dist/index.js');
