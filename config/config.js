const config = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN || 'your_discord_bot_token',
    ROBLOX_API_KEY: process.env.ROBLOX_API_KEY || 'your_roblox_api_key',
    ROBLOX_GROUP_ID: process.env.ROBLOX_GROUP_ID || 'your_roblox_group_id',
    COMMAND_PREFIX: process.env.COMMAND_PREFIX || '!',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

module.exports = config;
