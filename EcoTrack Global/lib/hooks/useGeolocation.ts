import { useState, useCallback, useEffect, useRef } from 'react';

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

interface AddressComponents {
  street: string | null;
  city: string | null;
  country: string | null;
}

interface LocationCache {
  coordinates?: {
    latitude: string;
    longitude: string;
    accuracy: number;
    timestamp: number;
  };
  addresses?: {
    [key: string]: {
      address: AddressComponents;
      fullAddress: string;
      timestamp: number;
    };
  };
  geoQueries?: {
    [query: string]: {
      latitude: string;
      longitude: string;
      timestamp: number;
    };
  };
}

interface GeolocationState {
  latitude: string | null;
  longitude: string | null;
  accuracy: number | null;
  address: AddressComponents;
  loading: boolean;
  error: string | null;
  isSecureContext: boolean;
}

// Constants
const CACHE_EXPIRATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const NOMINATIM_API_BASE = 'https://nominatim.openstreetmap.org';

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    address: {
      street: null,
      city: null,
      country: null,
    },
    loading: false,
    error: null,
    isSecureContext: false
  });

  // Use ref for cache to persist across renders
  const cacheRef = useRef<LocationCache>({
    coordinates: undefined,
    addresses: {},
    geoQueries: {}
  });

  // Request controller ref to abort previous requests
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Check if running in a secure context (HTTPS or localhost)
    const isSecure = typeof window !== 'undefined' && window.isSecureContext;
    setState(prev => ({ ...prev, isSecureContext: isSecure }));

    if (typeof window !== 'undefined' && !isSecure && window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
      console.warn('Geolocation requires a secure context (HTTPS). Some features may not work.');
    }

    // On component unmount, abort any pending requests
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const getCurrentPosition = useCallback(async (options: GeolocationOptions = {}): Promise<boolean> => {
    // Check if we have a recent cached position
    const cache = cacheRef.current.coordinates;
    const now = Date.now();
    
    if (cache && (now - cache.timestamp < CACHE_EXPIRATION) && !(options.enableHighAccuracy && !cache.accuracy)) {
      setState(prev => ({
        ...prev,
        latitude: cache.latitude,
        longitude: cache.longitude,
        accuracy: cache.accuracy,
        loading: false,
        error: null
      }));
      return true;
    }

    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        loading: false
      }));
      return false;
    }

    // Check for secure context
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
      setState(prev => ({
        ...prev,
        error: "Geolocation requires HTTPS. Please use a secure connection or run the app locally.",
        loading: false
      }));
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Use promise to make the API call easier to work with
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const geoWatchId = navigator.geolocation.watchPosition(
          (position) => {
            // Clear the watch once we get a position
            navigator.geolocation.clearWatch(geoWatchId);
            resolve(position);
          },
          reject,
          {
            enableHighAccuracy: options.enableHighAccuracy ?? true,
            timeout: options.timeout ?? 10000,
            maximumAge: options.maximumAge ?? 0
          }
        );

        // Set a timeout as a fallback in case watchPosition is slow
        setTimeout(() => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: options.enableHighAccuracy ?? true,
              timeout: options.timeout ?? 10000,
              maximumAge: options.maximumAge ?? 0
            }
          );
        }, 1000);
      });

      // Cache the result
      cacheRef.current.coordinates = {
        latitude: position.coords.latitude.toString(),
        longitude: position.coords.longitude.toString(),
        accuracy: position.coords.accuracy,
        timestamp: Date.now()
      };

      setState(prev => ({
        ...prev,
        latitude: position.coords.latitude.toString(),
        longitude: position.coords.longitude.toString(),
        accuracy: position.coords.accuracy,
        loading: false
      }));
      return true;
    } catch (error: any) {
      let errorMessage = "Error getting location";
      
      // Specific error messages
      if (error.code) {
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = window.location.protocol === 'http:' && window.location.hostname !== 'localhost'
              ? "Geolocation requires HTTPS. Please use a secure connection or run the app locally." 
              : "Location permission denied. Please enable location access in your browser settings.";
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = "Your location information is unavailable.";
            break;
          case 3: // TIMEOUT
            errorMessage = "The request to get your location timed out.";
            break;
        }
      }
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
      return false;
    }
  }, []);

  const reverseGeocode = useCallback(async (latitude: string, longitude: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    // Create a cache key from coordinates
    const cacheKey = `${latitude},${longitude}`;
    const cachedResult = cacheRef.current.addresses?.[cacheKey];
    const now = Date.now();

    // Return cached result if valid
    if (cachedResult && (now - cachedResult.timestamp < CACHE_EXPIRATION)) {
      setState(prev => ({
        ...prev,
        address: cachedResult.address,
        loading: false
      }));
      return {
        street: cachedResult.address.street,
        city: cachedResult.address.city,
        country: cachedResult.address.country,
        fullAddress: cachedResult.fullAddress
      };
    }

    // Abort previous requests
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    controllerRef.current = new AbortController();
    
    try {
      const response = await fetch(
        `${NOMINATIM_API_BASE}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'EcoTrackGlobal/1.0',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          signal: controllerRef.current.signal,
          cache: 'no-cache'
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.address) {
        const address = data.address;
        
        // Extract address components with multiple fallbacks
        const street = address.road || address.street || address.pedestrian || 
                       address.path || address.footway || address.address29 || 
                       (address.house_number ? (address.house_number + ' ' + (address.road || '')) : '') || '';
        
        const city = address.city || address.town || address.village || 
                     address.hamlet || address.suburb || address.city_district || 
                     address.district || address.neighbourhood || address.county || '';
        
        const country = address.country || address.country_name || '';
        
        const addressComponents = {
          street,
          city,
          country
        };

        // Cache the result
        if (!cacheRef.current.addresses) {
          cacheRef.current.addresses = {};
        }
        cacheRef.current.addresses[cacheKey] = {
          address: addressComponents,
          fullAddress: data.display_name,
          timestamp: now
        };
        
        setState(prev => ({
          ...prev,
          address: addressComponents,
          loading: false
        }));
        
        return {
          street,
          city,
          country,
          fullAddress: data.display_name
        };
      } else {
        throw new Error("Unable to find address for these coordinates");
      }
    } catch (error) {
      // Don't set error state if the request was aborted
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null;
      }

      const errorMessage = error instanceof Error 
        ? `Could not convert coordinates to address: ${error.message}`
        : "Could not convert coordinates to address";
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
      return null;
    }
  }, []);

  const geocode = useCallback(async (addressQuery: string) => {
    if (!addressQuery.trim()) {
      setState(prev => ({
        ...prev,
        error: "Please provide an address to search",
        loading: false
      }));
      return null;
    }
    
    setState(prev => ({ ...prev, loading: true, error: null }));

    // Check cache
    const cacheKey = addressQuery.trim().toLowerCase();
    const cachedResult = cacheRef.current.geoQueries?.[cacheKey];
    const now = Date.now();

    if (cachedResult && (now - cachedResult.timestamp < CACHE_EXPIRATION)) {
      setState(prev => ({
        ...prev,
        latitude: cachedResult.latitude,
        longitude: cachedResult.longitude,
        loading: false
      }));
      return { 
        latitude: cachedResult.latitude, 
        longitude: cachedResult.longitude 
      };
    }

    // Abort previous requests
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    controllerRef.current = new AbortController();
    
    try {
      const response = await fetch(
        `${NOMINATIM_API_BASE}/search?format=json&q=${encodeURIComponent(addressQuery)}&limit=1`,
        {
          headers: {
            'User-Agent': 'EcoTrackGlobal/1.0',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          signal: controllerRef.current.signal,
          cache: 'no-cache'
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        
        // Cache the result
        if (!cacheRef.current.geoQueries) {
          cacheRef.current.geoQueries = {};
        }
        cacheRef.current.geoQueries[cacheKey] = {
          latitude: lat,
          longitude: lon,
          timestamp: now
        };

        setState(prev => ({
          ...prev,
          latitude: lat,
          longitude: lon,
          loading: false
        }));
        
        return { latitude: lat, longitude: lon };
      } else {
        throw new Error("Address not found");
      }
    } catch (error) {
      // Don't set error state if the request was aborted
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null;
      }

      const errorMessage = error instanceof Error 
        ? `Could not convert address to coordinates: ${error.message}`
        : "Could not convert address to coordinates";
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
      return null;
    }
  }, []);

  const getFullLocation = useCallback(async (options: GeolocationOptions = {}) => {
    const success = await getCurrentPosition(options);
    if (success && state.latitude && state.longitude) {
      await reverseGeocode(state.latitude, state.longitude);
      return true;
    }
    return false;
  }, [getCurrentPosition, reverseGeocode, state.latitude, state.longitude]);

  const clearLocationCache = useCallback(() => {
    cacheRef.current = {
      coordinates: undefined,
      addresses: {},
      geoQueries: {}
    };
  }, []);

  return {
    ...state,
    getCurrentPosition,
    reverseGeocode,
    geocode,
    getFullLocation,
    resetError,
    clearLocationCache
  };
} 