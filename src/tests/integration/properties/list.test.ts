import request from "supertest";
import express from "express";
import { AppDataSource } from "../../../config/typeorm.config";
import { PropertyType, PropertyStatus } from "../../../enums";
import { errorHandler } from "../../../middleware/error.middleware";
import { languageMiddleware } from "../../../middleware/language.middleware";
import { GetPropertiesQueryDto } from "../../../dtos/property.dto";
import { PropertiesController } from "../../../controllers/properties.controller";
import { Router } from "express";
import { validateQuery } from "./test-helpers";

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

describe("GET /api/properties", () => {
    let app: express.Application;

    const mockPropertyRepository = {
        findAndCount: jest.fn(),
    };

    const mockProperties = [
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
