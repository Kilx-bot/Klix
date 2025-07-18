const robloxService = require('./robloxService');
const memoryDb = require('../storage/memoryDb');
const logger = require('../utils/logger');
const config = require('../config/config');
const { db } = require('../server/db');
const { verifications } = require('../shared/schema');
const { eq } = require('drizzle-orm');
const DataValidator = require('../utils/dataValidator');
const dataBackup = require('../utils/dataBackup');

class VerificationService {
    async verifyUser(discordId, robloxUsername) {
        try {
            // Get Roblox user information
            const userResult = await robloxService.getUserByUsername(robloxUsername);
            if (!userResult.success) {
                return {
                    success: false,
                    error: userResult.error
                };
            }

            const robloxUser = userResult.user;

            // Check if user is in the group
            const memberResult = await robloxService.getGroupMember(config.ROBLOX_GROUP_ID, robloxUser.id);
            if (!memberResult.success) {
                return {
                    success: false,
                    error: 'You must be a member of the Roblox group to verify'
                };
            }

            // Store verification data in PostgreSQL with validation
            const verificationData = {
                discordId: discordId,
                robloxId: robloxUser.id.toString(),
                robloxUsername: robloxUser.name,
                rank: memberResult.member.role.rank,
                roleName: memberResult.member.role.name,
                updatedAt: new Date()
            };

            // Validate data before storing
            const validation = DataValidator.validateVerificationData(verificationData);
            if (!validation.isValid) {
                logger.error('Invalid verification data:', validation.errors);
                return {
                    success: false,
                    error: 'Invalid verification data: ' + validation.errors.join(', ')
                };
            }

            // Sanitize data
            const sanitizedData = DataValidator.sanitizeVerificationData(verificationData);

            // Store in database with error handling
            try {
                await db.insert(verifications)
                    .values(sanitizedData)
                    .onConflictDoUpdate({
                        target: verifications.discordId,
                        set: {
                            robloxId: sanitizedData.robloxId,
                            robloxUsername: sanitizedData.robloxUsername,
                            rank: sanitizedData.rank,
                            roleName: sanitizedData.roleName,
                            updatedAt: sanitizedData.updatedAt
                        }
                    });

                // Also store in memory for performance
                memoryDb.setVerification(discordId, sanitizedData);
                
                logger.info(`Verification stored securely: ${discordId} -> ${sanitizedData.robloxUsername}`);
            } catch (dbError) {
                logger.error('Database storage failed:', dbError);
                // Store in memory as fallback
                memoryDb.setVerification(discordId, sanitizedData);
                logger.warn('Verification stored in memory only due to database error');
            }

            logger.info(`User verified: Discord ${discordId} -> Roblox ${robloxUser.name} (${robloxUser.id})`);

            return {
                success: true,
                robloxId: robloxUser.id,
                robloxUsername: robloxUser.name,
                rank: memberResult.member.role.name
            };
        } catch (error) {
            logger.error('Error in verification process:', error);
            return {
                success: false,
                error: 'An error occurred during verification'
            };
        }
    }

    async getVerifiedUser(discordId) {
        try {
            // First check database
            const [verification] = await db.select().from(verifications).where(eq(verifications.discordId, discordId));
            
            if (verification) {
                // Also sync to memory for compatibility
                memoryDb.setVerification(discordId, verification);
                return verification;
            }
            
            // Fallback to memory storage
            return memoryDb.getVerification(discordId);
        } catch (error) {
            logger.error('Error getting verified user:', error);
            // Fallback to memory storage
            return memoryDb.getVerification(discordId);
        }
    }

    async refreshUserRank(discordId) {
        const verification = await this.getVerifiedUser(discordId);
        if (!verification) {
            return { success: false, error: 'User not verified' };
        }

        try {
            // Get current group membership
            const memberResult = await robloxService.getGroupMember(config.ROBLOX_GROUP_ID, verification.robloxId);
            if (!memberResult.success) {
                return { success: false, error: 'User no longer in group' };
            }

            // Update stored rank information in database
            const updatedData = {
                rank: memberResult.member.role.rank,
                roleName: memberResult.member.role.name,
                updatedAt: new Date()
            };
            
            await db.update(verifications)
                .set(updatedData)
                .where(eq(verifications.discordId, discordId));
            
            // Update memory storage too
            verification.rank = memberResult.member.role.rank;
            verification.roleName = memberResult.member.role.name;
            memoryDb.setVerification(discordId, verification);

            return {
                success: true,
                rank: memberResult.member.role.rank,
                roleName: memberResult.member.role.name
            };
        } catch (error) {
            logger.error('Error refreshing user rank:', error);
            return { success: false, error: 'Failed to refresh rank' };
        }
    }

    async getAllVerifiedUsers() {
        try {
            // Get all verifications from database
            const dbVerifications = await db.select().from(verifications);
            
            // Sync to memory for performance
            dbVerifications.forEach(verification => {
                memoryDb.setVerification(verification.discordId, verification);
            });
            
            return dbVerifications;
        } catch (error) {
            logger.error('Error getting all verified users:', error);
            // Fallback to memory storage
            return memoryDb.getAllVerifications();
        }
    }

    async removeVerification(discordId) {
        try {
            // Remove from database
            await db.delete(verifications).where(eq(verifications.discordId, discordId));
            
            // Remove from memory
            memoryDb.removeVerification(discordId);
            
            logger.info(`Verification removed for Discord user: ${discordId}`);
        } catch (error) {
            logger.error('Error removing verification:', error);
            // Fallback to memory removal
            memoryDb.removeVerification(discordId);
        }
    }

    async loadVerificationsFromDatabase() {
        try {
            logger.info('🔄 Loading existing verifications from database...');
            
            // Validate database connection first
            const dbValidation = DataValidator.validateDatabaseConnection(db);
            if (!dbValidation.isValid) {
                logger.error('Database connection invalid:', dbValidation.error);
                return 0;
            }
            
            const dbVerifications = await db.select().from(verifications);
            
            let loadedCount = 0;
            let validCount = 0;
            
            dbVerifications.forEach(verification => {
                // Validate each verification record
                const validation = DataValidator.validateVerificationData(verification);
                
                if (validation.isValid) {
                    const sanitizedData = DataValidator.sanitizeVerificationData(verification);
                    memoryDb.setVerification(verification.discordId, sanitizedData);
                    validCount++;
                } else {
                    logger.warn(`Invalid verification data for ${verification.discordId}:`, validation.errors);
                }
                
                loadedCount++;
            });
            
            // Create backup of loaded data
            if (validCount > 0) {
                await dataBackup.backupVerifications(dbVerifications);
            }
            
            logger.info(`✅ Loaded ${validCount}/${loadedCount} valid verifications from database`);
            return validCount;
        } catch (error) {
            logger.error('Error loading verifications from database:', error);
            return 0;
        }
    }

    async performDataIntegrityCheck() {
        try {
            logger.info('🔍 Performing data integrity check...');
            
            const dbVerifications = await db.select().from(verifications);
            const memoryVerifications = memoryDb.getAllVerifications();
            
            let dbCount = dbVerifications.length;
            let memoryCount = Object.keys(memoryVerifications).length;
            let syncIssues = 0;
            
            // Check for sync issues
            dbVerifications.forEach(dbVerification => {
                const memoryVerification = memoryVerifications[dbVerification.discordId];
                if (!memoryVerification) {
                    logger.warn(`Database record not in memory: ${dbVerification.discordId}`);
                    syncIssues++;
                    // Sync to memory
                    memoryDb.setVerification(dbVerification.discordId, dbVerification);
                }
            });
            
            logger.info(`📊 Data integrity check: DB=${dbCount}, Memory=${memoryCount}, Sync issues=${syncIssues}`);
            
            return {
                databaseCount: dbCount,
                memoryCount: memoryCount,
                syncIssues: syncIssues
            };
        } catch (error) {
            logger.error('Data integrity check failed:', error);
            return null;
        }
    }
}

module.exports = new VerificationService();
