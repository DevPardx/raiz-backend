import { Property } from "../entities/Property.entity";

export interface PropertyDto {
    id: string;
    title: string;
    description: string;
    price: number;
    propertyType: string;
    address: string;
    department: string;
    municipality: string;
    latitude: number;
    longitude: number;
    bedrooms: number;
    bathrooms: number;
    areaSqm: number;
    status: string;
    viewsCount: number;
    isFeatured?: boolean;
    createdAt: Date;
    updatedAt: Date;
    images: {
        id: string;
        url: string;
        displayOrder: number;
    }[];
    user?: {
        id: string;
        name: string;
        email: string;
        profilePicture: string | null;
    };
}

export interface PropertyMapDto {
    id: string;
    title: string;
    price: number;
    propertyType: string;
    address: string;
    latitude: number;
    longitude: number;
    bedrooms: number;
    bathrooms: number;
    areaSqm: number;
    status: string;
    images: {
        id: string;
        url: string;
    }[];
}

export class PropertyMapper {
    static toDto(property: Property): PropertyDto {
        return {
            id: property.id,
            title: property.title,
            description: property.description,
            price: property.price,
            propertyType: property.propertyType,
            address: property.address,
            department: property.department,
            municipality: property.municipality,
            latitude: property.latitude!,
            longitude: property.longitude!,
            bedrooms: property.bedrooms!,
            bathrooms: property.bathrooms!,
            areaSqm: property.areaSqm!,
            status: property.status,
            viewsCount: property.viewsCount,
            isFeatured: property.isFeatured,
            createdAt: property.createdAt,
            updatedAt: property.updatedAt,
            images: property.images
                ? property.images
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((img) => ({
                          id: img.id,
                          url: img.url,
                          displayOrder: img.displayOrder,
                      }))
                : [],
            user: property.user
                ? {
                      id: property.user.id,
                      name: property.user.name,
                      email: property.user.email,
                      profilePicture: property.user.profilePicture,
                  }
                : undefined,
        };
    }

    static toMyPropertyDto(property: Property): Omit<PropertyDto, "user"> {
        const dto = this.toDto(property);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { user: _user, ...rest } = dto;
        return rest;
    }

    static toMapDto(property: Property): PropertyMapDto {
        return {
            id: property.id,
            title: property.title,
            price: property.price,
            propertyType: property.propertyType,
            address: property.address,
            latitude: property.latitude!,
            longitude: property.longitude!,
            bedrooms: property.bedrooms!,
            bathrooms: property.bathrooms!,
            areaSqm: property.areaSqm!,
            status: property.status,
            images: property.images
                ? property.images
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .slice(0, 1)
                      .map((img) => ({
                          id: img.id,
                          url: img.url,
                      }))
                : [],
        };
    }

    static toDtoArray(properties: Property[]): PropertyDto[] {
        return properties.map((property) => this.toDto(property));
    }

    static toMapDtoArray(properties: Property[]): PropertyMapDto[] {
        return properties.map((property) => this.toMapDto(property));
    }
}
