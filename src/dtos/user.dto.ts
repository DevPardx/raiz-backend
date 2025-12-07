import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsNotEmpty } from "class-validator";
import { UserRole } from "../enums";

export class RegisterUserDto {
    @IsEmail({}, { message: "validation:email_invalid" })
    email: string;

    @IsString({ message: "validation:name_must_be_string" })
    @MinLength(2, { message: "validation:name_min_length" })
    name: string;

    @IsString({ message: "validation:password_must_be_string" })
    @MinLength(8, { message: "validation:password_min_length" })
    password: string;

    @IsEnum(UserRole, { message: "validation:role_invalid" })
    role: UserRole;
}

export class VerifyAccountDto {
    @IsString({ message: "validation:verification_code_required" })
    token: string;
}

export class ResendVerificationCodeDto {
    @IsEmail({}, { message: "validation:email_invalid" })
    email: string;
}

export class ForgotPasswordDto {
    @IsEmail({}, { message: "validation:email_invalid" })
    email: string;
}

export class ResetPasswordDto {
    @IsString({ message: "validation:password_must_be_string" })
    @MinLength(8, { message: "validation:password_min_length" })
    newPassword: string;
}

export class LoginUserDto {
    @IsEmail({}, { message: "validation:email_invalid" })
    @IsNotEmpty({ message: "validation:email_required" })
    email: string;

    @IsString({ message: "validation:password_required" })
    @IsNotEmpty({ message: "validation:password_required" })
    password: string;
}

export class ChangePasswordDto {
    @IsString({ message: "validation:current_password_required" })
    @IsNotEmpty({ message: "validation:current_password_required" })
    currentPassword: string;

    @IsString({ message: "validation:password_must_be_string" })
    @MinLength(8, { message: "validation:password_min_length" })
    newPassword: string;
}

export class ConfirmPasswordDto {
    @IsString({ message: "validation:current_password_required" })
    @IsNotEmpty({ message: "validation:current_password_required" })
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
