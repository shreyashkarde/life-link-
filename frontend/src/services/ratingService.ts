import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const getHeaders = () => {
  const token = localStorage.getItem('token') || '';
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      token,
    },
  };
};

export const ratingService = {
  submitRating: async (payload: {
    targetType: 'DOCTOR' | 'DRIVER';
    targetId: string;
    rating: number;
    review?: string;
    userName?: string;
  }) => {
    const { data } = await axios.post(`${BACKEND_URL}/api/ratings/submit`, payload, getHeaders());
    return data;
  },

  getRatings: async (targetType: 'DOCTOR' | 'DRIVER', targetId: string) => {
    const { data } = await axios.get(`${BACKEND_URL}/api/ratings/${targetType}/${targetId}`);
    return data;
  },
};

export default ratingService;
