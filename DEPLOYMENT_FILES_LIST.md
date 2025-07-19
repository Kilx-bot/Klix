# Essential Deployment Files

## Download Method
**Use Replit's Download Feature**: Three dots menu → "Download as zip"

## After Download, Keep Only These Files:

### Root Configuration Files
- `package.json` - Dependencies
- `package-lock.json` - Exact dependency versions
- `railway.json` - Railway deployment config
- `nixpacks.toml` - Node.js 20.x build config
- `Procfile` - Process startup
- `README.md` - Project documentation
- `drizzle.config.json` - Database configuration

### Core Runtime Files
- `runtime-manager.js` - Main entry point for Railway
- `index.js` - Discord bot initialization
- `enhanced-keepalive.js` - 24/7 monitoring system

### Application Code
- `commands/help.js`
- `commands/rank.js` 
- `commands/verify.js`
- `handlers/commandHandler.js`
- `config/config.js`

### Services & Business Logic
- `services/rankingService.js`
- `services/robloxService.js`
- `services/verificationService.js`

### Server & Database
- `server/webServer.js`
- `server/storage.js`
- `server/messageProcessor.js`
- `server/db.js`
- `shared/schema.js`
- `storage/memoryDb.js`

### Utilities
- `utils/logger.js`
- `utils/permissions.js`
- `utils/dataBackup.js`
- `utils/dataValidator.js`

### Client (Web Dashboard)
- `client/` directory (entire folder)

## Delete These Before Upload
- `node_modules/` (Railway installs automatically)
- `.git/` (Replit git history)
- `.cache/` (Replit cache)
- `.local/` (Replit system files)
- `attached_assets/` (screenshots)
- Documentation `.md` files (except README.md)

## Result
**Final package**: ~30 essential files, <1MB upload size
**Railway builds**: Full application with all dependencies