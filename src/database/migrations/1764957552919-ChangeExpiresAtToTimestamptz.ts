import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeExpiresAtToTimestamptz1764957552919
  implements MigrationInterface
{
  name = "ChangeExpiresAtToTimestamptz1764957552919";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "verification_tokens"
      ALTER COLUMN "expires_at" TYPE TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "verification_tokens"
      ALTER COLUMN "expires_at" TYPE TIMESTAMP WITHOUT TIME ZONE
    `);
  }
}
