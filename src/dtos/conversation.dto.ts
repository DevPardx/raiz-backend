import { IsOptional, IsInt, Min, Max, IsNotEmpty, IsEnum, IsString } from "class-validator";
import { Type } from "class-transformer";
import { MessageType } from "../enums";

export class CreateConversationDto {
    @IsNotEmpty()
    @IsString()
    propertyId!: string;

    @IsNotEmpty()
    @IsString()
    sellerId!: string;
}

export class GetConversationsQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}

export class GetMessagesQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 50;
}

export class SendMessageDto {
    @IsNotEmpty()
    @IsEnum(MessageType)
    type!: MessageType;

    @IsNotEmpty()
    @IsString()
    content!: string;

    @IsOptional()
    @IsString()
    imageUrl?: string;
}
