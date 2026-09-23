import { Request, Response } from 'express';
import { Rating } from '../models/Rating';
import { Doctor } from '../models/Doctor';
import { Ambulance } from '../models/Ambulance';
import { prescriptoStore } from '../config/prescriptoStore';
import { isMongoConnected } from '../config/db';
import { AuthRequest } from '../middleware/auth';

// POST /api/ratings/submit
export const submitRating = async (req: AuthRequest, res: Response) => {
  try {
    const { targetType, targetId, rating, review } = req.body;
    const userId = req.user?.id || 'user_1';
    const userName = req.body.userName || req.user?.email?.split('@')[0] || 'Patient';

    if (!targetType || !targetId || !rating) {
      return res.status(400).json({ success: false, message: 'targetType, targetId, and rating (1-5) required' });
    }

    const ratingNum = Math.min(5, Math.max(1, Number(rating)));

    const ratingData = {
      userId,
      userName,
      targetType: targetType.toUpperCase() as 'DOCTOR' | 'DRIVER',
      targetId,
      rating: ratingNum,
      review: review || '',
    };

    if (isMongoConnected()) {
      const saved = await Rating.create(ratingData);

      // Re-calculate dynamic average
      const allReviews = await Rating.find({ targetType: ratingData.targetType, targetId });
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      const roundedAvg = Math.round(avg * 10) / 10;

      if (ratingData.targetType === 'DRIVER') {
        await Ambulance.findByIdAndUpdate(targetId, { rating: roundedAvg, reviewCount: allReviews.length });
      }

      return res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        rating: saved,
        newAverage: roundedAvg,
        totalReviews: allReviews.length,
      });
    }

    // In-memory fallback
    const saved = {
      _id: 'rate_' + Date.now(),
      ...ratingData,
      createdAt: new Date().toISOString(),
    };
    prescriptoStore.ratings.unshift(saved);

    const targetReviews = prescriptoStore.ratings.filter(
      (r) => r.targetType === ratingData.targetType && r.targetId === targetId
    );
    const avg = targetReviews.reduce((sum, r) => sum + r.rating, 0) / targetReviews.length;
    const roundedAvg = Math.round(avg * 10) / 10;

    if (ratingData.targetType === 'DRIVER') {
      const amb = prescriptoStore.ambulances?.find((a) => a._id === targetId || a._id === 'amb_108');
      if (amb) {
        amb.rating = roundedAvg;
        amb.reviewCount = targetReviews.length;
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      rating: saved,
      newAverage: roundedAvg,
      totalReviews: targetReviews.length,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/ratings/:targetType/:targetId
export const getRatingsForTarget = async (req: Request, res: Response) => {
  try {
    const { targetType, targetId } = req.params;
    const normalizedType = targetType.toUpperCase();

    if (isMongoConnected()) {
      const reviews = await Rating.find({ targetType: normalizedType, targetId }).sort({ createdAt: -1 });
      const avg = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 5.0;
      return res.json({
        success: true,
        targetType: normalizedType,
        targetId,
        averageRating: Math.round(avg * 10) / 10,
        totalReviews: reviews.length,
        reviews,
      });
    }

    const reviews = prescriptoStore.ratings.filter(
      (r) => r.targetType === normalizedType && (r.targetId === targetId || targetId === 'all')
    );
    const avg = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 4.9;

    return res.json({
      success: true,
      targetType: normalizedType,
      targetId,
      averageRating: Math.round(avg * 10) / 10,
      totalReviews: reviews.length,
      reviews,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
