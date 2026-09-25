import express from 'express';
import { getNearbyHospitals } from './hospitalController';
import { getGoogleNearbyHospitals } from '../../controllers/googleNearbyHospitalController';
import { getHybridHospitals } from '../../controllers/hybridHospitalController';

const hospitalRouter = express.Router();

// GET /api/hospitals/hybrid (Database Priority + Google Places)
hospitalRouter.get('/hybrid', getHybridHospitals);

// GET /api/hospitals/nearby-google (Google Places Live GPS Search)
hospitalRouter.get('/nearby-google', getGoogleNearbyHospitals);

// GET /api/hospitals/nearby
hospitalRouter.get('/nearby', getNearbyHospitals);

export default hospitalRouter;
