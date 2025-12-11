import { Router } from "express";
import { validateDto, validateQuery } from "../middleware/validation.middleware";
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
import { PropertiesController } from "../controllers/properties.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/", validateQuery(GetPropertiesQueryDto), PropertiesController.getAllProperties);
router.get(
    "/map/bounds",
    validateQuery(MapBoundsQueryDto),
    PropertiesController.getPropertiesInBounds,
);
router.get(
    "/search",
    validateQuery(SearchPropertiesQueryDto),
    PropertiesController.searchProperties,
);
router.get(
    "/featured/list",
    validateQuery(GetFeaturedPropertiesQueryDto),
    PropertiesController.getFeaturedProperties,
);
router.get(
    "/user/my-properties",
    authenticate,
    validateQuery(GetMyPropertiesQueryDto),
    PropertiesController.getMyProperties,
);
router.post("/", authenticate, validateDto(CreatePropertyDto), PropertiesController.createProperty);
router.put(
    "/:id",
    authenticate,
    validateDto(UpdatePropertyDto),
    PropertiesController.updateProperty,
);
router.delete("/:id", authenticate, PropertiesController.deleteProperty);
router.patch(
    "/:id/status",
    authenticate,
    validateDto(UpdatePropertyStatusDto),
    PropertiesController.updatePropertyStatus,
);
router.get("/:id", PropertiesController.getPropertyById);

export default router;
