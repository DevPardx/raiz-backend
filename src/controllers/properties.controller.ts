import { Request, Response, NextFunction } from "express";
import {
    GetPropertiesQueryDto,
    MapBoundsQueryDto,
    SearchPropertiesQueryDto,
    GetFeaturedPropertiesQueryDto,
    GetMyPropertiesQueryDto,
    CreatePropertyDto,
    UpdatePropertyDto,
    UpdatePropertyStatusDto,
} from "../dtos/property.dto";
import { PropertiesService } from "../services/properties.service";

export class PropertiesController {
    static getAllProperties = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const query = req.query as unknown as GetPropertiesQueryDto;
            const result = await PropertiesService.getAllProperties(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static getPropertyById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const result = await PropertiesService.getPropertyById(id as string, req.t);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static getPropertiesInBounds = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const query = req.query as unknown as MapBoundsQueryDto;
            const result = await PropertiesService.getPropertiesInBounds(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static searchProperties = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const query = req.query as unknown as SearchPropertiesQueryDto;
            const result = await PropertiesService.searchProperties(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static getFeaturedProperties = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const query = req.query as unknown as GetFeaturedPropertiesQueryDto;
            const result = await PropertiesService.getFeaturedProperties(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static getMyProperties = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const query = req.query as unknown as GetMyPropertiesQueryDto;
            const userId = req.user!.id;
            const result = await PropertiesService.getMyProperties(userId, query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static createProperty = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const propertyData: CreatePropertyDto = req.body;
            const userId = req.user!.id;
            const result = await PropertiesService.createProperty(userId, propertyData, req.t);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    };

    static updateProperty = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const propertyData: UpdatePropertyDto = req.body;
            const userId = req.user!.id;
            const result = await PropertiesService.updateProperty(
                userId,
                id as string,
                propertyData,
                req.t,
            );
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static deleteProperty = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const userId = req.user!.id;
            const result = await PropertiesService.deleteProperty(userId, id as string, req.t);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static updatePropertyStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const statusData: UpdatePropertyStatusDto = req.body;
            const userId = req.user!.id;
            const result = await PropertiesService.updatePropertyStatus(
                userId,
                id as string,
                statusData,
                req.t,
            );
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static getPropertyStats = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const userId = req.user!.id;
            const result = await PropertiesService.getPropertyStats(userId, id as string, req.t);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}
