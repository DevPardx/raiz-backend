import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveCurrencyFieldFromProperties1765416094407 implements MigrationInterface {
    name = "RemoveCurrencyFieldFromProperties1765416094407";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"properties\" DROP COLUMN \"currency\"");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"properties\" ADD \"currency\" character varying(3) NOT NULL DEFAULT 'USD'");
    }

}
