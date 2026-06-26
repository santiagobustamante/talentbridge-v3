export const Events = {
  MESSAGE_SENT: 'chat:message',
  MESSAGE_READ: 'chat:read',
  UNREAD_COUNT_CHANGED: 'chat:unread-count',
  CONVERSATION_UPDATED: 'chat:conversation-updated',
  APPLICATION_STATUS_CHANGED: 'application:status-changed',
  NEW_APPLICATION: 'application:new',
  JOB_PUBLISHED: 'job:published',
  JOB_CLOSED: 'job:closed',
  PROFILE_VIEWED: 'profile:viewed',
  NOTIFICATION_CREATED: 'notification:created',
} as const;

export interface ChatMessagePayload {
  conversationId: number;
  senderId: number;
  body: string;
  createdAt: string;
}

export interface ApplicationStatusPayload {
  applicationId: number;
  jobOfferId: number;
  candidateId: number;
  status: string;
}

export interface JobEventPayload {
  jobOfferId: number;
  companyId: number;
  title: string;
}

export interface NotificationPayload {
  userId: number;
  type: string;
  title: string;
  body: string;
  referenceId?: number;
}
