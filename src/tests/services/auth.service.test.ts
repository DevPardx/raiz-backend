import { TFunction } from "i18next";
import { AuthService } from "../../services/auth.service";
import { AppDataSource } from "../../config/typeorm.config";
import { transporter } from "../../config/email.config";
import { ConflictError } from "../../handler/error.handler";
import { UserRole } from "../../enums";
import * as bcryptUtil from "../../utils/bcrypt.util";
import * as tokenUtil from "../../utils/token.util";

// Mock dependencies
jest.mock("../../config/typeorm.config", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
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

describe("AuthService", () => {
  // Mock translation function - cast through unknown to satisfy TFunction type
  const mockT = jest.fn((key: string) => key) as unknown as TFunction;

  // Mock repositories
  const mockUserRepository = {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockVerificationTokenRepository = {
    save: jest.fn(),
  };

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

  describe("register", () => {
    const validUserData = {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
      role: UserRole.BUYER,
    };

    it("should register a new user successfully", async () => {
      // Arrange
      const originalPassword = validUserData.password;
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        id: "user-uuid-123",
        ...validUserData,
        password: "hashed_password",
      });
      mockUserRepository.save.mockResolvedValue({
        id: "user-uuid-123",
        ...validUserData,
        password: "hashed_password",
      });
      mockVerificationTokenRepository.save.mockResolvedValue({
        id: "token-uuid-123",
        token: "123456",
      });

      // Act
      const result = await AuthService.register({ ...validUserData }, mockT);

      // Assert
      expect(result).toBe("verification_email_sent");
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({
        email: validUserData.email,
      });
      expect(bcryptUtil.hashPassword).toHaveBeenCalledWith(originalPassword);
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockVerificationTokenRepository.save).toHaveBeenCalled();
      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: validUserData.email,
          from: "<no-reply@raizsv.com>",
        }),
      );
    });

    it("should throw ConflictError if user already exists", async () => {
      // Arrange
      mockUserRepository.findOneBy.mockResolvedValue({
        id: "existing-user-id",
        email: validUserData.email,
      });

      // Act & Assert
      await expect(AuthService.register(validUserData, mockT)).rejects.toThrow(ConflictError);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({
        email: validUserData.email,
      });
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(transporter.sendMail).not.toHaveBeenCalled();
    });

    it("should throw ConflictError for invalid role", async () => {
      // Arrange
      mockUserRepository.findOneBy.mockResolvedValue(null);
      const invalidUserData = {
        ...validUserData,
        role: "invalid_role" as UserRole,
      };

      // Act & Assert
      await expect(AuthService.register(invalidUserData, mockT)).rejects.toThrow(ConflictError);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("should register a seller successfully", async () => {
      // Arrange
      const sellerData = { ...validUserData, role: UserRole.SELLER };
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        id: "user-uuid-123",
        ...sellerData,
        password: "hashed_password",
      });
      mockUserRepository.save.mockResolvedValue({
        id: "user-uuid-123",
        ...sellerData,
        password: "hashed_password",
      });

      // Act
      const result = await AuthService.register(sellerData, mockT);

      // Assert
      expect(result).toBe("verification_email_sent");
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it("should hash the password before saving", async () => {
      // Arrange
      const testData = { ...validUserData };
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        id: "user-uuid-123",
        ...validUserData,
        password: "hashed_password",
      });
      mockUserRepository.save.mockResolvedValue({
        id: "user-uuid-123",
        ...validUserData,
        password: "hashed_password",
      });

      // Act
      await AuthService.register(testData, mockT);

      // Assert
      expect(bcryptUtil.hashPassword).toHaveBeenCalledWith("password123");
    });

    it("should generate a verification token", async () => {
      // Arrange
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        id: "user-uuid-123",
        ...validUserData,
      });
      mockUserRepository.save.mockResolvedValue({
        id: "user-uuid-123",
        ...validUserData,
      });

      // Act
      await AuthService.register(validUserData, mockT);

      // Assert
      expect(tokenUtil.generateToken).toHaveBeenCalled();
      expect(mockVerificationTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          token: "123456",
          userId: "user-uuid-123",
        }),
      );
    });

    it("should send verification email with correct subject", async () => {
      // Arrange
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        id: "user-uuid-123",
        ...validUserData,
      });
      mockUserRepository.save.mockResolvedValue({
        id: "user-uuid-123",
        ...validUserData,
      });

      // Act
      await AuthService.register(validUserData, mockT);

      // Assert
      expect(mockT).toHaveBeenCalledWith("verify_account_subject", {
        ns: "email",
      });
      expect(transporter.sendMail).toHaveBeenCalled();
    });
  });

  describe("verifyAccount", () => {
    const validToken = "123456";

    it("should verify account successfully", async () => {
      // Arrange
      const mockUser = {
        id: "user-uuid-123",
        email: "test@example.com",
        verified: false,
      };
      const mockTokenData = {
        id: "token-uuid-123",
        token: validToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        isUsed: false,
        user: mockUser,
      };

      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity.name === "VerificationToken") {
          return {
            findOne: jest.fn().mockResolvedValue(mockTokenData),
            save: jest.fn().mockResolvedValue({ ...mockTokenData, isUsed: true }),
          };
        }
        if (entity.name === "User") {
          return {
            save: jest.fn().mockResolvedValue({ ...mockUser, verified: true }),
          };
        }
        return {};
      });

      // Act
      const result = await AuthService.verifyAccount({ token: validToken }, mockT);

      // Assert
      expect(result).toBe("account_verified_successfully");
    });

    it("should throw NotFoundError for invalid token", async () => {
      // Arrange
      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity.name === "VerificationToken") {
          return {
            findOne: jest.fn().mockResolvedValue(null),
          };
        }
        return {};
      });

      // Act & Assert
      await expect(AuthService.verifyAccount({ token: "invalid-token" }, mockT)).rejects.toThrow();
    });

    it("should throw BadRequestError for expired token", async () => {
      // Arrange
      const mockTokenData = {
        id: "token-uuid-123",
        token: validToken,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        isUsed: false,
        user: { id: "user-uuid-123" },
      };

      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity.name === "VerificationToken") {
          return {
            findOne: jest.fn().mockResolvedValue(mockTokenData),
          };
        }
        return {};
      });

      // Act & Assert
      await expect(AuthService.verifyAccount({ token: validToken }, mockT)).rejects.toThrow();
    });

    it("should throw BadRequestError for already used token", async () => {
      // Arrange
      const mockTokenData = {
        id: "token-uuid-123",
        token: validToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        isUsed: true,
        user: { id: "user-uuid-123" },
      };

      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity.name === "VerificationToken") {
          return {
            findOne: jest.fn().mockResolvedValue(mockTokenData),
          };
        }
        return {};
      });

      // Act & Assert
      await expect(AuthService.verifyAccount({ token: validToken }, mockT)).rejects.toThrow();
    });
  });

  describe("resendVerificationCode", () => {
    const validEmail = "test@example.com";

    it("should resend verification code successfully", async () => {
      // Arrange
      const mockUser = {
        id: "user-uuid-123",
        email: validEmail,
        verified: false,
      };

      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity.name === "User") {
          return {
            findOneBy: jest.fn().mockResolvedValue(mockUser),
          };
        }
        if (entity.name === "VerificationToken") {
          return {
            save: jest.fn().mockResolvedValue({
              id: "token-uuid-456",
              token: "654321",
            }),
          };
        }
        return {};
      });

      // Act
      const result = await AuthService.resendVerificationCode({ email: validEmail }, mockT);

      // Assert
      expect(result).toBe("verification_email_sent");
      expect(transporter.sendMail).toHaveBeenCalled();
    });

    it("should throw NotFoundError for non-existent user", async () => {
      // Arrange
      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity.name === "User") {
          return {
            findOneBy: jest.fn().mockResolvedValue(null),
          };
        }
        return {};
      });

      // Act & Assert
      await expect(
        AuthService.resendVerificationCode({ email: "nonexistent@example.com" }, mockT),
      ).rejects.toThrow();
    });

    it("should throw BadRequestError for already verified user", async () => {
      // Arrange
      const mockUser = {
        id: "user-uuid-123",
        email: validEmail,
        verified: true,
      };

      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity.name === "User") {
          return {
            findOneBy: jest.fn().mockResolvedValue(mockUser),
          };
        }
        return {};
      });

      // Act & Assert
      await expect(
        AuthService.resendVerificationCode({ email: validEmail }, mockT),
      ).rejects.toThrow();
    });
  });
});
