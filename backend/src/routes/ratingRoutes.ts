import { Router } from 'express';
import { createRating, getTargetRatings } from '../controllers/ratingController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.post('/create', authenticateJWT, createRating);
router.get('/:targetType/:targetId', getTargetRatings);

export default router;
