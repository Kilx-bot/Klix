const { SlashCommandBuilder } = require('discord.js');
const verificationService = require('../services/verificationService');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your Roblox account')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Your Roblox username')
                .setRequired(true)
        ),

    async execute(interaction) {
        const username = interaction.options.getString('username');
        const discordId = interaction.user.id;

        try {
            await interaction.deferReply({ ephemeral: true });

            const result = await verificationService.verifyUser(discordId, username);

            if (result.success) {
                await interaction.editReply({
                    content: `✅ Successfully verified! Your Roblox account **${result.robloxUsername}** (ID: ${result.robloxId}) has been linked to your Discord account.\n\nYour current rank: **${result.rank}**`
                });
            } else {
                await interaction.editReply({
                    content: `❌ Verification failed: ${result.error}`
                });
            }
        } catch (error) {
            logger.error('Error in verify command:', error);
            await interaction.editReply({
                content: '❌ An error occurred during verification. Please try again later.'
            });
        }
    }
};
