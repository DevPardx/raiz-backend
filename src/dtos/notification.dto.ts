import { IsNotEmpty, IsString, IsObject, ValidateNested, IsOptional } from "class-validator";
import { Type } from "class-transformer";

class PushSubscriptionKeysDto {
    @IsString()
    @IsNotEmpty()
    p256dh!: string;

    @IsString()
    @IsNotEmpty()
    auth!: string;
}

export class SubscribePushNotificationDto {
    @IsString()
    @IsNotEmpty()
    endpoint!: string;

    @IsObject()
    @ValidateNested()
    @Type(() => PushSubscriptionKeysDto)
    keys!: PushSubscriptionKeysDto;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export class SendNotificationDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsNotEmpty()
    body!: string;

    @IsString()
    @IsOptional()
    icon?: string;

    @IsString()
    @IsOptional()
    badge?: string;

    @IsString()
    @IsOptional()
    tag?: string;

    @IsObject()
    @IsOptional()
    data?: Record<string, any>;
}
