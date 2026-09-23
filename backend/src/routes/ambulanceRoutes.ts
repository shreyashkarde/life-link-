import express from 'express';
import {
  getAllAmbulances,
  getNearbyAmbulances,
  toggleDriverDuty,
  updateAmbulanceLocation,
} from '../controllers/ambulanceController';
import { authenticate } from '../middleware/auth';

const ambulanceRouter = express.Router();

ambulanceRouter.get('/all', getAllAmbulances);
ambulanceRouter.get('/nearby', getNearbyAmbulances);
ambulanceRouter.post('/duty-toggle', authenticate, toggleDriverDuty);
ambulanceRouter.put('/location', authenticate, updateAmbulanceLocation);

export default ambulanceRouter;
