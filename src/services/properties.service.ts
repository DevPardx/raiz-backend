import { Repository, FindOptionsWhere, Between, MoreThanOrEqual, LessThanOrEqual } from "typeorm";
import { TFunction } from "i18next";
import { Property } from "../entities/Property.entity";
import { PropertyImage } from "../entities/PropertyImage.entity";
import {
    GetPropertiesQueryDto,
    MapBoundsQueryDto,
    SearchPropertiesQueryDto,
    GetFeaturedPropertiesQueryDto,
    GetMyPropertiesQueryDto,
    CreatePropertyDto,
    UpdatePropertyDto,
    UpdatePropertyStatusDto,
} from "../dtos/property.dto";
import { NotFoundError, ForbiddenError } from "../handler/error.handler";
import { AppDataSource } from "../config/typeorm.config";
import { PropertyStatus } from "../enums";
import { uploadMultipleImages, deleteMultipleImages } from "../utils/cloudinary.util";

export class PropertiesService {
    private static getPropertyRepository(): Repository<Property> {
        return AppDataSource.getRepository(Property);
    }

    private static getPropertyImageRepository(): Repository<PropertyImage> {
        return AppDataSource.getRepository(PropertyImage);
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

    static getPropertiesInBounds = async (query: MapBoundsQueryDto) => {
        const {
            neLat,
            neLng,
            swLat,
            swLng,
            propertyType,
            status,
            minPrice,
            maxPrice,
            bedrooms,
            bathrooms,
            limit = 100,
        } = query;

        const where: FindOptionsWhere<Property> = {};

        where.latitude = Between(swLat, neLat);
        where.longitude = Between(swLng, neLng);

        if (propertyType) {
            where.propertyType = propertyType;
        }

        if (status) {
            where.status = status;
        } else {
            where.status = PropertyStatus.ACTIVE;
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

        const properties = await this.getPropertyRepository().find({
            where,
            relations: ["images", "user"],
            take: limit,
            order: {
                createdAt: "DESC",
            },
        });

        return properties.map((property) => ({
            id: property.id,
            title: property.title,
            price: property.price,
            propertyType: property.propertyType,
            address: property.address,
            latitude: property.latitude,
            longitude: property.longitude,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            areaSqm: property.areaSqm,
            status: property.status,
            images: property.images
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .slice(0, 1)
                .map((img) => ({
                    id: img.id,
                    url: img.url,
                })),
        }));
    };

    static searchProperties = async (query: SearchPropertiesQueryDto) => {
        const {
            q,
            propertyType,
            status,
            department,
            municipality,
            minPrice,
            maxPrice,
            bedrooms,
            bathrooms,
            page = 1,
            limit = 20,
            sortBy = "createdAt",
            sortOrder = "DESC",
        } = query;

        const queryBuilder = this.getPropertyRepository()
            .createQueryBuilder("property")
            .leftJoinAndSelect("property.images", "images")
            .leftJoinAndSelect("property.user", "user");

        queryBuilder.where(
            "(property.title ILIKE :search OR property.description ILIKE :search OR property.address ILIKE :search)",
            { search: `%${q}%` },
        );

        if (propertyType) {
            queryBuilder.andWhere("property.propertyType = :propertyType", { propertyType });
        }

        if (status) {
            queryBuilder.andWhere("property.status = :status", { status });
        } else {
            queryBuilder.andWhere("property.status = :status", { status: PropertyStatus.ACTIVE });
        }

        if (department) {
            queryBuilder.andWhere("property.department = :department", { department });
        }

        if (municipality) {
            queryBuilder.andWhere("property.municipality = :municipality", { municipality });
        }

        if (bedrooms !== undefined) {
            queryBuilder.andWhere("property.bedrooms = :bedrooms", { bedrooms });
        }

        if (bathrooms !== undefined) {
            queryBuilder.andWhere("property.bathrooms = :bathrooms", { bathrooms });
        }

        if (minPrice !== undefined && maxPrice !== undefined) {
            queryBuilder.andWhere("property.price BETWEEN :minPrice AND :maxPrice", {
                minPrice,
                maxPrice,
            });
        } else if (minPrice !== undefined) {
            queryBuilder.andWhere("property.price >= :minPrice", { minPrice });
        } else if (maxPrice !== undefined) {
            queryBuilder.andWhere("property.price <= :maxPrice", { maxPrice });
        }

        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);

        queryBuilder.orderBy(`property.${sortBy}`, sortOrder);

        const [properties, total] = await queryBuilder.getManyAndCount();

        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        return {
            data: properties.map((property) => ({
                id: property.id,
                title: property.title,
                description: property.description,
                price: property.price,
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

    static getFeaturedProperties = async (query: GetFeaturedPropertiesQueryDto) => {
        const { page = 1, limit = 20 } = query;

        const skip = (page - 1) * limit;

        const where: FindOptionsWhere<Property> = {
            isFeatured: true,
            status: PropertyStatus.ACTIVE,
        };

        const [properties, total] = await this.getPropertyRepository().findAndCount({
            where,
            relations: ["images", "user"],
            order: {
                createdAt: "DESC",
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
                isFeatured: property.isFeatured,
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

    static getMyProperties = async (userId: string, query: GetMyPropertiesQueryDto) => {
        const { page = 1, limit = 20 } = query;

        const skip = (page - 1) * limit;

        const where: FindOptionsWhere<Property> = {
            userId,
        };

        const [properties, total] = await this.getPropertyRepository().findAndCount({
            where,
            relations: ["images"],
            order: {
                createdAt: "DESC",
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
                isFeatured: property.isFeatured,
                createdAt: property.createdAt,
                updatedAt: property.updatedAt,
                images: property.images.map((img) => ({
                    id: img.id,
                    url: img.url,
                    displayOrder: img.displayOrder,
                })),
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

    static createProperty = async (
        userId: string,
        propertyData: CreatePropertyDto,
        t: TFunction,
    ) => {
        const property = this.getPropertyRepository().create({
            userId,
            title: propertyData.title,
            description: propertyData.description,
            price: propertyData.price,
            propertyType: propertyData.propertyType,
            address: propertyData.address,
            department: propertyData.department,
            municipality: propertyData.municipality,
            latitude: propertyData.latitude,
            longitude: propertyData.longitude,
            bedrooms: propertyData.bedrooms,
            bathrooms: propertyData.bathrooms,
            areaSqm: propertyData.areaSqm,
            viewsCount: 0,
            isFeatured: false,
        });

        const savedProperty = await this.getPropertyRepository().save(property);

        if (propertyData.images && propertyData.images.length > 0) {
            const uploadedImages = await uploadMultipleImages(propertyData.images, "properties");

            const imageEntities = uploadedImages.map((img, index) =>
                this.getPropertyImageRepository().create({
                    propertyId: savedProperty.id,
                    url: img.url,
                    cloudinaryId: img.publicId,
                    displayOrder: index,
                }),
            );

            await this.getPropertyImageRepository().save(imageEntities);
        }

        return t("property_created");
    };

    static updateProperty = async (
        userId: string,
        propertyId: string,
        propertyData: UpdatePropertyDto,
        t: TFunction,
    ) => {
        const property = await this.getPropertyRepository().findOne({
            where: { id: propertyId },
            relations: ["images"],
        });

        if (!property) {
            throw new NotFoundError(t("property_not_found"));
        }

        if (property.userId !== userId) {
            throw new ForbiddenError(t("forbidden"));
        }

        if (propertyData.title !== undefined) property.title = propertyData.title;
        if (propertyData.description !== undefined) property.description = propertyData.description;
        if (propertyData.price !== undefined) property.price = propertyData.price;
        if (propertyData.propertyType !== undefined)
            property.propertyType = propertyData.propertyType;
        if (propertyData.address !== undefined) property.address = propertyData.address;
        if (propertyData.department !== undefined) property.department = propertyData.department;
        if (propertyData.municipality !== undefined)
            property.municipality = propertyData.municipality;
        if (propertyData.latitude !== undefined) property.latitude = propertyData.latitude;
        if (propertyData.longitude !== undefined) property.longitude = propertyData.longitude;
        if (propertyData.bedrooms !== undefined) property.bedrooms = propertyData.bedrooms;
        if (propertyData.bathrooms !== undefined) property.bathrooms = propertyData.bathrooms;
        if (propertyData.areaSqm !== undefined) property.areaSqm = propertyData.areaSqm;

        const updatedProperty = await this.getPropertyRepository().save(property);

        if (propertyData.images && propertyData.images.length > 0) {
            if (property.images.length > 0) {
                const oldCloudinaryIds = property.images.map((img) => img.cloudinaryId);
                await deleteMultipleImages(oldCloudinaryIds);

                await this.getPropertyImageRepository().delete({ propertyId });
            }

            const uploadedImages = await uploadMultipleImages(propertyData.images, "properties");

            const imageEntities = uploadedImages.map((img, index) =>
                this.getPropertyImageRepository().create({
                    propertyId: updatedProperty.id,
                    url: img.url,
                    cloudinaryId: img.publicId,
                    displayOrder: index,
                }),
            );

            property.images = await this.getPropertyImageRepository().save(imageEntities);
        }

        return t("property_updated");
    };

    static deleteProperty = async (userId: string, propertyId: string, t: TFunction) => {
        const property = await this.getPropertyRepository().findOne({
            where: { id: propertyId },
            relations: ["images"],
        });

        if (!property) {
            throw new NotFoundError(t("property_not_found"));
        }

        if (property.userId !== userId) {
            throw new ForbiddenError(t("forbidden"));
        }

        if (property.images.length > 0) {
            const cloudinaryIds = property.images.map((img) => img.cloudinaryId);
            await deleteMultipleImages(cloudinaryIds);
        }

        await this.getPropertyRepository().remove(property);

        return t("property_deleted");
    };

    static updatePropertyStatus = async (
        userId: string,
        propertyId: string,
        statusData: UpdatePropertyStatusDto,
        t: TFunction,
    ) => {
        const property = await this.getPropertyRepository().findOne({
            where: { id: propertyId },
        });

        if (!property) {
            throw new NotFoundError(t("property_not_found"));
        }

        if (property.userId !== userId) {
            throw new ForbiddenError(t("forbidden"));
        }

        property.status = statusData.status;
        await this.getPropertyRepository().save(property);

        return t("property_status_updated");
    };

    static getPropertyStats = async (userId: string, propertyId: string, t: TFunction) => {
        const property = await this.getPropertyRepository().findOne({
            where: { id: propertyId },
        });

        if (!property) {
            throw new NotFoundError(t("property_not_found"));
        }

        if (property.userId !== userId) {
            throw new ForbiddenError(t("forbidden"));
        }

        const now = new Date();
        const createdAt = new Date(property.createdAt);
        const daysActive = Math.floor(
            (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
            propertyId: property.id,
            viewsCount: property.viewsCount,
            daysActive,
            status: property.status,
            isFeatured: property.isFeatured,
            createdAt: property.createdAt,
        };
    };
}
