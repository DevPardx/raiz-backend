import request from "supertest";
import express from "express";
import { AppDataSource } from "../../config/typeorm.config";
import { transporter } from "../../config/email.config";
import { UserRole } from "../../enums";
import * as bcryptUtil from "../../utils/bcrypt.util";
import * as tokenUtil from "../../utils/token.util";

// Mock dependencies before importing app components
jest.mock("../../config/typeorm.config", () => ({
    AppDataSource: {
        getRepository: jest.fn(),
        initialize: jest.fn().mockResolvedValue(true),
    },
}));

jest.mock("../../config/email.config", () => ({
    transporter: {
        sendMail: jest.fn(),
    },
}));

jest.mock("../../utils/bcrypt.util", () => ({
    hashPassword: jest.fn(),
    expiresIn: jest.fn(),
}));

jest.mock("../../utils/token.util", () => ({
    generateToken: jest.fn(),
}));

jest.mock("../../emails/emailTemplates", () => ({
    EmailTemplates: {
        verifyAccountTemplate: jest.fn().mockResolvedValue("<html>Email</html>"),
        forgotPasswordEmailTemplate: jest.fn().mockResolvedValue("<html>Reset Email</html>"),
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
import { validateDto } from "../../middleware/validation.middleware";
import {
    RegisterUserDto,
    VerifyAccountDto,
    ResendVerificationCodeDto,
    ForgotPasswordDto,
    ResetPasswordDto,
} from "../../dtos/user.dto";
import { AuthController } from "../../controllers/auth.controller";
import { Router } from "express";

describe("POST /api/auth/register", () => {
    let app: express.Application;

    const mockUserRepository = {
        findOneBy: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockVerificationTokenRepository = {
        save: jest.fn(),
    };

    beforeAll(() => {
        // Create test app
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.post("/register", validateDto(RegisterUserDto), AuthController.register);
        app.use("/api/auth", router);
        app.use(errorHandler);
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup repository mocks
        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            if (entity.name === "User") {
                return mockUserRepository;
            }
            if (entity.name === "VerificationToken") {
                return mockVerificationTokenRepository;
            }
            return {};
        });

        // Setup utility mocks
        (bcryptUtil.hashPassword as jest.Mock).mockResolvedValue("hashed_password");
        (bcryptUtil.expiresIn as jest.Mock).mockReturnValue(new Date());
        (tokenUtil.generateToken as jest.Mock).mockReturnValue("123456");
        (transporter.sendMail as jest.Mock).mockResolvedValue({ messageId: "123" });
    });

    describe("successful registration", () => {
        it("should register a new buyer and return 201", async () => {
            // Arrange
            mockUserRepository.findOneBy.mockResolvedValue(null);
            mockUserRepository.create.mockReturnValue({
                id: "user-uuid-123",
                email: "test@example.com",
                name: "Test User",
                role: UserRole.BUYER,
            });
            mockUserRepository.save.mockResolvedValue({
                id: "user-uuid-123",
                email: "test@example.com",
            });

            // Act
            const response = await request(app).post("/api/auth/register").send({
                email: "test@example.com",
                password: "password123",
                name: "Test User",
                role: "buyer",
            });

            // Assert
            expect(response.status).toBe(201);
            expect(typeof response.body).toBe("string");
            expect(transporter.sendMail).toHaveBeenCalled();
        });

        it("should register a new seller and return 201", async () => {
            // Arrange
            mockUserRepository.findOneBy.mockResolvedValue(null);
            mockUserRepository.create.mockReturnValue({
                id: "user-uuid-123",
                email: "seller@example.com",
                name: "Seller User",
                role: UserRole.SELLER,
            });
            mockUserRepository.save.mockResolvedValue({
                id: "user-uuid-123",
                email: "seller@example.com",
            });

            // Act
            const response = await request(app).post("/api/auth/register").send({
                email: "seller@example.com",
                password: "password123",
                name: "Seller User",
                role: "seller",
            });

            // Assert
            expect(response.status).toBe(201);
        });
    });

    describe("validation errors", () => {
        it("should return 400 for invalid email", async () => {
            const response = await request(app).post("/api/auth/register").send({
                email: "invalid-email",
                password: "password123",
                name: "Test User",
                role: "buyer",
            });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "email" })]),
            );
        });

        it("should return 400 for short password", async () => {
            const response = await request(app).post("/api/auth/register").send({
                email: "test@example.com",
                password: "123",
                name: "Test User",
                role: "buyer",
            });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "password" })]),
            );
        });

        it("should return 400 for short name", async () => {
            const response = await request(app).post("/api/auth/register").send({
                email: "test@example.com",
                password: "password123",
                name: "T",
                role: "buyer",
            });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "name" })]),
            );
        });

        it("should return 400 for invalid role", async () => {
            const response = await request(app).post("/api/auth/register").send({
                email: "test@example.com",
                password: "password123",
                name: "Test User",
                role: "admin",
            });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: "role" })]),
            );
        });

        it("should return 400 for missing fields", async () => {
            const response = await request(app).post("/api/auth/register").send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });
    });

    describe("conflict errors", () => {
        it("should return 409 when user already exists", async () => {
            // Arrange
            mockUserRepository.findOneBy.mockResolvedValue({
                id: "existing-user-id",
                email: "existing@example.com",
            });

            // Act
            const response = await request(app).post("/api/auth/register").send({
                email: "existing@example.com",
                password: "password123",
                name: "Test User",
                role: "buyer",
            });

            // Assert
            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty("error");
        });
    });

    describe("language support", () => {
        it("should respect Accept-Language header for Spanish", async () => {
            mockUserRepository.findOneBy.mockResolvedValue(null);
            mockUserRepository.create.mockReturnValue({
                id: "user-uuid-123",
                email: "test@example.com",
            });
            mockUserRepository.save.mockResolvedValue({
                id: "user-uuid-123",
                email: "test@example.com",
            });

            const response = await request(app)
                .post("/api/auth/register")
                .set("Accept-Language", "es")
                .send({
                    email: "test@example.com",
                    password: "password123",
                    name: "Test User",
                    role: "buyer",
                });

            expect(response.status).toBe(201);
        });

        it("should respect Accept-Language header for English", async () => {
            mockUserRepository.findOneBy.mockResolvedValue(null);
            mockUserRepository.create.mockReturnValue({
                id: "user-uuid-123",
                email: "test@example.com",
            });
            mockUserRepository.save.mockResolvedValue({
                id: "user-uuid-123",
                email: "test@example.com",
            });

            const response = await request(app)
                .post("/api/auth/register")
                .set("Accept-Language", "en")
                .send({
                    email: "test@example.com",
                    password: "password123",
                    name: "Test User",
                    role: "buyer",
                });

            expect(response.status).toBe(201);
        });
    });
});

describe("POST /api/auth/verify-account", () => {
    let app: express.Application;

    const mockVerificationTokenRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    const mockUserRepository = {
        save: jest.fn(),
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.post("/verify-account", validateDto(VerifyAccountDto), AuthController.verifyAccount);
        app.use("/api/auth", router);
        app.use(errorHandler);
    });

    beforeEach(() => {
        jest.clearAllMocks();

        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            if (entity.name === "VerificationToken") {
                return mockVerificationTokenRepository;
            }
            if (entity.name === "User") {
                return mockUserRepository;
            }
            return {};
        });
    });

    describe("successful verification", () => {
        it("should verify account with valid token and return 200", async () => {
            // Arrange
            const mockUser = {
                id: "user-uuid-123",
                email: "test@example.com",
                verified: false,
            };
            const mockToken = {
                id: "token-uuid-123",
                token: "123456",
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                isUsed: false,
                user: mockUser,
            };

            mockVerificationTokenRepository.findOne.mockResolvedValue(mockToken);
            mockVerificationTokenRepository.save.mockResolvedValue({
                ...mockToken,
                isUsed: true,
            });
            mockUserRepository.save.mockResolvedValue({ ...mockUser, verified: true });

            // Act
            const response = await request(app)
                .post("/api/auth/verify-account")
                .send({ token: "123456" });

            // Assert
            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
        });
    });

    describe("validation errors", () => {
        it("should return 400 for missing token", async () => {
            const response = await request(app).post("/api/auth/verify-account").send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });
    });

    describe("not found errors", () => {
        it("should return 404 for invalid token", async () => {
            mockVerificationTokenRepository.findOne.mockResolvedValue(null);

            const response = await request(app)
                .post("/api/auth/verify-account")
                .send({ token: "invalid-token" });

            expect(response.status).toBe(404);
        });
    });

    describe("bad request errors", () => {
        it("should return 400 for expired token", async () => {
            const mockToken = {
                id: "token-uuid-123",
                token: "123456",
                expiresAt: new Date(Date.now() - 1000),
                isUsed: false,
                user: { id: "user-uuid-123" },
            };

            mockVerificationTokenRepository.findOne.mockResolvedValue(mockToken);

            const response = await request(app)
                .post("/api/auth/verify-account")
                .send({ token: "123456" });

            expect(response.status).toBe(400);
        });

        it("should return 400 for already used token", async () => {
            const mockToken = {
                id: "token-uuid-123",
                token: "123456",
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                isUsed: true,
                user: { id: "user-uuid-123" },
            };

            mockVerificationTokenRepository.findOne.mockResolvedValue(mockToken);

            const response = await request(app)
                .post("/api/auth/verify-account")
                .send({ token: "123456" });

            expect(response.status).toBe(400);
        });
    });
});

describe("POST /api/auth/resend-verification-code", () => {
    let app: express.Application;

    const mockUserRepository = {
        findOneBy: jest.fn(),
    };

    const mockVerificationTokenRepository = {
        save: jest.fn(),
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.post(
            "/resend-verification-code",
            validateDto(ResendVerificationCodeDto),
            AuthController.resendVerificationCode,
        );
        app.use("/api/auth", router);
        app.use(errorHandler);
    });

    beforeEach(() => {
        jest.clearAllMocks();

        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            if (entity.name === "User") {
                return mockUserRepository;
            }
            if (entity.name === "VerificationToken") {
                return mockVerificationTokenRepository;
            }
            return {};
        });

        (transporter.sendMail as jest.Mock).mockResolvedValue({ messageId: "123" });
    });

    describe("successful resend", () => {
        it("should resend verification code and return 200", async () => {
            // Arrange
            const mockUser = {
                id: "user-uuid-123",
                email: "test@example.com",
                verified: false,
            };

            mockUserRepository.findOneBy.mockResolvedValue(mockUser);
            mockVerificationTokenRepository.save.mockResolvedValue({
                id: "token-uuid-456",
                token: "654321",
            });

            // Act
            const response = await request(app)
                .post("/api/auth/resend-verification-code")
                .send({ email: "test@example.com" });

            // Assert
            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(transporter.sendMail).toHaveBeenCalled();
        });
    });

    describe("validation errors", () => {
        it("should return 400 for invalid email", async () => {
            const response = await request(app)
                .post("/api/auth/resend-verification-code")
                .send({ email: "invalid-email" });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });

        it("should return 400 for missing email", async () => {
            const response = await request(app).post("/api/auth/resend-verification-code").send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });
    });

    describe("not found errors", () => {
        it("should return 404 for non-existent user", async () => {
            mockUserRepository.findOneBy.mockResolvedValue(null);

            const response = await request(app)
                .post("/api/auth/resend-verification-code")
                .send({ email: "nonexistent@example.com" });

            expect(response.status).toBe(404);
        });
    });

    describe("bad request errors", () => {
        it("should return 400 for already verified user", async () => {
            const mockUser = {
                id: "user-uuid-123",
                email: "test@example.com",
                verified: true,
            };

            mockUserRepository.findOneBy.mockResolvedValue(mockUser);

            const response = await request(app)
                .post("/api/auth/resend-verification-code")
                .send({ email: "test@example.com" });

            expect(response.status).toBe(400);
        });
    });
});

describe("POST /api/auth/forgot-password", () => {
    let app: express.Application;

    const mockUserRepository = {
        findOneBy: jest.fn(),
    };

    const mockVerificationTokenRepository = {
        save: jest.fn(),
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.post(
            "/forgot-password",
            validateDto(ForgotPasswordDto),
            AuthController.forgotPassword,
        );
        app.use("/api/auth", router);
        app.use(errorHandler);
    });

    beforeEach(() => {
        jest.clearAllMocks();

        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            if (entity.name === "User") {
                return mockUserRepository;
            }
            if (entity.name === "VerificationToken") {
                return mockVerificationTokenRepository;
            }
            return {};
        });

        (transporter.sendMail as jest.Mock).mockResolvedValue({ messageId: "123" });
    });

    describe("successful request", () => {
        it("should send reset password email and return 200", async () => {
            // Arrange
            const mockUser = {
                id: "user-uuid-123",
                email: "test@example.com",
            };

            mockUserRepository.findOneBy.mockResolvedValue(mockUser);
            mockVerificationTokenRepository.save.mockResolvedValue({
                id: "token-uuid-456",
                token: "123456",
            });

            // Act
            const response = await request(app)
                .post("/api/auth/forgot-password")
                .send({ email: "test@example.com" });

            // Assert
            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(transporter.sendMail).toHaveBeenCalled();
        });
    });

    describe("validation errors", () => {
        it("should return 400 for invalid email", async () => {
            const response = await request(app)
                .post("/api/auth/forgot-password")
                .send({ email: "invalid-email" });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });

        it("should return 400 for missing email", async () => {
            const response = await request(app).post("/api/auth/forgot-password").send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });
    });

    describe("not found errors", () => {
        it("should return 404 for non-existent user", async () => {
            mockUserRepository.findOneBy.mockResolvedValue(null);

            const response = await request(app)
                .post("/api/auth/forgot-password")
                .send({ email: "nonexistent@example.com" });

            expect(response.status).toBe(404);
        });
    });
});

describe("POST /api/auth/reset-password/:token", () => {
    let app: express.Application;

    const mockVerificationTokenRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    const mockUserRepository = {
        save: jest.fn(),
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.post(
            "/reset-password/:token",
            validateDto(ResetPasswordDto),
            AuthController.resetPassword,
        );
        app.use("/api/auth", router);
        app.use(errorHandler);
    });

    beforeEach(() => {
        jest.clearAllMocks();

        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            if (entity.name === "VerificationToken") {
                return mockVerificationTokenRepository;
            }
            if (entity.name === "User") {
                return mockUserRepository;
            }
            return {};
        });

        (bcryptUtil.hashPassword as jest.Mock).mockResolvedValue("new_hashed_password");
    });

    describe("successful reset", () => {
        it("should reset password and return 200", async () => {
            // Arrange
            const mockUser = {
                id: "user-uuid-123",
                email: "test@example.com",
                password: "old_hashed_password",
            };
            const mockToken = {
                id: "token-uuid-123",
                token: "123456",
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                isUsed: false,
                user: mockUser,
            };

            mockVerificationTokenRepository.findOne.mockResolvedValue(mockToken);
            mockVerificationTokenRepository.save.mockResolvedValue({
                ...mockToken,
                isUsed: true,
            });
            mockUserRepository.save.mockResolvedValue({
                ...mockUser,
                password: "new_hashed_password",
            });

            // Act
            const response = await request(app)
                .post("/api/auth/reset-password/123456")
                .send({ newPassword: "newPassword123" });

            // Assert
            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
        });
    });

    describe("validation errors", () => {
        it("should return 400 for missing password", async () => {
            const response = await request(app).post("/api/auth/reset-password/123456").send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });

        it("should return 400 for short password", async () => {
            const response = await request(app)
                .post("/api/auth/reset-password/123456")
                .send({ newPassword: "short" });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("errors");
        });
    });

    describe("not found errors", () => {
        it("should return 404 for invalid token", async () => {
            mockVerificationTokenRepository.findOne.mockResolvedValue(null);

            const response = await request(app)
                .post("/api/auth/reset-password/invalid-token")
                .send({ newPassword: "newPassword123" });

            expect(response.status).toBe(404);
        });
    });

    describe("bad request errors", () => {
        it("should return 400 for expired token", async () => {
            const mockToken = {
                id: "token-uuid-123",
                token: "123456",
                expiresAt: new Date(Date.now() - 1000),
                isUsed: false,
                user: { id: "user-uuid-123" },
            };

            mockVerificationTokenRepository.findOne.mockResolvedValue(mockToken);

            const response = await request(app)
                .post("/api/auth/reset-password/123456")
                .send({ newPassword: "newPassword123" });

            expect(response.status).toBe(400);
        });

        it("should return 400 for already used token", async () => {
            const mockToken = {
                id: "token-uuid-123",
                token: "123456",
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                isUsed: true,
                user: { id: "user-uuid-123" },
            };

            mockVerificationTokenRepository.findOne.mockResolvedValue(mockToken);

            const response = await request(app)
                .post("/api/auth/reset-password/123456")
                .send({ newPassword: "newPassword123" });

            expect(response.status).toBe(400);
        });
    });
});

describe("GET /api/auth/reset-password/:token", () => {
    let app: express.Application;

    const mockVerificationTokenRepository = {
        findOne: jest.fn(),
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.get("/reset-password/:token", AuthController.validateResetToken);
        app.use("/api/auth", router);
        app.use(errorHandler);
    });

    beforeEach(() => {
        jest.clearAllMocks();

        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            if (entity.name === "VerificationToken") {
                return mockVerificationTokenRepository;
            }
            return {};
        });
    });

    describe("successful validation", () => {
        it("should validate token and return 200", async () => {
            // Arrange
            const mockToken = {
                id: "token-uuid-123",
                token: "123456",
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                isUsed: false,
            };

            mockVerificationTokenRepository.findOne.mockResolvedValue(mockToken);

            // Act
            const response = await request(app).get("/api/auth/reset-password/123456");

            // Assert
            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
        });
    });

    describe("not found errors", () => {
        it("should return 404 for invalid token", async () => {
            mockVerificationTokenRepository.findOne.mockResolvedValue(null);

            const response = await request(app).get("/api/auth/reset-password/invalid-token");

            expect(response.status).toBe(404);
        });
    });

    describe("bad request errors", () => {
        it("should return 400 for expired token", async () => {
            const mockToken = {
                id: "token-uuid-123",
                token: "123456",
                expiresAt: new Date(Date.now() - 1000),
                isUsed: false,
            };

            mockVerificationTokenRepository.findOne.mockResolvedValue(mockToken);

            const response = await request(app).get("/api/auth/reset-password/123456");

            expect(response.status).toBe(400);
        });

        it("should return 400 for already used token", async () => {
            const mockToken = {
                id: "token-uuid-123",
                token: "123456",
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                isUsed: true,
            };

            mockVerificationTokenRepository.findOne.mockResolvedValue(mockToken);

            const response = await request(app).get("/api/auth/reset-password/123456");

            expect(response.status).toBe(400);
        });
    });
});
