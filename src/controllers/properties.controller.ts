import { Request, Response, NextFunction } from "express";
import {
    GetPropertiesQueryDto,
    MapBoundsQueryDto,
    SearchPropertiesQueryDto,
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
}
