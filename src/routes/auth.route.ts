import { Router } from "express";
import { validateDto } from "../middleware/validation.middleware";
import { authenticate } from "../middleware/auth.middleware";
import {
    ChangePasswordDto,
    ConfirmPasswordDto,
    ForgotPasswordDto,
    LoginUserDto,
    RegisterUserDto,
    ResendVerificationCodeDto,
    ResetPasswordDto,
    VerifyAccountDto,
} from "../dtos/user.dto";
import { AuthController } from "../controllers/auth.controller";

const router = Router();

router.post("/register", validateDto(RegisterUserDto), AuthController.register);

router.post("/verify-account", validateDto(VerifyAccountDto), AuthController.verifyAccount);

router.post(
    "/resend-verification-code",
    validateDto(ResendVerificationCodeDto),
    AuthController.resendVerificationCode,
);

router.post("/forgot-password", validateDto(ForgotPasswordDto), AuthController.forgotPassword);

router.post("/reset-password/:token", validateDto(ResetPasswordDto), AuthController.resetPassword);

router.get("/reset-password/:token", AuthController.validateResetToken);

router.post("/login", validateDto(LoginUserDto), AuthController.login);

router.post("/logout", AuthController.logout);

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

// router.put("/update-profile");
// router.get("/me");

export default router;
