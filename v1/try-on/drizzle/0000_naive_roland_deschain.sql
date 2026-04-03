CREATE TABLE "Generation" (
	"id" text PRIMARY KEY NOT NULL,
	"merchantId" text NOT NULL,
	"productId" text,
	"inputImageUrl" text,
	"resultImageUrl" text,
	"costUSD" double precision NOT NULL,
	"status" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Merchant" (
	"id" text PRIMARY KEY NOT NULL,
	"shopDomain" text NOT NULL,
	"accessToken" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"trialEndsAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	CONSTRAINT "Merchant_shopDomain_unique" UNIQUE("shopDomain")
);
--> statement-breakpoint
CREATE TABLE "Session" (
	"id" text PRIMARY KEY NOT NULL,
	"shop" text NOT NULL,
	"state" text NOT NULL,
	"isOnline" boolean DEFAULT false NOT NULL,
	"scope" text,
	"expires" timestamp (3),
	"accessToken" text NOT NULL,
	"userId" bigint,
	"firstName" text,
	"lastName" text,
	"email" text,
	"accountOwner" boolean,
	"locale" text,
	"collaborator" boolean,
	"emailVerified" boolean,
	"refreshToken" text,
	"refreshTokenExpires" timestamp (3)
);
--> statement-breakpoint
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_merchantId_Merchant_id_fk" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "Generation_merchantId_createdAt_idx" ON "Generation" USING btree ("merchantId","createdAt");