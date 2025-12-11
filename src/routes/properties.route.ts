import { Router } from "express";
import { validateDto, validateQuery } from "../middleware/validation.middleware";
import {
    GetPropertiesQueryDto,
    MapBoundsQueryDto,
    SearchPropertiesQueryDto,
    GetFeaturedPropertiesQueryDto,
    GetMyPropertiesQueryDto,
    CreatePropertyDto,
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
router.get("/:id", PropertiesController.getPropertyById);
router.post("/", authenticate, validateDto(CreatePropertyDto), PropertiesController.createProperty);

// Future routes to implement:
// router.put("/:id", authenticate, validateDto(UpdatePropertyDto), PropertiesController.updateProperty);
// router.delete("/:id", authenticate, PropertiesController.deleteProperty);
// router.patch("/:id/status", authenticate, validateDto(UpdatePropertyStatusDto), PropertiesController.updatePropertyStatus);
// router.delete("/:id/images/:imageId", authenticate, PropertiesController.deletePropertyImage);
// router.get("/:id/stats", authenticate, PropertiesController.getPropertyStats);

export default router;
