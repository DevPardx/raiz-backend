import { Repository } from "typeorm";
import { TFunction } from "i18next";
import { User } from "../entities/User.entity";
import {
    ChangePasswordDto,
    ConfirmPasswordDto,
    ForgotPasswordDto,
    LoginUserDto,
    RegisterUserDto,
    ResendVerificationCodeDto,
    ResetPasswordDto,
    UpdateUserDto,
    VerifyAccountDto,
} from "../dtos/user.dto";
import {
    BadRequestError,
    ConflictError,
    NotFoundError,
    UnauthorizedError,
} from "../handler/error.handler";
import { AppDataSource } from "../config/typeorm.config";
import { UserRole, TokenType } from "../enums";
import { comparePassword, hashPassword } from "../utils/bcrypt.util";
import { VerificationToken } from "../entities/VerificationToken.entity";
import { RefreshToken } from "../entities/RefreshToken.entity";
import {
    generateJWT,
    generateRefreshToken,
    generateToken,
    verifyRefreshToken,
} from "../utils/token.util";
import { transporter } from "../config/email.config";
import { EmailTemplates } from "../emails/emailTemplates";
import { refreshTokenExpiresIn, tokenExpiresIn } from "../utils";
import { uploadImage, extractPublicIdFromUrl, deleteImage } from "../utils/cloudinary.util";
import logger from "../utils/logger.util";

export class AuthService {
    private static getUserRepository(): Repository<User> {
        return AppDataSource.getRepository(User);
    }

    private static getVerificationTokenRepository(): Repository<VerificationToken> {
        return AppDataSource.getRepository(VerificationToken);
    }

    private static getRefreshTokenRepository(): Repository<RefreshToken> {
        return AppDataSource.getRepository(RefreshToken);
    }

    static register = async (userData: RegisterUserDto, t: TFunction) => {
        const { email, role } = userData;

        const userExists = await this.getUserRepository().findOneBy({ email });

        if (userExists) {
            throw new ConflictError(t("user_already_exists"));
        }

        if (role !== UserRole.BUYER && role !== UserRole.SELLER) {
            throw new ConflictError(t("invalid_user_role"));
        }

        userData.password = await hashPassword(userData.password);
        const user = this.getUserRepository().create(userData);
        await this.getUserRepository().save(user);

        const verificationToken = new VerificationToken();
        verificationToken.token = generateToken();
        verificationToken.type = TokenType.EMAIL_VERIFICATION;
        verificationToken.expiresAt = tokenExpiresIn();
        verificationToken.userId = user.id;
        await this.getVerificationTokenRepository().save(verificationToken);

        await transporter.sendMail({
            from: "<no-reply@raizsv.com>",
            to: user.email,
            subject: t("verify_account_subject", { ns: "email" }),
            html: await EmailTemplates.verifyAccountTemplate(
                {
                    token: verificationToken.token,
                },
                t,
            ),
        });

        return t("verification_email_sent");
    };

    static verifyAccount = async (verifyAccountData: VerifyAccountDto, t: TFunction) => {
        const { token } = verifyAccountData;

        const tokenExists = await this.getVerificationTokenRepository().findOne({
            where: { token, type: TokenType.EMAIL_VERIFICATION },
            relations: ["user"],
        });

        if (!tokenExists) {
            throw new NotFoundError(t("invalid_verification_code"));
        }

        if (tokenExists.isUsed || tokenExists.expiresAt < new Date()) {
            throw new BadRequestError(t("invalid_verification_code"));
        }

        const user = tokenExists.user;

        user.verified = true;
        await this.getUserRepository().save(user);

        tokenExists.isUsed = true;
        await this.getVerificationTokenRepository().save(tokenExists);

        return t("account_verified_successfully");
    };

    static resendVerificationCode = async (resendData: ResendVerificationCodeDto, t: TFunction) => {
        const { email } = resendData;

        const user = await this.getUserRepository().findOneBy({ email });

        if (!user) {
            throw new NotFoundError(t("user_not_found"));
        }

        if (user.verified) {
            throw new BadRequestError(t("account_already_verified"));
        }

        const verificationToken = new VerificationToken();
        verificationToken.token = generateToken();
        verificationToken.type = TokenType.EMAIL_VERIFICATION;
        verificationToken.expiresAt = tokenExpiresIn();
        verificationToken.userId = user.id;
        await this.getVerificationTokenRepository().save(verificationToken);

        await transporter.sendMail({
            from: "<no-reply@raizsv.com>",
            to: user.email,
            subject: t("verify_account_subject", { ns: "email" }),
            html: await EmailTemplates.verifyAccountTemplate(
                {
                    token: verificationToken.token,
                },
                t,
            ),
        });

        return t("verification_email_sent");
    };

    static forgotPassword = async (userData: ForgotPasswordDto, t: TFunction) => {
        const { email } = userData;

        const user = await this.getUserRepository().findOneBy({ email });

        if (!user) {
            throw new NotFoundError(t("user_not_found"));
        }

        const resetToken = new VerificationToken();
        resetToken.token = generateToken();
        resetToken.type = TokenType.PASSWORD_RESET;
        resetToken.expiresAt = tokenExpiresIn();
        resetToken.userId = user.id;
        await this.getVerificationTokenRepository().save(resetToken);

        await transporter.sendMail({
            from: "<no-reply@raizsv.com>",
            to: user.email,
            subject: t("forgot_password_subject", { ns: "email" }),
            html: await EmailTemplates.forgotPasswordEmailTemplate(
                {
                    token: resetToken.token,
                },
                t,
            ),
        });

        return t("reset_password_email_sent");
    };

    static resetPassword = async (token: string, resetData: ResetPasswordDto, t: TFunction) => {
        const { newPassword } = resetData;

        const resetToken = await this.getVerificationTokenRepository().findOne({
            where: { token, type: TokenType.PASSWORD_RESET },
            relations: ["user"],
        });

        if (!resetToken) {
            throw new NotFoundError(t("invalid_reset_token"));
        }

        if (resetToken.isUsed || resetToken.expiresAt < new Date()) {
            throw new BadRequestError(t("invalid_reset_token"));
        }

        const user = resetToken.user;
        user.password = await hashPassword(newPassword);
        await this.getUserRepository().save(user);

        resetToken.isUsed = true;
        await this.getVerificationTokenRepository().save(resetToken);

        return t("password_reset_successfully");
    };

    static validateResetToken = async (token: string, t: TFunction) => {
        const resetToken = await this.getVerificationTokenRepository().findOne({
            where: { token, type: TokenType.PASSWORD_RESET },
        });

        if (!resetToken) {
            throw new NotFoundError(t("invalid_reset_token"));
        }

        if (resetToken.isUsed || resetToken.expiresAt < new Date()) {
            throw new BadRequestError(t("invalid_reset_token"));
        }

        return t("valid_reset_token");
    };

    static login = async (userData: LoginUserDto, t: TFunction) => {
        const { email, password } = userData;

        const user = await this.getUserRepository().findOneBy({ email });

        if (!user) {
            throw new NotFoundError(t("user_not_found"));
        }

        if (!user.verified) {
            throw new BadRequestError(t("account_not_verified"));
        }

        const checkPassword = await comparePassword(password, user.password);

        if (!checkPassword) {
            throw new BadRequestError(t("invalid_credentials"));
        }

        const accessToken = generateJWT({ id: user.id, role: user.role });
        const refreshTokenValue = generateRefreshToken({ id: user.id });

        const refreshToken = new RefreshToken();
        refreshToken.token = refreshTokenValue;
        refreshToken.userId = user.id;
        refreshToken.expiresAt = refreshTokenExpiresIn();
        await this.getRefreshTokenRepository().save(refreshToken);

        return {
            accessToken,
            refreshToken: refreshTokenValue,
        };
    };

    static logout = async (refreshToken: string, t: TFunction) => {
        const token = await this.getRefreshTokenRepository().findOne({
            where: { token: refreshToken },
        });

        if (!token) {
            throw new NotFoundError(t("invalid_refresh_token"));
        }

        await this.getRefreshTokenRepository().delete({ id: token.id });

        return t("logout_successful");
    };

    static refreshToken = async (refreshTokenValue: string, t: TFunction) => {
        try {
            verifyRefreshToken(refreshTokenValue);

            const refreshToken = await this.getRefreshTokenRepository().findOne({
                where: { token: refreshTokenValue },
                relations: ["user"],
            });

            if (!refreshToken) {
                throw new UnauthorizedError(t("invalid_refresh_token"));
            }

            if (refreshToken.expiresAt < new Date()) {
                await this.getRefreshTokenRepository().delete({ id: refreshToken.id });
                throw new UnauthorizedError(t("refresh_token_expired"));
            }

            const user = refreshToken.user;

            const newAccessToken = generateJWT({ id: user.id, role: user.role });

            return {
                accessToken: newAccessToken,
            };
        } catch {
            throw new UnauthorizedError(t("invalid_refresh_token"));
        }
    };

    static changePassword = async (userId: string, userData: ChangePasswordDto, t: TFunction) => {
        const { currentPassword, newPassword } = userData;

        const user = await this.getUserRepository().findOne({
            where: { id: userId },
            select: ["id", "password"],
        });

        if (!user) {
            throw new NotFoundError(t("user_not_found"));
        }

        const isPasswordValid = await comparePassword(currentPassword, user.password);

        if (!isPasswordValid) {
            throw new BadRequestError(t("current_password_incorrect"));
        }

        user.password = await hashPassword(newPassword);
        await this.getUserRepository().save(user);

        return t("password_changed_successfully");
    };

    static confirmPassword = async (userId: string, userData: ConfirmPasswordDto, t: TFunction) => {
        const { password } = userData;

        const user = await this.getUserRepository().findOne({
            where: { id: userId },
            select: ["id", "password"],
        });

        if (!user) {
            throw new NotFoundError(t("user_not_found"));
        }

        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            throw new BadRequestError(t("current_password_incorrect"));
        }

        return t("password_correct");
    };

    static updateUser = async (userId: string, userData: UpdateUserDto, t: TFunction) => {
        const updateData: Partial<User> = {};

        if (userData.name !== undefined) {
            updateData.name = userData.name;
        }

        if (userData.profilePicture !== undefined) {
            const isBase64 =
                userData.profilePicture.startsWith("data:image/") ||
                userData.profilePicture.match(/^[A-Za-z0-9+/=]+$/);

            if (isBase64) {
                const currentUser = await this.getUserRepository().findOne({
                    where: { id: userId },
                    select: ["profilePicture"],
                });

                if (currentUser?.profilePicture) {
                    try {
                        const publicId = extractPublicIdFromUrl(currentUser.profilePicture);
                        if (publicId) {
                            await deleteImage(publicId);
                        }
                    } catch (error) {
                        logger.error("Failed to delete old profile picture:", error);
                    }
                }

                try {
                    const result = await uploadImage(userData.profilePicture, "profile-pictures");
                    updateData.profilePicture = result.url;
                } catch (error) {
                    logger.error("Profile picture upload error:", error);
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    throw new BadRequestError(
                        `${t("profile_picture_upload_failed")} - ${errorMessage}`,
                    );
                }
            } else {
                updateData.profilePicture = userData.profilePicture;
            }
        }

        if (Object.keys(updateData).length === 0) {
            throw new BadRequestError(t("no_fields_to_update"));
        }

        const result = await this.getUserRepository().update({ id: userId }, updateData);

        if (result.affected === 0) {
            throw new NotFoundError(t("user_not_found"));
        }

        return t("user_updated_successfully");
    };

    static getUser = async (userId: string) => {
        const user = await this.getUserRepository().findOne({
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

        return user;
    };
}
