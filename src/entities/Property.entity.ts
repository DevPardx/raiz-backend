import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User.entity";
import { PropertyImage } from "./PropertyImage.entity";
import { Favorites } from "./Favorites.entity";
import { Conversation } from "./Conversation.entity";
import { PropertyType, PropertyStatus } from "../enums";

@Entity("properties")
@Index("idx_properties_user_id", ["userId"])
@Index("idx_properties_status", ["status"])
@Index("idx_properties_created_at", ["createdAt"])
@Index("idx_properties_location", ["department", "municipality"])
@Index("idx_properties_geolocation", ["latitude", "longitude"])
@Index("idx_properties_price", ["price"])
@Index("idx_properties_type", ["propertyType"])
export class Property {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", name: "user_id" })
  userId: string;

  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  price: number;

  @Column({ type: "varchar", length: 3, default: "USD" })
  currency: string;

  @Column({ type: "enum", enum: PropertyType, name: "property_type" })
  propertyType: PropertyType;

  @Column({ type: "text" })
  address: string;

  @Column({ type: "varchar", length: 100 })
  department: string;

  @Column({ type: "varchar", length: 100 })
  municipality: string;

  @Column({ type: "decimal", precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: "decimal", precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: "integer", nullable: true })
  bedrooms: number | null;

  @Column({ type: "decimal", precision: 3, scale: 1, nullable: true })
  bathrooms: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true, name: "area_sqm" })
  areaSqm: number | null;

  @Column({ type: "enum", enum: PropertyStatus, default: PropertyStatus.ACTIVE })
  status: PropertyStatus;

  @Column({ type: "integer", default: 0, name: "views_count" })
  viewsCount: number;

  @Column({ type: "tsvector", nullable: true, name: "search_vector", select: false })
  searchVector: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt: Date | null;

  // Relations
  @ManyToOne(() => User, (user) => user.properties, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @OneToMany(() => PropertyImage, (image) => image.property)
  images: PropertyImage[];

  @OneToMany(() => Favorites, (favorite) => favorite.property)
  favorites: Favorites[];

  @OneToMany(() => Conversation, (conversation) => conversation.property)
  conversations: Conversation[];
}
