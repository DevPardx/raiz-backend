import request from "supertest";
import express from "express";
import { AppDataSource } from "../../../config/typeorm.config";
import { PropertyType, PropertyStatus } from "../../../enums";

// Mock dependencies before importing app components
jest.mock("../../../config/typeorm.config", () => ({
    AppDataSource: {
        getRepository: jest.fn(),
        initialize: jest.fn().mockResolvedValue(true),
    },
}));

jest.mock("../../../utils/logger.util", () => ({
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

// Import after mocks are set up
import { errorHandler } from "../../../middleware/error.middleware";
import { languageMiddleware } from "../../../middleware/language.middleware";
import { MapBoundsQueryDto } from "../../../dtos/property.dto";
import { PropertiesController } from "../../../controllers/properties.controller";
import { Router } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { BadRequestError } from "../../../handler/error.handler";

// Custom validation middleware for tests that works around readonly req.query
/* eslint-disable @typescript-eslint/no-explicit-any */
const validateQuery = (dtoClass: any) => {
    return async (req: any, _res: any, next: any) => {
        try {
            const dtoInstance = plainToInstance(dtoClass, req.query);
            const errors = await validate(dtoInstance as object);

            if (errors.length > 0) {
                const formattedErrors = errors.map((error) => ({
                    field: error.property,
                    message: Object.values(error.constraints || {})[0] || req.t("invalid_value"),
                }));

                throw new BadRequestError(req.t("validation_failed"), formattedErrors);
            }

            // Work around readonly query property in tests
            Object.defineProperty(req, "query", {
                value: dtoInstance,
                writable: true,
                configurable: true,
            });

            next();
        } catch (error) {
            next(error);
        }
    };
};

describe("GET /api/properties/map/bounds", () => {
    let app: express.Application;

    const mockPropertyRepository = {
        find: jest.fn(),
    };

    const mockPropertiesInBounds = [
        {
            id: "property-uuid-1",
            title: "House in City",
            price: 250000,
            propertyType: PropertyType.HOUSE,
            address: "123 Main St",
            latitude: 10.5,
            longitude: -74.5,
            bedrooms: 3,
            bathrooms: 2,
            areaSqm: 150,
            status: PropertyStatus.ACTIVE,
            images: [
                {
                    id: "img-1",
                    url: "https://example.com/img1.jpg",
                    displayOrder: 0,
                },
                {
                    id: "img-2",
                    url: "https://example.com/img2.jpg",
                    displayOrder: 1,
                },
            ],
            user: {
                id: "user-1",
                name: "John Doe",
            },
        },
    ];

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.get(
            "/map/bounds",
            validateQuery(MapBoundsQueryDto),
            PropertiesController.getPropertiesInBounds,
        );
        app.use("/api/properties", router);
        app.use(errorHandler);
    });

    beforeEach(() => {
        jest.clearAllMocks();

        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            if (entity.name === "Property") {
                return mockPropertyRepository;
            }
            return {};
        });
    });

    describe("successful requests", () => {
        it("should return properties within map bounds", async () => {
            mockPropertyRepository.find.mockResolvedValue(mockPropertiesInBounds);

            const response = await request(app).get(
                "/api/properties/map/bounds?neLat=11&neLng=-74&swLat=10&swLng=-75",
            );

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toHaveLength(1);
            expect(response.body[0]).toHaveProperty("id");
            expect(response.body[0]).toHaveProperty("latitude");
            expect(response.body[0]).toHaveProperty("longitude");
            expect(response.body[0].images).toHaveLength(1); // Only first image
        });

        it("should filter by property type in bounds", async () => {
            mockPropertyRepository.find.mockResolvedValue(mockPropertiesInBounds);

            const response = await request(app).get(
                `/api/properties/map/bounds?neLat=11&neLng=-74&swLat=10&swLng=-75&propertyType=${PropertyType.HOUSE}`,
            );

            expect(response.status).toBe(200);
            expect(mockPropertyRepository.find).toHaveBeenCalled();
        });

        it("should respect limit parameter", async () => {
            mockPropertyRepository.find.mockResolvedValue(mockPropertiesInBounds);

            const response = await request(app).get(
                "/api/properties/map/bounds?neLat=11&neLng=-74&swLat=10&swLng=-75&limit=50",
            );

            expect(response.status).toBe(200);
        });
    });

    describe("validation errors", () => {
        it("should return 400 for missing neLat", async () => {
            const response = await request(app).get(
                "/api/properties/map/bounds?neLng=-74&swLat=10&swLng=-75",
            );

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });

        it("should return 400 for missing neLng", async () => {
            const response = await request(app).get(
                "/api/properties/map/bounds?neLat=11&swLat=10&swLng=-75",
            );

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });

        it("should return 400 for missing swLat", async () => {
            const response = await request(app).get(
                "/api/properties/map/bounds?neLat=11&neLng=-74&swLng=-75",
            );

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });

        it("should return 400 for missing swLng", async () => {
            const response = await request(app).get(
                "/api/properties/map/bounds?neLat=11&neLng=-74&swLat=10",
            );

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });

        it("should return 400 for invalid latitude value", async () => {
            const response = await request(app).get(
                "/api/properties/map/bounds?neLat=100&neLng=-74&swLat=10&swLng=-75",
            );

            expect(response.status).toBe(400);
        });

        it("should return 400 for limit exceeding 500", async () => {
            const response = await request(app).get(
                "/api/properties/map/bounds?neLat=11&neLng=-74&swLat=10&swLng=-75&limit=501",
            );

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });
    });
});
