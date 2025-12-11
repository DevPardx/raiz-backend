import request from "supertest";
import express from "express";
import { AppDataSource } from "../../../config/typeorm.config";
import { PropertyType, PropertyStatus, UserRole } from "../../../enums";
import { errorHandler } from "../../../middleware/error.middleware";
import { languageMiddleware } from "../../../middleware/language.middleware";
import { validateDto } from "../../../middleware/validation.middleware";
import { UpdatePropertyDto } from "../../../dtos/property.dto";
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

import { uploadMultipleImages, deleteMultipleImages } from "../../../utils/cloudinary.util";

describe("PUT /api/properties/:id", () => {
    let app: express.Application;

    const mockPropertyRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    const mockPropertyImageRepository = {
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
    };

    const mockUser = {
        id: "authenticated-user-uuid", // Must match mockAuthenticate helper
        email: "seller@example.com",
        name: "John Seller",
        role: UserRole.SELLER,
        verified: true,
    };

    const existingProperty = {
        id: "property-uuid-1",
        userId: mockUser.id,
        title: "Old Title",
        description: "Old description",
        price: 200000,
        propertyType: PropertyType.HOUSE,
        address: "Old Address",
        department: "Old Department",
        municipality: "Old Municipality",
        latitude: 4.5,
        longitude: -74.5,
        bedrooms: 2,
        bathrooms: 1,
        areaSqm: 100,
        status: PropertyStatus.ACTIVE,
        viewsCount: 10,
        isFeatured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [
            {
                id: "image-uuid-1",
                url: "https://cloudinary.com/old-image.jpg",
                cloudinaryId: "properties/old-image",
                displayOrder: 0,
            },
        ],
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.put(
            "/:id",
            mockAuthenticate,
            validateDto(UpdatePropertyDto),
            PropertiesController.updateProperty,
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
        it("should update property basic fields", async () => {
            const updateData: UpdatePropertyDto = {
                title: "Updated Title",
                price: 300000,
            };

            const updatedProperty = {
                ...existingProperty,
                ...updateData,
            };

            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);
            mockPropertyRepository.save.mockResolvedValue(updatedProperty);

            const response = await request(app)
                .put(`/api/properties/${existingProperty.id}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();

            expect(mockPropertyRepository.findOne).toHaveBeenCalledWith({
                where: { id: existingProperty.id },
                relations: ["images"],
            });
            expect(mockPropertyRepository.save).toHaveBeenCalled();
        });

        it("should update all property fields", async () => {
            const updateData: UpdatePropertyDto = {
                title: "Completely Updated",
                description: "New description",
                price: 350000,
                propertyType: PropertyType.APARTMENT,
                address: "New Address 123",
                department: "New Department",
                municipality: "New Municipality",
                latitude: 5.0,
                longitude: -75.0,
                bedrooms: 4,
                bathrooms: 3,
                areaSqm: 200,
            };

            const updatedProperty = {
                ...existingProperty,
                ...updateData,
            };

            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);
            mockPropertyRepository.save.mockResolvedValue(updatedProperty);

            const response = await request(app)
                .put(`/api/properties/${existingProperty.id}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();
        });

        it("should update property and replace images", async () => {
            const updateData = {
                title: "Updated with new images",
                images: ["/9j/newimage1==", "iVBORw0newimage2=="],
            };

            const uploadedImages = [
                { url: "https://cloudinary.com/new-image1.jpg", publicId: "properties/new-image1" },
                { url: "https://cloudinary.com/new-image2.jpg", publicId: "properties/new-image2" },
            ];

            const savedImages = [
                {
                    id: "new-image-uuid-1",
                    propertyId: existingProperty.id,
                    url: uploadedImages[0].url,
                    cloudinaryId: uploadedImages[0].publicId,
                    displayOrder: 0,
                },
                {
                    id: "new-image-uuid-2",
                    propertyId: existingProperty.id,
                    url: uploadedImages[1].url,
                    cloudinaryId: uploadedImages[1].publicId,
                    displayOrder: 1,
                },
            ];

            const updatedProperty = {
                ...existingProperty,
                title: updateData.title,
                images: savedImages,
            };

            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);
            mockPropertyRepository.save.mockResolvedValue(updatedProperty);
            (deleteMultipleImages as jest.Mock).mockResolvedValue(undefined);
            (uploadMultipleImages as jest.Mock).mockResolvedValue(uploadedImages);
            mockPropertyImageRepository.create.mockImplementation((data) => data);
            mockPropertyImageRepository.save.mockResolvedValue(savedImages);

            const response = await request(app)
                .put(`/api/properties/${existingProperty.id}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();

            // Verify old images were deleted from Cloudinary
            expect(deleteMultipleImages).toHaveBeenCalledWith(["properties/old-image"]);

            // Verify old images were deleted from database
            expect(mockPropertyImageRepository.delete).toHaveBeenCalledWith({
                propertyId: existingProperty.id,
            });

            // Verify new images were uploaded
            expect(uploadMultipleImages).toHaveBeenCalledWith(updateData.images, "properties");
            expect(mockPropertyImageRepository.save).toHaveBeenCalled();
        });

        it("should update property without changing images", async () => {
            const updateData = {
                price: 280000,
            };

            const updatedProperty = {
                ...existingProperty,
                price: 280000,
            };

            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);
            mockPropertyRepository.save.mockResolvedValue(updatedProperty);

            const response = await request(app)
                .put(`/api/properties/${existingProperty.id}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();

            // Should not touch images
            expect(deleteMultipleImages).not.toHaveBeenCalled();
            expect(uploadMultipleImages).not.toHaveBeenCalled();
        });
    });

    describe("Error Cases", () => {
        it("should return 404 if property does not exist", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(null);

            const response = await request(app)
                .put("/api/properties/non-existent-id")
                .send({ title: "New Title" });

            expect(response.status).toBe(404);
        });

        it("should return 403 if user is not the owner", async () => {
            const otherUserProperty = {
                ...existingProperty,
                userId: "other-user-id",
            };

            mockPropertyRepository.findOne.mockResolvedValue(otherUserProperty);

            const response = await request(app)
                .put(`/api/properties/${existingProperty.id}`)
                .send({ title: "Trying to update someone else's property" });

            expect(response.status).toBe(403);
        });

        it("should return 400 if price is negative", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);

            const response = await request(app)
                .put(`/api/properties/${existingProperty.id}`)
                .send({ price: -1000 });

            expect(response.status).toBe(400);
        });

        it("should return 400 if propertyType is invalid", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);

            const response = await request(app)
                .put(`/api/properties/${existingProperty.id}`)
                .send({ propertyType: "invalid-type" });

            expect(response.status).toBe(400);
        });

        it("should return 400 if latitude is invalid", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);

            const response = await request(app)
                .put(`/api/properties/${existingProperty.id}`)
                .send({ latitude: 100 });

            expect(response.status).toBe(400);
        });

        it("should return 400 if bedrooms is negative", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);

            const response = await request(app)
                .put(`/api/properties/${existingProperty.id}`)
                .send({ bedrooms: -2 });

            expect(response.status).toBe(400);
        });
    });

    describe("Authentication", () => {
        it("should require authentication", async () => {
            const appNoAuth = express();
            appNoAuth.use(express.json());
            appNoAuth.use(languageMiddleware);

            const router = Router();
            router.put("/:id", PropertiesController.updateProperty);

            appNoAuth.use("/api/properties", router);
            appNoAuth.use(errorHandler);

            const response = await request(appNoAuth)
                .put("/api/properties/some-id")
                .send({ title: "New Title" });

            expect(response.status).toBe(500); // Will error because req.user is undefined
        });
    });
});
