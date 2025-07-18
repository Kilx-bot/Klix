const robloxService = require('./robloxService');
const permissions = require('../utils/permissions');
const logger = require('../utils/logger');
const config = require('../config/config');
const memoryDb = require('../storage/memoryDb');

class RankingService {
    async rankUserByUsername(commander, targetUsername, newRank) {
        try {
            // Get target user information
            const userResult = await robloxService.getUserByUsername(targetUsername);
            if (!userResult.success) {
                return {
                    success: false,
                    error: userResult.error
                };
            }

            const targetUser = userResult.user;

            // Check if target user is in the group
            const memberResult = await robloxService.getGroupMember(config.ROBLOX_GROUP_ID, targetUser.id);
            if (!memberResult.success) {
                return {
                    success: false,
                    error: 'Target user is not a member of the group'
                };
            }

            const targetCurrentRank = memberResult.member.role.rank;

            // Check if commander can rank this user
            if (commander.rank <= targetCurrentRank) {
                return {
                    success: false,
                    error: 'You cannot rank users with equal or higher rank than yourself'
                };
            }

            // Check if the new rank is below commander's rank
            if (newRank >= commander.rank) {
                return {
                    success: false,
                    error: 'You cannot rank users to your rank or higher'
                };
            }

            // Get group roles to validate rank
            const rolesResult = await robloxService.getGroupRoles(config.ROBLOX_GROUP_ID);
            if (!rolesResult.success) {
                return {
                    success: false,
                    error: 'Failed to fetch group roles'
                };
            }

            // Find the role with the specified rank
            const targetRole = rolesResult.roles.find(role => role.rank === newRank);
            if (!targetRole) {
                return {
                    success: false,
                    error: `No role found with rank ${newRank}`
                };
            }

            // Set the user's rank
            logger.info(`Attempting to rank user ${targetUser.name} (${targetUser.id}) to role ${targetRole.name} (ID: ${targetRole.id}, Rank: ${newRank})`);
            
            const rankResult = await robloxService.setUserRank(
                config.ROBLOX_GROUP_ID,
                targetUser.id,
                targetRole.id
            );

            if (!rankResult.success) {
                return {
                    success: false,
                    error: rankResult.error
                };
            }

            // Log the ranking action
            memoryDb.addRankingLog(
                commander.discordId,
                targetUser.id,
                targetCurrentRank,
                newRank,
                `Ranked by ${commander.robloxUsername}`
            );

            // Update verification data if user is verified
            const existingVerification = memoryDb.getVerificationByRobloxId(targetUser.id);
            if (existingVerification) {
                existingVerification.rank = newRank;
                existingVerification.roleName = targetRole.name;
                memoryDb.setVerification(existingVerification.discordId, existingVerification);
            }

            logger.info(`User ranked: ${commander.robloxUsername} ranked ${targetUser.name} to ${newRank} (${targetRole.name})`);

            return {
                success: true,
                targetUsername: targetUser.name,
                newRank: newRank,
                newRoleName: targetRole.name
            };
        } catch (error) {
            logger.error('Error in ranking process:', error);
            return {
                success: false,
                error: 'An error occurred while ranking the user'
            };
        }
    }

    async getAvailableRanks(commanderRank) {
        try {
            const rolesResult = await robloxService.getGroupRoles(config.ROBLOX_GROUP_ID);
            if (!rolesResult.success) {
                return {
                    success: false,
                    error: 'Failed to fetch group roles'
                };
            }

            // Filter roles to only include those below the commander's rank
            const availableRoles = rolesResult.roles.filter(role => role.rank < commanderRank);

            return {
                success: true,
                roles: availableRoles
            };
        } catch (error) {
            logger.error('Error fetching available ranks:', error);
            return {
                success: false,
                error: 'Failed to fetch available ranks'
            };
        }
    }
}

module.exports = new RankingService();
