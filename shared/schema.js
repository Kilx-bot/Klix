const {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  boolean,
  integer,
} = require('drizzle-orm/pg-core');

// Session storage table.
const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Discord servers table
const discordServers = pgTable("discord_servers", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(),
  ownerId: varchar("owner_id").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// Messages table
const messages = pgTable("messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  serverId: varchar("server_id").notNull(),
  channelId: varchar("channel_id"),
  content: text("content"),
  embed: jsonb("embed"), // Store embed data as JSON
  sentAt: timestamp("sent_at").defaultNow(),
  status: varchar("status").default('pending'),
  errorMessage: text("error_message"),
});

// Verification storage table for Discord-to-Roblox account linking
const verifications = pgTable("verifications", {
  discordId: varchar("discord_id").primaryKey(),
  robloxId: varchar("roblox_id").notNull(),
  robloxUsername: varchar("roblox_username").notNull(),
  rank: integer("rank").notNull(),
  roleName: varchar("role_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

module.exports = {
  sessions,
  users,
  discordServers,
  messages,
  verifications
};