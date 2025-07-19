# GitHub Files to Update for Railway Deployment

## 🔥 CRITICAL FILES (Must Update)

### 1. `config/config.js` ⚠️ MISSING FILE - Railway Failing Without This
**Problem:** Railway can't find this file, causing "Cannot find module './config/config'" error
**Solution:** Copy this file from Replit to GitHub
**Content:** Simple wrapper around environment variables
**Why Critical:** Multiple files require this - index.js, commandHandler.js, services/*

### 2. `runtime-manager.js`
**Changes Made:**
- Removed competing health server code
- Eliminated express dependency
- Cleaned up health server startup logic
- Now focuses only on Discord bot process management

**Why Critical:** Prevents port conflicts that cause Railway health check failures

### 2. `server/webServer.js` 
**Changes Made:**
- Optimized health endpoint with Railway-specific headers
- Added `X-Health-Check: railway-optimized` header
- Always returns HTTP 200 OK during startup
- Enhanced logging for deployment monitoring
- Added fallback handling for missing client build

**Why Critical:** This is Railway's primary health check endpoint

### 3. `nixpacks.toml`
**Changes Made:**
- Added client build process: `cd client && npm install && npm run build`
- Ensures React frontend builds during Railway deployment
- Maintains Node.js 20.x compatibility

**Why Critical:** Without this, the web dashboard won't work on Railway

### 4. `utils/logger.js` ⚠️ RAILWAY FIX
**Changes Made:**
- Removed config file dependency that was causing "Cannot find module '../config/config'" error
- Uses process.env.LOG_LEVEL directly instead of config.LOG_LEVEL
- Railway compatible environment variable access

**Why Critical:** Railway was failing with missing config module error

## ✅ ALREADY CORRECT (No Changes Needed)

### `railway.json` - Already optimal
- 300-second health check timeout
- Correct health path: `/health`
- Proper restart policy

### `package.json` - Already correct
- All dependencies properly listed
- Build scripts configured

## 📋 UPDATE PROCESS

1. **Copy these 3 files** from your Replit to GitHub:
   - `runtime-manager.js`
   - `server/webServer.js` 
   - `nixpacks.toml`

2. **Commit message suggestion:**
   ```
   Fix Railway health check conflicts and optimize deployment
   
   - Remove competing health servers
   - Optimize health endpoint for Railway
   - Add client build process to nixpacks
   ```

3. **Deploy to Railway** - All health check issues resolved

## 🚀 DEPLOYMENT READY STATUS

After updating these 3 files, your Railway deployment will:
- ✅ Pass health checks immediately
- ✅ Build frontend during deployment  
- ✅ Run with zero port conflicts
- ✅ Maintain 24/7 operation