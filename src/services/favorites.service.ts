import { Repository } from "typeorm";
import { TFunction } from "i18next";
import { Favorites } from "../entities/Favorites.entity";
import { Property } from "../entities/Property.entity";
import { GetFavoritesQueryDto } from "../dtos/favorite.dto";
import { NotFoundError, ConflictError } from "../handler/error.handler";
import { AppDataSource } from "../config/typeorm.config";

export class FavoritesService {
    private static getFavoritesRepository(): Repository<Favorites> {
        return AppDataSource.getRepository(Favorites);
    }

    private static getPropertyRepository(): Repository<Property> {
        return AppDataSource.getRepository(Property);
    }

    static getUserFavorites = async (userId: string, query: GetFavoritesQueryDto) => {
        const { page = 1, limit = 10 } = query;

        const [favorites, total] = await this.getFavoritesRepository().findAndCount({
            where: { userId },
            relations: ["property", "property.images"],
            order: { createdAt: "DESC" },
            skip: (page - 1) * limit,
            take: limit,
        });

        const properties = favorites.map((favorite) => favorite.property);

        return {
            data: properties,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    };

    static addFavorite = async (userId: string, propertyId: string, t: TFunction) => {
        const property = await this.getPropertyRepository().findOne({
            where: { id: propertyId },
        });

        if (!property) {
            throw new NotFoundError(t("property_not_found"));
        }

        const existingFavorite = await this.getFavoritesRepository().findOne({
            where: { userId, propertyId },
        });

        if (existingFavorite) {
            throw new ConflictError(t("favorite_already_exists"));
        }

        const favorite = this.getFavoritesRepository().create({
            userId,
            propertyId,
        });

        await this.getFavoritesRepository().save(favorite);

        return t("favorite_added");
    };

    static removeFavorite = async (userId: string, propertyId: string, t: TFunction) => {
        const favorite = await this.getFavoritesRepository().findOne({
            where: { userId, propertyId },
        });

        if (!favorite) {
            throw new NotFoundError(t("favorite_not_found"));
        }

        await this.getFavoritesRepository().remove(favorite);

        return t("favorite_removed");
    };

    static checkIfFavorited = async (userId: string, propertyId: string) => {
        const favorite = await this.getFavoritesRepository().findOne({
            where: { userId, propertyId },
        });

        return {
            isFavorited: !!favorite,
        };
    };

    static getFavoriteCount = async (propertyId: string) => {
        const count = await this.getFavoritesRepository().count({
            where: { propertyId },
        });

        return {
            count,
        };
    };
}
