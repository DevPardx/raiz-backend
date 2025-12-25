import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateBathroomsDataType1766681539829 implements MigrationInterface {
    name = "UpdateBathroomsDataType1766681539829";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX \"public\".\"idx_messages_status\"");
        await queryRunner.query("DROP INDEX \"public\".\"idx_messages_type\"");
        await queryRunner.query("DROP INDEX \"public\".\"idx_conversations_last_message_at\"");
        await queryRunner.query("ALTER TYPE \"public\".\"message_type\" RENAME TO \"message_type_old\"");
        await queryRunner.query("CREATE TYPE \"public\".\"messages_type_enum\" AS ENUM('text', 'image')");
        await queryRunner.query("ALTER TABLE \"messages\" ALTER COLUMN \"type\" DROP DEFAULT");
        await queryRunner.query("ALTER TABLE \"messages\" ALTER COLUMN \"type\" TYPE \"public\".\"messages_type_enum\" USING \"type\"::\"text\"::\"public\".\"messages_type_enum\"");
        await queryRunner.query("ALTER TABLE \"messages\" ALTER COLUMN \"type\" SET DEFAULT 'text'");
        await queryRunner.query("DROP TYPE \"public\".\"message_type_old\"");
        await queryRunner.query("ALTER TYPE \"public\".\"message_status\" RENAME TO \"message_status_old\"");
        await queryRunner.query("CREATE TYPE \"public\".\"messages_status_enum\" AS ENUM('sent', 'delivered', 'read')");
        await queryRunner.query("ALTER TABLE \"messages\" ALTER COLUMN \"status\" DROP DEFAULT");
        await queryRunner.query("ALTER TABLE \"messages\" ALTER COLUMN \"status\" TYPE \"public\".\"messages_status_enum\" USING \"status\"::\"text\"::\"public\".\"messages_status_enum\"");
        await queryRunner.query("ALTER TABLE \"messages\" ALTER COLUMN \"status\" SET DEFAULT 'sent'");
        await queryRunner.query("DROP TYPE \"public\".\"message_status_old\"");
        await queryRunner.query("ALTER TABLE \"properties\" DROP COLUMN \"bathrooms\"");
        await queryRunner.query("ALTER TABLE \"properties\" ADD \"bathrooms\" integer");
        await queryRunner.query("CREATE INDEX \"idx_users_verified\" ON \"users\" (\"verified\") ");
        await queryRunner.query("CREATE INDEX \"idx_users_email\" ON \"users\" (\"email\") ");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX \"public\".\"idx_users_email\"");
        await queryRunner.query("DROP INDEX \"public\".\"idx_users_verified\"");
        await queryRunner.query("ALTER TABLE \"properties\" DROP COLUMN \"bathrooms\"");
        await queryRunner.query("ALTER TABLE \"properties\" ADD \"bathrooms\" numeric(3,1)");
        await queryRunner.query("CREATE TYPE \"public\".\"message_status_old\" AS ENUM('sent', 'delivered', 'read')");
        await queryRunner.query("ALTER TABLE \"messages\" ALTER COLUMN \"status\" DROP DEFAULT");
        await queryRunner.query("ALTER TABLE \"messages\" ALTER COLUMN \"status\" TYPE \"public\".\"message_status_old\" USING \"status\"::\"text\"::\"public\".\"message_status_old\"");
        await queryRunner.query("ALTER TABLE \"messages\" ALTER COLUMN \"status\" SET DEFAULT 'sent'");
        await queryRunner.query("DROP TYPE \"public\".\"messages_status_enum\"");
        await queryRunner.query("ALTER TYPE \"public\".\"message_status_old\" RENAME TO \"message_status\"");
        await queryRunner.query("CREATE TYPE \"public\".\"message_type_old\" AS ENUM('text', 'image')");
        await queryRunner.query("ALTER TABLE \"messages\" ALTER COLUMN \"type\" DROP DEFAULT");
        await queryRunner.query("ALTER TABLE \"messages\" ALTER COLUMN \"type\" TYPE \"public\".\"message_type_old\" USING \"type\"::\"text\"::\"public\".\"message_type_old\"");
        await queryRunner.query("ALTER TABLE \"messages\" ALTER COLUMN \"type\" SET DEFAULT 'text'");
        await queryRunner.query("DROP TYPE \"public\".\"messages_type_enum\"");
        await queryRunner.query("ALTER TYPE \"public\".\"message_type_old\" RENAME TO \"message_type\"");
        await queryRunner.query("CREATE INDEX \"idx_conversations_last_message_at\" ON \"conversations\" (\"last_message_at\") ");
        await queryRunner.query("CREATE INDEX \"idx_messages_type\" ON \"messages\" (\"type\") ");
        await queryRunner.query("CREATE INDEX \"idx_messages_status\" ON \"messages\" (\"conversation_id\", \"status\") ");
    }

}
