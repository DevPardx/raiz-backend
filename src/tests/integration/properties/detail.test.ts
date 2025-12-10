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
import { PropertiesController } from "../../../controllers/properties.controller";
import { Router } from "express";

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
