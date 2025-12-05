import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from "typeorm";
import { User } from "./User.entity";
import { Property } from "./Property.entity";

@Entity("favorites")
@Unique("unique_user_property_favorite", ["userId", "propertyId"])
@Index("idx_favorites_user_id", ["userId"])
@Index("idx_favorites_property_id", ["propertyId"])
@Index("idx_favorites_created_at", ["createdAt"])
export class Favorites {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", name: "user_id" })
    userId: string;

    @Column({ type: "uuid", name: "property_id" })
    propertyId: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    // Relations
    @ManyToOne(() => User, (user) => user.favorites, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user: User;

    @ManyToOne(() => Property, (property) => property.favorites, { onDelete: "CASCADE" })
    @JoinColumn({ name: "property_id" })
    property: Property;
}
