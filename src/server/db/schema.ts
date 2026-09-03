import { pgTable, text, numeric, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  displayName: text("display_name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "subadmin"] }).notNull().default("subadmin"),
  status: text("status", { enum: ["pending", "active", "rejected", "suspended"] }).notNull().default("pending"),
  bdtRate: numeric("bdt_rate", { precision: 10, scale: 2 }).default("120"),
  feePercentage: numeric("fee_percentage", { precision: 5, scale: 2 }).default("0"),
  balance: numeric("balance", { precision: 10, scale: 2 }).notNull().default("0"),
  profilePic: text("profile_pic"),
  // Unused — leftover from a removed multi-account feature. Left in place rather than
  // dropped to avoid a risky column-drop migration; always null/false going forward.
  parentUserId: text("parent_user_id"),
  isAdminSubAccount: boolean("is_admin_sub_account").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentsTable = pgTable("payments", {
  id: text("id").primaryKey(),
  shortId: text("short_id").notNull(),
  userId: text("user_id").references(() => usersTable.id),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
  chargedUsd: numeric("charged_usd", { precision: 10, scale: 2 }),
  amountSats: numeric("amount_sats", { precision: 20, scale: 0 }).notNull().default("0"),
  status: text("status", { enum: ["pending", "paid", "expired"] }).notNull().default("pending"),
  lightningInvoice: text("lightning_invoice").notNull().default(""),
  checkedBy: text("checked_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
});

export const withdrawalsTable = pgTable("withdrawals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
  method: text("method", { enum: ["bkash", "nagad", "bank"] }).notNull(),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  bankName: text("bank_name"),
  routingNumber: text("routing_number"),
  district: text("district"),
  upazila: text("upazila"),
  status: text("status", { enum: ["pending", "paid", "rejected"] }).notNull().default("pending"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
});

export const settingsTable = pgTable("admin_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const contactMessagesTable = pgTable("contact_messages", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status", { enum: ["unread", "read"] }).notNull().default("unread"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => usersTable.id),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
