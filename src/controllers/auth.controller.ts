import { Request, Response, NextFunction } from "express";
import { RegisterUserDto, ResendVerificationCodeDto, VerifyAccountDto } from "../dtos/user.dto";
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
}
