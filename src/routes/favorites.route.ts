import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validateQuery } from "../middleware/validation.middleware";
import { GetFavoritesQueryDto } from "../dtos/favorite.dto";
import { FavoritesController } from "../controllers/favorites.controller";

const router = Router();

router.get(
    "/",
    authenticate,
    validateQuery(GetFavoritesQueryDto),
    FavoritesController.getUserFavorites,
);
router.post("/:propertyId", authenticate, FavoritesController.addFavorite);
router.delete("/:propertyId", authenticate, FavoritesController.removeFavorite);
router.get("/:propertyId/check", authenticate, FavoritesController.checkIfFavorited);
router.get("/:propertyId/count", FavoritesController.getFavoriteCount);

export default router;
