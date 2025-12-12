import { Request, Response, NextFunction } from "express";
import {
    CreateConversationDto,
    GetConversationsQueryDto,
    GetMessagesQueryDto,
    SendMessageDto,
} from "../dtos/conversation.dto";
import { ConversationsService } from "../services/conversations.service";
import { MessagesService } from "../services/messages.service";

export class ConversationsController {
    static createConversation = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const data: CreateConversationDto = req.body;
            const result = await ConversationsService.createConversation(userId, data, req.t);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    };

    static getUserConversations = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const query = req.query as unknown as GetConversationsQueryDto;
            const result = await ConversationsService.getUserConversations(userId, query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static getConversationById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const result = await ConversationsService.getConversationById(
                userId,
                id as string,
                req.t,
            );
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static getConversationMessages = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const query = req.query as unknown as GetMessagesQueryDto;
            const result = await ConversationsService.getConversationMessages(
                userId,
                id as string,
                query,
                req.t,
            );
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    static sendMessage = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const data: SendMessageDto = req.body;
            const result = await MessagesService.sendMessage(userId, id as string, data, req.t);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    };

    static markAsRead = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const result = await ConversationsService.markMessagesAsRead(
                userId,
                id as string,
                req.t,
            );
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}
