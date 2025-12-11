import {
    IsEnum,
    IsOptional,
    IsNumber,
    IsString,
    Min,
    Max,
    IsIn,
    IsNotEmpty,
    MinLength,
    IsLatitude,
    IsLongitude,
} from "class-validator";
import { Type } from "class-transformer";
import { PropertyType, PropertyStatus } from "../enums";

export class GetPropertiesQueryDto {
    @IsOptional()
    @IsEnum(PropertyType, { message: "validation:property_type_invalid" })
    propertyType?: PropertyType;

    @IsOptional()
    @IsEnum(PropertyStatus, { message: "validation:property_status_invalid" })
    status?: PropertyStatus;

    @IsOptional()
    @IsString({ message: "validation:department_must_be_string" })
    department?: string;

    @IsOptional()
    @IsString({ message: "validation:municipality_must_be_string" })
    municipality?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:min_price_must_be_number" })
    @Min(0, { message: "validation:min_price_min_value" })
    minPrice?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:max_price_must_be_number" })
    @Min(0, { message: "validation:max_price_min_value" })
    maxPrice?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:bedrooms_must_be_number" })
    @Min(0, { message: "validation:bedrooms_min_value" })
    bedrooms?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:bathrooms_must_be_number" })
    @Min(0, { message: "validation:bathrooms_min_value" })
    bathrooms?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:min_area_must_be_number" })
    @Min(0, { message: "validation:min_area_min_value" })
    minArea?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:max_area_must_be_number" })
    @Min(0, { message: "validation:max_area_min_value" })
    maxArea?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:page_must_be_number" })
    @Min(1, { message: "validation:page_min_value" })
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:limit_must_be_number" })
    @Min(1, { message: "validation:limit_min_value" })
    @Max(100, { message: "validation:limit_max_value" })
    limit?: number = 20;

    @IsOptional()
    @IsIn(["price", "createdAt", "updatedAt", "areaSqm", "bedrooms", "bathrooms"], {
        message: "validation:sort_by_invalid",
    })
    sortBy?: string = "createdAt";

    @IsOptional()
    @IsIn(["ASC", "DESC"], { message: "validation:sort_order_invalid" })
    sortOrder?: "ASC" | "DESC" = "DESC";
}

export class MapBoundsQueryDto {
    @Type(() => Number)
    @IsNumber({}, { message: "validation:ne_lat_must_be_number" })
    @IsLatitude({ message: "validation:ne_lat_invalid" })
    neLat!: number;

    @Type(() => Number)
    @IsNumber({}, { message: "validation:ne_lng_must_be_number" })
    @IsLongitude({ message: "validation:ne_lng_invalid" })
    neLng!: number;

    @Type(() => Number)
    @IsNumber({}, { message: "validation:sw_lat_must_be_number" })
    @IsLatitude({ message: "validation:sw_lat_invalid" })
    swLat!: number;

    @Type(() => Number)
    @IsNumber({}, { message: "validation:sw_lng_must_be_number" })
    @IsLongitude({ message: "validation:sw_lng_invalid" })
    swLng!: number;

    @IsOptional()
    @IsEnum(PropertyType, { message: "validation:property_type_invalid" })
    propertyType?: PropertyType;

    @IsOptional()
    @IsEnum(PropertyStatus, { message: "validation:property_status_invalid" })
    status?: PropertyStatus;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:min_price_must_be_number" })
    @Min(0, { message: "validation:min_price_min_value" })
    minPrice?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:max_price_must_be_number" })
    @Min(0, { message: "validation:max_price_min_value" })
    maxPrice?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:bedrooms_must_be_number" })
    @Min(0, { message: "validation:bedrooms_min_value" })
    bedrooms?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:bathrooms_must_be_number" })
    @Min(0, { message: "validation:bathrooms_min_value" })
    bathrooms?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:limit_must_be_number" })
    @Min(1, { message: "validation:limit_min_value" })
    @Max(500, { message: "validation:map_limit_max_value" })
    limit?: number = 100;
}

export class SearchPropertiesQueryDto {
    @IsNotEmpty({ message: "validation:search_query_required" })
    @IsString({ message: "validation:search_query_must_be_string" })
    @MinLength(2, { message: "validation:search_query_min_length" })
    q!: string;

    @IsOptional()
    @IsEnum(PropertyType, { message: "validation:property_type_invalid" })
    propertyType?: PropertyType;

    @IsOptional()
    @IsEnum(PropertyStatus, { message: "validation:property_status_invalid" })
    status?: PropertyStatus;

    @IsOptional()
    @IsString({ message: "validation:department_must_be_string" })
    department?: string;

    @IsOptional()
    @IsString({ message: "validation:municipality_must_be_string" })
    municipality?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:min_price_must_be_number" })
    @Min(0, { message: "validation:min_price_min_value" })
    minPrice?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:max_price_must_be_number" })
    @Min(0, { message: "validation:max_price_min_value" })
    maxPrice?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:bedrooms_must_be_number" })
    @Min(0, { message: "validation:bedrooms_min_value" })
    bedrooms?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:bathrooms_must_be_number" })
    @Min(0, { message: "validation:bathrooms_min_value" })
    bathrooms?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:page_must_be_number" })
    @Min(1, { message: "validation:page_min_value" })
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:limit_must_be_number" })
    @Min(1, { message: "validation:limit_min_value" })
    @Max(100, { message: "validation:limit_max_value" })
    limit?: number = 20;

    @IsOptional()
    @IsIn(["price", "createdAt", "updatedAt", "areaSqm", "bedrooms", "bathrooms"], {
        message: "validation:sort_by_invalid",
    })
    sortBy?: string = "createdAt";

    @IsOptional()
    @IsIn(["ASC", "DESC"], { message: "validation:sort_order_invalid" })
    sortOrder?: "ASC" | "DESC" = "DESC";
}

export class GetFeaturedPropertiesQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:page_must_be_number" })
    @Min(1, { message: "validation:page_min_value" })
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:limit_must_be_number" })
    @Min(1, { message: "validation:limit_min_value" })
    @Max(100, { message: "validation:limit_max_value" })
    limit?: number = 20;
}

export class GetMyPropertiesQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:page_must_be_number" })
    @Min(1, { message: "validation:page_min_value" })
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "validation:limit_must_be_number" })
    @Min(1, { message: "validation:limit_min_value" })
    @Max(100, { message: "validation:limit_max_value" })
    limit?: number = 20;
}

export class CreatePropertyDto {
    @IsNotEmpty({ message: "validation:title_required" })
    @IsString({ message: "validation:title_must_be_string" })
    @MinLength(3, { message: "validation:title_min_length" })
    title!: string;

    @IsNotEmpty({ message: "validation:description_required" })
    @IsString({ message: "validation:description_must_be_string" })
    @MinLength(10, { message: "validation:description_min_length" })
    description!: string;

    @IsNotEmpty({ message: "validation:price_required" })
    @Type(() => Number)
    @IsNumber({}, { message: "validation:price_must_be_number" })
    @Min(0, { message: "validation:price_min_value" })
    price!: number;

    @IsNotEmpty({ message: "validation:property_type_required" })
    @IsEnum(PropertyType, { message: "validation:property_type_invalid" })
    propertyType!: PropertyType;

    @IsNotEmpty({ message: "validation:address_required" })
    @IsString({ message: "validation:address_must_be_string" })
    address!: string;

    @IsNotEmpty({ message: "validation:department_required" })
    @IsString({ message: "validation:department_must_be_string" })
    department!: string;

    @IsNotEmpty({ message: "validation:municipality_required" })
    @IsString({ message: "validation:municipality_must_be_string" })
    municipality!: string;

    @IsNotEmpty({ message: "validation:latitude_required" })
    @Type(() => Number)
    @IsNumber({}, { message: "validation:latitude_must_be_number" })
    @IsLatitude({ message: "validation:latitude_invalid" })
    latitude!: number;

    @IsNotEmpty({ message: "validation:longitude_required" })
    @Type(() => Number)
    @IsNumber({}, { message: "validation:longitude_must_be_number" })
    @IsLongitude({ message: "validation:longitude_invalid" })
    longitude!: number;

    @IsNotEmpty({ message: "validation:bedrooms_required" })
    @Type(() => Number)
    @IsNumber({}, { message: "validation:bedrooms_must_be_number" })
    @Min(0, { message: "validation:bedrooms_min_value" })
    bedrooms!: number;

    @IsNotEmpty({ message: "validation:bathrooms_required" })
    @Type(() => Number)
    @IsNumber({}, { message: "validation:bathrooms_must_be_number" })
    @Min(0, { message: "validation:bathrooms_min_value" })
    bathrooms!: number;

    @IsNotEmpty({ message: "validation:area_sqm_required" })
    @Type(() => Number)
    @IsNumber({}, { message: "validation:area_sqm_must_be_number" })
    @Min(0, { message: "validation:area_sqm_min_value" })
    areaSqm!: number;
}
