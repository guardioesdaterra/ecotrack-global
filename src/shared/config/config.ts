/**
 * Application configuration
 */

// API Keys
export const API_KEYS = {
  // Replace this with your actual HERE API key
  HERE_MAPS: process.env.NEXT_PUBLIC_HERE_API_KEY || 'YOUR_HERE_API_KEY_HERE'
};

// API Endpoints
export const API_ENDPOINTS = {
  // HERE Maps API endpoints
  HERE_MAPS: {
    GEOCODE: 'https://geocode.search.hereapi.com/v1/geocode',
    REVERSE_GEOCODE: 'https://revgeocode.search.hereapi.com/v1/revgeocode',
    AUTOSUGGEST: 'https://autosuggest.search.hereapi.com/v1/autosuggest'
  }
};

// Default configuration
export const DEFAULT_CONFIG = {
  // Geolocation options
  GEOLOCATION: {
    ENABLE_HIGH_ACCURACY: true,
    TIMEOUT: 15000,
    MAXIMUM_AGE: 0,
    CACHE_EXPIRATION: 15 * 60 * 1000 // 15 minutes
  }
}; 