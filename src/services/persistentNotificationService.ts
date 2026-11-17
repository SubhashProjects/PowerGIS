import { notificationRepository, PersistentNotification } from '../repositories/domain/NotificationRepository';

export const persistentNotificationService = {
  async list(userId: string): Promise<PersistentNotification[]> { return notificationRepository.listForUser(userId); },
  async markRead(id: string): Promise<void> { return notificationRepository.markRead(id); },
  async markAllRead(userId: string): Promise<void> { return notificationRepository.markAllRead(userId); },
};
