import { Router } from "express";
import { validateQuery } from "../middleware/validation.middleware";
import {
    GetPropertiesQueryDto,
    MapBoundsQueryDto,
    SearchPropertiesQueryDto,
} from "../dtos/property.dto";
import { PropertiesController } from "../controllers/properties.controller";
// import { authenticate } from '../middleware/auth.middleware';

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
router.get("/:id", PropertiesController.getPropertyById);

// Future routes to implement:
// router.get("/featured/list", PropertiesController.getFeaturedProperties);
// router.get("/user/my-properties", authenticate, PropertiesController.getMyProperties);
// router.post("/", authenticate, validateDto(CreatePropertyDto), PropertiesController.createProperty);
// router.put("/:id", authenticate, validateDto(UpdatePropertyDto), PropertiesController.updateProperty);
// router.delete("/:id", authenticate, PropertiesController.deleteProperty);
// router.patch("/:id/status", authenticate, validateDto(UpdatePropertyStatusDto), PropertiesController.updatePropertyStatus);
// router.delete("/:id/images/:imageId", authenticate, PropertiesController.deletePropertyImage);
// router.get("/:id/stats", authenticate, PropertiesController.getPropertyStats);

export default router;
