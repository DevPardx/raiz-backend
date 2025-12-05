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
import { RegisterUserDto } from "../../dtos/user.dto";
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
