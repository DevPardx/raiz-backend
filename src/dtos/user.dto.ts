import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from "class-validator";
import { UserRole } from "../enums";

export class RegisterUserDto {
  @IsEmail({}, { message: "Email must be valid" })
  email: string;

  @IsString({ message: "Name must be a string" })
  @MinLength(2, { message: "Name must be at least 2 characters long" })
  name: string;

  @IsString({ message: "Password must be a string" })
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  password: string;

  @IsEnum(UserRole, { message: "Role must be buyer or seller" })
  role: UserRole;
}

export class LoginUserDto {
  @IsEmail({}, { message: "Email must be valid" })
  email: string;

  @IsString({ message: "Password is required" })
  password: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: "Name must be a string" })
  @MinLength(2, { message: "Name must be at least 2 characters long" })
  name?: string;

  @IsOptional()
  @IsString({ message: "Profile picture must be a valid URL" })
  profilePicture?: string;
}
