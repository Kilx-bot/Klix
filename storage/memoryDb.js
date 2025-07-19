class MemoryDb {
    constructor() {
        this.verifications = new Map();
        this.rankings = new Map();
        this.logs = [];
    }

    init() {
        this.verifications.clear();
        this.rankings.clear();
        this.logs = [];
        console.log('Memory database initialized');
    }

    // Verification methods
    setVerification(discordId, data) {
        this.verifications.set(discordId, {
            ...data,
            updatedAt: new Date().toISOString()
        });
    }

    getVerification(discordId) {
        return this.verifications.get(discordId);
    }

    getVerificationByRobloxId(robloxId) {
        for (const verification of this.verifications.values()) {
            if (verification.robloxId === robloxId) {
                return verification;
            }
        }
        return null;
    }

    getAllVerifications() {
        return Array.from(this.verifications.values());
    }

    removeVerification(discordId) {
        return this.verifications.delete(discordId);
    }

    // Ranking history methods
    addRankingLog(commanderId, targetId, oldRank, newRank, reason = null) {
        const log = {
            id: Date.now() + Math.random(),
            commanderId,
            targetId,
            oldRank,
            newRank,
            reason,
            timestamp: new Date().toISOString()
        };
        
        this.logs.push(log);
        this.rankings.set(log.id, log);
        
        // Keep only last 1000 logs to prevent memory bloat
        if (this.logs.length > 1000) {
            const removed = this.logs.shift();
            this.rankings.delete(removed.id);
        }
        
        return log;
    }

    getRankingLogs(limit = 50) {
        return this.logs.slice(-limit).reverse();
    }

    getRankingLogsForUser(discordId, limit = 20) {
        return this.logs
            .filter(log => log.targetId === discordId)
            .slice(-limit)
            .reverse();
    }

    // General utility methods
    getStats() {
        return {
            verifications: this.verifications.size,
            rankingLogs: this.logs.length,
            memoryUsage: process.memoryUsage()
        };
    }

    clear() {
        this.verifications.clear();
        this.rankings.clear();
        this.logs = [];
    }
}

module.exports = new MemoryDb();
