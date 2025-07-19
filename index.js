const { Collection, Client, GatewayIntentBits } = require('discord.js');
const config = require('./config/config');
const commandHandler = require('./handlers/commandHandler');
const logger = require('./utils/logger');
const memoryDb = require('./storage/memoryDb');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Import web server components
const app = require('./server/webServer');
const { storage } = require('./server/storage');
const MessageProcessor = require('./server/messageProcessor');
const EnhancedKeepAlive = require('./enhanced-keepalive');

// Initialize command collection
client.commands = new Collection();

// Initialize memory database
memoryDb.init();

// Load existing verifications from database
const verificationService = require('./services/verificationService');
verificationService.loadVerificationsFromDatabase().then(count => {
    logger.info(`🔐 Verification system initialized with ${count} existing verifications`);
    
    // Perform initial data integrity check
    setTimeout(() => {
        verificationService.performDataIntegrityCheck().then(() => {
            logger.info('Initial data integrity check completed');
        }).catch(error => {
            logger.error('Initial data integrity check failed:', error);
        });
    }, 5000); // Wait 5 seconds after startup
}).catch(error => {
    logger.error('Failed to load verifications from database:', error);
});

// Initialize message processor
const messageProcessor = new MessageProcessor(client, storage);

// Initialize enhanced keep-alive service (will be configured with Discord client when ready)
const keepAlive = new EnhancedKeepAlive();

// Load commands
commandHandler.loadCommands(client);

// Bot ready event
client.once('ready', async () => {
    logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guild(s)`);
    
    // Pass Discord client to web server
    app.locals.discordClient = client;
    
    // Start message processor
    messageProcessor.start();
    
    // Configure and start enhanced keep-alive service with Discord client
    keepAlive.setDiscordClient(client);
    keepAlive.start();
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        logger.warn(`Unknown command: ${interaction.commandName}`);
        return;
    }

    try {
        await command.execute(interaction);
        logger.info(`Command executed: ${interaction.commandName} by ${interaction.user.tag}`);
    } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}:`, error);
        
        const errorMessage = 'There was an error while executing this command. Please try again later.';
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

// Handle errors
client.on('error', (error) => {
    logger.error('Discord client error:', error);
});

client.on('disconnect', () => {
    logger.warn('Discord client disconnected');
});

client.on('reconnecting', () => {
    logger.info('Discord client reconnecting...');
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    // Don't exit immediately, let the process manager handle restarts
});

process.on('SIGINT', () => {
    logger.info('Received SIGINT. Gracefully shutting down...');
    keepAlive.stop();
    messageProcessor.stop();
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Gracefully shutting down...');
    keepAlive.stop();
    messageProcessor.stop();
    client.destroy();
    process.exit(0);
});

process.on('RESTART_REQUIRED', () => {
    logger.info('Restart required. Gracefully shutting down...');
    keepAlive.stop();
    messageProcessor.stop();
    client.destroy();
    process.exit(1); // Exit with code 1 to signal restart needed
});

// Start web server with Railway health check support  
const startWebServer = async () => {
    try {
        const PORT = process.env.PORT || 5000;
        
        const server = app.listen(PORT, '0.0.0.0', () => {
            logger.info(`Web server running on port ${PORT}`);
            logger.info(`Railway health endpoint: http://0.0.0.0:${PORT}/health`);
            logger.info(`Dashboard available at: http://0.0.0.0:${PORT}/`);
        });
        
        return server;
    } catch (error) {
        logger.error('Failed to start web server:', error);
        throw error;
    }
};

// Start web server immediately for Railway health checks
startWebServer();

// Start Discord bot
client.login(config.DISCORD_TOKEN).catch(error => {
    logger.error('Failed to log in to Discord:', error);
    // Keep web server running for Railway health checks even if Discord fails
    logger.warn('Discord login failed, but web server remains operational for health checks');
});
