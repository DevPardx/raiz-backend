import { Request, Response, NextFunction } from "express";
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

    static login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userData: LoginUserDto = req.body;
            const result = await AuthService.login(userData, req.t);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static logout = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const logoutData: LogoutDto = req.body;
            const result = await AuthService.logout(logoutData.refreshToken, req.t);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static refreshToken = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { refreshToken } = req.body;
            const result = await AuthService.refreshToken(refreshToken, req.t);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static changePassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const changePasswordData: ChangePasswordDto = req.body;
            const userId = req.user!.id;
            const result = await AuthService.changePassword(userId, changePasswordData, req.t);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static confirmPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const confirmPasswordData: ConfirmPasswordDto = req.body;
            const userId = req.user!.id;
            const result = await AuthService.confirmPassword(userId, confirmPasswordData, req.t);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static updateUser = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const updateUserData: UpdateUserDto = req.body;
            const userId = req.user!.id;
            const result = await AuthService.updateUser(userId, updateUserData, req.t);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static getUser = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const result = await AuthService.getUser(userId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}
