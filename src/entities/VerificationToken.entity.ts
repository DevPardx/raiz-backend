import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from "typeorm";
import { User } from "./User.entity";
import { TokenType } from "../enums";

@Entity("verification_tokens")
@Index("idx_verification_tokens_user_id", ["userId"])
@Index("idx_verification_tokens_token", ["token"])
@Index("idx_verification_tokens_expires_at", ["expiresAt"])
@Index("idx_verification_tokens_type", ["type"])
export class VerificationToken {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", name: "user_id" })
    userId: string;

    @Column({ type: "varchar", length: 6 })
    token: string;

    @Column({
        type: "enum",
        enum: TokenType,
        default: TokenType.EMAIL_VERIFICATION,
    })
    type: TokenType;

    @Column({ type: "timestamptz", name: "expires_at" })
    expiresAt: Date;

    @Column({ type: "boolean", default: false, name: "is_used" })
    isUsed: boolean;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    // Relations
    @ManyToOne(() => User, (user) => user.verificationTokens, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user: User;
}
