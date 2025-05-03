import { useState, useCallback, useEffect, useRef } from 'react';
import { API_KEYS, API_ENDPOINTS, DEFAULT_CONFIG } from '@/lib/config';

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
const CACHE_EXPIRATION = DEFAULT_CONFIG.GEOLOCATION.CACHE_EXPIRATION;
const NOMINATIM_API_BASE = 'https://nominatim.openstreetmap.org';
const HERE_API_KEY = API_KEYS.HERE_MAPS;

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

    if (typeof window !== 'undefined' && !isSecure && window.location.protocol === 'http:') {
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
    
    // Implement a more robust permissions check
    let permissionStatus: PermissionStatus | null = null;
    
    try {
      // First check if Permissions API is available and try to query permission status
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        try {
          permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          console.log(`Initial geolocation permission status: ${permissionStatus.state}`);
          
          // If permission is denied, inform the user
          if (permissionStatus.state === 'denied') {
            setState(prev => ({
              ...prev,
              loading: false,
              error: "Location access was denied. Please enable location permissions in your browser settings."
            }));
            return false;
          }
          
          // If permission is prompt (not yet decided), we need to handle the first-click scenario
          if (permissionStatus.state === 'prompt') {
            console.log("Permission prompt will be shown to user - preparing special handling");
            
            // Make a preliminary permission request to trigger the permission dialog
            // This helps with the first-click issue, as we're explicitly handling the prompt state
            const preRequestPromise = new Promise<void>((resolve) => {
              let handled = false;
              
              // Set a timeout to resolve the promise even if getCurrentPosition doesn't invoke callbacks
              const timeoutId = setTimeout(() => {
                if (!handled) {
                  console.log("Pre-request timed out, continuing with main request");
                  handled = true;
                  resolve();
                }
              }, 500);
              
              // Make a quick position request just to trigger the permission dialog
              navigator.geolocation.getCurrentPosition(
                () => {
                  if (!handled) {
                    console.log("Pre-request succeeded");
                    clearTimeout(timeoutId);
                    handled = true;
                    resolve();
                  }
                },
                () => {
                  if (!handled) {
                    console.log("Pre-request failed");
                    clearTimeout(timeoutId);
                    handled = true;
                    resolve();
                  }
                },
                { timeout: 3000, maximumAge: 0 }
              );
            });
            
            // Wait for the pre-request to complete
            await preRequestPromise;
            
            // Small delay to ensure browser has processed the permission change
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check permission again after the pre-request
            try {
              permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
              console.log(`Updated permission status after pre-request: ${permissionStatus.state}`);
              
              // If permission is denied after pre-request, exit early
              if (permissionStatus.state === 'denied') {
                setState(prev => ({
                  ...prev,
                  loading: false,
                  error: "Location access was denied. Please enable location permissions in your browser settings."
                }));
                return false;
              }
            } catch (err) {
              console.warn("Error checking permission status after pre-request:", err);
            }
          }
        } catch (err) {
          console.warn("Permissions query is not supported, continuing with standard flow:", err);
        }
      }
    } catch (err) {
      console.warn("Error with permissions API:", err);
    }

    // Define max retries and delay between retries
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 3000; // 1 second
    
    // Implement retry logic
    let attempts = 0;
    let success = false;
    let lastError: any = null;

    while (attempts < MAX_RETRIES && !success) {
      try {
        attempts++;
        console.log(`Geolocation attempt ${attempts} of ${MAX_RETRIES}`);
        
        // Use promise to make the API call easier to work with
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          let watchTimeoutId: number | null = null;
          
          // Set a timeout as a failsafe for watchPosition
          const timeoutId = setTimeout(() => {
            if (watchTimeoutId !== null) {
              navigator.geolocation.clearWatch(watchTimeoutId);
              watchTimeoutId = null;
            }
            
            // If timeout occurs, try getCurrentPosition as fallback
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: options.enableHighAccuracy ?? true,
                timeout: options.timeout ?? 10000,
                maximumAge: options.maximumAge ?? 0
              }
            );
          }, 3000);

          // First try with watchPosition for better accuracy
          watchTimeoutId = navigator.geolocation.watchPosition(
            (position) => {
              // Clear the watch and timeout once we get a position
              clearTimeout(timeoutId);
              resolve(position);
            },
            reject,
            {
              enableHighAccuracy: options.enableHighAccuracy ?? true,
              timeout: options.timeout ?? 10000,
              maximumAge: options.maximumAge ?? 0
            }
          );
        });

        // If we get here, we successfully got the position
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
          loading: false,
          error: null
        }));
        
        success = true;
        return true;
      } catch (error: any) {
        lastError = error;
        console.warn(`Geolocation attempt ${attempts} failed:`, error);
        
        // If not on last attempt, wait before retrying
        if (attempts < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }

    // If we get here, all attempts failed
    let errorMessage = "Error getting location after multiple attempts";
    
    // Specific error messages
    if (lastError?.code) {
      switch (lastError.code) {
        case 1: // PERMISSION_DENIED
          errorMessage = window.location.protocol === 'http:' && window.location.hostname !== 'localhost'
            ? "Geolocation requires HTTPS. Please use a secure connection or run the app locally." 
            : "Location permission denied. Please enable location access in your browser settings.";
          break;
        case 2: // POSITION_UNAVAILABLE
          errorMessage = "Your location information is unavailable. Please check your device's GPS or try again later.";
          break;
        case 3: // TIMEOUT
          errorMessage = "The request to get your location timed out. Please check your internet connection and try again.";
          break;
      }
    }
    
    setState(prev => ({
      ...prev,
      error: errorMessage,
      loading: false
    }));
    return false;
  }, []);

  // Check if the internet connection is available
  const checkInternetConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Make a small HEAD request to check connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.openstreetmap.org/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      console.warn('Internet connection check failed:', error);
      setState(prev => ({
        ...prev,
        error: "Unable to connect to the internet. Please check your connection and try again."
      }));
      return false;
    }
  }, []);

  const reverseGeocode = useCallback(async (latitude: string, longitude: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    // First, check internet connection
    const isConnected = await checkInternetConnection();
    if (!isConnected) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: "No internet connection. Please check your connection and try again."
      }));
      return null;
    }

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

    // Define max retries and delay between retries
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    
    // Implement retry logic
    let attempts = 0;
    let lastError: any = null;

    while (attempts < MAX_RETRIES) {
      attempts++;
      console.log(`Reverse geocoding attempt ${attempts} of ${MAX_RETRIES}`);
      
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
        lastError = error;
        
        // Don't retry if the request was aborted intentionally
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('Request aborted');
          break;
        }
        
        console.warn(`Reverse geocoding attempt ${attempts} failed:`, error);
        
        // If not on last attempt, wait before retrying
        if (attempts < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }

    // If we get here, all attempts failed
    const errorMessage = lastError instanceof Error 
      ? `Could not convert coordinates to address: ${lastError.message}`
      : "Could not convert coordinates to address after multiple attempts";
    
    setState(prev => ({
      ...prev,
      error: errorMessage,
      loading: false
    }));
    return null;
  }, []);

  // HERE API for reverse geocoding
  const hereReverseGeocode = useCallback(async (latitude: string, longitude: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    // Create a cache key from coordinates
    const cacheKey = `here-${latitude},${longitude}`;
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
        `${API_ENDPOINTS.HERE_MAPS.REVERSE_GEOCODE}?at=${latitude},${longitude}&lang=en-US&apiKey=${HERE_API_KEY}`,
        {
          headers: {
            'User-Agent': 'EcoTrackGlobal/1.0'
          },
          signal: controllerRef.current.signal
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.items && data.items.length > 0) {
        const item = data.items[0];
        const address = item.address;
        
        // Extract address components
        const street = address.street ? 
          (address.houseNumber ? `${address.houseNumber} ${address.street}` : address.street) : '';
        const city = address.city || address.county || '';
        const country = address.countryName || '';
        
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
          fullAddress: item.title || item.address.label,
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
          fullAddress: item.title || item.address.label
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

    // First, check internet connection
    const isConnected = await checkInternetConnection();
    if (!isConnected) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: "No internet connection. Please check your connection and try again."
      }));
      return null;
    }

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

    // Define max retries and delay between retries
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    
    // Implement retry logic
    let attempts = 0;
    let lastError: any = null;

    while (attempts < MAX_RETRIES) {
      attempts++;
      console.log(`Geocoding attempt ${attempts} of ${MAX_RETRIES}`);
      
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
        lastError = error;
        
        // Don't retry if the request was aborted intentionally
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('Request aborted');
          break;
        }
        
        console.warn(`Geocoding attempt ${attempts} failed:`, error);
        
        // If not on last attempt, wait before retrying
        if (attempts < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }

    // If we get here, all attempts failed
    const errorMessage = lastError instanceof Error 
      ? `Could not convert address to coordinates: ${lastError.message}`
      : "Could not convert address to coordinates after multiple attempts";
    
    setState(prev => ({
      ...prev,
      error: errorMessage,
      loading: false
    }));
    return null;
  }, []);

  // HERE API for forward geocoding
  const hereGeocode = useCallback(async (addressQuery: string) => {
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
    const cacheKey = `here-${addressQuery.trim().toLowerCase()}`;
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
        `${API_ENDPOINTS.HERE_MAPS.GEOCODE}?q=${encodeURIComponent(addressQuery)}&limit=1&apiKey=${HERE_API_KEY}`,
        {
          headers: {
            'User-Agent': 'EcoTrackGlobal/1.0'
          },
          signal: controllerRef.current.signal
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.items && data.items.length > 0) {
        const item = data.items[0];
        const { lat, lng } = item.position;
        
        // Cache the result
        if (!cacheRef.current.geoQueries) {
          cacheRef.current.geoQueries = {};
        }
        cacheRef.current.geoQueries[cacheKey] = {
          latitude: lat.toString(),
          longitude: lng.toString(),
          timestamp: now
        };

        setState(prev => ({
          ...prev,
          latitude: lat.toString(),
          longitude: lng.toString(),
          loading: false
        }));
        
        return { latitude: lat.toString(), longitude: lng.toString() };
      } else {
        throw new Error("No results found for this address");
      }
    } catch (error) {
      // Don't set error state if the request was aborted
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null;
      }

      const errorMessage = error instanceof Error 
        ? `Could not find coordinates for address: ${error.message}`
        : "Could not find coordinates for address";
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
      return null;
    }
  }, []);

  // Utility function to get both location and address in one call
  const getFullLocation = useCallback(async (options: GeolocationOptions & { useHereApi?: boolean } = {}): Promise<boolean> => {
    // First get the coordinates with increased timeout to accommodate retry attempts
    const fullOptions = {
      ...options,
      timeout: options.timeout || 30000, // Default to 30 seconds to allow for retries
    };
    
    console.log("Getting full location with options:", fullOptions);
    
    // Try multiple times to get coordinates if needed
    const MAX_COORD_ATTEMPTS = 2;
    let coordAttempts = 0;
    let coordSuccess = false;
    
    while (coordAttempts < MAX_COORD_ATTEMPTS && !coordSuccess) {
      coordAttempts++;
      console.log(`Attempt ${coordAttempts} to get coordinates`);
      
      coordSuccess = await getCurrentPosition(fullOptions);
      
      if (!coordSuccess && coordAttempts < MAX_COORD_ATTEMPTS) {
        console.log("Waiting before retrying coordinate lookup...");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (coordSuccess && state.latitude && state.longitude) {
      console.log("Successfully got coordinates:", state.latitude, state.longitude);
      
      // Now try to get the address
      try {
        // Try multiple times to reverse geocode if needed
        const MAX_GEOCODE_ATTEMPTS = 2;
        let geocodeAttempts = 0;
        let addressResult = null;
        
        while (geocodeAttempts < MAX_GEOCODE_ATTEMPTS && !addressResult) {
          geocodeAttempts++;
          console.log(`Attempt ${geocodeAttempts} to get address from coordinates`);
          
          if (options.useHereApi) {
            addressResult = await hereReverseGeocode(state.latitude, state.longitude);
          } else {
            addressResult = await reverseGeocode(state.latitude, state.longitude);
          }
          
          if (!addressResult && geocodeAttempts < MAX_GEOCODE_ATTEMPTS) {
            console.log("Waiting before retrying address lookup...");
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        return !!addressResult; // Return true only if we got an address
      } catch (error) {
        console.error("Error in getFullLocation:", error);
        return false;
      }
    }
    return false;
  }, [getCurrentPosition, reverseGeocode, hereReverseGeocode, state.latitude, state.longitude]);

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
    hereReverseGeocode,
    geocode,
    hereGeocode,
    getFullLocation,
    resetError,
    clearLocationCache,
    checkInternetConnection
  };
} 