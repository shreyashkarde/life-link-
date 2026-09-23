import express from 'express';
import { getNearbyHospitals } from './hospitalController';

const hospitalRouter = express.Router();

// GET /api/hospitals/nearby
hospitalRouter.get('/nearby', getNearbyHospitals);

export default hospitalRouter;
