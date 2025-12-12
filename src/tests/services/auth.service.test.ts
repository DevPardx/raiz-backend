import { TFunction } from "i18next";

// Mock dependencies BEFORE imports
jest.mock("../../utils/logger.util", () => ({
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock("../../config/cloudinary.config", () => ({
    cloudinary: {
        config: jest.fn(),
        uploader: {
            upload: jest.fn(),
            destroy: jest.fn(),
        },
    },
}));

jest.mock("socket.io", () => ({
    Server: jest.fn().mockImplementation(() => ({
        use: jest.fn(),
        on: jest.fn(),
        emit: jest.fn(),
    })),
}));

jest.mock("../../utils/cloudinary.util", () => ({
    uploadImage: jest.fn(),
    extractPublicIdFromUrl: jest.fn(),
    deleteImage: jest.fn(),
}));

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
    comparePassword: jest.fn(),
}));

jest.mock("../../utils/token.util", () => ({
    generateToken: jest.fn(),
    generateJWT: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
}));

jest.mock("../../utils", () => ({
    tokenExpiresIn: jest.fn(),
    refreshTokenExpiresIn: jest.fn(),
}));

jest.mock("../../emails/emailTemplates", () => ({
    EmailTemplates: {
        verifyAccountTemplate: jest.fn().mockResolvedValue("<html>Verify Email</html>"),
        forgotPasswordEmailTemplate: jest
            .fn()
            .mockResolvedValue("<html>Reset Password Email</html>"),
    },
}));

// Import after mocks
import { AuthService } from "../../services/auth.service";
import { AppDataSource } from "../../config/typeorm.config";
import { transporter } from "../../config/email.config";
import { ConflictError, NotFoundError, BadRequestError } from "../../handler/error.handler";
import { UserRole } from "../../enums";
import * as bcryptUtil from "../../utils/bcrypt.util";
import * as tokenUtil from "../../utils/token.util";

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

    const mockRefreshTokenRepository = {
        save: jest.fn(),
        findOne: jest.fn(),
        delete: jest.fn(),
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
            if (entity.name === "RefreshToken") {
                return mockRefreshTokenRepository;
            }
            return {};
        });

        // Setup utility mocks
        const { hashPassword, comparePassword } = bcryptUtil;
        (hashPassword as jest.Mock).mockResolvedValue("hashed_password");
        (comparePassword as jest.Mock).mockResolvedValue(true);

        const { generateToken, generateJWT, generateRefreshToken, verifyRefreshToken } = tokenUtil;
        (generateToken as jest.Mock).mockReturnValue("123456");
        (generateJWT as jest.Mock).mockReturnValue("access_token_jwt");
        (generateRefreshToken as jest.Mock).mockReturnValue("refresh_token_jwt");
        (verifyRefreshToken as jest.Mock).mockReturnValue({ id: "user-id" });

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
            await expect(AuthService.register(invalidUserData, mockT)).rejects.toThrow(
                ConflictError,
            );
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
            await expect(
                AuthService.verifyAccount({ token: "invalid-token" }, mockT),
            ).rejects.toThrow();
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

    describe("forgotPassword", () => {
        const validEmail = "test@example.com";

        it("should send reset password email successfully", async () => {
            // Arrange
            const mockUser = {
                id: "user-uuid-123",
                email: validEmail,
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
                            token: "123456",
                        }),
                    };
                }
                return {};
            });

            // Act
            const result = await AuthService.forgotPassword({ email: validEmail }, mockT);

            // Assert
            expect(result).toBe("reset_password_email_sent");
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
                AuthService.forgotPassword({ email: "nonexistent@example.com" }, mockT),
            ).rejects.toThrow();
        });
    });

    describe("resetPassword", () => {
        const validToken = "123456";
        const newPassword = "newPassword123";

        it("should reset password successfully", async () => {
            // Arrange
            const mockUser = {
                id: "user-uuid-123",
                email: "test@example.com",
                password: "oldHashedPassword",
            };
            const mockResetToken = {
                id: "token-uuid-123",
                token: validToken,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                isUsed: false,
                user: mockUser,
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "VerificationToken") {
                    return {
                        findOne: jest.fn().mockResolvedValue(mockResetToken),
                        save: jest.fn().mockResolvedValue({ ...mockResetToken, isUsed: true }),
                    };
                }
                if (entity.name === "User") {
                    return {
                        save: jest.fn().mockResolvedValue(mockUser),
                    };
                }
                return {};
            });

            // Act
            const result = await AuthService.resetPassword(validToken, { newPassword }, mockT);

            // Assert
            expect(result).toBe("password_reset_successfully");
            expect(bcryptUtil.hashPassword).toHaveBeenCalledWith(newPassword);
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
            await expect(
                AuthService.resetPassword("invalid-token", { newPassword }, mockT),
            ).rejects.toThrow();
        });

        it("should throw BadRequestError for expired token", async () => {
            // Arrange
            const mockResetToken = {
                id: "token-uuid-123",
                token: validToken,
                expiresAt: new Date(Date.now() - 1000),
                isUsed: false,
                user: { id: "user-uuid-123" },
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "VerificationToken") {
                    return {
                        findOne: jest.fn().mockResolvedValue(mockResetToken),
                    };
                }
                return {};
            });

            // Act & Assert
            await expect(
                AuthService.resetPassword(validToken, { newPassword }, mockT),
            ).rejects.toThrow();
        });

        it("should throw BadRequestError for already used token", async () => {
            // Arrange
            const mockResetToken = {
                id: "token-uuid-123",
                token: validToken,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                isUsed: true,
                user: { id: "user-uuid-123" },
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "VerificationToken") {
                    return {
                        findOne: jest.fn().mockResolvedValue(mockResetToken),
                    };
                }
                return {};
            });

            // Act & Assert
            await expect(
                AuthService.resetPassword(validToken, { newPassword }, mockT),
            ).rejects.toThrow();
        });
    });

    describe("validateResetToken", () => {
        const validToken = "123456";

        it("should validate token successfully", async () => {
            // Arrange
            const mockResetToken = {
                id: "token-uuid-123",
                token: validToken,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                isUsed: false,
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "VerificationToken") {
                    return {
                        findOne: jest.fn().mockResolvedValue(mockResetToken),
                    };
                }
                return {};
            });

            // Act
            const result = await AuthService.validateResetToken(validToken, mockT);

            // Assert
            expect(result).toBe("valid_reset_token");
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
            await expect(AuthService.validateResetToken("invalid-token", mockT)).rejects.toThrow();
        });

        it("should throw BadRequestError for expired token", async () => {
            // Arrange
            const mockResetToken = {
                id: "token-uuid-123",
                token: validToken,
                expiresAt: new Date(Date.now() - 1000),
                isUsed: false,
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "VerificationToken") {
                    return {
                        findOne: jest.fn().mockResolvedValue(mockResetToken),
                    };
                }
                return {};
            });

            // Act & Assert
            await expect(AuthService.validateResetToken(validToken, mockT)).rejects.toThrow();
        });

        it("should throw BadRequestError for already used token", async () => {
            // Arrange
            const mockResetToken = {
                id: "token-uuid-123",
                token: validToken,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                isUsed: true,
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "VerificationToken") {
                    return {
                        findOne: jest.fn().mockResolvedValue(mockResetToken),
                    };
                }
                return {};
            });

            // Act & Assert
            await expect(AuthService.validateResetToken(validToken, mockT)).rejects.toThrow();
        });
    });

    describe("login", () => {
        const validEmail = "test@example.com";
        const validPassword = "password123";
        const loginData = { email: validEmail, password: validPassword };

        it("should login successfully and return tokens with user data", async () => {
            // Arrange
            const mockUser = {
                id: "user-uuid-123",
                email: validEmail,
                password: "hashed_password",
                name: "Test User",
                role: UserRole.BUYER,
                profilePicture: null,
                verified: true,
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return {
                        findOneBy: jest.fn().mockResolvedValue(mockUser),
                    };
                }
                if (entity.name === "RefreshToken") {
                    return {
                        save: jest.fn().mockResolvedValue({}),
                    };
                }
                return {};
            });

            // Act
            const result = await AuthService.login(loginData, mockT);

            // Assert
            expect(result).toEqual({
                accessToken: "access_token_jwt",
                refreshToken: "refresh_token_jwt",
            });
            expect(tokenUtil.generateJWT).toHaveBeenCalledWith({
                id: mockUser.id,
                role: mockUser.role,
            });
            expect(tokenUtil.generateRefreshToken).toHaveBeenCalledWith({ id: mockUser.id });
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
            await expect(AuthService.login(loginData, mockT)).rejects.toThrow();
        });

        it("should throw BadRequestError for unverified account", async () => {
            // Arrange
            const mockUser = {
                id: "user-uuid-123",
                email: validEmail,
                password: "hashed_password",
                verified: false,
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
            await expect(AuthService.login(loginData, mockT)).rejects.toThrow();
        });

        it("should throw BadRequestError for invalid password", async () => {
            // Arrange
            const mockUser = {
                id: "user-uuid-123",
                email: validEmail,
                password: "hashed_password",
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

            (bcryptUtil.comparePassword as jest.Mock).mockResolvedValue(false);

            // Act & Assert
            await expect(AuthService.login(loginData, mockT)).rejects.toThrow();
        });
    });

    describe("logout", () => {
        const validRefreshToken = "valid_refresh_token";

        it("should logout successfully", async () => {
            // Arrange
            const mockToken = {
                id: "token-uuid-123",
                token: validRefreshToken,
                userId: "user-uuid-123",
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "RefreshToken") {
                    return {
                        findOne: jest.fn().mockResolvedValue(mockToken),
                        delete: jest.fn().mockResolvedValue({ affected: 1 }),
                    };
                }
                return {};
            });

            // Act
            const result = await AuthService.logout(validRefreshToken, mockT);

            // Assert
            expect(result).toBe("logout_successful");
        });

        it("should throw NotFoundError for invalid refresh token", async () => {
            // Arrange
            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "RefreshToken") {
                    return {
                        findOne: jest.fn().mockResolvedValue(null),
                    };
                }
                return {};
            });

            // Act & Assert
            await expect(AuthService.logout("invalid_token", mockT)).rejects.toThrow();
        });
    });

    describe("refreshToken", () => {
        const validRefreshToken = "valid_refresh_token";

        it("should refresh token successfully", async () => {
            // Arrange
            const mockUser = {
                id: "user-uuid-123",
                email: "test@example.com",
                role: UserRole.BUYER,
            };

            const mockToken = {
                id: "token-uuid-123",
                token: validRefreshToken,
                userId: mockUser.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                user: mockUser,
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "RefreshToken") {
                    return {
                        findOne: jest.fn().mockResolvedValue(mockToken),
                    };
                }
                return {};
            });

            // Act
            const result = await AuthService.refreshToken(validRefreshToken, mockT);

            // Assert
            expect(result).toEqual({
                accessToken: "access_token_jwt",
            });
            expect(tokenUtil.generateJWT).toHaveBeenCalledWith({
                id: mockUser.id,
                role: mockUser.role,
            });
        });

        it("should throw UnauthorizedError for invalid refresh token", async () => {
            // Arrange
            (tokenUtil.verifyRefreshToken as jest.Mock).mockImplementation(() => {
                throw new Error("Invalid token");
            });

            // Act & Assert
            await expect(AuthService.refreshToken("invalid_token", mockT)).rejects.toThrow();
        });

        it("should throw UnauthorizedError for non-existent refresh token in database", async () => {
            // Arrange
            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "RefreshToken") {
                    return {
                        findOne: jest.fn().mockResolvedValue(null),
                    };
                }
                return {};
            });

            // Act & Assert
            await expect(AuthService.refreshToken(validRefreshToken, mockT)).rejects.toThrow();
        });

        it("should throw UnauthorizedError for expired refresh token", async () => {
            // Arrange
            const mockToken = {
                id: "token-uuid-123",
                token: validRefreshToken,
                userId: "user-uuid-123",
                expiresAt: new Date(Date.now() - 1000), // Expired
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "RefreshToken") {
                    return {
                        findOne: jest.fn().mockResolvedValue(mockToken),
                        delete: jest.fn().mockResolvedValue({ affected: 1 }),
                    };
                }
                return {};
            });

            // Act & Assert
            await expect(AuthService.refreshToken(validRefreshToken, mockT)).rejects.toThrow();
        });
    });

    describe("changePassword", () => {
        const userId = "user-uuid-123";
        const currentPassword = "oldPassword123";
        const newPassword = "newPassword456";
        const changePasswordData = { currentPassword, newPassword };

        it("should change password successfully", async () => {
            // Arrange
            const mockUser = {
                id: userId,
                password: "hashed_old_password",
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return {
                        findOne: jest.fn().mockResolvedValue(mockUser),
                        save: jest.fn().mockResolvedValue({
                            ...mockUser,
                            password: "hashed_new_password",
                        }),
                    };
                }
                return {};
            });

            (bcryptUtil.comparePassword as jest.Mock).mockResolvedValue(true);
            (bcryptUtil.hashPassword as jest.Mock).mockResolvedValue("hashed_new_password");

            // Act
            const result = await AuthService.changePassword(userId, changePasswordData, mockT);

            // Assert
            expect(result).toBe("password_changed_successfully");
            expect(bcryptUtil.comparePassword).toHaveBeenCalledWith(
                currentPassword,
                "hashed_old_password",
            );
            expect(bcryptUtil.hashPassword).toHaveBeenCalledWith(newPassword);
        });

        it("should throw NotFoundError if user doesn't exist", async () => {
            // Arrange
            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return {
                        findOne: jest.fn().mockResolvedValue(null),
                    };
                }
                return {};
            });

            // Act & Assert
            await expect(
                AuthService.changePassword(userId, changePasswordData, mockT),
            ).rejects.toThrow(NotFoundError);
        });

        it("should throw BadRequestError if current password is incorrect", async () => {
            // Arrange
            const mockUser = {
                id: userId,
                password: "hashed_old_password",
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return {
                        findOne: jest.fn().mockResolvedValue(mockUser),
                    };
                }
                return {};
            });

            (bcryptUtil.comparePassword as jest.Mock).mockResolvedValue(false);

            // Act & Assert
            await expect(
                AuthService.changePassword(userId, changePasswordData, mockT),
            ).rejects.toThrow(BadRequestError);
            expect(bcryptUtil.hashPassword).not.toHaveBeenCalled();
        });

        it("should query user with password field selected", async () => {
            // Arrange
            const mockUserRepository = {
                findOne: jest.fn().mockResolvedValue({
                    id: userId,
                    password: "hashed_old_password",
                }),
                save: jest.fn(),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return mockUserRepository;
                }
                return {};
            });

            (bcryptUtil.comparePassword as jest.Mock).mockResolvedValue(true);

            // Act
            await AuthService.changePassword(userId, changePasswordData, mockT);

            // Assert
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: userId },
                select: ["id", "password"],
            });
        });
    });

    describe("confirmPassword", () => {
        const userId = "user-uuid-123";
        const password = "testPassword123";
        const confirmPasswordData = { password };

        it("should confirm password successfully", async () => {
            // Arrange
            const mockUser = {
                id: userId,
                password: "hashed_password",
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return {
                        findOne: jest.fn().mockResolvedValue(mockUser),
                    };
                }
                return {};
            });

            (bcryptUtil.comparePassword as jest.Mock).mockResolvedValue(true);

            // Act
            const result = await AuthService.confirmPassword(userId, confirmPasswordData, mockT);

            // Assert
            expect(result).toBe("password_correct");
            expect(bcryptUtil.comparePassword).toHaveBeenCalledWith(password, mockUser.password);
        });

        it("should throw NotFoundError if user doesn't exist", async () => {
            // Arrange
            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return {
                        findOne: jest.fn().mockResolvedValue(null),
                    };
                }
                return {};
            });

            // Act & Assert
            await expect(
                AuthService.confirmPassword(userId, confirmPasswordData, mockT),
            ).rejects.toThrow(NotFoundError);
        });

        it("should throw BadRequestError if password is incorrect", async () => {
            // Arrange
            const mockUser = {
                id: userId,
                password: "hashed_password",
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return {
                        findOne: jest.fn().mockResolvedValue(mockUser),
                    };
                }
                return {};
            });

            (bcryptUtil.comparePassword as jest.Mock).mockResolvedValue(false);

            // Act & Assert
            await expect(
                AuthService.confirmPassword(userId, confirmPasswordData, mockT),
            ).rejects.toThrow(BadRequestError);
        });

        it("should query user with password field selected", async () => {
            // Arrange
            const mockUserRepository = {
                findOne: jest.fn().mockResolvedValue({
                    id: userId,
                    password: "hashed_password",
                }),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return mockUserRepository;
                }
                return {};
            });

            (bcryptUtil.comparePassword as jest.Mock).mockResolvedValue(true);

            // Act
            await AuthService.confirmPassword(userId, confirmPasswordData, mockT);

            // Assert
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: userId },
                select: ["id", "password"],
            });
        });
    });

    describe("updateUser", () => {
        const userId = "user-uuid-123";

        it("should update user name successfully", async () => {
            // Arrange
            const updateData = { name: "New Name" };

            const mockUserRepository = {
                update: jest.fn().mockResolvedValue({ affected: 1 }),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return mockUserRepository;
                }
                return {};
            });

            // Act
            const result = await AuthService.updateUser(userId, updateData, mockT);

            // Assert
            expect(result).toBe("user_updated_successfully");
            expect(mockUserRepository.update).toHaveBeenCalledWith(
                { id: userId },
                { name: "New Name" },
            );
        });

        it("should update user profilePicture successfully", async () => {
            // Arrange
            const updateData = { profilePicture: "https://example.com/photo.jpg" };

            const mockUserRepository = {
                update: jest.fn().mockResolvedValue({ affected: 1 }),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return mockUserRepository;
                }
                return {};
            });

            // Act
            const result = await AuthService.updateUser(userId, updateData, mockT);

            // Assert
            expect(result).toBe("user_updated_successfully");
            expect(mockUserRepository.update).toHaveBeenCalledWith(
                { id: userId },
                { profilePicture: "https://example.com/photo.jpg" },
            );
        });

        it("should update both name and profilePicture successfully", async () => {
            // Arrange
            const updateData = {
                name: "New Name",
                profilePicture: "https://example.com/photo.jpg",
            };

            const mockUserRepository = {
                update: jest.fn().mockResolvedValue({ affected: 1 }),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return mockUserRepository;
                }
                return {};
            });

            // Act
            const result = await AuthService.updateUser(userId, updateData, mockT);

            // Assert
            expect(result).toBe("user_updated_successfully");
            expect(mockUserRepository.update).toHaveBeenCalledWith(
                { id: userId },
                {
                    name: "New Name",
                    profilePicture: "https://example.com/photo.jpg",
                },
            );
        });

        it("should throw BadRequestError when no fields to update", async () => {
            // Arrange
            const updateData = {};

            // Act & Assert
            await expect(AuthService.updateUser(userId, updateData, mockT)).rejects.toThrow(
                BadRequestError,
            );
        });

        it("should throw NotFoundError when user doesn't exist", async () => {
            // Arrange
            const updateData = { name: "New Name" };

            const mockUserRepository = {
                update: jest.fn().mockResolvedValue({ affected: 0 }),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return mockUserRepository;
                }
                return {};
            });

            // Act & Assert
            await expect(AuthService.updateUser(userId, updateData, mockT)).rejects.toThrow(
                NotFoundError,
            );
        });

        it("should only update provided fields", async () => {
            // Arrange
            const updateData = { name: "New Name" };

            const mockUserRepository = {
                update: jest.fn().mockResolvedValue({ affected: 1 }),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return mockUserRepository;
                }
                return {};
            });

            // Act
            await AuthService.updateUser(userId, updateData, mockT);

            // Assert
            expect(mockUserRepository.update).toHaveBeenCalledWith(
                { id: userId },
                expect.not.objectContaining({ profilePicture: expect.anything() }),
            );
            expect(mockUserRepository.update).toHaveBeenCalledWith(
                { id: userId },
                { name: "New Name" },
            );
        });
    });

    describe("getUser", () => {
        const userId = "user-uuid-123";

        it("should get user successfully", async () => {
            // Arrange
            const mockUser = {
                id: userId,
                email: "test@example.com",
                name: "Test User",
                role: UserRole.BUYER,
                verified: true,
                profilePicture: "https://example.com/photo.jpg",
                createdAt: new Date("2024-01-01"),
                updatedAt: new Date("2024-01-02"),
            };

            const mockUserRepository = {
                findOne: jest.fn().mockResolvedValue(mockUser),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return mockUserRepository;
                }
                return {};
            });

            // Act
            const result = await AuthService.getUser(userId);

            // Assert
            expect(result).toEqual(mockUser);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: userId },
                select: [
                    "id",
                    "email",
                    "name",
                    "role",
                    "verified",
                    "profilePicture",
                    "createdAt",
                    "updatedAt",
                ],
            });
        });

        it("should return null when user doesn't exist", async () => {
            // Arrange
            const mockUserRepository = {
                findOne: jest.fn().mockResolvedValue(null),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return mockUserRepository;
                }
                return {};
            });

            // Act
            const result = await AuthService.getUser(userId);

            // Assert
            expect(result).toBeNull();
        });

        it("should select only specific fields excluding password", async () => {
            // Arrange
            const mockUserRepository = {
                findOne: jest.fn().mockResolvedValue({
                    id: userId,
                    email: "test@example.com",
                }),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return mockUserRepository;
                }
                return {};
            });

            // Act
            await AuthService.getUser(userId);

            // Assert
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: userId },
                select: expect.not.arrayContaining(["password"]),
            });
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: userId },
                select: expect.arrayContaining(["id", "email", "name", "role"]),
            });
        });

        it("should return user with all expected fields", async () => {
            // Arrange
            const mockUser = {
                id: userId,
                email: "test@example.com",
                name: "Test User",
                role: UserRole.SELLER,
                verified: false,
                profilePicture: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockUserRepository = {
                findOne: jest.fn().mockResolvedValue(mockUser),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "User") {
                    return mockUserRepository;
                }
                return {};
            });

            // Act
            const result = await AuthService.getUser(userId);

            // Assert
            expect(result).toHaveProperty("id");
            expect(result).toHaveProperty("email");
            expect(result).toHaveProperty("name");
            expect(result).toHaveProperty("role");
            expect(result).toHaveProperty("verified");
            expect(result).toHaveProperty("profilePicture");
            expect(result).toHaveProperty("createdAt");
            expect(result).toHaveProperty("updatedAt");
            expect(result).not.toHaveProperty("password");
        });
    });
});
