import {
  pgTable,
  text,
  boolean,
  timestamp,
  bigint,
  doublePrecision,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const session = pgTable("Session", {
  id: text("id").primaryKey(),
  shop: text("shop").notNull(),
  state: text("state").notNull(),
  isOnline: boolean("isOnline").default(false).notNull(),
  scope: text("scope"),
  expires: timestamp("expires", { mode: "date", precision: 3 }),
  accessToken: text("accessToken").notNull(),
  userId: bigint("userId", { mode: "number" }),
  firstName: text("firstName"),
  lastName: text("lastName"),
  email: text("email"),
  accountOwner: boolean("accountOwner"),
  locale: text("locale"),
  collaborator: boolean("collaborator"),
  emailVerified: boolean("emailVerified"),
  refreshToken: text("refreshToken"),
  refreshTokenExpires: timestamp("refreshTokenExpires", { mode: "date", precision: 3 }),
});

export const merchant = pgTable("Merchant", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  shopDomain: text("shopDomain").notNull().unique(),
  accessToken: text("accessToken").notNull(),
  plan: text("plan").default("free").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  widgetPosition: text("widgetPosition").default("bottom-right").notNull(),
  widgetBtnColorHue: bigint("widgetBtnColorHue", { mode: "number" }).default(120).notNull(),
  widgetBtnColorSaturation: doublePrecision("widgetBtnColorSaturation").default(1).notNull(),
  widgetBtnColorBrightness: doublePrecision("widgetBtnColorBrightness").default(1).notNull(),
  isWidgetEnabled: boolean("isWidgetEnabled").default(false).notNull(),
  widgetButtonText: text("widgetButtonText").default("Try It On").notNull(),
  widgetButtonContentType: text("widgetButtonContentType").default("text").notNull(),
  widgetButtonEmoji: text("widgetButtonEmoji").default("👀").notNull(),
  widgetButtonImageUrl: text("widgetButtonImageUrl"),
  widgetButtonSize: bigint("widgetButtonSize", { mode: "number" }).default(56).notNull(),
  widgetButtonIcon: text("widgetButtonIcon").default("").notNull(),
  widgetButtonIconPosition: text("widgetButtonIconPosition").default("none").notNull(),
  widgetButtonRadius: bigint("widgetButtonRadius", { mode: "number" }).default(12).notNull(),
  widgetButtonTextColor: text("widgetButtonTextColor").default("#FFFFFF").notNull(),
  trialEndsAt: timestamp("trialEndsAt", { mode: "date", precision: 3 }),
  createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
});

export const generation = pgTable(
  "Generation",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    merchantId: text("merchantId")
      .notNull()
      .references(() => merchant.id, { onDelete: "cascade" }),
    productId: text("productId"),
    inputImageUrl: text("inputImageUrl"),
    resultImageUrl: text("resultImageUrl"),
    costUSD: doublePrecision("costUSD").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).defaultNow().notNull(),
  },
  (table) => {
    return {
      merchantIdCreatedAtIdx: index("Generation_merchantId_createdAt_idx").on(
        table.merchantId,
        table.createdAt
      ),
    };
  }
);

export const merchantRelations = relations(merchant, ({ many }) => ({
  generations: many(generation),
}));

export const generationRelations = relations(generation, ({ one }) => ({
  merchant: one(merchant, {
    fields: [generation.merchantId],
    references: [merchant.id],
  }),
}));
