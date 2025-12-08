import { Request, Response, NextFunction } from "express";
import { GetPropertiesQueryDto } from "../dtos/property.dto";
import { PropertiesService } from "../services/properties.service";

export class PropertiesController {
    static getAllProperties = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const query: GetPropertiesQueryDto = req.query;
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
}
