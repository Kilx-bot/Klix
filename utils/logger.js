const config = require('../config/config');

class Logger {
    constructor() {
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        this.currentLevel = this.levels[config.LOG_LEVEL] || this.levels.info;
    }

    log(level, message, ...args) {
        if (this.levels[level] <= this.currentLevel) {
            const timestamp = new Date().toISOString();
            const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
            
            if (typeof message === 'string') {
                console.log(`${prefix} ${message}`, ...args);
            } else {
                console.log(`${prefix}`, message, ...args);
            }
        }
    }

    error(message, ...args) {
        this.log('error', message, ...args);
    }

    warn(message, ...args) {
        this.log('warn', message, ...args);
    }

    info(message, ...args) {
        this.log('info', message, ...args);
    }

    debug(message, ...args) {
        this.log('debug', message, ...args);
    }
}

module.exports = new Logger();
