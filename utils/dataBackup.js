const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class DataBackup {
    constructor() {
        this.backupDir = path.join(process.cwd(), 'storage', 'backups');
        this.ensureBackupDir();
    }

    async ensureBackupDir() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
        } catch (error) {
            logger.error('Failed to create backup directory:', error);
        }
    }

    async backupVerifications(verifications) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `verifications-backup-${timestamp}.json`;
            const filepath = path.join(this.backupDir, filename);
            
            const backupData = {
                timestamp: new Date().toISOString(),
                count: verifications.length,
                verifications: verifications
            };
            
            await fs.writeFile(filepath, JSON.stringify(backupData, null, 2));
            logger.info(`Verification backup created: ${filename} (${verifications.length} records)`);
            
            // Keep only last 10 backups
            await this.cleanupOldBackups();
            
            return filepath;
        } catch (error) {
            logger.error('Failed to backup verifications:', error);
            throw error;
        }
    }

    async cleanupOldBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backupFiles = files
                .filter(file => file.startsWith('verifications-backup-'))
                .sort()
                .reverse();
            
            // Keep only the 10 most recent backups
            for (let i = 10; i < backupFiles.length; i++) {
                const filepath = path.join(this.backupDir, backupFiles[i]);
                await fs.unlink(filepath);
                logger.debug(`Removed old backup: ${backupFiles[i]}`);
            }
        } catch (error) {
            logger.error('Failed to cleanup old backups:', error);
        }
    }

    async restoreFromBackup(backupFile) {
        try {
            const filepath = path.join(this.backupDir, backupFile);
            const backupData = JSON.parse(await fs.readFile(filepath, 'utf8'));
            
            logger.info(`Restored ${backupData.count} verifications from backup: ${backupFile}`);
            return backupData.verifications;
        } catch (error) {
            logger.error('Failed to restore from backup:', error);
            throw error;
        }
    }
}

module.exports = new DataBackup();