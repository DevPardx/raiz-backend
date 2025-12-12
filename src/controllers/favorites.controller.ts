import { Request, Response, NextFunction } from "express";
import { GetFavoritesQueryDto } from "../dtos/favorite.dto";
import { FavoritesService } from "../services/favorites.service";

export class FavoritesController {
    static getUserFavorites = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const query = req.query as unknown as GetFavoritesQueryDto;
            const result = await FavoritesService.getUserFavorites(userId, query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static addFavorite = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { propertyId } = req.params;
            const result = await FavoritesService.addFavorite(userId, propertyId as string, req.t);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    };

    static removeFavorite = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { propertyId } = req.params;
            const result = await FavoritesService.removeFavorite(
                userId,
                propertyId as string,
                req.t,
            );
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static checkIfFavorited = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { propertyId } = req.params;
            const result = await FavoritesService.checkIfFavorited(userId, propertyId as string);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static getFavoriteCount = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { propertyId } = req.params;
            const result = await FavoritesService.getFavoriteCount(propertyId as string);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}
