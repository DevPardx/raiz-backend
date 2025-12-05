import { Request, Response, NextFunction } from "express";
import { RegisterUserDto } from "../dtos/user.dto";
import { AuthService } from "../services/auth.service";

export class AuthController {
  static register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userData: RegisterUserDto = req.body;
      const result = await AuthService.register(userData);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };
}
