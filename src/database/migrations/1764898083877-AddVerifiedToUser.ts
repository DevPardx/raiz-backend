import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVerifiedToUser1764898083877 implements MigrationInterface {
    name = "AddVerifiedToUser1764898083877";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"users\" ADD \"verified\" boolean NOT NULL DEFAULT false");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"users\" DROP COLUMN \"verified\"");
    }

}
