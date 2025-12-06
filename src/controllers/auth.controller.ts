import { Request, Response, NextFunction } from "express";
import {
    ForgotPasswordDto,
    RegisterUserDto,
    ResendVerificationCodeDto,
    ResetPasswordDto,
    VerifyAccountDto,
} from "../dtos/user.dto";
import { AuthService } from "../services/auth.service";

export class AuthController {
    static register = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userData: RegisterUserDto = req.body;
            const result = await AuthService.register(userData, req.t);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    };

    static verifyAccount = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const verifyAccountData: VerifyAccountDto = req.body;
            const result = await AuthService.verifyAccount(verifyAccountData, req.t);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static resendVerificationCode = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const resendData: ResendVerificationCodeDto = req.body;
            const result = await AuthService.resendVerificationCode(resendData, req.t);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userData: ForgotPasswordDto = req.body;
            const result = await AuthService.forgotPassword(userData, req.t);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static resetPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { token } = req.params;
            const resetData: ResetPasswordDto = req.body;
            const result = await AuthService.resetPassword(token as string, resetData, req.t);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static validateResetToken = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { token } = req.params;
            const result = await AuthService.validateResetToken(token as string, req.t);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}
