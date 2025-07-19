const logger = require('./logger');

class DataValidator {
    static validateVerificationData(data) {
        const errors = [];
        
        // Validate Discord ID
        if (!data.discordId || typeof data.discordId !== 'string' || data.discordId.length < 17) {
            errors.push('Invalid Discord ID format');
        }
        
        // Validate Roblox ID
        if (!data.robloxId || typeof data.robloxId !== 'string' || isNaN(data.robloxId)) {
            errors.push('Invalid Roblox ID format');
        }
        
        // Validate Roblox username
        if (!data.robloxUsername || typeof data.robloxUsername !== 'string' || data.robloxUsername.length < 3) {
            errors.push('Invalid Roblox username format');
        }
        
        // Validate rank
        if (typeof data.rank !== 'number' || data.rank < 0 || data.rank > 255) {
            errors.push('Invalid rank value');
        }
        
        // Validate role name
        if (!data.roleName || typeof data.roleName !== 'string' || data.roleName.length < 1) {
            errors.push('Invalid role name format');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    static sanitizeVerificationData(data) {
        return {
            discordId: String(data.discordId).trim(),
            robloxId: String(data.robloxId).trim(),
            robloxUsername: String(data.robloxUsername).trim(),
            rank: Number(data.rank),
            roleName: String(data.roleName).trim(),
            updatedAt: data.updatedAt || new Date()
        };
    }

    static validateDatabaseConnection(db) {
        try {
            // Simple validation that database connection exists
            if (!db || typeof db.select !== 'function') {
                return { isValid: false, error: 'Database connection invalid' };
            }
            return { isValid: true };
        } catch (error) {
            return { isValid: false, error: error.message };
        }
    }
}

module.exports = DataValidator;