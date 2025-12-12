import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChatFeatures1734000000000 implements MigrationInterface {
    name = "AddChatFeatures1734000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create ENUM types for message features
        await queryRunner.query(
            "CREATE TYPE \"message_type\" AS ENUM ('text', 'image')"
        );
        await queryRunner.query(
            "CREATE TYPE \"message_status\" AS ENUM ('sent', 'delivered', 'read')"
        );

        // Add new columns to conversations table
        await queryRunner.query(
            "ALTER TABLE \"conversations\" ADD \"last_message\" text"
        );
        await queryRunner.query(
            "ALTER TABLE \"conversations\" ADD \"last_message_at\" TIMESTAMP"
        );
        await queryRunner.query(
            "ALTER TABLE \"conversations\" ADD \"buyer_unread_count\" integer NOT NULL DEFAULT 0"
        );
        await queryRunner.query(
            "ALTER TABLE \"conversations\" ADD \"seller_unread_count\" integer NOT NULL DEFAULT 0"
        );

        // Add new columns to messages table
        await queryRunner.query(
            "ALTER TABLE \"messages\" ADD \"type\" message_type NOT NULL DEFAULT 'text'"
        );
        await queryRunner.query(
            "ALTER TABLE \"messages\" ADD \"image_url\" text"
        );
        await queryRunner.query(
            "ALTER TABLE \"messages\" ADD \"status\" message_status NOT NULL DEFAULT 'sent'"
        );
        await queryRunner.query(
            "ALTER TABLE \"messages\" ADD \"read_at\" TIMESTAMP"
        );

        // Create additional indexes for better performance
        await queryRunner.query(
            "CREATE INDEX \"idx_conversations_last_message_at\" ON \"conversations\" (\"last_message_at\" DESC NULLS LAST)"
        );
        await queryRunner.query(
            "CREATE INDEX \"idx_messages_status\" ON \"messages\" (\"conversation_id\", \"status\")"
        );
        await queryRunner.query(
            "CREATE INDEX \"idx_messages_type\" ON \"messages\" (\"type\")"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(
            "DROP INDEX IF EXISTS \"idx_messages_type\""
        );
        await queryRunner.query(
            "DROP INDEX IF EXISTS \"idx_messages_status\""
        );
        await queryRunner.query(
            "DROP INDEX IF EXISTS \"idx_conversations_last_message_at\""
        );

        // Remove columns from messages table
        await queryRunner.query(
            "ALTER TABLE \"messages\" DROP COLUMN \"read_at\""
        );
        await queryRunner.query(
            "ALTER TABLE \"messages\" DROP COLUMN \"status\""
        );
        await queryRunner.query(
            "ALTER TABLE \"messages\" DROP COLUMN \"image_url\""
        );
        await queryRunner.query(
            "ALTER TABLE \"messages\" DROP COLUMN \"type\""
        );

        // Remove columns from conversations table
        await queryRunner.query(
            "ALTER TABLE \"conversations\" DROP COLUMN \"seller_unread_count\""
        );
        await queryRunner.query(
            "ALTER TABLE \"conversations\" DROP COLUMN \"buyer_unread_count\""
        );
        await queryRunner.query(
            "ALTER TABLE \"conversations\" DROP COLUMN \"last_message_at\""
        );
        await queryRunner.query(
            "ALTER TABLE \"conversations\" DROP COLUMN \"last_message\""
        );

        // Drop ENUM types
        await queryRunner.query(
            "DROP TYPE IF EXISTS \"message_status\""
        );
        await queryRunner.query(
            "DROP TYPE IF EXISTS \"message_type\""
        );
    }
}
