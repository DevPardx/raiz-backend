import { Repository } from "typeorm";
import { TFunction } from "i18next";
import { Messages } from "../entities/Messages.entity";
import { Conversation } from "../entities/Conversation.entity";
import { SendMessageDto } from "../dtos/conversation.dto";
import { NotFoundError, ForbiddenError } from "../handler/error.handler";
import { AppDataSource } from "../config/typeorm.config";
import { MessageType, MessageStatus } from "../enums";
import { uploadImage } from "../utils/cloudinary.util";

export class MessagesService {
    private static getMessagesRepository(): Repository<Messages> {
        return AppDataSource.getRepository(Messages);
    }

    private static getConversationRepository(): Repository<Conversation> {
        return AppDataSource.getRepository(Conversation);
    }

    static sendMessage = async (
        userId: string,
        conversationId: string,
        data: SendMessageDto,
        t: TFunction,
    ) => {
        const { type, content, imageUrl } = data;

        const conversation = await this.getConversationRepository().findOne({
            where: { id: conversationId },
        });

        if (!conversation) {
            throw new NotFoundError(t("conversation_not_found"));
        }

        if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
            throw new ForbiddenError(t("invalid_participant"));
        }

        let uploadedImageUrl = imageUrl;
        if (type === MessageType.IMAGE && imageUrl) {
            try {
                const result = await uploadImage(imageUrl, "chat-images");
                uploadedImageUrl = result.url;
            } catch {
                uploadedImageUrl = imageUrl;
            }
        }

        const message = this.getMessagesRepository().create({
            conversationId,
            senderId: userId,
            type,
            content,
            imageUrl: uploadedImageUrl,
            status: MessageStatus.SENT,
            isRead: false,
        });

        const savedMessage = await this.getMessagesRepository().save(message);

        conversation.lastMessage = type === MessageType.TEXT ? content : "Image";
        conversation.lastMessageAt = new Date();

        if (conversation.buyerId === userId) {
            conversation.sellerUnreadCount += 1;
        } else {
            conversation.buyerUnreadCount += 1;
        }

        await this.getConversationRepository().save(conversation);

        const fullMessage = await this.getMessagesRepository().findOne({
            where: { id: savedMessage.id },
            relations: ["sender"],
        });

        return fullMessage;
    };

    static updateMessageStatus = async (messageId: string, status: MessageStatus, t: TFunction) => {
        const message = await this.getMessagesRepository().findOne({
            where: { id: messageId },
        });

        if (!message) {
            throw new NotFoundError(t("conversation_not_found"));
        }

        message.status = status;

        if (status === MessageStatus.READ && !message.readAt) {
            message.isRead = true;
            message.readAt = new Date();
        }

        await this.getMessagesRepository().save(message);

        return message;
    };
}
