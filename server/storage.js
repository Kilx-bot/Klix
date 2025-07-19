const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq } = require('drizzle-orm');
const { users, discordServers, messages } = require('../shared/schema');
const logger = require('../utils/logger');
const ws = require('ws');

// Configure neon to use WebSocket
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

class DatabaseStorage {
  // User operations
  async getUser(id) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      logger.error('Error getting user:', error);
      throw error;
    }
  }

  async upsertUser(userData) {
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error) {
      logger.error('Error upserting user:', error);
      throw error;
    }
  }

  // Discord server operations
  async addServer(server) {
    try {
      const [newServer] = await db
        .insert(discordServers)
        .values(server)
        .returning();
      return newServer;
    } catch (error) {
      logger.error('Error adding server:', error);
      throw error;
    }
  }

  async getServersByUser(userId) {
    try {
      return await db
        .select()
        .from(discordServers)
        .where(eq(discordServers.ownerId, userId));
    } catch (error) {
      logger.error('Error getting servers by user:', error);
      throw error;
    }
  }

  async getServer(serverId) {
    try {
      const [server] = await db
        .select()
        .from(discordServers)
        .where(eq(discordServers.id, serverId));
      return server;
    } catch (error) {
      logger.error('Error getting server:', error);
      throw error;
    }
  }

  async updateServerStatus(serverId, isActive) {
    try {
      await db
        .update(discordServers)
        .set({ isActive })
        .where(eq(discordServers.id, serverId));
    } catch (error) {
      logger.error('Error updating server status:', error);
      throw error;
    }
  }

  // Message operations
  async createMessage(message) {
    try {
      logger.info('Storage createMessage called with:', message);
      const [newMessage] = await db
        .insert(messages)
        .values(message)
        .returning();
      logger.info('Message created in DB:', newMessage);
      return newMessage;
    } catch (error) {
      logger.error('Error creating message:', error);
      throw error;
    }
  }

  async getMessagesByUser(userId) {
    try {
      return await db
        .select()
        .from(messages)
        .where(eq(messages.userId, userId))
        .orderBy(messages.sentAt);
    } catch (error) {
      logger.error('Error getting messages by user:', error);
      throw error;
    }
  }

  async getMessagesByServer(serverId) {
    try {
      return await db
        .select()
        .from(messages)
        .where(eq(messages.serverId, serverId))
        .orderBy(messages.sentAt);
    } catch (error) {
      logger.error('Error getting messages by server:', error);
      throw error;
    }
  }

  async updateMessageStatus(messageId, status, errorMessage) {
    try {
      await db
        .update(messages)
        .set({ 
          status, 
          errorMessage: errorMessage || null 
        })
        .where(eq(messages.id, messageId));
    } catch (error) {
      logger.error('Error updating message status:', error);
      throw error;
    }
  }

  async getPendingMessages() {
    try {
      return await db
        .select()
        .from(messages)
        .where(eq(messages.status, 'pending'));
    } catch (error) {
      logger.error('Error getting pending messages:', error);
      throw error;
    }
  }
}

const storage = new DatabaseStorage();

module.exports = { storage, DatabaseStorage };