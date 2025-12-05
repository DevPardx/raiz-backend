import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from "class-validator";
import { UserRole } from "../enums";

export class RegisterUserDto {
  @IsEmail({}, { message: "validation:email_invalid" })
  email: string;

  @IsString({ message: "validation:name_must_be_string" })
  @MinLength(2, { message: "validation:name_min_length" })
  name: string;

  @IsString({ message: "validation:password_must_be_string" })
  @MinLength(6, { message: "validation:password_min_length" })
  password: string;

  @IsEnum(UserRole, { message: "validation:role_invalid" })
  role: UserRole;
}

export class LoginUserDto {
  @IsEmail({}, { message: "validation:email_invalid" })
  email: string;

  @IsString({ message: "validation:password_required" })
  password: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: "validation:name_must_be_string" })
  @MinLength(2, { message: "validation:name_min_length" })
  name?: string;

  @IsOptional()
  @IsString({ message: "validation:profile_picture_invalid" })
  profilePicture?: string;
}
