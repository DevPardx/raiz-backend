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

jest.mock("../../../config/cloudinary.config", () => ({
    cloudinary: {},
}));

jest.mock("../../../config/redis.config", () => ({
    redisClient: {
        get: jest.fn(),
        set: jest.fn(),
        setEx: jest.fn(),
        del: jest.fn(),
        keys: jest.fn(),
        exists: jest.fn(),
        expire: jest.fn(),
        isOpen: false,
    },
    connectRedis: jest.fn(),
    disconnectRedis: jest.fn(),
}));

jest.mock("../../../utils/cache.util", () => ({
    CacheUtil: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
        del: jest.fn().mockResolvedValue(undefined),
        delMany: jest.fn().mockResolvedValue(undefined),
        invalidatePattern: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue(false),
        expire: jest.fn().mockResolvedValue(undefined),
    },
}));

// Import after mocks are set up
import { errorHandler } from "../../../middleware/error.middleware";
import { languageMiddleware } from "../../../middleware/language.middleware";
import { GetFeaturedPropertiesQueryDto } from "../../../dtos/property.dto";
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

describe("GET /api/properties/featured/list", () => {
    let app: express.Application;

    const mockPropertyRepository = {
        findAndCount: jest.fn(),
    };

    const mockFeaturedProperties = [
        {
            id: "featured-property-1",
            title: "Featured Luxury Villa",
            description: "An amazing luxury villa in a prime location",
            price: 500000,
            propertyType: PropertyType.HOUSE,
            address: "456 Premium St",
            department: "Department 1",
            municipality: "Municipality 1",
            latitude: 10.456789,
            longitude: -74.456789,
            bedrooms: 5,
            bathrooms: 3.5,
            areaSqm: 300,
            status: PropertyStatus.ACTIVE,
            viewsCount: 150,
            isFeatured: true,
            createdAt: new Date("2024-02-01"),
            updatedAt: new Date("2024-02-01"),
            images: [
                {
                    id: "image-uuid-1",
                    url: "https://example.com/featured1.jpg",
                    displayOrder: 0,
                },
                {
                    id: "image-uuid-2",
                    url: "https://example.com/featured2.jpg",
                    displayOrder: 1,
                },
            ],
            user: {
                id: "user-uuid-1",
                name: "Premium Seller",
                email: "seller@example.com",
                profilePicture: null,
            },
        },
        {
            id: "featured-property-2",
            title: "Featured Downtown Apartment",
            description: "Modern apartment in the heart of the city",
            price: 350000,
            propertyType: PropertyType.APARTMENT,
            address: "789 Downtown Ave",
            department: "Department 2",
            municipality: "Municipality 2",
            latitude: 10.56789,
            longitude: -74.56789,
            bedrooms: 3,
            bathrooms: 2,
            areaSqm: 120,
            status: PropertyStatus.ACTIVE,
            viewsCount: 95,
            isFeatured: true,
            createdAt: new Date("2024-01-28"),
            updatedAt: new Date("2024-01-28"),
            images: [],
            user: {
                id: "user-uuid-2",
                name: "Elite Agent",
                email: "agent@example.com",
                profilePicture: "https://example.com/avatar.jpg",
            },
        },
    ];

    beforeAll(() => {
        // Create test app
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.get(
            "/featured/list",
            validateQuery(GetFeaturedPropertiesQueryDto),
            PropertiesController.getFeaturedProperties,
        );
        app.use("/api/properties", router);
        app.use(errorHandler);
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup repository mocks
        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            if (entity.name === "Property") {
                return mockPropertyRepository;
            }
            return {};
        });
    });

    describe("successful requests", () => {
        it("should return featured properties with default pagination", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([mockFeaturedProperties, 2]);

            // Act
            const response = await request(app).get("/api/properties/featured/list");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("data");
            expect(response.body).toHaveProperty("pagination");
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data[0]).toHaveProperty("isFeatured", true);
            expect(response.body.data[1]).toHaveProperty("isFeatured", true);
            expect(response.body.pagination).toEqual({
                total: 2,
                page: 1,
                limit: 20,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            });

            // Verify repository was called with correct filters
            expect(mockPropertyRepository.findAndCount).toHaveBeenCalledWith({
                where: {
                    isFeatured: true,
                    status: PropertyStatus.ACTIVE,
                },
                relations: ["images", "user"],
                order: {
                    createdAt: "DESC",
                },
                skip: 0,
                take: 20,
            });
        });

        it("should return featured properties with custom pagination", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([
                [mockFeaturedProperties[0]],
                10,
            ]);

            // Act
            const response = await request(app).get("/api/properties/featured/list?page=2&limit=1");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.pagination).toEqual({
                total: 10,
                page: 2,
                limit: 1,
                totalPages: 10,
                hasNextPage: true,
                hasPreviousPage: true,
            });
            expect(mockPropertyRepository.findAndCount).toHaveBeenCalledWith({
                where: {
                    isFeatured: true,
                    status: PropertyStatus.ACTIVE,
                },
                relations: ["images", "user"],
                order: {
                    createdAt: "DESC",
                },
                skip: 1,
                take: 1,
            });
        });

        it("should return empty array when no featured properties exist", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([[], 0]);

            // Act
            const response = await request(app).get("/api/properties/featured/list");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(0);
            expect(response.body.pagination).toEqual({
                total: 0,
                page: 1,
                limit: 20,
                totalPages: 0,
                hasNextPage: false,
                hasPreviousPage: false,
            });
        });

        it("should include all property fields in response", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([[mockFeaturedProperties[0]], 1]);

            // Act
            const response = await request(app).get("/api/properties/featured/list");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.data[0]).toMatchObject({
                id: expect.any(String),
                title: expect.any(String),
                description: expect.any(String),
                price: expect.any(Number),
                propertyType: expect.any(String),
                address: expect.any(String),
                department: expect.any(String),
                municipality: expect.any(String),
                latitude: expect.any(Number),
                longitude: expect.any(Number),
                bedrooms: expect.any(Number),
                bathrooms: expect.any(Number),
                areaSqm: expect.any(Number),
                status: expect.any(String),
                viewsCount: expect.any(Number),
                isFeatured: true,
                images: expect.any(Array),
                user: expect.objectContaining({
                    id: expect.any(String),
                    name: expect.any(String),
                    email: expect.any(String),
                }),
            });
        });

        it("should include images with correct structure", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([[mockFeaturedProperties[0]], 1]);

            // Act
            const response = await request(app).get("/api/properties/featured/list");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.data[0].images).toHaveLength(2);
            expect(response.body.data[0].images[0]).toEqual({
                id: "image-uuid-1",
                url: "https://example.com/featured1.jpg",
                displayOrder: 0,
            });
        });

        it("should handle properties with no images", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([[mockFeaturedProperties[1]], 1]);

            // Act
            const response = await request(app).get("/api/properties/featured/list");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.data[0].images).toEqual([]);
        });

        it("should only return ACTIVE featured properties", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([mockFeaturedProperties, 2]);

            // Act
            const response = await request(app).get("/api/properties/featured/list");

            // Assert
            expect(response.status).toBe(200);
            const callArgs = mockPropertyRepository.findAndCount.mock.calls[0][0];
            expect(callArgs.where.status).toBe(PropertyStatus.ACTIVE);
            expect(callArgs.where.isFeatured).toBe(true);
        });

        it("should sort by createdAt DESC", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([mockFeaturedProperties, 2]);

            // Act
            const response = await request(app).get("/api/properties/featured/list");

            // Assert
            expect(response.status).toBe(200);
            const callArgs = mockPropertyRepository.findAndCount.mock.calls[0][0];
            expect(callArgs.order).toEqual({ createdAt: "DESC" });
        });
    });

    describe("validation errors", () => {
        it("should return 400 for page less than 1", async () => {
            const response = await request(app).get("/api/properties/featured/list?page=0");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "page" })]),
            );
        });

        it("should return 400 for limit less than 1", async () => {
            const response = await request(app).get("/api/properties/featured/list?limit=0");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "limit" })]),
            );
        });

        it("should return 400 for limit greater than 100", async () => {
            const response = await request(app).get("/api/properties/featured/list?limit=101");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "limit" })]),
            );
        });

        it("should return 400 for non-numeric page", async () => {
            const response = await request(app).get("/api/properties/featured/list?page=abc");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });

        it("should return 400 for non-numeric limit", async () => {
            const response = await request(app).get("/api/properties/featured/list?limit=xyz");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });
    });

    describe("language support", () => {
        it("should respect Accept-Language header for Spanish", async () => {
            mockPropertyRepository.findAndCount.mockResolvedValue([mockFeaturedProperties, 2]);

            const response = await request(app)
                .get("/api/properties/featured/list")
                .set("Accept-Language", "es");

            expect(response.status).toBe(200);
        });

        it("should respect Accept-Language header for English", async () => {
            mockPropertyRepository.findAndCount.mockResolvedValue([mockFeaturedProperties, 2]);

            const response = await request(app)
                .get("/api/properties/featured/list")
                .set("Accept-Language", "en");

            expect(response.status).toBe(200);
        });
    });
});
