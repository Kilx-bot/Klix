const logger = require('../utils/logger');

class MessageProcessor {
  constructor(client, storage) {
    this.client = client;
    this.storage = storage;
    this.isProcessing = false;
    this.processingInterval = null;
  }

  start() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Process messages every 5 seconds
    this.processingInterval = setInterval(() => {
      this.processMessages();
    }, 5000);

    logger.info("Message processor started");
  }

  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    logger.info("Message processor stopped");
  }

  async processMessages() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const pendingMessages = await this.storage.getPendingMessages();
      
      for (const message of pendingMessages) {
        try {
          const guild = this.client.guilds.cache.get(message.serverId);
          if (!guild) {
            await this.storage.updateMessageStatus(
              message.id,
              "failed",
              "Server not found or bot not in server"
            );
            continue;
          }

          const channel = guild.channels.cache.get(message.channelId);
          if (!channel || !channel.isTextBased()) {
            await this.storage.updateMessageStatus(
              message.id,
              "failed",
              "Channel not found or not a text channel"
            );
            continue;
          }

          // Prepare message payload
          const messagePayload = {};
          
          // Add content if provided
          if (message.content) {
            messagePayload.content = message.content;
          }
          
          // Add embed if provided
          if (message.embed) {
            messagePayload.embeds = [message.embed];
          }
          
          // Send the message
          await channel.send(messagePayload);
          await this.storage.updateMessageStatus(message.id, "sent");
          
          const logContent = message.content ? message.content.substring(0, 50) : (message.embed ? `[Embed: ${message.embed.title || 'No title'}]` : '[Empty message]');
          logger.info(`Message sent to ${guild.name}#${channel.name}: ${logContent}...`);
        } catch (error) {
          await this.storage.updateMessageStatus(
            message.id,
            "failed",
            error instanceof Error ? error.message : "Unknown error"
          );
          logger.error(`Failed to send message ${message.id}:`, error);
        }
      }
    } catch (error) {
      logger.error("Error processing messages:", error);
    } finally {
      this.isProcessing = false;
    }
  }
}

module.exports = MessageProcessor;