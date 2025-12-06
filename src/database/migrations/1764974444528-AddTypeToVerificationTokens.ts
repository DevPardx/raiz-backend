import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTypeToVerificationTokens1764974444528 implements MigrationInterface {
    name = "AddTypeToVerificationTokens1764974444528";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TYPE \"public\".\"verification_tokens_type_enum\" AS ENUM('email_verification', 'password_reset')");
        await queryRunner.query("ALTER TABLE \"verification_tokens\" ADD \"type\" \"public\".\"verification_tokens_type_enum\" NOT NULL DEFAULT 'email_verification'");
        await queryRunner.query("CREATE INDEX \"idx_verification_tokens_type\" ON \"verification_tokens\" (\"type\") ");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX \"public\".\"idx_verification_tokens_type\"");
        await queryRunner.query("ALTER TABLE \"verification_tokens\" DROP COLUMN \"type\"");
        await queryRunner.query("DROP TYPE \"public\".\"verification_tokens_type_enum\"");
    }

}
