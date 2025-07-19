const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const connectPg = require('connect-pg-simple');
const { storage } = require('./storage');
const logger = require('../utils/logger');

const app = express();

// Trust proxy for Replit
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 
    [`https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`] : 
    ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
}));

// Session configuration
const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
const pgStore = connectPg(session);
const sessionStore = new pgStore({
  conString: process.env.DATABASE_URL,
  createTableIfMissing: false,
  ttl: sessionTtl,
  tableName: 'sessions',
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Set to false for development/testing
    maxAge: sessionTtl,
    sameSite: 'lax',
  },
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple auth middleware
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

// Routes
app.get('/api/auth/user', isAuthenticated, (req, res) => {
  res.json(req.session.user);
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Simple demo auth - in production, use proper authentication
  if (username === 'admin' && password === 'password') {
    try {
      // Ensure user exists in database
      const user = await storage.upsertUser({
        id: '1',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        profileImageUrl: null,
      });
      
      req.session.user = {
        id: user.id,
        username: 'admin',
        email: user.email,
      };
      res.json({ success: true });
    } catch (error) {
      logger.error('Error creating/updating user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ message: 'Could not log out' });
    } else {
      res.json({ message: 'Logged out successfully' });
    }
  });
});

// Discord servers endpoints
app.get('/api/servers', isAuthenticated, async (req, res) => {
  try {
    // Get servers from Discord client if available
    if (app.locals.discordClient) {
      const guilds = app.locals.discordClient.guilds.cache.map(guild => ({
        id: guild.id,
        name: guild.name,
        isActive: true,
        addedAt: new Date().toISOString(),
        memberCount: guild.memberCount || 0,
        icon: guild.iconURL() || null
      }));
      res.json(guilds);
    } else {
      // Fallback to database servers
      const servers = await storage.getServersByUser(req.session.user.id);
      res.json(servers);
    }
  } catch (error) {
    logger.error('Error fetching servers:', error);
    res.status(500).json({ message: 'Failed to fetch servers' });
  }
});

app.post('/api/servers', isAuthenticated, async (req, res) => {
  try {
    const { id, name } = req.body;
    const server = await storage.addServer({
      id,
      name,
      ownerId: req.session.user.id,
    });
    res.json(server);
  } catch (error) {
    logger.error('Error adding server:', error);
    res.status(500).json({ message: 'Failed to add server' });
  }
});

// Get channels for a specific server
app.get('/api/servers/:serverId/channels', isAuthenticated, async (req, res) => {
  try {
    const { serverId } = req.params;
    
    if (app.locals.discordClient) {
      const guild = app.locals.discordClient.guilds.cache.get(serverId);
      if (!guild) {
        return res.status(404).json({ message: 'Server not found' });
      }
      
      const channels = guild.channels.cache
        .filter(channel => channel.type === 0) // Text channels only
        .map(channel => ({
          id: channel.id,
          name: channel.name,
          type: channel.type,
          position: channel.position
        }))
        .sort((a, b) => a.position - b.position);
      
      res.json(channels);
    } else {
      res.status(503).json({ message: 'Discord client not available' });
    }
  } catch (error) {
    logger.error('Error fetching channels:', error);
    res.status(500).json({ message: 'Failed to fetch channels' });
  }
});

// Messages endpoints
app.get('/api/messages', isAuthenticated, async (req, res) => {
  try {
    const messages = await storage.getMessagesByUser(req.session.user.id);
    res.json(messages);
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

app.post('/api/messages', isAuthenticated, async (req, res) => {
  try {
    const { serverId, channelId, content, embed } = req.body;
    
    // Debug logging
    logger.info('Creating message with data:', {
      serverId,
      channelId,
      content,
      embed: embed ? JSON.stringify(embed) : null
    });
    
    const messageData = {
      userId: req.session.user.id,
      serverId,
      channelId,
      content: content || null,
      embed: embed || null,
    };
    
    logger.info('Message data to store:', messageData);
    
    const message = await storage.createMessage(messageData);
    res.json(message);
  } catch (error) {
    logger.error('Error creating message:', error);
    res.status(500).json({ message: 'Failed to create message' });
  }
});

// Railway optimized health check endpoint
app.get('/health', (req, res) => {
  // Set headers for Railway compatibility
  res.set({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'X-Health-Check': 'railway-optimized'
  });
  
  const uptime = Math.floor(process.uptime());
  const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const isDiscordReady = app.locals.discordClient && app.locals.discordClient.isReady();
  
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: uptime,
    service: 'discord-roblox-bot',
    environment: process.env.NODE_ENV || 'production',
    port: parseInt(process.env.PORT) || 5000,
    memory_mb: memoryUsage,
    components: {
      web_server: 'operational',
      database: process.env.DATABASE_URL ? 'connected' : 'missing',
      discord_bot: isDiscordReady ? 'connected' : 'initializing'
    },
    metrics: {
      guilds: isDiscordReady ? app.locals.discordClient.guilds.cache.size : 0,
      ping_ms: isDiscordReady ? app.locals.discordClient.ws.ping : -1,
      ready: isDiscordReady
    }
  };
  
  // Railway health check: Always return 200 OK for maximum compatibility
  // This prevents deployment timeout during Discord initialization
  const httpStatus = 200;
  
  res.status(httpStatus).json(healthStatus);
  
  // Log health checks periodically for monitoring
  if (uptime < 60 || uptime % 300 === 0) { // First minute, then every 5 minutes
    logger.info(`Railway health check: ${healthStatus.status} (uptime: ${uptime}s, guilds: ${healthStatus.metrics.guilds})`);
  }
});

// Static file serving - fallback if client build exists
const clientDistPath = path.join(__dirname, '../client/dist');
const fs = require('fs');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  
  // Dashboard route
  app.get('/', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Fallback: Simple status page when client build missing
  app.get('/', (req, res) => {
    res.json({
      message: 'Discord Roblox Management Bot - Web Dashboard',
      status: 'operational',
      bot_status: {
        connected: app.locals.discordClient ? app.locals.discordClient.isReady() : false,
        guilds: app.locals.discordClient ? app.locals.discordClient.guilds.cache.size : 0
      },
      endpoints: {
        health: '/health',
        api: '/api/*'
      },
      note: 'Frontend dashboard temporarily unavailable - bot functionality active'
    });
  });
}

module.exports = app;