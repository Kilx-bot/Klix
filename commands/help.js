const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help information about bot commands'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Roblox Group Management Bot')
            .setDescription('This bot helps manage your Roblox group through Discord!')
            .setColor(0x0099FF)
            .addFields(
                {
                    name: '🔗 `/verify <username>`',
                    value: 'Link your Discord account to your Roblox account\n*Example: `/verify john_doe123`*',
                    inline: false
                },
                {
                    name: '👑 `/rank <username> <rank>`',
                    value: 'Rank any user in the Roblox group by their username\n*Example: `/rank john_doe123 5`*\n*Note: You can only rank users to ranks below your own*',
                    inline: false
                },
                {
                    name: '❓ `/help`',
                    value: 'Show this help message',
                    inline: false
                }
            )
            .addFields(
                {
                    name: '📋 Requirements',
                    value: '• You must be verified to use ranking commands\n• Target users must be members of the Roblox group\n• You can only rank users with lower ranks than your own\n• You can only rank users to ranks below your current rank',
                    inline: false
                }
            )
            .setFooter({
                text: 'Roblox Group Management Bot'
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
