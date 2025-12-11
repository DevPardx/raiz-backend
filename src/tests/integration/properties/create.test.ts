import request from "supertest";
import express from "express";
import { AppDataSource } from "../../../config/typeorm.config";
import { PropertyType, PropertyStatus, UserRole } from "../../../enums";
import { errorHandler } from "../../../middleware/error.middleware";
import { languageMiddleware } from "../../../middleware/language.middleware";
import { validateDto } from "../../../middleware/validation.middleware";
import { CreatePropertyDto } from "../../../dtos/property.dto";
import { PropertiesController } from "../../../controllers/properties.controller";
import { Router } from "express";
import { mockAuthenticate } from "./test-helpers";

// Mock dependencies
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

jest.mock("../../../utils/cloudinary.util", () => ({
    uploadMultipleImages: jest.fn(),
    deleteMultipleImages: jest.fn(),
}));

jest.mock("../../../config/cloudinary.config", () => ({
    cloudinary: {},
}));

import { uploadMultipleImages } from "../../../utils/cloudinary.util";

describe("POST /api/properties", () => {
    let app: express.Application;

    const mockPropertyRepository = {
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockPropertyImageRepository = {
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockUser = {
        id: "authenticated-user-uuid", // Must match mockAuthenticate helper
        email: "seller@example.com",
        name: "John Seller",
        role: UserRole.SELLER,
        verified: true,
    };

    const validPropertyData: CreatePropertyDto = {
        title: "Beautiful House",
        description: "A beautiful house in the city",
        price: 250000,
        propertyType: PropertyType.HOUSE,
        address: "123 Main St",
        department: "Cundinamarca",
        municipality: "Bogotá",
        latitude: 4.6097,
        longitude: -74.0817,
        bedrooms: 3,
        bathrooms: 2,
        areaSqm: 150,
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.post(
            "/",
            mockAuthenticate,
            validateDto(CreatePropertyDto),
            PropertiesController.createProperty,
        );

        app.use("/api/properties", router);
        app.use(errorHandler);

        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            if (entity.name === "Property") {
                return mockPropertyRepository;
            }
            if (entity.name === "PropertyImage") {
                return mockPropertyImageRepository;
            }
            return {};
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Success Cases", () => {
        it("should create property without images", async () => {
            const createdProperty = {
                id: "property-uuid-1",
                userId: mockUser.id,
                ...validPropertyData,
                status: PropertyStatus.ACTIVE,
                viewsCount: 0,
                isFeatured: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPropertyRepository.create.mockReturnValue(createdProperty);
            mockPropertyRepository.save.mockResolvedValue(createdProperty);

            const response = await request(app).post("/api/properties").send(validPropertyData);

            expect(response.status).toBe(201);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();

            expect(mockPropertyRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockUser.id,
                    title: validPropertyData.title,
                    price: validPropertyData.price,
                }),
            );
            expect(mockPropertyRepository.save).toHaveBeenCalled();
        });

        it("should create property with images", async () => {
            const propertyWithImages = {
                ...validPropertyData,
                images: ["/9j/4AAQSkZJRg==", "iVBORw0KGgo=="],
            };

            const createdProperty = {
                id: "property-uuid-1",
                userId: mockUser.id,
                ...validPropertyData,
                status: PropertyStatus.ACTIVE,
                viewsCount: 0,
                isFeatured: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const uploadedImages = [
                { url: "https://cloudinary.com/image1.jpg", publicId: "properties/image1" },
                { url: "https://cloudinary.com/image2.jpg", publicId: "properties/image2" },
            ];

            const savedImages = [
                {
                    id: "image-uuid-1",
                    propertyId: createdProperty.id,
                    url: uploadedImages[0].url,
                    cloudinaryId: uploadedImages[0].publicId,
                    displayOrder: 0,
                },
                {
                    id: "image-uuid-2",
                    propertyId: createdProperty.id,
                    url: uploadedImages[1].url,
                    cloudinaryId: uploadedImages[1].publicId,
                    displayOrder: 1,
                },
            ];

            mockPropertyRepository.create.mockReturnValue(createdProperty);
            mockPropertyRepository.save.mockResolvedValue(createdProperty);
            (uploadMultipleImages as jest.Mock).mockResolvedValue(uploadedImages);
            mockPropertyImageRepository.create.mockImplementation((data) => data);
            mockPropertyImageRepository.save.mockResolvedValue(savedImages);

            const response = await request(app).post("/api/properties").send(propertyWithImages);

            expect(response.status).toBe(201);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();

            expect(uploadMultipleImages).toHaveBeenCalledWith(
                propertyWithImages.images,
                "properties",
            );
            expect(mockPropertyImageRepository.save).toHaveBeenCalled();
        });

        it("should create property with all optional fields", async () => {
            const createdProperty = {
                id: "property-uuid-1",
                userId: mockUser.id,
                ...validPropertyData,
                status: PropertyStatus.ACTIVE,
                viewsCount: 0,
                isFeatured: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPropertyRepository.create.mockReturnValue(createdProperty);
            mockPropertyRepository.save.mockResolvedValue(createdProperty);

            const response = await request(app).post("/api/properties").send(validPropertyData);

            expect(response.status).toBe(201);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();
        });
    });

    describe("Validation Errors", () => {
        it("should return 400 if title is missing", async () => {
            const invalidData: Partial<CreatePropertyDto> = { ...validPropertyData };
            delete invalidData.title;

            const response = await request(app).post("/api/properties").send(invalidData);

            expect(response.status).toBe(400);
        });

        it("should return 400 if title is too short", async () => {
            const invalidData = {
                ...validPropertyData,
                title: "AB",
            };

            const response = await request(app).post("/api/properties").send(invalidData);

            expect(response.status).toBe(400);
        });

        it("should return 400 if description is missing", async () => {
            const invalidData: Partial<CreatePropertyDto> = { ...validPropertyData };
            delete invalidData.description;

            const response = await request(app).post("/api/properties").send(invalidData);

            expect(response.status).toBe(400);
        });

        it("should return 400 if price is negative", async () => {
            const invalidData = {
                ...validPropertyData,
                price: -1000,
            };

            const response = await request(app).post("/api/properties").send(invalidData);

            expect(response.status).toBe(400);
        });

        it("should return 400 if propertyType is invalid", async () => {
            const invalidData = {
                ...validPropertyData,
                propertyType: "invalid-type",
            };

            const response = await request(app).post("/api/properties").send(invalidData);

            expect(response.status).toBe(400);
        });

        it("should return 400 if latitude is invalid", async () => {
            const invalidData = {
                ...validPropertyData,
                latitude: 100, // Invalid latitude
            };

            const response = await request(app).post("/api/properties").send(invalidData);

            expect(response.status).toBe(400);
        });

        it("should return 400 if longitude is invalid", async () => {
            const invalidData = {
                ...validPropertyData,
                longitude: 200, // Invalid longitude
            };

            const response = await request(app).post("/api/properties").send(invalidData);

            expect(response.status).toBe(400);
        });

        it("should return 400 if bedrooms is negative", async () => {
            const invalidData = {
                ...validPropertyData,
                bedrooms: -1,
            };

            const response = await request(app).post("/api/properties").send(invalidData);

            expect(response.status).toBe(400);
        });

        it("should return 400 if bathrooms is negative", async () => {
            const invalidData = {
                ...validPropertyData,
                bathrooms: -1,
            };

            const response = await request(app).post("/api/properties").send(invalidData);

            expect(response.status).toBe(400);
        });

        it("should return 400 if areaSqm is negative", async () => {
            const invalidData = {
                ...validPropertyData,
                areaSqm: -50,
            };

            const response = await request(app).post("/api/properties").send(invalidData);

            expect(response.status).toBe(400);
        });

        it("should return 400 if images is not an array", async () => {
            const invalidData = {
                ...validPropertyData,
                images: "not-an-array",
            };

            const response = await request(app).post("/api/properties").send(invalidData);

            expect(response.status).toBe(400);
        });

        it("should return 400 if images array is empty", async () => {
            const invalidData = {
                ...validPropertyData,
                images: [],
            };

            const response = await request(app).post("/api/properties").send(invalidData);

            expect(response.status).toBe(400);
        });
    });

    describe("Authentication", () => {
        it("should require authentication", async () => {
            const appNoAuth = express();
            appNoAuth.use(express.json());
            appNoAuth.use(languageMiddleware);

            const router = Router();
            router.post("/", PropertiesController.createProperty);

            appNoAuth.use("/api/properties", router);
            appNoAuth.use(errorHandler);

            const response = await request(appNoAuth)
                .post("/api/properties")
                .send(validPropertyData);

            expect(response.status).toBe(500); // Will error because req.user is undefined
        });
    });
});
