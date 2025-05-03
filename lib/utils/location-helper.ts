/**
 * Location Helper Utility
 * Provides helper functions to deal with browser-specific geolocation quirks
 * and improves reliability of geolocation functionality.
 */

// Types
interface LocationOptions extends PositionOptions {
  retryCount?: number;
  retryDelay?: number;
}

interface LocationResult {
  success: boolean;
  position?: GeolocationPosition;
  error?: GeolocationPositionError | Error;
}

// Browser detection for applying specific workarounds
const getBrowserInfo = () => {
  if (typeof window === 'undefined') return { name: 'unknown', isChrome: false, isSafari: false, isFirefox: false, isEdge: false };
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  return {
    name: userAgent,
    isChrome: userAgent.indexOf('chrome') > -1 && userAgent.indexOf('edge') === -1 && userAgent.indexOf('edg') === -1,
    isSafari: userAgent.indexOf('safari') > -1 && userAgent.indexOf('chrome') === -1,
    isFirefox: userAgent.indexOf('firefox') > -1,
    isEdge: userAgent.indexOf('edge') > -1 || userAgent.indexOf('edg') > -1
  };
};

/**
 * Pre-requests geolocation permission to handle the first-click issue
 */
export const preRequestGeolocationPermission = async (): Promise<string> => {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return 'unsupported';
  }
  
  try {
    // First check permissions API if available
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        
        if (permissionStatus.state === 'granted') {
          return 'granted';
        }
        
        if (permissionStatus.state === 'denied') {
          return 'denied';
        }
        
        // For 'prompt' state, we use our workarounds
        console.log("Permission status is 'prompt', applying first-click workarounds");
      } catch (err) {
        console.warn("Permissions API error:", err);
      }
    }
    
    // Apply browser-specific workarounds
    const browser = getBrowserInfo();
    console.log(`Detected browser: ${browser.name}`);
    
    // Different browsers have different quirks with geolocation permission
    if (browser.isChrome) {
      // Chrome sometimes needs a dummy request with short timeout
      await makeDummyGeolocationRequest(500);
    } else if (browser.isSafari) {
      // Safari often needs a longer timeout for the permission dialog
      await makeDummyGeolocationRequest(1000);
    } else {
      // Default approach for other browsers
      await makeDummyGeolocationRequest(800);
    }
    
    return 'prepared';
  } catch (error) {
    console.error("Error pre-requesting geolocation permission:", error);
    return 'error';
  }
};

/**
 * Makes a dummy geolocation request to prepare the browser
 * This helps with the first-click issue in many browsers
 */
const makeDummyGeolocationRequest = (timeout: number = 500): Promise<void> => {
  return new Promise<void>((resolve) => {
    let resolved = false;
    
    // Set timeout to avoid hanging
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    }, timeout);
    
    // Make a quick position request with minimal options
    navigator.geolocation.getCurrentPosition(
      () => {
        if (!resolved) {
          clearTimeout(timeoutId);
          resolved = true;
          resolve();
        }
      },
      () => {
        if (!resolved) {
          clearTimeout(timeoutId);
          resolved = true;
          resolve();
        }
      },
      { 
        timeout: timeout - 100, // Slightly shorter than our waiting time
        maximumAge: 0,
        enableHighAccuracy: false // Less accuracy for better chance of success
      }
    );
  });
};

/**
 * Gets the user's current position with retry logic and browser-specific workarounds
 */
export const getUserLocation = async (options: LocationOptions = {}): Promise<LocationResult> => {
  const {
    retryCount = 2,
    retryDelay = 1000,
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0
  } = options;
  
  // First apply permission workarounds
  const permissionStatus = await preRequestGeolocationPermission();
  console.log("Permission preparation result:", permissionStatus);
  
  if (permissionStatus === 'denied') {
    return {
      success: false,
      error: new Error("Location permission denied. Please enable location access in your browser settings.")
    };
  }
  
  if (permissionStatus === 'unsupported') {
    return {
      success: false,
      error: new Error("Geolocation is not supported by your browser")
    };
  }
  
  // Apply retry logic
  let attempts = 0;
  let lastError: GeolocationPositionError | Error | undefined;
  
  while (attempts < retryCount) {
    attempts++;
    console.log(`Geolocation attempt ${attempts}/${retryCount}`);
    
    try {
      // Use promise to handle the geolocation API
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy,
            timeout,
            maximumAge
          }
        );
      });
      
      // Success!
      return {
        success: true,
        position
      };
    } catch (error) {
      lastError = error as GeolocationPositionError;
      console.warn(`Geolocation attempt ${attempts} failed:`, error);
      
      // If not on the last attempt, wait before retrying
      if (attempts < retryCount) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  // If we get here, all attempts failed
  return {
    success: false,
    error: lastError
  };
};

/**
 * Check if the device supports geolocation and if we're in a secure context
 */
export const checkGeolocationSupport = (): { supported: boolean; secureContext: boolean } => {
  if (typeof window === 'undefined') {
    return { supported: false, secureContext: false };
  }
  
  const supported = 'geolocation' in navigator;
  const secureContext = window.isSecureContext;
  
  return { supported, secureContext };
};

/**
 * Formats error messages from geolocation errors
 */
export const formatGeolocationError = (error: GeolocationPositionError | Error): string => {
  // Handle GeolocationPositionError
  if ('code' in error) {
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        return window.location.protocol === 'http:' && window.location.hostname !== 'localhost'
          ? "Geolocation requires HTTPS. Please use a secure connection or run the app locally."
          : "Location permission denied. Please enable location access in your browser settings.";
      case 2: // POSITION_UNAVAILABLE
        return "Your location information is unavailable. Please check your device's GPS or try again later.";
      case 3: // TIMEOUT
        return "The request to get your location timed out. Please check your internet connection and try again.";
      default:
        return error.message || "Unknown geolocation error";
    }
  }
  
  // Handle generic Error
  return error.message || "Unknown error getting your location";
}; 