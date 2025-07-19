const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

class RobloxService {
    constructor() {
        this.baseURL = 'https://api.roblox.com';
        this.groupsURL = 'https://groups.roblox.com';
    }

    async getUserByUsername(username) {
        try {
            const response = await axios.post(`https://users.roblox.com/v1/usernames/users`, {
                usernames: [username]
            });

            if (response.data.data && response.data.data.length > 0) {
                return {
                    success: true,
                    user: response.data.data[0]
                };
            }

            return {
                success: false,
                error: 'User not found'
            };
        } catch (error) {
            logger.error('Error fetching user by username:', error);
            return {
                success: false,
                error: 'Failed to fetch user information'
            };
        }
    }

    async getGroupMember(groupId, userId) {
        try {
            // Use the correct endpoint to get user's groups and check membership
            const response = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
            
            // Find the group in the user's groups
            const userGroups = response.data.data;
            const groupMembership = userGroups.find(group => group.group.id.toString() === groupId.toString());
            
            if (groupMembership) {
                return {
                    success: true,
                    member: {
                        role: {
                            id: groupMembership.role.id,
                            name: groupMembership.role.name,
                            rank: groupMembership.role.rank
                        }
                    }
                };
            } else {
                return {
                    success: false,
                    error: 'User is not a member of the group'
                };
            }
        } catch (error) {
            logger.error('Error fetching group member:', error);
            return {
                success: false,
                error: 'Failed to fetch group member information'
            };
        }
    }

    async setUserRank(groupId, userId, roleId) {
        try {
            const response = await axios.patch(`${this.groupsURL}/v1/groups/${groupId}/users/${userId}`, {
                roleId: roleId
            }, {
                headers: {
                    'X-CSRF-TOKEN': await this.getCSRFToken(),
                    'Cookie': `.ROBLOSECURITY=${config.ROBLOX_API_KEY}`
                }
            });

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            logger.error('Error setting user rank:', error);
            
            if (error.response) {
                logger.error('Roblox API Error Details:', {
                    status: error.response.status,
                    data: error.response.data,
                    errors: error.response.data.errors
                });
                return {
                    success: false,
                    error: `API Error: ${error.response.data.errors?.[0]?.message || 'Unknown error'}`
                };
            }
            
            return {
                success: false,
                error: 'Failed to set user rank'
            };
        }
    }

    async getGroupRoles(groupId) {
        try {
            const response = await axios.get(`${this.groupsURL}/v1/groups/${groupId}/roles`);
            return {
                success: true,
                roles: response.data.roles
            };
        } catch (error) {
            logger.error('Error fetching group roles:', error);
            return {
                success: false,
                error: 'Failed to fetch group roles'
            };
        }
    }

    async getCSRFToken() {
        try {
            await axios.post(`https://auth.roblox.com/v1/logout`, {}, {
                headers: {
                    'Cookie': `.ROBLOSECURITY=${config.ROBLOX_API_KEY}`
                }
            });
        } catch (error) {
            if (error.response && error.response.headers['x-csrf-token']) {
                return error.response.headers['x-csrf-token'];
            }
        }
        return null;
    }
}

module.exports = new RobloxService();
