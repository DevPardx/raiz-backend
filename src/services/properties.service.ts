import { Repository, FindOptionsWhere, Between, MoreThanOrEqual, LessThanOrEqual } from "typeorm";
import { TFunction } from "i18next";
import { Property } from "../entities/Property.entity";
import { GetPropertiesQueryDto } from "../dtos/property.dto";
import { NotFoundError } from "../handler/error.handler";
import { AppDataSource } from "../config/typeorm.config";
import { PropertyStatus } from "../enums";

export class PropertiesService {
    private static getPropertyRepository(): Repository<Property> {
        return AppDataSource.getRepository(Property);
    }

    static getAllProperties = async (query: GetPropertiesQueryDto) => {
        const {
            propertyType,
            status,
            department,
            municipality,
            minPrice,
            maxPrice,
            bedrooms,
            bathrooms,
            minArea,
            maxArea,
            page = 1,
            limit = 20,
            sortBy = "createdAt",
            sortOrder = "DESC",
        } = query;

        const where: FindOptionsWhere<Property> = {};

        if (propertyType) {
            where.propertyType = propertyType;
        }

        if (status) {
            where.status = status;
        } else {
            where.status = PropertyStatus.ACTIVE;
        }

        if (department) {
            where.department = department;
        }

        if (municipality) {
            where.municipality = municipality;
        }

        if (bedrooms !== undefined) {
            where.bedrooms = bedrooms;
        }

        if (bathrooms !== undefined) {
            where.bathrooms = bathrooms;
        }

        if (minPrice !== undefined && maxPrice !== undefined) {
            where.price = Between(minPrice, maxPrice);
        } else if (minPrice !== undefined) {
            where.price = MoreThanOrEqual(minPrice);
        } else if (maxPrice !== undefined) {
            where.price = LessThanOrEqual(maxPrice);
        }

        if (minArea !== undefined && maxArea !== undefined) {
            where.areaSqm = Between(minArea, maxArea);
        } else if (minArea !== undefined) {
            where.areaSqm = MoreThanOrEqual(minArea);
        } else if (maxArea !== undefined) {
            where.areaSqm = LessThanOrEqual(maxArea);
        }

        const skip = (page - 1) * limit;

        const [properties, total] = await this.getPropertyRepository().findAndCount({
            where,
            relations: ["images", "user"],
            order: {
                [sortBy]: sortOrder,
            },
            skip,
            take: limit,
        });

        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        return {
            data: properties.map((property) => ({
                id: property.id,
                title: property.title,
                description: property.description,
                price: property.price,
                currency: property.currency,
                propertyType: property.propertyType,
                address: property.address,
                department: property.department,
                municipality: property.municipality,
                latitude: property.latitude,
                longitude: property.longitude,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                areaSqm: property.areaSqm,
                status: property.status,
                viewsCount: property.viewsCount,
                createdAt: property.createdAt,
                updatedAt: property.updatedAt,
                images: property.images.map((img) => ({
                    id: img.id,
                    url: img.url,
                    displayOrder: img.displayOrder,
                })),
                user: {
                    id: property.user.id,
                    name: property.user.name,
                    email: property.user.email,
                    profilePicture: property.user.profilePicture,
                },
            })),
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage,
                hasPreviousPage,
            },
        };
    };

    static getPropertyById = async (id: string, t: TFunction) => {
        const property = await this.getPropertyRepository().findOne({
            where: { id },
            relations: ["images", "user"],
        });

        if (!property) {
            throw new NotFoundError(t("property_not_found"));
        }

        property.viewsCount += 1;
        await this.getPropertyRepository().save(property);

        return {
            id: property.id,
            title: property.title,
            description: property.description,
            price: property.price,
            currency: property.currency,
            propertyType: property.propertyType,
            address: property.address,
            department: property.department,
            municipality: property.municipality,
            latitude: property.latitude,
            longitude: property.longitude,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            areaSqm: property.areaSqm,
            status: property.status,
            viewsCount: property.viewsCount,
            createdAt: property.createdAt,
            updatedAt: property.updatedAt,
            images: property.images
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((img) => ({
                    id: img.id,
                    url: img.url,
                    displayOrder: img.displayOrder,
                })),
            user: {
                id: property.user.id,
                name: property.user.name,
                email: property.user.email,
                profilePicture: property.user.profilePicture,
            },
        };
    };
}
