import apiClient from './apiClient';

export interface GoogleHospital {
  place_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  location: {
    lat: number;
    lng: number;
  };
  rating: number;
  user_ratings_total: number;
  open_now: boolean;
  icon?: string;
  distanceKm: number;
  estimatedDriveMinutes?: number;
  types?: string[];
  business_status?: string;
  googleMapsUrl?: string;
}

export interface GoogleNearbyHospitalsResponse {
  success: boolean;
  source: string;
  userLocation: {
    lat: number;
    lng: number;
  };
  radius: number;
  totalFound: number;
  hospitals: GoogleHospital[];
  timestamp?: string;
  message?: string;
}

export const fetchGoogleNearbyHospitals = async (
  lat: number,
  lng: number,
  radius: number = 5000,
  keyword: string = ''
): Promise<GoogleNearbyHospitalsResponse> => {
  try {
    const response = await apiClient.get<GoogleNearbyHospitalsResponse>('/api/hospitals/nearby-google', {
      params: {
        lat,
        lng,
        radius,
        keyword: keyword || undefined,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching Google nearby hospitals:', error);
    throw error;
  }
};

export default {
  fetchGoogleNearbyHospitals,
};
