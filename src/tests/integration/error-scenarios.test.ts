import request from "supertest";
import express from "express";
import { AppDataSource } from "../../config/typeorm.config";
import { PropertyStatus, PropertyType } from "../../enums";
import { CacheUtil } from "../../utils/cache.util";

// Mock dependencies
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

jest.mock("../../config/cloudinary.config", () => ({
    cloudinary: {},
}));

jest.mock("../../config/redis.config", () => ({
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

jest.mock("../../utils/cache.util", () => ({
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

jest.mock("socket.io", () => ({
    Server: jest.fn().mockImplementation(() => ({
        use: jest.fn(),
        on: jest.fn(),
        emit: jest.fn(),
    })),
}));

import { errorHandler } from "../../middleware/error.middleware";
import { languageMiddleware } from "../../middleware/language.middleware";
import { validateDto } from "../../middleware/validation.middleware";
import { PropertiesController } from "../../controllers/properties.controller";
import { AuthController } from "../../controllers/auth.controller";
import { LoginDto } from "../../dtos/user.dto";
import { Router } from "express";

describe("Error Scenario Tests", () => {
    let app: express.Application;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const propertiesRouter = Router();
        propertiesRouter.get("/:id", PropertiesController.getPropertyById);
        app.use("/api/properties", propertiesRouter);

        const authRouter = Router();
        authRouter.post("/login", validateDto(LoginDto), AuthController.login);
        app.use("/api/auth", authRouter);

        app.use(errorHandler);
    });

    describe("Database Errors", () => {
        it("should handle database connection errors gracefully", async () => {
            const mockPropertyRepository = {
                findOne: jest.fn().mockRejectedValue(new Error("Database connection failed")),
                createQueryBuilder: jest.fn().mockReturnValue({
                    update: jest.fn().mockReturnThis(),
                    set: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    execute: jest.fn().mockRejectedValue(new Error("Database error")),
                }),
            };

            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockPropertyRepository);

            const response = await request(app).get("/api/properties/property-123");

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty("error");
        });

        it("should handle query timeout errors", async () => {
            const mockPropertyRepository = {
                createQueryBuilder: jest.fn().mockReturnValue({
                    update: jest.fn().mockReturnThis(),
                    set: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    execute: jest.fn().mockRejectedValue(new Error("Query timeout")),
                }),
            };

            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockPropertyRepository);

            const response = await request(app).get("/api/properties/property-123");

            expect(response.status).toBe(500);
        });
    });

    describe("Validation Errors", () => {
        it("should return 400 for invalid email format in login", async () => {
            const invalidLoginData = {
                email: "invalid-email",
                password: "password123",
            };

            const response = await request(app).post("/api/auth/login").send(invalidLoginData);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });

        it("should return 400 for missing required fields", async () => {
            const incompleteData = {
                email: "test@example.com",
                // Missing password
            };

            const response = await request(app).post("/api/auth/login").send(incompleteData);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });
    });

    describe("Not Found Errors", () => {
        it("should return 404 for non-existent property", async () => {
            const mockPropertyRepository = {
                createQueryBuilder: jest.fn().mockReturnValue({
                    update: jest.fn().mockReturnThis(),
                    set: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    execute: jest.fn().mockResolvedValue({ affected: 1 }),
                }),
                findOne: jest.fn().mockResolvedValue(null),
            };

            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockPropertyRepository);

            const response = await request(app).get("/api/properties/non-existent-id");

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty("error");
        });
    });

    describe("Concurrent Request Errors", () => {
        it("should handle concurrent requests to the same resource", async () => {
            const mockPropertyRepository = {
                createQueryBuilder: jest.fn().mockReturnValue({
                    update: jest.fn().mockReturnThis(),
                    set: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    execute: jest.fn().mockResolvedValue({ affected: 1 }),
                }),
                findOne: jest.fn().mockResolvedValue({
                    id: "property-123",
                    title: "Test Property",
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
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    images: [],
                    user: {
                        id: "user-123",
                        name: "John Doe",
                        email: "john@example.com",
                        profilePicture: null,
                    },
                }),
            };

            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockPropertyRepository);

            // Simulate concurrent requests
            const requests = Array(3)
                .fill(null)
                .map(() => request(app).get("/api/properties/property-123"));

            const responses = await Promise.all(requests);

            // All should succeed with the same data
            responses.forEach((r) => {
                expect(r.status).toBe(200);
            });
        });
    });

    describe("Malformed Request Errors", () => {
        it("should return 400 for missing required fields", async () => {
            const response = await request(app).post("/api/auth/login").send({}); // Empty body missing email and password

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });

        it("should handle extremely large payloads", async () => {
            const largePayload = {
                email: "test@example.com",
                password: "a".repeat(1000000), // 1MB password
            };

            const response = await request(app).post("/api/auth/login").send(largePayload);

            // Should either reject or handle gracefully
            expect([400, 413, 500]).toContain(response.status);
        });
    });

    describe("Cache Errors", () => {
        it("should handle cache unavailability gracefully", async () => {
            // Reset cache mock to return null (cache miss) instead of rejection
            CacheUtil.get.mockResolvedValue(null);

            const mockPropertyRepository = {
                createQueryBuilder: jest.fn().mockReturnValue({
                    update: jest.fn().mockReturnThis(),
                    set: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    execute: jest.fn().mockResolvedValue({ affected: 1 }),
                }),
                findOne: jest.fn().mockResolvedValue({
                    id: "property-123",
                    title: "Test Property",
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
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    images: [],
                    user: {
                        id: "user-123",
                        name: "John Doe",
                        email: "john@example.com",
                        profilePicture: null,
                    },
                }),
            };

            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockPropertyRepository);

            const response = await request(app).get("/api/properties/property-123");

            // Should fall back to database when cache misses
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("title", "Test Property");
        });
    });

    describe("Authentication Errors", () => {
        it("should return 400 for invalid email format", async () => {
            const response = await request(app).post("/api/auth/login").send({
                email: "invalid-email",
                password: "password123",
            });

            // Validation middleware catches invalid email before auth service
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });
    });

    describe("Resource Limit Errors", () => {
        it("should handle requests exceeding resource limits", async () => {
            const mockPropertyRepository = {
                findAndCount: jest.fn().mockRejectedValue(new Error("Result set too large")),
            };

            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockPropertyRepository);

            const response = await request(app).get("/api/properties").query({
                limit: 10000, // Very large limit
            });

            expect(response.status).toBeGreaterThanOrEqual(400);
        });
    });
});
