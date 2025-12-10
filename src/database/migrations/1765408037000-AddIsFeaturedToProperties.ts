import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsFeaturedToProperties1765408037000 implements MigrationInterface {
    name = "AddIsFeaturedToProperties1765408037000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "ALTER TABLE \"properties\" ADD \"is_featured\" boolean NOT NULL DEFAULT false"
        );
        await queryRunner.query(
            "CREATE INDEX \"idx_properties_is_featured\" ON \"properties\" (\"is_featured\")"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "DROP INDEX \"idx_properties_is_featured\""
        );
        await queryRunner.query(
            "ALTER TABLE \"properties\" DROP COLUMN \"is_featured\""
        );
    }
}
