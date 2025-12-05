import { Repository } from "typeorm";
import { User } from "../entities/User.entity";
import { RegisterUserDto } from "../dtos/user.dto";
import { ConflictError } from "../handler/error.handler";
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

  static register = async (userData: RegisterUserDto) => {
    const { email, role } = userData;

    const userExists = await this.getUserRepository().findOneBy({ email });

    if (userExists) {
      throw new ConflictError("A user with this email already exists.");
    }

    if (role !== UserRole.BUYER && role !== UserRole.SELLER) {
      throw new ConflictError("Invalid user role.");
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
      subject: "Verify your Raiz account",
      html: await EmailTemplates.verifyAccountTemplate({
        token: +verificationToken.token,
      }),
    });

    return "We've sent an email to verify your account.";
  };
}
