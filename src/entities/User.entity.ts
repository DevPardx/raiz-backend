import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Property } from "./Property.entity";
import { Favorites } from "./Favorites.entity";
import { Messages } from "./Messages.entity";
import { Conversation } from "./Conversation.entity";
import { PushSubscription } from "./PushSubscription.entity";
import { RefreshToken } from "./RefreshToken.entity";
import { VerificationToken } from "./VerificationToken.entity";
import { UserRole } from "../enums";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 255 })
  password: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "enum", enum: UserRole })
  role: UserRole;

  @Column({ type: "text", nullable: true, name: "profile_picture" })
  profilePicture: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Property, (property) => property.user)
  properties: Property[];

  @OneToMany(() => Favorites, (favorite) => favorite.user)
  favorites: Favorites[];

  @OneToMany(() => Messages, (message) => message.sender)
  sentMessages: Messages[];

  @OneToMany(() => Conversation, (conversation) => conversation.buyer)
  buyerConversations: Conversation[];

  @OneToMany(() => Conversation, (conversation) => conversation.seller)
  sellerConversations: Conversation[];

  @OneToMany(() => PushSubscription, (subscription) => subscription.user)
  pushSubscriptions: PushSubscription[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => VerificationToken, (token) => token.user)
  verificationTokens: VerificationToken[];
}
