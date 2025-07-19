class Permissions {
    canRankUser(commander, target, newRank) {
        // Check if commander has a higher rank than the target
        if (commander.rank <= target.rank) {
            return {
                allowed: false,
                reason: 'You cannot rank users with equal or higher rank than yourself'
            };
        }

        // Check if the new rank is below the commander's rank
        if (newRank >= commander.rank) {
            return {
                allowed: false,
                reason: 'You cannot rank users to your rank or higher'
            };
        }

        // Check if commander is trying to rank themselves
        if (commander.discordId === target.discordId) {
            return {
                allowed: false,
                reason: 'You cannot rank yourself'
            };
        }

        return {
            allowed: true,
            reason: null
        };
    }

    hasRankPermission(userRank, requiredRank) {
        return userRank >= requiredRank;
    }

    canManageRank(commanderRank, targetRank) {
        return commanderRank > targetRank;
    }
}

module.exports = new Permissions();
