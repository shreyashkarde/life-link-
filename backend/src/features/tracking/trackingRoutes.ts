import express from 'express';
import { getLiveTracking, updateLiveTracking } from './trackingController';

const trackingRouter = express.Router();

// GET /api/tracking/live
trackingRouter.get('/live', getLiveTracking);

// POST /api/tracking/update
trackingRouter.post('/update', updateLiveTracking);

export default trackingRouter;
