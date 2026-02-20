import express from 'express';

import userRoutes from '@routes/userRoutes';
import announcementRoutes from '@routes/announcementRoutes';
import postRoutes from '@routes/postRoutes';
import fcmRoutes from '@routes/fcmRoutes';
import whiteListRoutes from '@routes/whiteListRoutes';
import messageRoutes from '@routes/messageRoutes';
import missionRoutes from '@routes/missionRoutes';
import blockUserRoutes from '@routes/blockedUserRoutes';

const router = express.Router();

router.use('/users', userRoutes);
router.use('/announcements', announcementRoutes);
router.use('/posts', postRoutes);
router.use('/fcm', fcmRoutes);
router.use('/white-list', whiteListRoutes);
router.use('/messages', messageRoutes);
router.use('/missions', missionRoutes);
router.use('/blocked-users', blockUserRoutes);

export default router;
