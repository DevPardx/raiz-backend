import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
    Unique,
} from "typeorm";
import { User } from "./User.entity";
import { Property } from "./Property.entity";
import { Messages } from "./Messages.entity";

@Entity("conversations")
@Unique("unique_property_buyer_seller", ["propertyId", "buyerId", "sellerId"])
@Index("idx_conversations_buyer_id", ["buyerId"])
@Index("idx_conversations_seller_id", ["sellerId"])
@Index("idx_conversations_property_id", ["propertyId"])
@Index("idx_conversations_updated_at", ["updatedAt"])
export class Conversation {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", name: "property_id" })
    propertyId: string;

    @Column({ type: "uuid", name: "buyer_id" })
    buyerId: string;

    @Column({ type: "uuid", name: "seller_id" })
    sellerId: string;

    @Column({ type: "text", name: "last_message", nullable: true })
    lastMessage: string | null;

    @Column({ type: "timestamp", name: "last_message_at", nullable: true })
    lastMessageAt: Date | null;

    @Column({ type: "int", name: "buyer_unread_count", default: 0 })
    buyerUnreadCount: number;

    @Column({ type: "int", name: "seller_unread_count", default: 0 })
    sellerUnreadCount: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Property, (property) => property.conversations, { onDelete: "CASCADE" })
    @JoinColumn({ name: "property_id" })
    property: Property;

    @ManyToOne(() => User, (user) => user.buyerConversations, { onDelete: "CASCADE" })
    @JoinColumn({ name: "buyer_id" })
    buyer: User;

    @ManyToOne(() => User, (user) => user.sellerConversations, { onDelete: "CASCADE" })
    @JoinColumn({ name: "seller_id" })
    seller: User;

    @OneToMany(() => Messages, (message) => message.conversation)
    messages: Messages[];
}
