import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { User } from "./User.entity";

@Entity("push_subscriptions")
export class PushSubscription {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", name: "user_id" })
    userId: string;

    @Column({ type: "text", unique: true })
    endpoint: string;

    @Column({ type: "text", name: "keys_json" })
    keysJson: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    // Relations
    @ManyToOne(() => User, (user) => user.pushSubscriptions, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user: User;
}
