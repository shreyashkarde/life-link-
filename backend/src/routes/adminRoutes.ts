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

adminRouter.post('/login', loginAdmin);
adminRouter.post('/add-doctor', authAdmin, addDoctor);
adminRouter.post('/upload-doctors', excelUpload.single('file'), handleUploadError, uploadDoctorsExcel);
adminRouter.post('/upload-hospitals', excelUpload.single('file'), handleUploadError, uploadHospitalsExcel);
adminRouter.post('/all-doctors', authAdmin, allDoctors);
adminRouter.get('/all-doctors', authAdmin, allDoctors);
adminRouter.post('/change-availability', authAdmin, changeAvailability);
adminRouter.post('/change-availablity', authAdmin, changeAvailability);
adminRouter.get('/appointments', authAdmin, appointmentsAdmin);
adminRouter.post('/cancel-appointment', authAdmin, appointmentCancel);
adminRouter.get('/dashboard', authAdmin, adminDashboard);
adminRouter.post('/clear-all-data', clearAllData);
adminRouter.get('/clear-all-data', clearAllData);

export default adminRouter;
