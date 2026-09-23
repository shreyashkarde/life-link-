import express from 'express';
import { submitRating, getRatingsForTarget } from '../controllers/ratingController';
import { authenticate } from '../middleware/auth';

const ratingRouter = express.Router();

ratingRouter.post('/submit', authenticate, submitRating);
ratingRouter.get('/:targetType/:targetId', getRatingsForTarget);

export default ratingRouter;
