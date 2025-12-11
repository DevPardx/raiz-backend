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

// Import after mocks are set up
import { errorHandler } from "../../../middleware/error.middleware";
import { languageMiddleware } from "../../../middleware/language.middleware";
import { SearchPropertiesQueryDto } from "../../../dtos/property.dto";
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
