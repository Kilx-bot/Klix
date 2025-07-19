const { SlashCommandBuilder } = require('discord.js');
const rankingService = require('../services/rankingService');
const verificationService = require('../services/verificationService');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Rank a user in the Roblox group')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The Roblox username to rank')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('rank')
                .setDescription('The rank number to assign')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(255)
        ),

    async execute(interaction) {
        const targetUsername = interaction.options.getString('username');
        const newRank = interaction.options.getInteger('rank');
        const commanderId = interaction.user.id;

        try {
            await interaction.deferReply({ ephemeral: true });

            // Check if commander is verified
            const commander = await verificationService.getVerifiedUser(commanderId);
            if (!commander) {
                await interaction.editReply({
                    content: '❌ You must be verified to use ranking commands. Use `/verify` first.'
                });
                return;
            }

            // Refresh commander's rank information
            await verificationService.refreshUserRank(commanderId);

            const result = await rankingService.rankUserByUsername(commander, targetUsername, newRank);

            if (result.success) {
                await interaction.editReply({
                    content: `✅ Successfully ranked **${result.targetUsername}** to rank ${newRank} (${result.newRoleName})!`
                });
            } else {
                await interaction.editReply({
                    content: `❌ Ranking failed: ${result.error}`
                });
            }
        } catch (error) {
            logger.error('Error in rank command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while ranking the user. Please try again later.'
            });
        }
    }
};
