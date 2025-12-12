import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from "typeorm";
import { Conversation } from "./Conversation.entity";
import { User } from "./User.entity";
import { MessageType, MessageStatus } from "../enums";

@Entity("messages")
@Index("idx_messages_conversation_id", ["conversationId"])
@Index("idx_messages_created_at", ["conversationId", "createdAt"])
@Index("idx_messages_sender_id", ["senderId"])
export class Messages {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", name: "conversation_id" })
    conversationId: string;

    @Column({ type: "uuid", name: "sender_id" })
    senderId: string;

    @Column({ type: "enum", enum: MessageType, default: MessageType.TEXT })
    type: MessageType;

    @Column({ type: "text" })
    content: string;

    @Column({ type: "text", name: "image_url", nullable: true })
    imageUrl: string | null;

    @Column({
        type: "enum",
        enum: MessageStatus,
        default: MessageStatus.SENT,
    })
    status: MessageStatus;

    @Column({ type: "boolean", default: false, name: "is_read" })
    isRead: boolean;

    @Column({ type: "timestamp", name: "read_at", nullable: true })
    readAt: Date | null;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    // Relations
    @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "conversation_id" })
    conversation: Conversation;

    @ManyToOne(() => User, (user) => user.sentMessages, { onDelete: "CASCADE" })
    @JoinColumn({ name: "sender_id" })
    sender: User;
}
