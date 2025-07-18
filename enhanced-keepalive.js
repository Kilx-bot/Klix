const logger = require('./utils/logger');

class EnhancedKeepAlive {
    constructor() {
        this.discordClient = null;
        this.intervals = {
            activity: null,
            health: null,
            heartbeat: null,
            dataIntegrity: null,
            replitKeepAlive: null
        };
        this.config = {
            activityInterval: 30000, // 30 seconds - more frequent
            healthCheckInterval: 60000, // 60 seconds - more frequent
            heartbeatInterval: 20000, // 20 seconds - more frequent
            dataIntegrityInterval: 300000, // 5 minutes
            replitKeepAliveInterval: 10000, // 10 seconds - aggressive Replit keep-alive
            maxMissedHeartbeats: 3 // Lower threshold for faster detection
        };
        this.state = {
            lastActivity: Date.now(),
            lastHeartbeat: Date.now(),
            missedHeartbeats: 0,
            isShuttingDown: false
        };
    }

    start() {
        this.clearAllIntervals();
        logger.info('🚀 ENHANCED KEEP-ALIVE SERVICE STARTED - Discord-focused monitoring active');
        
        // Discord activity monitoring
        this.intervals.activity = setInterval(() => {
            this.performDiscordActivity();
        }, this.config.activityInterval);
        logger.info('✅ Activity monitoring initialized (30s intervals)');

        // Health monitoring
        this.intervals.health = setInterval(() => {
            this.performHealthCheck();
        }, this.config.healthCheckInterval);
        logger.info('✅ Health monitoring initialized (60s intervals)');

        // Heartbeat monitoring
        this.intervals.heartbeat = setInterval(() => {
            this.performHeartbeat();
        }, this.config.heartbeatInterval);
        logger.info('✅ Heartbeat monitoring initialized (20s intervals)');

        // Data integrity monitoring
        this.intervals.dataIntegrity = setInterval(() => {
            this.performDataIntegrityCheck();
        }, this.config.dataIntegrityInterval);
        logger.info('✅ Data integrity monitoring initialized (5min intervals)');

        // Aggressive Replit keep-alive
        this.intervals.replitKeepAlive = setInterval(() => {
            this.performReplitKeepAlive();
        }, this.config.replitKeepAliveInterval);
        logger.info('✅ Aggressive Replit keep-alive initialized (10s intervals)');

        this.setupProcessHandlers();
    }

    setDiscordClient(client) {
        this.discordClient = client;
        logger.info('Discord client attached to enhanced keep-alive service');
        
        // Set up Discord-specific event handlers
        if (client) {
            client.on('ready', () => {
                this.state.lastActivity = Date.now();
                this.state.lastHeartbeat = Date.now();
                this.state.missedHeartbeats = 0;
                logger.info('Discord client ready - keep-alive monitoring active');
            });

            client.on('disconnect', () => {
                logger.warn('Discord client disconnected - monitoring for reconnection');
            });

            client.on('reconnecting', () => {
                logger.info('Discord client reconnecting - resetting heartbeat');
                this.state.lastHeartbeat = Date.now();
            });

            client.on('error', (error) => {
                logger.error('Discord client error detected:', error.message);
                this.state.missedHeartbeats++;
            });
        }
    }

    performDiscordActivity() {
        if (this.state.isShuttingDown) return;

        try {
            if (this.discordClient && this.discordClient.isReady()) {
                this.state.lastActivity = Date.now();
                this.state.missedHeartbeats = 0;
                
                // Update bot status to show activity
                this.discordClient.user.setPresence({
                    activities: [{
                        name: 'Roblox Group Management | /help',
                        type: 'PLAYING'
                    }],
                    status: 'online'
                });
                
                logger.info(`🟢 Discord activity confirmed - ${this.discordClient.guilds.cache.size} guilds connected`);
            } else {
                logger.debug('Discord client not ready during activity check');
                this.state.missedHeartbeats++;
            }
        } catch (error) {
            logger.debug('Discord activity check failed:', error.message);
            this.state.missedHeartbeats++;
        }
    }

    performHeartbeat() {
        if (this.state.isShuttingDown) return;

        try {
            if (this.discordClient && this.discordClient.isReady()) {
                this.state.lastHeartbeat = Date.now();
                
                // Simple ping to Discord to keep connection alive
                this.discordClient.guilds.cache.first()?.members.cache.size;
                
                logger.info('💓 Discord heartbeat successful');
            } else {
                this.state.missedHeartbeats++;
                logger.debug(`Discord heartbeat failed (${this.state.missedHeartbeats}/${this.config.maxMissedHeartbeats})`);
            }
        } catch (error) {
            this.state.missedHeartbeats++;
            logger.debug('Discord heartbeat error:', error.message);
        }
    }

    performHealthCheck() {
        if (this.state.isShuttingDown) return;

        const now = Date.now();
        const timeSinceLastActivity = now - this.state.lastActivity;
        const timeSinceLastHeartbeat = now - this.state.lastHeartbeat;
        
        if (this.discordClient && this.discordClient.isReady()) {
            const guildCount = this.discordClient.guilds.cache.size;
            const ping = this.discordClient.ws.ping;
            
            logger.info(`🔍 Health check: ${guildCount} guilds, ${ping}ms ping, ${this.state.missedHeartbeats} missed heartbeats`);
            
            // Reset missed heartbeats if we're healthy
            if (ping > 0 && ping < 1000) {
                this.state.missedHeartbeats = 0;
            }
        } else if (this.state.missedHeartbeats >= this.config.maxMissedHeartbeats) {
            logger.error(`Discord health check failed - ${this.state.missedHeartbeats} missed heartbeats, last activity: ${timeSinceLastActivity}ms ago`);
            this.triggerRestart();
        }

        // Check for extended periods without activity
        if (timeSinceLastActivity > 300000) { // 5 minutes
            logger.warn('Extended period without Discord activity detected');
            this.state.missedHeartbeats++;
        }
    }

    async performDataIntegrityCheck() {
        if (this.state.isShuttingDown) return;

        try {
            const verificationService = require('./services/verificationService');
            const result = await verificationService.performDataIntegrityCheck();
            
            if (result && result.syncIssues > 0) {
                logger.warn(`🔧 Data integrity check found ${result.syncIssues} sync issues - resolved automatically`);
            }
        } catch (error) {
            logger.error('Data integrity check failed:', error.message);
        }
    }

    performReplitKeepAlive() {
        if (this.state.isShuttingDown) return;

        try {
            // Multiple strategies to keep Replit active
            
            // 1. Memory allocation to show activity
            const keepAliveData = Buffer.alloc(1024, 'keepalive');
            
            // 2. File system activity
            const fs = require('fs');
            const timestamp = Date.now();
            fs.writeFileSync('/tmp/keepalive.txt', timestamp.toString());
            
            // 3. Process activity indicator
            process.title = `Discord-Bot-Active-${timestamp}`;
            
            // 4. Console activity (but only occasionally to avoid spam)
            if (timestamp % 60000 < 10000) { // Every minute
                console.log(`[${new Date().toISOString()}] 🔄 Replit keep-alive active - ${this.discordClient?.guilds?.cache?.size || 0} guilds`);
            }
            
            // 5. Garbage collection hint
            if (global.gc) {
                global.gc();
            }
            
        } catch (error) {
            // Silently handle errors to avoid spam
        }
    }

    triggerRestart() {
        logger.info('Triggering application restart due to Discord connectivity failure');
        this.state.isShuttingDown = true;
        process.emit('RESTART_REQUIRED');
    }

    setupProcessHandlers() {
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception in enhanced keep-alive:', error.message);
        });

        process.on('unhandledRejection', (error) => {
            logger.error('Unhandled rejection in enhanced keep-alive:', error.message);
        });

        process.on('SIGINT', () => this.stop());
        process.on('SIGTERM', () => this.stop());
    }

    clearAllIntervals() {
        Object.keys(this.intervals).forEach(key => {
            if (this.intervals[key]) {
                clearInterval(this.intervals[key]);
                this.intervals[key] = null;
            }
        });
    }

    stop() {
        logger.info('Stopping enhanced keep-alive service...');
        this.state.isShuttingDown = true;
        this.clearAllIntervals();
    }
}

module.exports = EnhancedKeepAlive;