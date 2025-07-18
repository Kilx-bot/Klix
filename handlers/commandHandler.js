const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const logger = require('../utils/logger');

class CommandHandler {
    constructor() {
        this.commands = [];
    }

    loadCommands(client) {
        const commandsPath = path.join(__dirname, '../commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                this.commands.push(command.data.toJSON());
                logger.info(`Loaded command: ${command.data.name}`);
            } else {
                logger.warn(`Invalid command structure in file: ${file}`);
            }
        }

        // Deploy commands to Discord
        this.deployCommands();
    }

    async deployCommands() {
        const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

        try {
            logger.info('Started refreshing application (/) commands.');

            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID || 'your_client_id'),
                { body: this.commands }
            );

            logger.info('Successfully reloaded application (/) commands.');
        } catch (error) {
            logger.error('Error deploying commands:', error);
        }
    }
}

module.exports = new CommandHandler();
