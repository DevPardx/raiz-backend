import request from "supertest";
import express from "express";
import { AppDataSource } from "../../config/typeorm.config";
import { PropertyType, PropertyStatus, UserRole } from "../../enums";

// Mock dependencies before importing app components
jest.mock("../../config/typeorm.config", () => ({
    AppDataSource: {
        getRepository: jest.fn(),
        initialize: jest.fn().mockResolvedValue(true),
    },
}));

jest.mock("../../utils/logger.util", () => ({
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

// Import after mocks are set up
import { errorHandler } from "../../middleware/error.middleware";
import { languageMiddleware } from "../../middleware/language.middleware";
import {
    GetPropertiesQueryDto,
    MapBoundsQueryDto,
    SearchPropertiesQueryDto,
    GetFeaturedPropertiesQueryDto,
    GetMyPropertiesQueryDto,
} from "../../dtos/property.dto";
import { PropertiesController } from "../../controllers/properties.controller";
import { Router } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { BadRequestError } from "../../handler/error.handler";

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

describe("GET /api/properties", () => {
    let app: express.Application;

    const mockPropertyRepository = {
        findAndCount: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(),
    };

    const mockProperties = [
        {
            id: "property-uuid-1",
            title: "Beautiful House",
            description: "A beautiful house in the city",
            price: 250000,
            currency: "USD",
            propertyType: PropertyType.HOUSE,
            address: "123 Main St",
            department: "Department 1",
            municipality: "Municipality 1",
            latitude: 10.123456,
            longitude: -74.123456,
            bedrooms: 3,
            bathrooms: 2,
            areaSqm: 150,
            status: PropertyStatus.ACTIVE,
            viewsCount: 10,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
            images: [
                {
                    id: "image-uuid-1",
                    url: "https://example.com/image1.jpg",
                    displayOrder: 0,
                },
            ],
            user: {
                id: "user-uuid-1",
                name: "John Doe",
                email: "john@example.com",
                profilePicture: null,
            },
        },
        {
            id: "property-uuid-2",
            title: "Modern Apartment",
            description: "A modern apartment downtown",
            price: 180000,
            currency: "USD",
            propertyType: PropertyType.APARTMENT,
            address: "456 Downtown Ave",
            department: "Department 1",
            municipality: "Municipality 2",
            latitude: 10.223456,
            longitude: -74.223456,
            bedrooms: 2,
            bathrooms: 1,
            areaSqm: 80,
            status: PropertyStatus.ACTIVE,
            viewsCount: 5,
            createdAt: new Date("2024-01-02"),
            updatedAt: new Date("2024-01-02"),
            images: [],
            user: {
                id: "user-uuid-2",
                name: "Jane Smith",
                email: "jane@example.com",
                profilePicture: null,
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
            "/",
            validateQuery(GetPropertiesQueryDto),
            PropertiesController.getAllProperties,
        );
        router.get("/:id", PropertiesController.getPropertyById);
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
        it("should return properties with default pagination", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([mockProperties, 2]);

            // Act
            const response = await request(app).get("/api/properties");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("data");
            expect(response.body).toHaveProperty("pagination");
            expect(response.body.data).toHaveLength(2);
            expect(response.body.pagination).toEqual({
                total: 2,
                page: 1,
                limit: 20,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            });
            expect(mockPropertyRepository.findAndCount).toHaveBeenCalledWith({
                where: { status: PropertyStatus.ACTIVE },
                relations: ["images", "user"],
                order: { createdAt: "DESC" },
                skip: 0,
                take: 20,
            });
        });

        it("should return properties with custom pagination", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([[mockProperties[0]], 10]);

            // Act
            const response = await request(app).get("/api/properties?page=2&limit=1");

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
                where: { status: PropertyStatus.ACTIVE },
                relations: ["images", "user"],
                order: { createdAt: "DESC" },
                skip: 1,
                take: 1,
            });
        });

        it("should filter by property type", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([[mockProperties[0]], 1]);

            // Act
            const response = await request(app).get(
                `/api/properties?propertyType=${PropertyType.HOUSE}`,
            );

            // Assert
            expect(response.status).toBe(200);
            expect(mockPropertyRepository.findAndCount).toHaveBeenCalledWith({
                where: {
                    propertyType: PropertyType.HOUSE,
                    status: PropertyStatus.ACTIVE,
                },
                relations: ["images", "user"],
                order: { createdAt: "DESC" },
                skip: 0,
                take: 20,
            });
        });

        it("should filter by status", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([[], 0]);

            // Act
            const response = await request(app).get(
                `/api/properties?status=${PropertyStatus.SOLD}`,
            );

            // Assert
            expect(response.status).toBe(200);
            expect(mockPropertyRepository.findAndCount).toHaveBeenCalledWith({
                where: { status: PropertyStatus.SOLD },
                relations: ["images", "user"],
                order: { createdAt: "DESC" },
                skip: 0,
                take: 20,
            });
        });

        it("should filter by department and municipality", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([[mockProperties[0]], 1]);

            // Act
            const response = await request(app).get(
                "/api/properties?department=Department 1&municipality=Municipality 1",
            );

            // Assert
            expect(response.status).toBe(200);
            expect(mockPropertyRepository.findAndCount).toHaveBeenCalledWith({
                where: {
                    department: "Department 1",
                    municipality: "Municipality 1",
                    status: PropertyStatus.ACTIVE,
                },
                relations: ["images", "user"],
                order: { createdAt: "DESC" },
                skip: 0,
                take: 20,
            });
        });

        it("should filter by bedrooms and bathrooms", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([[mockProperties[0]], 1]);

            // Act
            const response = await request(app).get("/api/properties?bedrooms=3&bathrooms=2");

            // Assert
            expect(response.status).toBe(200);
            expect(mockPropertyRepository.findAndCount).toHaveBeenCalledWith({
                where: {
                    bedrooms: 3,
                    bathrooms: 2,
                    status: PropertyStatus.ACTIVE,
                },
                relations: ["images", "user"],
                order: { createdAt: "DESC" },
                skip: 0,
                take: 20,
            });
        });

        it("should filter by price range", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([mockProperties, 2]);

            // Act
            const response = await request(app).get(
                "/api/properties?minPrice=100000&maxPrice=300000",
            );

            // Assert
            expect(response.status).toBe(200);
            expect(mockPropertyRepository.findAndCount).toHaveBeenCalled();
            const callArgs = mockPropertyRepository.findAndCount.mock.calls[0][0];
            expect(callArgs.where).toHaveProperty("price");
        });

        it("should filter by area range", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([[mockProperties[1]], 1]);

            // Act
            const response = await request(app).get("/api/properties?minArea=50&maxArea=100");

            // Assert
            expect(response.status).toBe(200);
            expect(mockPropertyRepository.findAndCount).toHaveBeenCalled();
            const callArgs = mockPropertyRepository.findAndCount.mock.calls[0][0];
            expect(callArgs.where).toHaveProperty("areaSqm");
        });

        it("should sort by price ascending", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([mockProperties, 2]);

            // Act
            const response = await request(app).get("/api/properties?sortBy=price&sortOrder=ASC");

            // Assert
            expect(response.status).toBe(200);
            expect(mockPropertyRepository.findAndCount).toHaveBeenCalledWith({
                where: { status: PropertyStatus.ACTIVE },
                relations: ["images", "user"],
                order: { price: "ASC" },
                skip: 0,
                take: 20,
            });
        });

        it("should sort by area descending", async () => {
            // Arrange
            mockPropertyRepository.findAndCount.mockResolvedValue([mockProperties, 2]);

            // Act
            const response = await request(app).get(
                "/api/properties?sortBy=areaSqm&sortOrder=DESC",
            );

            // Assert
            expect(response.status).toBe(200);
            expect(mockPropertyRepository.findAndCount).toHaveBeenCalledWith({
                where: { status: PropertyStatus.ACTIVE },
                relations: ["images", "user"],
                order: { areaSqm: "DESC" },
                skip: 0,
                take: 20,
            });
        });
    });

    describe("validation errors", () => {
        it("should return 400 for invalid property type", async () => {
            const response = await request(app).get("/api/properties?propertyType=invalid");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "propertyType" })]),
            );
        });

        it("should return 400 for invalid status", async () => {
            const response = await request(app).get("/api/properties?status=invalid");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "status" })]),
            );
        });

        it("should return 400 for negative minPrice", async () => {
            const response = await request(app).get("/api/properties?minPrice=-100");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "minPrice" })]),
            );
        });

        it("should return 400 for negative maxPrice", async () => {
            const response = await request(app).get("/api/properties?maxPrice=-100");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "maxPrice" })]),
            );
        });

        it("should return 400 for negative bedrooms", async () => {
            const response = await request(app).get("/api/properties?bedrooms=-1");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "bedrooms" })]),
            );
        });

        it("should return 400 for negative bathrooms", async () => {
            const response = await request(app).get("/api/properties?bathrooms=-1");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "bathrooms" })]),
            );
        });

        it("should return 400 for page less than 1", async () => {
            const response = await request(app).get("/api/properties?page=0");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "page" })]),
            );
        });

        it("should return 400 for limit less than 1", async () => {
            const response = await request(app).get("/api/properties?limit=0");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "limit" })]),
            );
        });

        it("should return 400 for limit greater than 100", async () => {
            const response = await request(app).get("/api/properties?limit=101");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "limit" })]),
            );
        });

        it("should return 400 for invalid sortBy field", async () => {
            const response = await request(app).get("/api/properties?sortBy=invalidField");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "sortBy" })]),
            );
        });

        it("should return 400 for invalid sortOrder", async () => {
            const response = await request(app).get("/api/properties?sortOrder=INVALID");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "sortOrder" })]),
            );
        });
    });

    describe("language support", () => {
        it("should respect Accept-Language header for Spanish", async () => {
            mockPropertyRepository.findAndCount.mockResolvedValue([mockProperties, 2]);

            const response = await request(app).get("/api/properties").set("Accept-Language", "es");

            expect(response.status).toBe(200);
        });

        it("should respect Accept-Language header for English", async () => {
            mockPropertyRepository.findAndCount.mockResolvedValue([mockProperties, 2]);

            const response = await request(app).get("/api/properties").set("Accept-Language", "en");

            expect(response.status).toBe(200);
        });
    });
});

describe("GET /api/properties/:id", () => {
    let app: express.Application;

    const mockPropertyRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    const mockProperty = {
        id: "property-uuid-1",
        title: "Beautiful House",
        description: "A beautiful house in the city",
        price: 250000,
        currency: "USD",
        propertyType: PropertyType.HOUSE,
        address: "123 Main St",
        department: "Department 1",
        municipality: "Municipality 1",
        latitude: 10.123456,
        longitude: -74.123456,
        bedrooms: 3,
        bathrooms: 2,
        areaSqm: 150,
        status: PropertyStatus.ACTIVE,
        viewsCount: 10,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        images: [
            {
                id: "image-uuid-1",
                url: "https://example.com/image1.jpg",
                displayOrder: 1,
            },
            {
                id: "image-uuid-2",
                url: "https://example.com/image2.jpg",
                displayOrder: 0,
            },
        ],
        user: {
            id: "user-uuid-1",
            name: "John Doe",
            email: "john@example.com",
            profilePicture: null,
        },
    };

    beforeAll(() => {
        // Create test app
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.get("/:id", PropertiesController.getPropertyById);
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
        it("should return property by id and increment viewsCount", async () => {
            // Arrange
            mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
            mockPropertyRepository.save.mockResolvedValue({
                ...mockProperty,
                viewsCount: 11,
            });

            // Act
            const response = await request(app).get("/api/properties/property-uuid-1");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("id", "property-uuid-1");
            expect(response.body).toHaveProperty("title", "Beautiful House");
            expect(response.body).toHaveProperty("viewsCount", 11);
            expect(response.body).toHaveProperty("images");
            expect(response.body.images).toHaveLength(2);
            // Verify images are sorted by displayOrder
            expect(response.body.images[0].displayOrder).toBe(0);
            expect(response.body.images[1].displayOrder).toBe(1);
            expect(response.body).toHaveProperty("user");
            expect(response.body.user).toHaveProperty("id", "user-uuid-1");

            // Verify viewsCount was incremented and saved
            expect(mockPropertyRepository.save).toHaveBeenCalledWith({
                ...mockProperty,
                viewsCount: 11,
            });
        });

        it("should return property data structure with all fields", async () => {
            // Arrange
            mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
            mockPropertyRepository.save.mockResolvedValue(mockProperty);

            // Act
            const response = await request(app).get("/api/properties/property-uuid-1");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
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
            });
        });
    });

    describe("not found errors", () => {
        it("should return 404 for non-existent property", async () => {
            // Arrange
            mockPropertyRepository.findOne.mockResolvedValue(null);

            // Act
            const response = await request(app).get("/api/properties/non-existent-id");

            // Assert
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty("error");
            expect(mockPropertyRepository.save).not.toHaveBeenCalled();
        });
    });

    describe("language support", () => {
        it("should respect Accept-Language header for Spanish", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
            mockPropertyRepository.save.mockResolvedValue(mockProperty);

            const response = await request(app)
                .get("/api/properties/property-uuid-1")
                .set("Accept-Language", "es");

            expect(response.status).toBe(200);
        });

        it("should respect Accept-Language header for English", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
            mockPropertyRepository.save.mockResolvedValue(mockProperty);

            const response = await request(app)
                .get("/api/properties/property-uuid-1")
                .set("Accept-Language", "en");

            expect(response.status).toBe(200);
        });

        it("should return error message in Spanish for non-existent property", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(null);

            const response = await request(app)
                .get("/api/properties/non-existent-id")
                .set("Accept-Language", "es");

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty("error");
        });
    });
});

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
            currency: "USD",
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

describe("GET /api/properties/search", () => {
    let app: express.Application;

    const mockPropertyRepository = {
        createQueryBuilder: jest.fn(),
    };

    const mockSearchResults = [
        {
            id: "property-uuid-1",
            title: "Beautiful House",
            description: "A beautiful house in the city",
            price: 250000,
            currency: "USD",
            propertyType: PropertyType.HOUSE,
            address: "123 Main St",
            department: "Department 1",
            municipality: "Municipality 1",
            latitude: 10.123456,
            longitude: -74.123456,
            bedrooms: 3,
            bathrooms: 2,
            areaSqm: 150,
            status: PropertyStatus.ACTIVE,
            viewsCount: 10,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
            images: [],
            user: {
                id: "user-uuid-1",
                name: "John Doe",
                email: "john@example.com",
                profilePicture: null,
            },
        },
    ];

    const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.get(
            "/search",
            validateQuery(SearchPropertiesQueryDto),
            PropertiesController.searchProperties,
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

        mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    describe("successful requests", () => {
        it("should search properties by query string", async () => {
            mockQueryBuilder.getManyAndCount.mockResolvedValue([mockSearchResults, 1]);

            const response = await request(app).get("/api/properties/search?q=beautiful");

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("data");
            expect(response.body).toHaveProperty("pagination");
            expect(response.body.data).toHaveLength(1);
            expect(mockQueryBuilder.where).toHaveBeenCalled();
        });

        it("should search with filters", async () => {
            mockQueryBuilder.getManyAndCount.mockResolvedValue([mockSearchResults, 1]);

            const response = await request(app).get(
                `/api/properties/search?q=house&propertyType=${PropertyType.HOUSE}&bedrooms=3`,
            );

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);
            expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
        });

        it("should paginate search results", async () => {
            mockQueryBuilder.getManyAndCount.mockResolvedValue([mockSearchResults, 10]);

            const response = await request(app).get(
                "/api/properties/search?q=house&page=2&limit=5",
            );

            expect(response.status).toBe(200);
            expect(response.body.pagination).toEqual({
                total: 10,
                page: 2,
                limit: 5,
                totalPages: 2,
                hasNextPage: false,
                hasPreviousPage: true,
            });
        });

        it("should sort search results", async () => {
            mockQueryBuilder.getManyAndCount.mockResolvedValue([mockSearchResults, 1]);

            const response = await request(app).get(
                "/api/properties/search?q=house&sortBy=price&sortOrder=ASC",
            );

            expect(response.status).toBe(200);
            expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith("property.price", "ASC");
        });
    });

    describe("validation errors", () => {
        it("should return 400 for missing search query", async () => {
            const response = await request(app).get("/api/properties/search");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "q" })]),
            );
        });

        it("should return 400 for search query less than 2 characters", async () => {
            const response = await request(app).get("/api/properties/search?q=a");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });

        it("should return 400 for invalid property type", async () => {
            const response = await request(app).get(
                "/api/properties/search?q=house&propertyType=invalid",
            );

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });

        it("should return 400 for invalid sort field", async () => {
            const response = await request(app).get(
                "/api/properties/search?q=house&sortBy=invalid",
            );

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });
    });

    describe("language support", () => {
        it("should respect Accept-Language header for Spanish", async () => {
            mockQueryBuilder.getManyAndCount.mockResolvedValue([mockSearchResults, 1]);

            const response = await request(app)
                .get("/api/properties/search?q=casa")
                .set("Accept-Language", "es");

            expect(response.status).toBe(200);
        });

        it("should respect Accept-Language header for English", async () => {
            mockQueryBuilder.getManyAndCount.mockResolvedValue([mockSearchResults, 1]);

            const response = await request(app)
                .get("/api/properties/search?q=house")
                .set("Accept-Language", "en");

            expect(response.status).toBe(200);
        });
    });
});

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
            currency: "USD",
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
            currency: "USD",
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
