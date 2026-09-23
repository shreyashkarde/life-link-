import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Store in memory buffer for instant streaming and parsing
const storage = multer.memoryStorage();

// File filter strictly for Excel spreadsheets (.xlsx, .xls)
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream',
    'application/zip',
  ];

  const hasExcelExtension = file.originalname.match(/\.(xlsx|xls)$/i);

  if (allowedMimes.includes(file.mimetype) || hasExcelExtension) {
    callback(null, true);
  } else {
    callback(new Error('Invalid file type. Please upload a valid Excel (.xlsx or .xls) file.'));
  }
};

export const excelUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB Max File Size
    files: 1,
  },
});

// Friendly Multer error handler wrapper middleware
export const handleUploadError = (
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum allowed file size is 10MB.',
      });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};
