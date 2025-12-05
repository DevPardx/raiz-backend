import { Repository } from "typeorm";
import { TFunction } from "i18next";
import { User } from "../entities/User.entity";
import { RegisterUserDto, ResendVerificationCodeDto, VerifyAccountDto } from "../dtos/user.dto";
import { BadRequestError, ConflictError, NotFoundError } from "../handler/error.handler";
import { AppDataSource } from "../config/typeorm.config";
import { UserRole } from "../enums";
import { expiresIn, hashPassword } from "../utils/bcrypt.util";
import { VerificationToken } from "../entities/VerificationToken.entity";
import { generateToken } from "../utils/token.util";
import { transporter } from "../config/email.config";
import { EmailTemplates } from "../emails/emailTemplates";

export class AuthService {
    private static getUserRepository(): Repository<User> {
        return AppDataSource.getRepository(User);
    }

    private static getVerificationTokenRepository(): Repository<VerificationToken> {
        return AppDataSource.getRepository(VerificationToken);
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
        verificationToken.expiresAt = expiresIn();
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
            where: { token },
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
        verificationToken.expiresAt = expiresIn();
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
}
