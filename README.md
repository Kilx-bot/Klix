# Discord Roblox Group Management Bot

A comprehensive Discord bot for managing Roblox group operations with an integrated web dashboard.

## Features

- **Discord-to-Roblox Account Verification**: Users can link their Discord accounts to Roblox accounts
- **Hierarchical Ranking System**: Authorized users can rank group members based on permissions
- **Web Dashboard**: Send custom messages to Discord servers with rich formatting
- **24/7 Operation**: Enhanced keep-alive system with multiple monitoring layers
- **Persistent Storage**: PostgreSQL database with automatic backups
- **Security Features**: Data validation, sanitization, and integrity monitoring

## Commands

- `/verify <username>` - Link Discord account to Roblox account
- `/rank <username> <rank>` - Rank users in the Roblox group
- `/help` - Display bot usage information

## Technology Stack

- **Backend**: Node.js with Discord.js v14
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: React with Tailwind CSS
- **Hosting**: Ready for Railway deployment
- **APIs**: Discord API, Roblox API integration

## Deployment

This bot is configured for Railway deployment with true 24/7 uptime. See `RAILWAY_DEPLOYMENT.md` for complete setup instructions.

## Environment Variables

Required environment variables are documented in `ENVIRONMENT_VARIABLES.md`.

## Architecture

- Service-oriented design with clear separation of concerns
- Memory cache with database persistence
- Automatic data backup and integrity monitoring
- Enhanced keep-alive system for maximum uptime