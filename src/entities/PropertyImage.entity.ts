import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from "typeorm";
import { Property } from "./Property.entity";

@Entity("property_images")
@Index("idx_property_images_property_id", ["propertyId"])
@Index("idx_property_images_display_order", ["propertyId", "displayOrder"])
export class PropertyImage {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", name: "property_id" })
    propertyId: string;

    @Column({ type: "text" })
    url: string;

    @Column({ type: "varchar", length: 255, name: "cloudinary_id" })
    cloudinaryId: string;

    @Column({ type: "integer", default: 0, name: "display_order" })
    displayOrder: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    // Relations
    @ManyToOne(() => Property, (property) => property.images, { onDelete: "CASCADE" })
    @JoinColumn({ name: "property_id" })
    property: Property;
}
