import apiClient from './apiClient';

export const ratingService = {
  submitRating: async (payload: {
    targetType: 'DOCTOR' | 'DRIVER';
    targetId: string;
    rating: number;
    review?: string;
    userName?: string;
  }) => {
    const { data } = await apiClient.post(`/api/ratings/submit`, payload);
    return data;
  },

  getRatings: async (targetType: 'DOCTOR' | 'DRIVER', targetId: string) => {
    const { data } = await apiClient.get(`/api/ratings/${targetType}/${targetId}`);
    return data;
  },
};

export default ratingService;
