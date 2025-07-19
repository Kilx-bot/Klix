# 📋 GitHub Update Guide - Step by Step

## Files You Need to Add/Update

### 1. CREATE NEW: config/config.js
**Location:** Create `config` folder, then `config.js` inside it
**Content:**
```javascript
const config = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN || 'your_discord_bot_token',
    ROBLOX_API_KEY: process.env.ROBLOX_API_KEY || 'your_roblox_api_key',
    ROBLOX_GROUP_ID: process.env.ROBLOX_GROUP_ID || 'your_roblox_group_id',
    COMMAND_PREFIX: process.env.COMMAND_PREFIX || '!',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

module.exports = config;
```

### 2. UPDATE: runtime-manager.js
**Action:** Replace entire file content with Replit version
**Key Changes:** Removed competing health servers, Railway-compatible

### 3. UPDATE: server/webServer.js  
**Action:** Replace entire file content with Replit version
**Key Changes:** Railway-optimized health endpoint with X-Health-Check headers

### 4. UPDATE: nixpacks.toml
**Action:** Replace entire file content
**Content:**
```toml
[phases.setup]
nixPkgs = ['nodejs_20']

[phases.install]
cmds = ['npm install']

[phases.build]
cmds = [
  'npm run build --if-present',
  'cd client && npm install && npm run build'
]

[start]
cmd = 'node runtime-manager.js'
```

## Step-by-Step Process

### Step 1: Access Your GitHub Repository
1. Go to your GitHub repository
2. Make sure you're on the main branch

### Step 2: Create Config Directory
1. Click "Add file" → "Create new file"
2. Type: `config/config.js`
3. Copy the config.js content from above
4. Commit with message: "Add missing config directory for Railway deployment"

### Step 3: Update Runtime Manager
1. Click on `runtime-manager.js` in your repo
2. Click the pencil icon (Edit)
3. Select all content and delete
4. Copy the ENTIRE content from your Replit `runtime-manager.js`
5. Commit with message: "Fix Railway health endpoint conflicts"

### Step 4: Update Web Server
1. Click on `server/webServer.js` 
2. Click the pencil icon (Edit)
3. Select all content and delete
4. Copy the ENTIRE content from your Replit `server/webServer.js`
5. Commit with message: "Add Railway-optimized health endpoint"

### Step 5: Update Build Configuration
1. Click on `nixpacks.toml`
2. Click the pencil icon (Edit)
3. Replace with the nixpacks.toml content shown above
4. Commit with message: "Add client build process for Railway"

### Step 6: Trigger Railway Deployment
1. Go to your Railway project
2. Click "Deploy Now" or wait for automatic deployment
3. Watch the build logs - should succeed this time

## Expected Results

After these updates:
- ✅ Build: Node.js 20.x installs successfully
- ✅ Dependencies: npm install completes
- ✅ Client Build: React dashboard builds automatically  
- ✅ Startup: All config modules found, no errors
- ✅ Health Check: Immediate HTTP 200 response
- ✅ Discord Bot: Connects to your servers in background

## Need Help?
Let me know which step you're on and I can provide more specific guidance!