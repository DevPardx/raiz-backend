import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validateDto, validateQuery } from "../middleware/validation.middleware";
import {
    CreateConversationDto,
    GetConversationsQueryDto,
    GetMessagesQueryDto,
    SendMessageDto,
} from "../dtos/conversation.dto";
import { ConversationsController } from "../controllers/conversations.controller";

const router = Router();

router.post(
    "/",
    authenticate,
    validateDto(CreateConversationDto),
    ConversationsController.createConversation,
);

router.get(
    "/",
    authenticate,
    validateQuery(GetConversationsQueryDto),
    ConversationsController.getUserConversations,
);

router.get("/:id", authenticate, ConversationsController.getConversationById);

router.get(
    "/:id/messages",
    authenticate,
    validateQuery(GetMessagesQueryDto),
    ConversationsController.getConversationMessages,
);

router.post(
    "/:id/messages",
    authenticate,
    validateDto(SendMessageDto),
    ConversationsController.sendMessage,
);

router.patch("/:id/read", authenticate, ConversationsController.markAsRead);

export default router;
