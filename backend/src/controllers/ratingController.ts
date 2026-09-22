import { Request, Response } from 'express';
import { Rating } from '../models/Rating';
import { Doctor } from '../models/Doctor';
import { Ambulance } from '../models/Ambulance';
import { AuthRequest } from '../middleware/auth';
import { isMongoConnected } from '../config/db';
import { memoryStore } from '../config/mockStore';

// Create a new rating / review
export const createRating = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetType, targetId, bookingId, appointmentId, rating, comment } = req.body;
    const u = req.user;

    if (!isMongoConnected()) {
      const newReview = {
        _id: `rate_${Date.now()}`,
        reviewerId: { _id: u?._id || u?.id, name: u?.name || 'User' },
        targetType,
        targetId,
        bookingId,
        appointmentId,
        rating: Number(rating),
        comment: comment || '',
        createdAt: new Date().toISOString(),
      };

      memoryStore.ratings.push(newReview);
      res.status(201).json({
        success: true,
        message: 'Thank you for your feedback! Rating submitted successfully.',
        review: newReview,
        newAverageRating: Number(rating),
      });
      return;
    }

    const review = await Rating.create({
      reviewerId: req.user._id,
      targetType,
      targetId,
      bookingId: bookingId || undefined,
      appointmentId: appointmentId || undefined,
      rating: Number(rating),
      comment: comment || '',
    });

    const allRatings = await Rating.find({ targetId, targetType });
    const totalScore = allRatings.reduce((acc, curr) => acc + curr.rating, 0);
    const avg = Math.round((totalScore / allRatings.length) * 10) / 10;

    if (targetType === 'DOCTOR') {
      await Doctor.findByIdAndUpdate(targetId, {
        averageRating: avg,
        reviewCount: allRatings.length,
      });
    } else if (targetType === 'DRIVER') {
      await Ambulance.findOneAndUpdate(
        { driverId: targetId },
        { averageRating: avg }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! Rating submitted successfully.',
      review,
      newAverageRating: avg,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to submit rating' });
  }
};

// Get reviews for a Doctor or Driver
export const getTargetRatings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { targetType, targetId } = req.params;

    if (!isMongoConnected()) {
      const list = memoryStore.ratings.filter((r) => r.targetId === targetId);
      res.json({ success: true, count: list.length, reviews: list });
      return;
    }

    const reviews = await Rating.find({ targetType: targetType.toUpperCase(), targetId })
      .populate('reviewerId', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: reviews.length, reviews });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch reviews' });
  }
};
