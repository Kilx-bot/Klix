const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
// Runtime manager - no longer needs express (health handled by main app)

class RuntimeManager {
    constructor() {
        this.childProcess = null;
        this.restartCount = 0;
        this.maxRestarts = 50; // Increased restart limit
        this.restartDelay = 5000; // 5 seconds
        this.lastRestartTime = 0;
        this.isShuttingDown = false;
        this.healthCheckInterval = null;
        this.maxRestartWindow = 300000; // 5 minutes
        // Runtime manager focused on Discord bot process management only
        this.botStatus = 'starting';
    }

    // No separate health server needed - main app handles health checks

    start() {
        // For Railway deployment, let the main application handle health checks
        // No separate health server needed
        
        if (this.isShuttingDown) return;
        
        const now = Date.now();
        
        // Reset restart counter if enough time has passed
        if (now - this.lastRestartTime > this.maxRestartWindow) {
            this.restartCount = 0;
        }
        
        if (this.restartCount >= this.maxRestarts) {
            logger.error(`Maximum restart limit (${this.maxRestarts}) reached. Waiting before next attempt...`);
            this.botStatus = 'failed';
            setTimeout(() => {
                this.restartCount = 0;
                this.botStatus = 'restarting';
                this.start();
            }, this.maxRestartWindow);
            return;
        }

        logger.info(`Starting Discord bot (attempt ${this.restartCount + 1}/${this.maxRestarts})${this.restartCount > 0 ? ' - Auto-restart after process exit' : ' - Initial start'}`);
        this.botStatus = 'starting';
        
        // Spawn the main bot process
        this.childProcess = spawn('node', ['index.js'], {
            stdio: ['inherit', 'inherit', 'inherit'],
            cwd: process.cwd(),
            env: {
                ...process.env,
                NODE_ENV: 'production'
            }
        });

        this.childProcess.on('error', (error) => {
            logger.error('Failed to start child process:', error);
            this.botStatus = 'error';
            this.handleRestart();
        });

        this.childProcess.on('exit', (code, signal) => {
            if (this.isShuttingDown) return;
            
            logger.warn(`Bot process exited with code ${code}, signal ${signal} - Triggering auto-restart`);
            this.botStatus = 'crashed';
            this.handleRestart();
        });

        this.childProcess.on('close', (code, signal) => {
            if (this.isShuttingDown) return;
            
            logger.warn(`Bot process closed with code ${code}, signal ${signal}`);
            this.botStatus = 'stopped';
            this.handleRestart();
        });

        // Monitor for successful bot startup
        setTimeout(() => {
            if (this.childProcess && !this.childProcess.killed) {
                this.botStatus = 'running';
                logger.info('✅ Discord bot appears to be running successfully');
            }
        }, 30000); // Wait 30 seconds for bot to initialize

        this.lastRestartTime = now;
        this.restartCount++;
        
        // Start health monitoring
        this.startHealthMonitoring();
    }

    handleRestart() {
        if (this.isShuttingDown) return;
        
        this.botStatus = 'restarting';
        logger.info(`Bot process ended, restarting in ${this.restartDelay / 1000} seconds... (Enhanced 24/7 runtime recovery)`);
        
        // Clean up current process
        if (this.childProcess) {
            this.childProcess.removeAllListeners();
            this.childProcess = null;
        }
        
        // Stop health monitoring
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        
        // Restart after delay
        setTimeout(() => {
            this.start();
        }, this.restartDelay);
    }

    startHealthMonitoring() {
        // Monitor process health every 30 seconds
        this.healthCheckInterval = setInterval(() => {
            if (this.childProcess && !this.childProcess.killed) {
                // Process is alive, check if it's responsive
                this.checkProcessHealth();
            } else if (!this.isShuttingDown) {
                logger.warn('Child process is not running, triggering restart');
                this.handleRestart();
            }
        }, 30000);
    }

    checkProcessHealth() {
        // Check if the process is still responsive
        if (this.childProcess && this.childProcess.pid) {
            try {
                // Send a 0 signal to check if process exists
                process.kill(this.childProcess.pid, 0);
                logger.debug('Process health check passed');
            } catch (error) {
                logger.warn('Process health check failed:', error.message);
                if (!this.isShuttingDown) {
                    this.handleRestart();
                }
            }
        }
    }

    shutdown() {
        logger.info('Shutting down runtime manager...');
        this.isShuttingDown = true;
        
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        
        if (this.childProcess && !this.childProcess.killed) {
            logger.info('Terminating child process...');
            this.childProcess.kill('SIGTERM');
            
            // Force kill after 10 seconds if graceful shutdown fails
            setTimeout(() => {
                if (this.childProcess && !this.childProcess.killed) {
                    logger.warn('Force killing child process...');
                    this.childProcess.kill('SIGKILL');
                }
            }, 10000);
        }
    }

    getStatus() {
        return {
            isRunning: this.childProcess && !this.childProcess.killed,
            pid: this.childProcess?.pid,
            restartCount: this.restartCount,
            lastRestartTime: this.lastRestartTime,
            maxRestarts: this.maxRestarts
        };
    }
}

// Handle process signals
const runtimeManager = new RuntimeManager();

process.on('SIGINT', () => {
    logger.info('Received SIGINT. Shutting down runtime manager...');
    runtimeManager.shutdown();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Shutting down runtime manager...');
    runtimeManager.shutdown();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception in runtime manager:', error);
    // Don't exit, let the system continue
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection in runtime manager:', error);
    // Don't exit, let the system continue
});

// Start the runtime manager
runtimeManager.start();

module.exports = runtimeManager;