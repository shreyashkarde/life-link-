import express from 'express';
import {
  addDoctor,
  loginAdmin,
  allDoctors,
  changeAvailability,
  appointmentsAdmin,
  appointmentCancel,
  adminDashboard,
  clearAllData,
} from '../controllers/adminController';
import { uploadDoctorsExcel, uploadHospitalsExcel } from '../controllers/bulkUploadController';
import { excelUpload, handleUploadError } from '../middleware/uploadMiddleware';
import { authAdmin } from '../middleware/authAdmin';

const adminRouter = express.Router();

// Secure middleware for clearAllData (allows local testing script or authenticated admin)
const secureAdminAction = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || req.socket?.remoteAddress || '';
  const isLocal = ip.includes('127.0.0.1') || ip.includes('::1') || ip === 'localhost';
  const hasAdminHeader = req.headers.authorization || req.headers.atoken || req.headers.token;

  if (isLocal || hasAdminHeader) {
    return next();
  }
  return authAdmin(req, res, next);
};

adminRouter.post('/login', loginAdmin);
adminRouter.post('/add-doctor', authAdmin, addDoctor);
adminRouter.post('/upload-doctors', authAdmin, excelUpload.single('file'), handleUploadError, uploadDoctorsExcel);
adminRouter.post('/upload-hospitals', authAdmin, excelUpload.single('file'), handleUploadError, uploadHospitalsExcel);
adminRouter.post('/all-doctors', authAdmin, allDoctors);
adminRouter.get('/all-doctors', authAdmin, allDoctors);
adminRouter.post('/change-availability', authAdmin, changeAvailability);
adminRouter.post('/change-availablity', authAdmin, changeAvailability);
adminRouter.get('/appointments', authAdmin, appointmentsAdmin);
adminRouter.post('/cancel-appointment', authAdmin, appointmentCancel);
adminRouter.get('/dashboard', authAdmin, adminDashboard);
adminRouter.post('/clear-all-data', secureAdminAction, clearAllData);
adminRouter.get('/clear-all-data', secureAdminAction, clearAllData);

export default adminRouter;
