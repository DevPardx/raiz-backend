import { Repository } from "typeorm";
import { TFunction } from "i18next";
import { Conversation } from "../entities/Conversation.entity";
import { Property } from "../entities/Property.entity";
import { Messages } from "../entities/Messages.entity";
import {
    CreateConversationDto,
    GetConversationsQueryDto,
    GetMessagesQueryDto,
} from "../dtos/conversation.dto";
import { NotFoundError, ForbiddenError, ConflictError } from "../handler/error.handler";
import { AppDataSource } from "../config/typeorm.config";
import { MessageStatus } from "../enums";

export class ConversationsService {
    private static getConversationRepository(): Repository<Conversation> {
        return AppDataSource.getRepository(Conversation);
    }

    private static getPropertyRepository(): Repository<Property> {
        return AppDataSource.getRepository(Property);
    }

    private static getMessagesRepository(): Repository<Messages> {
        return AppDataSource.getRepository(Messages);
    }

    static createConversation = async (
        userId: string,
        data: CreateConversationDto,
        t: TFunction,
    ) => {
        const { propertyId, sellerId } = data;

        const property = await this.getPropertyRepository().findOne({
            where: { id: propertyId },
        });

        if (!property) {
            throw new NotFoundError(t("property_not_found"));
        }

        if (property.userId === userId) {
            throw new ForbiddenError(t("cannot_message_own_property"));
        }

        if (property.userId !== sellerId) {
            throw new ForbiddenError(t("forbidden"));
        }

        const existingConversation = await this.getConversationRepository().findOne({
            where: {
                propertyId,
                buyerId: userId,
                sellerId,
            },
        });

        if (existingConversation) {
            throw new ConflictError(t("conversation_already_exists"));
        }

        const conversation = this.getConversationRepository().create({
            propertyId,
            buyerId: userId,
            sellerId,
        });

        const savedConversation = await this.getConversationRepository().save(conversation);

        const fullConversation = await this.getConversationRepository().findOne({
            where: { id: savedConversation.id },
            relations: ["buyer", "seller", "property", "property.images"],
        });

        return fullConversation;
    };

    static getUserConversations = async (userId: string, query: GetConversationsQueryDto) => {
        const { page = 1, limit = 20 } = query;

        const queryBuilder = this.getConversationRepository()
            .createQueryBuilder("conversation")
            .leftJoinAndSelect("conversation.buyer", "buyer")
            .leftJoinAndSelect("conversation.seller", "seller")
            .leftJoinAndSelect("conversation.property", "property")
            .leftJoinAndSelect("property.images", "images")
            .where("conversation.buyerId = :userId OR conversation.sellerId = :userId", {
                userId,
            })
            .orderBy("conversation.lastMessageAt", "DESC", "NULLS LAST")
            .addOrderBy("conversation.createdAt", "DESC")
            .skip((page - 1) * limit)
            .take(limit);

        const [conversations, total] = await queryBuilder.getManyAndCount();

        return {
            data: conversations.map((conversation) => ({
                ...conversation,
                unreadCount:
                    conversation.buyerId === userId
                        ? conversation.buyerUnreadCount
                        : conversation.sellerUnreadCount,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    };

    static getConversationById = async (userId: string, conversationId: string, t: TFunction) => {
        const conversation = await this.getConversationRepository().findOne({
            where: { id: conversationId },
            relations: ["buyer", "seller", "property", "property.images"],
        });

        if (!conversation) {
            throw new NotFoundError(t("conversation_not_found"));
        }

        if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
            throw new ForbiddenError(t("invalid_participant"));
        }

        return {
            ...conversation,
            unreadCount:
                conversation.buyerId === userId
                    ? conversation.buyerUnreadCount
                    : conversation.sellerUnreadCount,
        };
    };

    static getConversationMessages = async (
        userId: string,
        conversationId: string,
        query: GetMessagesQueryDto,
        t: TFunction,
    ) => {
        const conversation = await this.getConversationById(userId, conversationId, t);

        const { page = 1, limit = 50 } = query;

        const [messages, total] = await this.getMessagesRepository().findAndCount({
            where: { conversationId },
            relations: ["sender"],
            order: { createdAt: "DESC" },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            data: messages.reverse(),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            conversation,
        };
    };

    static markMessagesAsRead = async (userId: string, conversationId: string, t: TFunction) => {
        const conversation = await this.getConversationRepository().findOne({
            where: { id: conversationId },
        });

        if (!conversation) {
            throw new NotFoundError(t("conversation_not_found"));
        }

        if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
            throw new ForbiddenError(t("invalid_participant"));
        }

        const unreadMessages = await this.getMessagesRepository().find({
            where: {
                conversationId,
                isRead: false,
            },
        });

        const messagesToUpdate = unreadMessages.filter((msg) => msg.senderId !== userId);

        if (messagesToUpdate.length > 0) {
            await this.getMessagesRepository().update(
                messagesToUpdate.map((m) => m.id),
                {
                    isRead: true,
                    readAt: new Date(),
                    status: MessageStatus.READ,
                },
            );

            if (conversation.buyerId === userId) {
                conversation.buyerUnreadCount = 0;
            } else {
                conversation.sellerUnreadCount = 0;
            }

            await this.getConversationRepository().save(conversation);
        }

        return t("messages_marked_as_read");
    };
}
