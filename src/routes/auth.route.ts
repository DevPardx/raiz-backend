import { Router } from "express";
import { validateDto } from "../middleware/validation.middleware";
import { RegisterUserDto, ResendVerificationCodeDto, VerifyAccountDto } from "../dtos/user.dto";
import { AuthController } from "../controllers/auth.controller";

const router = Router();

router.post("/register", validateDto(RegisterUserDto), AuthController.register);

router.post("/verify-account", validateDto(VerifyAccountDto), AuthController.verifyAccount);

router.post("/resend-verification-code", validateDto(ResendVerificationCodeDto), AuthController.resendVerificationCode);

// router.post("/login");
// router.post("/logout");
// router.post("/refresh-token");
// router.post("/forgot-password");
// router.post("/reset-password/:token");
// router.post("/change-password");
// router.put("/update-profile");
// router.post("/confirm-password");
// router.get("/me");

export default router;
