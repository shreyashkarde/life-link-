import express, { Request, Response } from 'express';
import { NotificationService } from './notificationService';

const notificationRouter = express.Router();

// GET /api/notifications
notificationRouter.get('/', (_req: Request, res: Response) => {
  const notifs = NotificationService.getRecentNotifications(25);
  return res.json({
    success: true,
    total: notifs.length,
    notifications: notifs,
  });
});

// POST /api/notifications/trigger
notificationRouter.post('/trigger', (req: Request, res: Response) => {
  const { title, message, type = 'SYSTEM_INFO', targetRole = 'ALL' } = req.body;
  const notif = NotificationService.sendNotification({
    title: title || 'System Update',
    message: message || 'Live notification stream ping received.',
    type,
    targetRole,
  });
  return res.json({ success: true, notification: notif });
});

export default notificationRouter;
