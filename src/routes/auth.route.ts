import { Router } from "express";
import { validateDto } from "../middleware/validation.middleware";
import { authenticate } from "../middleware/auth.middleware";
import {
    ChangePasswordDto,
    ConfirmPasswordDto,
    ForgotPasswordDto,
    LoginUserDto,
    LogoutDto,
    RegisterUserDto,
    ResendVerificationCodeDto,
    ResetPasswordDto,
    UpdateUserDto,
    VerifyAccountDto,
} from "../dtos/user.dto";
import { AuthController } from "../controllers/auth.controller";
import {
    authLimiter,
    passwordResetLimiter,
    emailVerificationLimiter,
    uploadLimiter,
} from "../config/rate-limit.config";

const router = Router();

router.post("/register", authLimiter, validateDto(RegisterUserDto), AuthController.register);

router.post(
    "/verify-account",
    emailVerificationLimiter,
    validateDto(VerifyAccountDto),
    AuthController.verifyAccount,
);

router.post(
    "/resend-verification-code",
    emailVerificationLimiter,
    validateDto(ResendVerificationCodeDto),
    AuthController.resendVerificationCode,
);

router.post(
    "/forgot-password",
    passwordResetLimiter,
    validateDto(ForgotPasswordDto),
    AuthController.forgotPassword,
);

router.post(
    "/reset-password/:token",
    passwordResetLimiter,
    validateDto(ResetPasswordDto),
    AuthController.resetPassword,
);

router.get("/reset-password/:token", passwordResetLimiter, AuthController.validateResetToken);

router.post("/login", authLimiter, validateDto(LoginUserDto), AuthController.login);

router.post("/logout", validateDto(LogoutDto), AuthController.logout);

router.post("/refresh-token", AuthController.refreshToken);

router.post(
    "/change-password",
    authenticate,
    validateDto(ChangePasswordDto),
    AuthController.changePassword,
);

router.post(
    "/confirm-password",
    authenticate,
    validateDto(ConfirmPasswordDto),
    AuthController.confirmPassword,
);

router.put(
    "/update-user",
    authenticate,
    uploadLimiter,
    validateDto(UpdateUserDto),
    AuthController.updateUser,
);

router.get("/get-user", authenticate, AuthController.getUser);

export default router;
