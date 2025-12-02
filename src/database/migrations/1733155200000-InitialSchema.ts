import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1733155200000 implements MigrationInterface {
  name = "InitialSchema1733155200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create ENUM types
    await queryRunner.query("CREATE TYPE \"user_role\" AS ENUM ('buyer', 'seller')");
    await queryRunner.query(
      "CREATE TYPE \"property_type\" AS ENUM ('house', 'apartment', 'land', 'commercial', 'warehouse')",
    );
    await queryRunner.query("CREATE TYPE \"property_status\" AS ENUM ('active', 'paused', 'sold')");

    // Create users table
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying(255) NOT NULL,
                "password" character varying(255) NOT NULL,
                "name" character varying(255) NOT NULL,
                "role" user_role NOT NULL,
                "profile_picture" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "UQ_users_email" UNIQUE ("email"),
                CONSTRAINT "check_email_format" CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
                CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
            )
        `);

    // Create properties table
    await queryRunner.query(`
            CREATE TABLE "properties" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "title" character varying(200) NOT NULL,
                "description" text NOT NULL,
                "price" numeric(12,2) NOT NULL,
                "currency" character varying(3) NOT NULL DEFAULT 'USD',
                "property_type" property_type NOT NULL,
                "address" text NOT NULL,
                "department" character varying(100) NOT NULL,
                "municipality" character varying(100) NOT NULL,
                "latitude" numeric(10,8),
                "longitude" numeric(11,8),
                "bedrooms" integer,
                "bathrooms" numeric(3,1),
                "area_sqm" numeric(10,2),
                "status" property_status NOT NULL DEFAULT 'active',
                "views_count" integer NOT NULL DEFAULT 0,
                "search_vector" tsvector,
                "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "deleted_at" TIMESTAMP,
                CONSTRAINT "check_price_positive" CHECK (price > 0),
                CONSTRAINT "check_latitude" CHECK (latitude >= -90 AND latitude <= 90),
                CONSTRAINT "check_longitude" CHECK (longitude >= -180 AND longitude <= 180),
                CONSTRAINT "check_bedrooms_positive" CHECK (bedrooms IS NULL OR bedrooms > 0),
                CONSTRAINT "check_bathrooms_positive" CHECK (bathrooms IS NULL OR bathrooms > 0),
                CONSTRAINT "check_area_positive" CHECK (area_sqm IS NULL OR area_sqm > 0),
                CONSTRAINT "PK_properties_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_properties_user_id" FOREIGN KEY ("user_id")
                    REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

    // Create property_images table
    await queryRunner.query(`
            CREATE TABLE "property_images" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "property_id" uuid NOT NULL,
                "url" text NOT NULL,
                "cloudinary_id" character varying(255) NOT NULL,
                "display_order" integer NOT NULL DEFAULT 0,
                "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "check_display_order_positive" CHECK (display_order >= 0),
                CONSTRAINT "PK_property_images_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_property_images_property_id" FOREIGN KEY ("property_id")
                    REFERENCES "properties"("id") ON DELETE CASCADE
            )
        `);

    // Create favorites table
    await queryRunner.query(`
            CREATE TABLE "favorites" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "property_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "unique_user_property_favorite" UNIQUE ("user_id", "property_id"),
                CONSTRAINT "PK_favorites_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_favorites_user_id" FOREIGN KEY ("user_id")
                    REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_favorites_property_id" FOREIGN KEY ("property_id")
                    REFERENCES "properties"("id") ON DELETE CASCADE
            )
        `);

    // Create conversations table
    await queryRunner.query(`
            CREATE TABLE "conversations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "property_id" uuid NOT NULL,
                "buyer_id" uuid NOT NULL,
                "seller_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "unique_property_buyer_seller" UNIQUE ("property_id", "buyer_id", "seller_id"),
                CONSTRAINT "check_buyer_not_seller" CHECK (buyer_id != seller_id),
                CONSTRAINT "PK_conversations_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_conversations_property_id" FOREIGN KEY ("property_id")
                    REFERENCES "properties"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_conversations_buyer_id" FOREIGN KEY ("buyer_id")
                    REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_conversations_seller_id" FOREIGN KEY ("seller_id")
                    REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

    // Create messages table
    await queryRunner.query(`
            CREATE TABLE "messages" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "conversation_id" uuid NOT NULL,
                "sender_id" uuid NOT NULL,
                "content" text NOT NULL,
                "is_read" boolean NOT NULL DEFAULT FALSE,
                "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "check_content_not_empty" CHECK (LENGTH(TRIM(content)) > 0),
                CONSTRAINT "PK_messages_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_messages_conversation_id" FOREIGN KEY ("conversation_id")
                    REFERENCES "conversations"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_messages_sender_id" FOREIGN KEY ("sender_id")
                    REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

    // Create push_subscriptions table
    await queryRunner.query(`
            CREATE TABLE "push_subscriptions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "endpoint" text NOT NULL,
                "keys_json" text NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "UQ_push_subscriptions_endpoint" UNIQUE ("endpoint"),
                CONSTRAINT "PK_push_subscriptions_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_push_subscriptions_user_id" FOREIGN KEY ("user_id")
                    REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

    // Create refresh_tokens table
    await queryRunner.query(`
            CREATE TABLE "refresh_tokens" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "token" character varying(500) NOT NULL,
                "expires_at" TIMESTAMP NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "UQ_refresh_tokens_token" UNIQUE ("token"),
                CONSTRAINT "check_expires_at_future" CHECK (expires_at > created_at),
                CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id")
                    REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

    // Create verification_tokens table
    await queryRunner.query(`
            CREATE TABLE "verification_tokens" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "token" character varying(6) NOT NULL,
                "expires_at" TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 minutes'),
                "is_used" boolean NOT NULL DEFAULT FALSE,
                "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "check_token_format" CHECK (token ~ '^[0-9]{6}$'),
                CONSTRAINT "PK_verification_tokens_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_verification_tokens_user_id" FOREIGN KEY ("user_id")
                    REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

    // Create indexes for users
    await queryRunner.query('CREATE INDEX "idx_users_email" ON "users" ("email")');
    await queryRunner.query('CREATE INDEX "idx_users_role" ON "users" ("role")');

    // Create indexes for properties
    await queryRunner.query('CREATE INDEX "idx_properties_user_id" ON "properties" ("user_id")');
    await queryRunner.query('CREATE INDEX "idx_properties_status" ON "properties" ("status")');
    await queryRunner.query(
      'CREATE INDEX "idx_properties_created_at" ON "properties" ("created_at" DESC)',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_properties_location" ON "properties" ("department", "municipality")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_properties_geolocation" ON "properties" ("latitude", "longitude")',
    );
    await queryRunner.query('CREATE INDEX "idx_properties_price" ON "properties" ("price")');
    await queryRunner.query('CREATE INDEX "idx_properties_type" ON "properties" ("property_type")');
    await queryRunner.query(
      'CREATE INDEX "idx_properties_search" ON "properties" USING GIN("search_vector")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_properties_active" ON "properties" ("created_at" DESC) WHERE "deleted_at" IS NULL',
    );

    // Create indexes for property_images
    await queryRunner.query(
      'CREATE INDEX "idx_property_images_property_id" ON "property_images" ("property_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_property_images_display_order" ON "property_images" ("property_id", "display_order")',
    );

    // Create indexes for favorites
    await queryRunner.query('CREATE INDEX "idx_favorites_user_id" ON "favorites" ("user_id")');
    await queryRunner.query(
      'CREATE INDEX "idx_favorites_property_id" ON "favorites" ("property_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_favorites_created_at" ON "favorites" ("created_at" DESC)',
    );

    // Create indexes for conversations
    await queryRunner.query(
      'CREATE INDEX "idx_conversations_buyer_id" ON "conversations" ("buyer_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_conversations_seller_id" ON "conversations" ("seller_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_conversations_property_id" ON "conversations" ("property_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_conversations_updated_at" ON "conversations" ("updated_at" DESC)',
    );

    // Create indexes for messages
    await queryRunner.query(
      'CREATE INDEX "idx_messages_conversation_id" ON "messages" ("conversation_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_messages_created_at" ON "messages" ("conversation_id", "created_at" DESC)',
    );
    await queryRunner.query('CREATE INDEX "idx_messages_sender_id" ON "messages" ("sender_id")');
    await queryRunner.query(
      'CREATE INDEX "idx_messages_is_read" ON "messages" ("conversation_id", "is_read") WHERE "is_read" = FALSE',
    );

    // Create indexes for refresh_tokens
    await queryRunner.query(
      'CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_refresh_tokens_token" ON "refresh_tokens" ("token")',
    );

    // Create indexes for verification_tokens
    await queryRunner.query(
      'CREATE INDEX "idx_verification_tokens_user_id" ON "verification_tokens" ("user_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_verification_tokens_token" ON "verification_tokens" ("token")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_verification_tokens_expires_at" ON "verification_tokens" ("expires_at")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_verification_tokens_is_used" ON "verification_tokens" ("user_id", "is_used") WHERE "is_used" = FALSE',
    );

    // Create function to update updated_at timestamp
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

    // Apply updated_at triggers
    await queryRunner.query(`
            CREATE TRIGGER update_users_updated_at
                BEFORE UPDATE ON "users"
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);

    await queryRunner.query(`
            CREATE TRIGGER update_properties_updated_at
                BEFORE UPDATE ON "properties"
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);

    await queryRunner.query(`
            CREATE TRIGGER update_conversations_updated_at
                BEFORE UPDATE ON "conversations"
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);

    // Create function to update search vector for properties
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION properties_search_trigger()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.search_vector :=
                    setweight(to_tsvector('spanish', COALESCE(NEW.title, '')), 'A') ||
                    setweight(to_tsvector('spanish', COALESCE(NEW.description, '')), 'B') ||
                    setweight(to_tsvector('spanish', COALESCE(NEW.address, '')), 'C') ||
                    setweight(to_tsvector('spanish', COALESCE(NEW.municipality, '')), 'D') ||
                    setweight(to_tsvector('spanish', COALESCE(NEW.department, '')), 'D');
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

    // Apply search vector trigger
    await queryRunner.query(`
            CREATE TRIGGER properties_search_update
                BEFORE INSERT OR UPDATE ON "properties"
                FOR EACH ROW EXECUTE FUNCTION properties_search_trigger();
        `);

    // Add table comments
    await queryRunner.query(
      "COMMENT ON TABLE \"users\" IS 'Stores user accounts for buyers and sellers'",
    );
    await queryRunner.query(
      "COMMENT ON TABLE \"properties\" IS 'Stores property listings with soft delete support'",
    );
    await queryRunner.query(
      "COMMENT ON TABLE \"property_images\" IS 'Stores multiple images per property'",
    );
    await queryRunner.query(
      "COMMENT ON TABLE \"favorites\" IS 'Junction table for user favorite properties'",
    );
    await queryRunner.query(
      "COMMENT ON TABLE \"conversations\" IS 'Stores chat conversations between buyers and sellers'",
    );
    await queryRunner.query(
      "COMMENT ON TABLE \"messages\" IS 'Stores individual messages within conversations'",
    );
    await queryRunner.query(
      "COMMENT ON TABLE \"push_subscriptions\" IS 'Stores web push notification subscriptions'",
    );
    await queryRunner.query(
      "COMMENT ON TABLE \"refresh_tokens\" IS 'Stores JWT refresh tokens for authentication'",
    );
    await queryRunner.query(
      "COMMENT ON TABLE \"verification_tokens\" IS 'Stores 6-digit verification tokens for account confirmation (expires in 15 minutes)'",
    );

    // Add column comments
    await queryRunner.query(
      'COMMENT ON COLUMN "properties"."search_vector" IS \'Full-text search vector for property search\'',
    );
    await queryRunner.query(
      'COMMENT ON COLUMN "properties"."deleted_at" IS \'Soft delete timestamp - NULL means not deleted\'',
    );
    await queryRunner.query(
      'COMMENT ON COLUMN "properties"."views_count" IS \'Number of times property detail page was viewed\'',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query('DROP TRIGGER IF EXISTS properties_search_update ON "properties"');
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS update_conversations_updated_at ON "conversations"',
    );
    await queryRunner.query('DROP TRIGGER IF EXISTS update_properties_updated_at ON "properties"');
    await queryRunner.query('DROP TRIGGER IF EXISTS update_users_updated_at ON "users"');

    // Drop functions
    await queryRunner.query("DROP FUNCTION IF EXISTS properties_search_trigger()");
    await queryRunner.query("DROP FUNCTION IF EXISTS update_updated_at_column()");

    // Drop indexes for verification_tokens
    await queryRunner.query('DROP INDEX IF EXISTS "idx_verification_tokens_is_used"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_verification_tokens_expires_at"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_verification_tokens_token"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_verification_tokens_user_id"');

    // Drop indexes for refresh_tokens
    await queryRunner.query('DROP INDEX IF EXISTS "idx_refresh_tokens_token"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_refresh_tokens_expires_at"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_refresh_tokens_user_id"');

    // Drop indexes for messages
    await queryRunner.query('DROP INDEX IF EXISTS "idx_messages_is_read"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_messages_sender_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_messages_created_at"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_messages_conversation_id"');

    // Drop indexes for conversations
    await queryRunner.query('DROP INDEX IF EXISTS "idx_conversations_updated_at"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_conversations_property_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_conversations_seller_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_conversations_buyer_id"');

    // Drop indexes for favorites
    await queryRunner.query('DROP INDEX IF EXISTS "idx_favorites_created_at"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_favorites_property_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_favorites_user_id"');

    // Drop indexes for property_images
    await queryRunner.query('DROP INDEX IF EXISTS "idx_property_images_display_order"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_property_images_property_id"');

    // Drop indexes for properties
    await queryRunner.query('DROP INDEX IF EXISTS "idx_properties_active"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_properties_search"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_properties_type"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_properties_price"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_properties_geolocation"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_properties_location"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_properties_created_at"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_properties_status"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_properties_user_id"');

    // Drop indexes for users
    await queryRunner.query('DROP INDEX IF EXISTS "idx_users_role"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_users_email"');

    // Drop tables in reverse order
    await queryRunner.query('DROP TABLE IF EXISTS "verification_tokens"');
    await queryRunner.query('DROP TABLE IF EXISTS "refresh_tokens"');
    await queryRunner.query('DROP TABLE IF EXISTS "push_subscriptions"');
    await queryRunner.query('DROP TABLE IF EXISTS "messages"');
    await queryRunner.query('DROP TABLE IF EXISTS "conversations"');
    await queryRunner.query('DROP TABLE IF EXISTS "favorites"');
    await queryRunner.query('DROP TABLE IF EXISTS "property_images"');
    await queryRunner.query('DROP TABLE IF EXISTS "properties"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');

    // Drop ENUM types
    await queryRunner.query('DROP TYPE IF EXISTS "property_status"');
    await queryRunner.query('DROP TYPE IF EXISTS "property_type"');
    await queryRunner.query('DROP TYPE IF EXISTS "user_role"');

    // Drop UUID extension
    await queryRunner.query('DROP EXTENSION IF EXISTS "uuid-ossp"');
  }
}
