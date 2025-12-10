import request from "supertest";
import express from "express";
import { AppDataSource } from "../../../config/typeorm.config";
import { PropertyType, PropertyStatus, UserRole } from "../../../enums";

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
import { GetMyPropertiesQueryDto } from "../../../dtos/property.dto";
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

// Mock authenticate middleware for testing protected routes
const mockAuthenticate = (req: any, _res: any, next: any) => {
    // Simulate authenticated user
    req.user = {
        id: "authenticated-user-uuid",
        email: "authenticated@example.com",
        name: "Authenticated User",
        role: UserRole.SELLER,
        verified: true,
    };
    next();
};

describe("GET /api/properties/user/my-properties", () => {
    let app: express.Application;

    const mockPropertyRepository = {
        findAndCount: jest.fn(),
    };

    const mockUserProperties = [
        {
            id: "user-property-1",
            title: "My First Property",
            description: "A property I own",
            price: 200000,
            currency: "USD",
            propertyType: PropertyType.HOUSE,
            address: "123 My St",
            department: "My Department",
            municipality: "My Municipality",
            latitude: 10.111111,
            longitude: -74.111111,
            bedrooms: 3,
            bathrooms: 2,
            areaSqm: 150,
            status: PropertyStatus.ACTIVE,
            viewsCount: 50,
            isFeatured: false,
            createdAt: new Date("2024-02-10"),
            updatedAt: new Date("2024-02-10"),
            images: [
                {
                    id: "my-image-1",
                    url: "https://example.com/my-property1.jpg",
                    displayOrder: 0,
                },
            ],
        },
        {
            id: "user-property-2",
            title: "My Second Property",
            description: "Another property I own - currently paused",
            price: 180000,
            currency: "USD",
            propertyType: PropertyType.APARTMENT,
            address: "456 My Ave",
            department: "My Department",
            municipality: "Another Municipality",
            latitude: 10.222222,
            longitude: -74.222222,
            bedrooms: 2,
            bathrooms: 1,
            areaSqm: 80,
            status: PropertyStatus.PAUSED,
            viewsCount: 20,
            isFeatured: false,
            createdAt: new Date("2024-02-05"),
            updatedAt: new Date("2024-02-05"),
            images: [],
        },
        {
            id: "user-property-3",
            title: "My Sold Property",
            description: "A property I sold",
            price: 220000,
            currency: "USD",
            propertyType: PropertyType.HOUSE,
            address: "789 Sold St",
            department: "My Department",
            municipality: "My Municipality",
            latitude: 10.333333,
            longitude: -74.333333,
            bedrooms: 4,
            bathrooms: 2.5,
            areaSqm: 200,
            status: PropertyStatus.SOLD,
            viewsCount: 100,
            isFeatured: true,
            createdAt: new Date("2024-01-15"),
            updatedAt: new Date("2024-01-15"),
            images: [
                {
                    id: "sold-image-1",
                    url: "https://example.com/sold-property.jpg",
                    displayOrder: 0,
                },
            ],
        },
    ];

    beforeAll(() => {
        // Create test app
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.get(
            "/user/my-properties",
            mockAuthenticate, // Use mock authenticate middleware
            validateQuery(GetMyPropertiesQueryDto),
            PropertiesController.getMyProperties,
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
        it("should return user's properties with default pagination", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([mockUserProperties, 3]);

            // Act
            const response = await request(app).get("/api/properties/user/my-properties");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("data");
            expect(response.body).toHaveProperty("pagination");
            expect(response.body.data).toHaveLength(3);
            expect(response.body.pagination).toEqual({
                total: 3,
                page: 1,
                limit: 20,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            });

            // Verify repository was called with authenticated user's ID
            expect(mockPropertyRepository.findAndCount).toHaveBeenCalledWith({
                where: {
                    userId: "authenticated-user-uuid",
                },
                relations: ["images"],
                order: {
                    createdAt: "DESC",
                },
                skip: 0,
                take: 20,
            });
        });

        it("should return user's properties with custom pagination", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([[mockUserProperties[0]], 5]);

            // Act
            const response = await request(app).get(
                "/api/properties/user/my-properties?page=2&limit=1",
            );

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.pagination).toEqual({
                total: 5,
                page: 2,
                limit: 1,
                totalPages: 5,
                hasNextPage: true,
                hasPreviousPage: true,
            });
            expect(mockPropertyRepository.findAndCount).toHaveBeenCalledWith({
                where: {
                    userId: "authenticated-user-uuid",
                },
                relations: ["images"],
                order: {
                    createdAt: "DESC",
                },
                skip: 1,
                take: 1,
            });
        });

        it("should return all property statuses (active, paused, sold)", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([mockUserProperties, 3]);

            // Act
            const response = await request(app).get("/api/properties/user/my-properties");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(3);

            // Verify we have properties with different statuses
            const statuses = response.body.data.map((p: any) => p.status);
            expect(statuses).toContain(PropertyStatus.ACTIVE);
            expect(statuses).toContain(PropertyStatus.PAUSED);
            expect(statuses).toContain(PropertyStatus.SOLD);

            // Verify repository was called without status filter
            const callArgs = mockPropertyRepository.findAndCount.mock.calls[0][0];
            expect(callArgs.where).not.toHaveProperty("status");
        });

        it("should return empty array when user has no properties", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([[], 0]);

            // Act
            const response = await request(app).get("/api/properties/user/my-properties");

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
            mockPropertyRepository.findAndCount.mockResolvedValue([[mockUserProperties[0]], 1]);

            // Act
            const response = await request(app).get("/api/properties/user/my-properties");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.data[0]).toMatchObject({
                id: expect.any(String),
                title: expect.any(String),
                description: expect.any(String),
                price: expect.any(Number),
                currency: expect.any(String),
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
                isFeatured: expect.any(Boolean),
                images: expect.any(Array),
            });
        });

        it("should NOT include user object in response", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([[mockUserProperties[0]], 1]);

            // Act
            const response = await request(app).get("/api/properties/user/my-properties");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.data[0]).not.toHaveProperty("user");
        });

        it("should include images with correct structure", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([[mockUserProperties[0]], 1]);

            // Act
            const response = await request(app).get("/api/properties/user/my-properties");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.data[0].images).toHaveLength(1);
            expect(response.body.data[0].images[0]).toEqual({
                id: "my-image-1",
                url: "https://example.com/my-property1.jpg",
                displayOrder: 0,
            });
        });

        it("should handle properties with no images", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([[mockUserProperties[1]], 1]);

            // Act
            const response = await request(app).get("/api/properties/user/my-properties");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.data[0].images).toEqual([]);
        });

        it("should include isFeatured field", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([mockUserProperties, 3]);

            // Act
            const response = await request(app).get("/api/properties/user/my-properties");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.data[0]).toHaveProperty("isFeatured");
            expect(response.body.data[2].isFeatured).toBe(true); // Sold property is featured
        });

        it("should sort by createdAt DESC", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([mockUserProperties, 3]);

            // Act
            const response = await request(app).get("/api/properties/user/my-properties");

            // Assert
            expect(response.status).toBe(200);
            const callArgs = mockPropertyRepository.findAndCount.mock.calls[0][0];
            expect(callArgs.order).toEqual({ createdAt: "DESC" });
        });

        it("should only load images relation (not user relation)", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([mockUserProperties, 3]);

            // Act
            const response = await request(app).get("/api/properties/user/my-properties");

            // Assert
            expect(response.status).toBe(200);
            const callArgs = mockPropertyRepository.findAndCount.mock.calls[0][0];
            expect(callArgs.relations).toEqual(["images"]);
            expect(callArgs.relations).not.toContain("user");
        });
    });

    describe("validation errors", () => {
        it("should return 400 for page less than 1", async () => {
            const response = await request(app).get("/api/properties/user/my-properties?page=0");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "page" })]),
            );
        });

        it("should return 400 for limit less than 1", async () => {
            const response = await request(app).get("/api/properties/user/my-properties?limit=0");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "limit" })]),
            );
        });

        it("should return 400 for limit greater than 100", async () => {
            const response = await request(app).get("/api/properties/user/my-properties?limit=101");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "limit" })]),
            );
        });

        it("should return 400 for non-numeric page", async () => {
            const response = await request(app).get("/api/properties/user/my-properties?page=abc");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });

        it("should return 400 for non-numeric limit", async () => {
            const response = await request(app).get("/api/properties/user/my-properties?limit=xyz");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });
    });

    describe("language support", () => {
        it("should respect Accept-Language header for Spanish", async () => {
            mockPropertyRepository.findAndCount.mockResolvedValue([mockUserProperties, 3]);

            const response = await request(app)
                .get("/api/properties/user/my-properties")
                .set("Accept-Language", "es");

            expect(response.status).toBe(200);
        });

        it("should respect Accept-Language header for English", async () => {
            mockPropertyRepository.findAndCount.mockResolvedValue([mockUserProperties, 3]);

            const response = await request(app)
                .get("/api/properties/user/my-properties")
                .set("Accept-Language", "en");

            expect(response.status).toBe(200);
        });
    });
});
