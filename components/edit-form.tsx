"use client"

import { useState, useEffect, useRef } from "react"
import { GradientButton } from "@/components/ui/gradient-button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { 
  MapPin, 
  Upload, 
  Check, 
  AlertCircle, 
  X, 
  Camera, 
  Globe, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  Save,
  Trash2
} from "lucide-react"
import Image from "next/image"
import type { ChangeEvent, FormEvent } from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useGeolocation } from "@/lib/hooks/useGeolocation"
import { getUserLocation, formatGeolocationError, checkGeolocationSupport } from "@/lib/utils/location-helper"
// Import anime.js v4 APIs
import { animate, createScope } from "animejs"
import { v4 as uuidv4 } from 'uuid'
import { useOverlay } from "@/contexts/overlay-context"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/contexts/auth-context"
import { createClient } from "@/utils/supabase/client"
import type { Database } from "@/types/supabase"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface FormState {
  title: string;
  type: string;
  description: string;
  location: string;
  latitude: string;
  longitude: string;
  country: string;
  city: string;
  street: string;
  email: string;
  hyperlink: string;
  images: File[];
  imagePreview: string[];
  existingPhotos: string[];
  deletedPhotos: string[];
  locationType: 'coordinates' | 'address';
}

interface EditFormProps {
  activityId: string;
}

export default function EditForm({ activityId }: EditFormProps) {
  const { hideOverlay } = useOverlay()
  const geolocation = useGeolocation()
  const { user } = useAuth()
  const supabase = createClient()
  const formRef = useRef(null)
  const animationScope = useRef<any>(null)
  
  console.log("EditForm mounted with activityId:", activityId)
  
  // Initialize form state
  const [formState, setFormState] = useState<FormState>({
    title: "",
    type: "",
    description: "",
    location: "",
    latitude: "",
    longitude: "",
    country: "",
    city: "",
    street: "",
    email: user?.email || "",
    hyperlink: "",
    images: [],
    imagePreview: [],
    existingPhotos: [],
    deletedPhotos: [],
    locationType: 'address'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingError, setIsLoadingError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [showHttpsWarning, setShowHttpsWarning] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false)
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const totalSteps = 3
  
  useEffect(() => {
    // Check for HTTPS
    setShowHttpsWarning(window.location.protocol !== 'https:')
    
    // Set a timeout to ensure the component is fully mounted
    // This helps with Supabase connection issues that can occur during rapid mounting
    const timer = setTimeout(() => {
      if (activityId) {
        fetchActivityData();
      } else {
        setIsLoadingError("Missing activity ID");
        setIsLoading(false);
      }
    }, 500);
    
    // Cleanup animations when component unmounts
    return () => {
      clearTimeout(timer);
    };
  }, [activityId]);

  // Separate useEffect for animation to ensure it runs after render is complete
  useEffect(() => {
    // Only initialize animation when component is not loading
    if (isLoading) return;

    // Use a timeout to ensure DOM is fully rendered
    const animationTimer = setTimeout(() => {
      if (formRef.current) {
        try {
          animationScope.current = createScope({
            root: formRef.current
          }).add(self => {
            // Animation for form entry
            animate(formRef.current!, {
              opacity: [0, 1],
              translateY: [20, 0],
              duration: 500,
              ease: 'outQuad'
            });
          });
        } catch (error) {
          console.error("Animation error:", error);
        }
      }
    }, 100);

    return () => {
      clearTimeout(animationTimer);
      if (animationScope.current) {
        animationScope.current.revert();
      }
    };
  }, [isLoading]);
  
  const fetchActivityData = async () => {
    if (!activityId) {
      setIsLoadingError("Missing activity ID");
      setIsLoading(false);
      return;
    }
    
    if (!user) {
      setIsLoadingError("You must be logged in to view this activity");
      setIsLoading(false);
      return;
    }
    
    setIsLoadingError(null);
    
    try {
      console.log(`Fetching activity data for ID: ${activityId}`);
      
      // Create a fresh client for this request
      const supabaseClient = createClient();
      
      const { data, error } = await supabaseClient
        .from('ecotrack')
        .select('*')
        .eq('id', activityId)
        .single();
      
      if (error) {
        console.error("Supabase error:", error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!data) {
        console.error("No activity found with ID:", activityId);
        throw new Error("Activity not found");
      }
      
      // Check if the current user is the owner of this activity
      if (data.user_id !== user?.id) {
        console.error("User doesn't own this activity:", { activityUserId: data.user_id, currentUserId: user?.id });
        throw new Error("You don't have permission to edit this activity");
      }
      
      // Parse photos if they exist
      let photoArray: string[] = [];
      if (data.photos) {
        try {
          photoArray = JSON.parse(data.photos);
          if (!Array.isArray(photoArray)) photoArray = [];
        } catch (e) {
          console.error("Error parsing photos:", e);
          photoArray = [];
        }
      }
      
      console.log("Activity data loaded successfully:", data.title);
      
      // Update form state with activity data
      setFormState({
        title: data.title || "",
        type: data.type || "",
        description: data.description || "",
        location: "",
        latitude: data.latitude ? data.latitude.toString() : "",
        longitude: data.longitude ? data.longitude.toString() : "",
        country: data.country || "",
        city: data.city || "",
        street: data.street || "",
        email: data.email || user?.email || "",
        hyperlink: data.hyperlink || "",
        images: [],
        imagePreview: [],
        existingPhotos: photoArray,
        deletedPhotos: [],
        locationType: 'address'
      });
      
    } catch (error: any) {
      console.error("Error fetching activity:", error);
      setIsLoadingError(error.message || "Failed to load activity data");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle input changes
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }
  
  // Handle number inputs
  const handleNumberInput = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numValue = value === '' ? undefined : parseInt(value, 10)
    setFormState((prev) => ({ ...prev, [name]: numValue }))
  }

  const handleSelectChange = (value: string) => {
    setFormState((prev) => ({ ...prev, type: value }))
  }

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormState(prev => ({
      ...prev,
      images: [...prev.images, ...files],
      imagePreview: [...prev.imagePreview, ...files.map(file => URL.createObjectURL(file))],
    }));
  }

  const handleRemoveImage = (idx: number) => {
    setFormState(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
      imagePreview: prev.imagePreview.filter((_, i) => i !== idx),
    }));
  }
  
  const handleRemoveExistingPhoto = (url: string) => {
    setFormState(prev => ({
      ...prev,
      existingPhotos: prev.existingPhotos.filter(photo => photo !== url),
      deletedPhotos: [...prev.deletedPhotos, url]
    }));
  }

  const handleLocation = async () => {
    setErrorMsg(null);
    
    // Check if the device supports geolocation
    const { supported, secureContext } = checkGeolocationSupport();
    
    if (!supported) {
      setErrorMsg("Geolocation is not supported by your browser");
      return;
    }
    
    // Check if running on HTTPS, show warning if not
    if (!secureContext && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setErrorMsg("Geolocation requires HTTPS. Consider running the app with npm run dev:https for full functionality.");
      return;
    }

    setIsGettingLocation(true);
    
    try {
      // Reset any previous errors from the geolocation hook
      geolocation.resetError();
      
      // Check for internet connection first
      const isConnected = await geolocation.checkInternetConnection();
      if (!isConnected) {
        setErrorMsg("No internet connection. Please check your connection and try again.");
        setIsGettingLocation(false);
        return;
      }
      
      console.log("Starting location acquisition with improved helper");
      
      // Use our specialized location helper
      const locationResult = await getUserLocation({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
        retryCount: 2,
        retryDelay: 1000
      });
      
      if (locationResult.success && locationResult.position) {
        console.log("Successfully retrieved location with helper!");
        const position = locationResult.position;
        
        // Update form state with the coordinates
        setFormState(prev => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
          location: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
        }));
        
        // Get address information using the coordinates
        try {
          const result = await geolocation.reverseGeocode(
            position.coords.latitude.toString(),
            position.coords.longitude.toString()
          );
          
          if (result) {
            setFormState(prev => ({
              ...prev,
              street: result.street || "",
              city: result.city || "",
              country: result.country || ""
            }));
          }
        } catch (addressErr) {
          console.warn("Error getting address:", addressErr);
        }
      } else {
        // Handle error from location helper
        if (locationResult.error) {
          setErrorMsg(formatGeolocationError(locationResult.error));
        } else {
          setErrorMsg("Could not get your location. Please try again or enter your location manually.");
        }
      }
    } catch (error) {
      console.error("Geolocation error:", error);
      setErrorMsg("Failed to get your location. Please try again or enter your location manually.");
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Function to convert address to coordinates
  const handleAddressBasedLocation = async () => {
    if (!formState.country) {
      setErrorMsg("Please enter at least a country name to find coordinates.");
      return;
    }
    
    setErrorMsg(null);
    setIsGeocodingAddress(true);
    
    // Construct a query from the available address parts
    const addressQuery = [
      formState.street, 
      formState.city, 
      formState.country
    ].filter(Boolean).join(", ");
    
    console.log(`Converting address to coordinates: "${addressQuery}"`);
    
    try {
      // Use the OpenStreetMap for geocoding (default)
      const result = await geolocation.geocode(addressQuery);
      
      if (result) {
        console.log("Geocoding successful:", result);
        // Update form state with the coordinates
        setFormState(prev => ({
          ...prev,
          latitude: result.latitude || "",
          longitude: result.longitude || "",
          location: result.latitude && result.longitude 
            ? `${parseFloat(result.latitude).toFixed(4)}, ${parseFloat(result.longitude).toFixed(4)}`
            : ""
        }));
        setErrorMsg(null);
      } else {
        console.warn("Geocoding failed:", geolocation.error);
        setErrorMsg(geolocation.error || "Could not find coordinates for this address. Please try a more specific address.");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setErrorMsg("Failed to convert address to coordinates. Please check your address and try again.");
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  // Validate geographic coordinates
  const validateCoordinates = (lat: string, lng: string): { valid: boolean; message: string } => {
    if (!lat.trim() || !lng.trim()) {
      return { valid: false, message: "Please enter both latitude and longitude." };
    }
    
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    if (isNaN(latNum) || isNaN(lngNum)) {
      return { valid: false, message: "Coordinates must be valid numbers." };
    }
    
    if (latNum < -90 || latNum > 90) {
      return { valid: false, message: "Latitude must be between -90 and 90 degrees." };
    }
    
    if (lngNum < -180 || lngNum > 180) {
      return { valid: false, message: "Longitude must be between -180 and 180 degrees." };
    }
    
    return { valid: true, message: "" };
  };

  // Function to convert coordinates to address
  const handleCoordinatesToAddress = async () => {
    const validation = validateCoordinates(formState.latitude, formState.longitude);
    
    if (!validation.valid) {
      setErrorMsg(validation.message);
      return;
    }

    setErrorMsg(null);
    setIsReverseGeocoding(true);
    
    const lat = parseFloat(formState.latitude);
    const lng = parseFloat(formState.longitude);
    console.log(`Converting coordinates to address: ${lat}, ${lng}`);
    
    try {
      // Use the OpenStreetMap API for reverse geocoding (default)
      const result = await geolocation.reverseGeocode(formState.latitude, formState.longitude);
      
      if (result) {
        console.log("Reverse geocoding successful:", result);
        // Update form state with the address components
        setFormState(prev => ({
          ...prev,
          street: result.street || "",
          city: result.city || "",
          country: result.country || ""
        }));
        setErrorMsg(null);
      } else {
        console.warn("Reverse geocoding failed:", geolocation.error);
        setErrorMsg(geolocation.error || "Could not find an address for these coordinates. Please check the values and try again.");
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      setErrorMsg("Failed to convert coordinates to address. Please check your values and try again.");
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true)
    setErrorMsg(null)
    
    try {
      // Delete the activity
      const { error } = await supabase
        .from('ecotrack')
        .delete()
        .eq('id', activityId)
      
      if (error) throw new Error(`Error deleting activity: ${error.message}`)
      
      // Set success message and show confirmation
      setIsSuccess(true)
      setSuccessMsg("Activity deleted successfully!")
      
      // Close modal after a short delay
      setTimeout(() => {
        hideOverlay()
        window.location.href = '/monitor' // Redirect to monitor page
      }, 2000)
    } catch (error: any) {
      console.error("Error deleting activity:", error)
      setErrorMsg(`Failed to delete the activity: ${error.message}`)
    } finally {
      setIsSubmitting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (currentStep < totalSteps) {
      nextStep()
      return
    }
    
    // Client-side validation
    if (!formState.title.trim()) {
      setErrorMsg("Please provide a title for your activity.")
      return
    }
    
    if (!formState.type) {
      setErrorMsg("Please select an activity type.")
      return
    }
    
    if (!formState.description.trim()) {
      setErrorMsg("Please provide a description of your activity.")
      return
    }
    
    if ((!formState.latitude || !formState.longitude) && 
        (!formState.country || (!formState.city && !formState.street))) {
      setErrorMsg("Please provide either coordinates or an address for your activity.")
      return
    }
    
    // Ensure user is logged in
    if (!user) {
      setErrorMsg("You must be logged in to update an activity.")
      return
    }
    
    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      // Upload new images to Supabase storage
      let newImageUrls: string[] = [];
      
      if (formState.images.length > 0) {
        setIsUploading(true);
        
        for (const file of formState.images) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${uuidv4()}.${fileExt}`;
          const filePath = `eco-evidence/${fileName}`;
          
          const { error: uploadError, data } = await supabase.storage
            .from('imagens')
            .upload(filePath, file);
          
          if (uploadError) {
            throw new Error(`Error uploading image: ${uploadError.message}`);
          }
          
          // Get public URL for the image
          const { data: { publicUrl } } = supabase.storage
            .from('imagens')
            .getPublicUrl(filePath);
          
          newImageUrls.push(publicUrl);
        }
        
        setIsUploading(false);
      }
      
      // Combine existing photos (not deleted) with new uploads
      const combinedPhotos = [...formState.existingPhotos, ...newImageUrls];
      
      // Build data object for update
      const activityData = {
        title: formState.title,
        type: formState.type,
        description: formState.description,
        latitude: formState.latitude ? parseFloat(formState.latitude) : null,
        longitude: formState.longitude ? parseFloat(formState.longitude) : null,
        country: formState.country,
        city: formState.city,
        street: formState.street,
        email: formState.email,
        hyperlink: formState.hyperlink,
        photos: combinedPhotos.length > 0 ? JSON.stringify(combinedPhotos) : null,
        updated_at: new Date().toISOString(),
      };
      
      // Update data in the ecotrack table
      const { error: updateError } = await supabase
        .from('ecotrack')
        .update(activityData)
        .eq('id', activityId);
      
      if (updateError) {
        throw new Error(`Error updating activity: ${updateError.message}`);
      }
      
      // Success animation with proper cleanup
      if (formRef.current) {
        const successAnimation = animate(formRef.current, {
          boxShadow: ["0 0 0 rgba(6,182,212,0)", "0 0 30px rgba(6,182,212,0.4)"],
          borderColor: ["rgba(6,182,212,0)", "rgba(6,182,212,0.6)"],
          duration: 500,
          ease: 'outQuad'
        });
      }
      
      // Show success message
      setIsSuccess(true)
      setSuccessMsg("Your environmental activity has been updated successfully!")
      
    } catch (error: any) {
      console.error("Error updating form:", error)
      setErrorMsg(`There was an error updating your activity: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    // Validation for first step
    if (currentStep === 1) {
      if (!formState.title.trim()) {
        setErrorMsg("Please provide a title for your activity.")
        return
      }
      
      if (!formState.type) {
        setErrorMsg("Please select an activity type.")
        return
      }
      
      if (!formState.description.trim()) {
        setErrorMsg("Please provide a description of your activity.")
        return
      }
    }
    
    // Validation for second step
    if (currentStep === 2) {
      if ((!formState.latitude || !formState.longitude) && 
          (!formState.country || (!formState.city && !formState.street))) {
        setErrorMsg("Please provide either coordinates or an address for your activity.")
        return
      }
    }
    
    setErrorMsg(null)
    setCurrentStep(prev => Math.min(prev + 1, totalSteps))
  }

  const prevStep = () => {
    setErrorMsg(null)
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const toggleLocationType = () => {
    setFormState(prev => ({
      ...prev,
      locationType: prev.locationType === 'coordinates' ? 'address' : 'coordinates'
    }))
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="title" className="text-cyan-300">
                Activity Title
              </Label>
              <input
                id="title"
                name="title"
                value={formState.title}
                onChange={handleInputChange}
                placeholder="e.g., Community Forest Restoration"
                required
                className="flex h-10 w-full rounded-md border border-cyan-900/40 bg-gray-800/80 px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="type" className="text-cyan-300">
                Activity Type
              </Label>
              <Select onValueChange={handleSelectChange} value={formState.type}>
                <SelectTrigger className="bg-gray-800/80 border-cyan-900/60 text-gray-300">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="select-content-cyberpunk">
                  <SelectItem className="select-item-cyberpunk" value="reforestation">Reforestation</SelectItem>
                  <SelectItem className="select-item-cyberpunk" value="clean-up">Clean-up</SelectItem>
                  <SelectItem className="select-item-cyberpunk" value="education">Education</SelectItem>
                  <SelectItem className="select-item-cyberpunk" value="conservation">Conservation</SelectItem>
                  <SelectItem className="select-item-cyberpunk" value="renewable">Renewable Energy</SelectItem>
                  <SelectItem className="select-item-cyberpunk" value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="description" className="text-cyan-300">
                Description
              </Label>
              <textarea
                id="description"
                name="description"
                value={formState.description}
                onChange={handleInputChange}
                placeholder="Describe your activity and its impact..."
                required
                className="bg-gray-800/80 border border-cyan-900/60 focus:border-cyan-500 focus:ring-cyan-500 min-h-[150px] w-full rounded-md px-3 py-2 text-sm"
              />
            </div>
            
            {/* Removed beneficiaries fields */}
          </div>
        );
      case 2:
        return (
          <div className="space-y-5">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                Location Details
              </h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <GradientButton 
                      type="button" 
                      variant="variant" 
                      onClick={toggleLocationType}
                      className="text-xs border-cyan-900/50 text-cyan-400 hover:bg-cyan-950/30"
                    >
                      <span className="mr-1.5">Switch to</span>
                      <Badge variant="secondary" className="bg-cyan-900/30 text-cyan-300 hover:bg-cyan-900/40">
                        {formState.locationType === 'coordinates' ? 'Address' : 'Coordinates'}
                      </Badge>
                    </GradientButton>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 border-cyan-900/50 text-cyan-300">
                    <p>Toggle between address and coordinate input methods</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {formState.locationType === 'address' ? (
              <>
                <div className="space-y-2.5">
                  <Label htmlFor="country" className="text-cyan-300">
                    Country
                  </Label>
                  <input
                    id="country"
                    name="country"
                    value={formState.country}
                    onChange={handleInputChange}
                    placeholder="Country"
                    className="flex h-10 w-full rounded-md border border-cyan-900/40 bg-gray-800/80 px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="city" className="text-cyan-300">
                    City
                  </Label>
                  <input
                    id="city"
                    name="city"
                    value={formState.city}
                    onChange={handleInputChange}
                    placeholder="City"
                    className="flex h-10 w-full rounded-md border border-cyan-900/40 bg-gray-800/80 px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="street" className="text-cyan-300">
                    Street (optional)
                  </Label>
                  <input
                    id="street"
                    name="street"
                    value={formState.street}
                    onChange={handleInputChange}
                    placeholder="Street address"
                    className="flex h-10 w-full rounded-md border border-cyan-900/40 bg-gray-800/80 px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <GradientButton
                    type="button"
                    onClick={handleLocation}
                    disabled={isGettingLocation}
                    className={cn(
                      "w-full justify-center gap-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white",
                      isGettingLocation && "opacity-80"
                    )}
                  >
                    {isGettingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Getting your location...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4" />
                        Use My Current Location
                      </>
                    )}
                  </GradientButton>
                  
                  <GradientButton
                    type="button"
                    onClick={() => {
                      if (formState.country) {
                        handleAddressBasedLocation();
                      } else if (formState.latitude && formState.longitude) {
                        handleCoordinatesToAddress();
                      } else {
                        setErrorMsg("Please enter either an address or coordinates to convert.");
                      }
                    }}
                    disabled={isGeocodingAddress || isReverseGeocoding}
                    className={cn(
                      "w-full justify-center gap-2 border-cyan-500 text-cyan-400 hover:bg-cyan-950/30",
                      (isGeocodingAddress || isReverseGeocoding) && "opacity-80"
                    )}
                    variant="variant"
                  >
                    {isGeocodingAddress || isReverseGeocoding ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isGeocodingAddress ? "Converting to coordinates..." : "Finding address..."}
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4" />
                        Convert: Address ↔ Coordinates
                      </>
                    )}
                  </GradientButton>
                </div>

                {formState.latitude && formState.longitude && (
                  <div className="p-3 rounded-md bg-gray-800/30 border border-cyan-900/30">
                    <p className="text-xs text-gray-400 mb-1">Coordinates</p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          value={formState.latitude}
                          onChange={handleInputChange}
                          name="latitude"
                          className="flex h-10 w-full rounded-md border border-cyan-900/40 bg-gray-800/80 px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                          placeholder="Latitude"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          value={formState.longitude}
                          onChange={handleInputChange}
                          name="longitude"
                          className="flex h-10 w-full rounded-md border border-cyan-900/40 bg-gray-800/80 px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                          placeholder="Longitude"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <Label htmlFor="latitude" className="text-cyan-300">
                      Latitude
                    </Label>
                    <input
                      id="latitude"
                      name="latitude"
                      value={formState.latitude}
                      onChange={handleInputChange}
                      placeholder="e.g., 40.7128"
                      className="flex h-10 w-full rounded-md border border-cyan-900/40 bg-gray-800/80 px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="longitude" className="text-cyan-300">
                      Longitude
                    </Label>
                    <input
                      id="longitude"
                      name="longitude"
                      value={formState.longitude}
                      onChange={handleInputChange}
                      placeholder="e.g., -74.0060"
                      className="flex h-10 w-full rounded-md border border-cyan-900/40 bg-gray-800/80 px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <GradientButton
                    type="button"
                    onClick={handleLocation}
                    disabled={isGettingLocation}
                    className={cn(
                      "w-full justify-center gap-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white",
                      isGettingLocation && "opacity-80"
                    )}
                  >
                    {isGettingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Getting your location...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4" />
                        Use My Current Location
                      </>
                    )}
                  </GradientButton>
                  
                  <GradientButton
                    type="button"
                    onClick={() => {
                      if (formState.latitude && formState.longitude) {
                        handleCoordinatesToAddress();
                      } else if (formState.country) {
                        handleAddressBasedLocation();
                      } else {
                        setErrorMsg("Please enter either coordinates or an address to convert.");
                      }
                    }}
                    disabled={isGeocodingAddress || isReverseGeocoding}
                    className={cn(
                      "w-full justify-center gap-2 border-cyan-500 text-cyan-400 hover:bg-cyan-950/30",
                      (isGeocodingAddress || isReverseGeocoding) && "opacity-80"
                    )}
                    variant="variant"
                  >
                    {isGeocodingAddress || isReverseGeocoding ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isGeocodingAddress ? "Converting to coordinates..." : "Finding address..."}
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4" />
                        Convert: Address ↔ Coordinates
                      </>
                    )}
                  </GradientButton>
                </div>

                {formState.country && (
                  <div className="p-3 rounded-md bg-gray-800/30 border border-cyan-900/30">
                    <p className="text-xs text-gray-400 mb-1">Address</p>
                    <div className="space-y-2.5">
                      {formState.street && (
                        <p className="text-sm text-white">{formState.street}</p>
                      )}
                      <p className="text-sm text-white">
                        {[formState.city, formState.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-cyan-300">
                Email (optional)
              </Label>
              <input
                id="email"
                name="email"
                type="email"
                value={formState.email}
                onChange={handleInputChange}
                placeholder="For notifications about your activity"
                className="flex h-10 w-full rounded-md border border-cyan-900/40 bg-gray-800/80 px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="hyperlink" className="text-cyan-300">
                Website or Social Media (optional)
              </Label>
              <input
                id="hyperlink"
                name="hyperlink"
                value={formState.hyperlink}
                onChange={handleInputChange}
                placeholder="e.g., https://example.com/my-initiative"
                className="flex h-10 w-full rounded-md border border-cyan-900/40 bg-gray-800/80 px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
              />
            </div>

            {/* Existing photos section */}
            {formState.existingPhotos.length > 0 && (
              <div className="space-y-2.5">
                <Label className="text-cyan-300">Current Images</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {formState.existingPhotos.map((src, idx) => (
                    <div key={`existing-${idx}`} className="relative group">
                      <div className="relative h-24 rounded overflow-hidden border border-cyan-900/30">
                        <Image
                          src={src}
                          alt={`Current image ${idx}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 bg-black/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveExistingPhoto(src)}
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add new photos section */}
            <div className="space-y-2.5">
              <Label className="text-cyan-300">Add New Images (optional)</Label>
              <div className="flex items-center gap-4">
                <Label 
                  htmlFor="images" 
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer border-cyan-900/50 bg-gray-800/30 hover:bg-gray-800/50 transition-colors duration-200"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-cyan-400" />
                    <p className="text-sm text-gray-400">Click to upload new images</p>
                    <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                  </div>
                  <Input
                    id="images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </Label>
              </div>

              {formState.imagePreview.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                  {formState.imagePreview.map((src, idx) => (
                    <div key={`new-${idx}`} className="relative group">
                      <div className="relative h-24 rounded overflow-hidden border border-cyan-900/30">
                        <Image
                          src={src}
                          alt={`Preview ${idx}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 bg-black/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveImage(idx)}
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-10 space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-full blur-xl"></div>
          <div className="h-16 w-16 rounded-full border-4 border-t-transparent border-cyan-500/50 animate-spin shadow-[0_0_15px_rgba(6,182,212,0.3)]"></div>
        </div>
        <p className="text-cyan-400/80 text-sm animate-pulse">Loading activity data...</p>
      </div>
    )
  }

  if (isLoadingError) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-10 space-y-6 text-center">
        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-red-500 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.4)]">
          <AlertCircle className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-amber-500">
          Error Loading Activity
        </h2>
        <p className="text-gray-300 max-w-md">
          {isLoadingError}
        </p>
        <div className="flex gap-4">
          <Button className="bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/40" onClick={hideOverlay}>
            Close
          </Button>
          <Button className="bg-cyan-900/20 hover:bg-cyan-900/30 text-cyan-400 border border-cyan-900/40" onClick={fetchActivityData}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-10 space-y-6 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="h-16 w-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]"
        >
          <Check className="h-8 w-8 text-white" />
        </motion.div>
        <motion.h2 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600"
        >
          Update Successful
        </motion.h2>
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-300 max-w-md"
        >
          {successMsg}
        </motion.p>
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-row gap-4 mt-4"
        >
          <GradientButton
            type="button"
            onClick={hideOverlay}
            className="w-full border-cyan-900/40 text-cyan-400 hover:bg-cyan-950/30"
            variant="variant"
          >
            Close
          </GradientButton>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" ref={formRef}>
      {/* Header section */}
      <div className="px-6 py-5 border-b border-cyan-900/30 relative">
        <div className="absolute left-0 right-0 -bottom-px h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
        <div className="flex flex-col space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
            Edit Environmental Activity
          </h2>
          <p className="text-sm text-gray-400">
            Update your initiative details
          </p>
        </div>
      </div>

      {/* Content section */}
      <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
        {showHttpsWarning && (
          <div className="mb-4 p-3 rounded-md bg-amber-900/30 border border-amber-500/30 text-amber-300 text-sm">
            <div className="flex gap-2 items-center">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>
                Geolocation may not work properly in HTTP mode. For best experience, use HTTPS or localhost.
              </p>
            </div>
          </div>
        )}

        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-md bg-red-900/30 border border-red-500/30 text-red-300 text-sm"
          >
            <div className="flex gap-2 items-center">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>{errorMsg}</p>
            </div>
          </motion.div>
        )}

        {/* Step progress indicator */}
        <div className="mb-6 relative">
          <div className="flex items-center mb-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.3)] z-10">
              <span className="text-sm font-medium">{currentStep}</span>
            </div>
            <div className="text-sm text-cyan-300 ml-2 font-medium">Step {currentStep} of {totalSteps}</div>
          </div>
          
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-800/80 rounded-full overflow-hidden relative mb-6">
            <div 
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" onClick={(e) => e.stopPropagation()}>
          {renderStepContent()}

          {/* Form buttons */}
          <div className="flex justify-between mt-8 pt-4 border-t border-gray-800">
            <div className="flex gap-2">
              {currentStep > 1 ? (
                <GradientButton
                  type="button"
                  onClick={prevStep}
                  variant="variant"
                  className="border-cyan-900/50 text-cyan-400 hover:bg-cyan-950/30"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </GradientButton>
              ) : (
                <GradientButton
                  type="button"
                  onClick={hideOverlay}
                  variant="variant"
                  className="border-red-900/50 text-red-400 hover:bg-red-950/30"
                >
                  Cancel
                </GradientButton>
              )}
              
              {currentStep === totalSteps && (
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <GradientButton
                      type="button"
                      variant="variant"
                      className="border-red-900/50 text-red-400 hover:bg-red-950/30"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </GradientButton>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-gray-900 border border-red-900/50">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        This action cannot be undone. This will permanently delete your activity
                        and remove all associated data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-red-900/50 hover:bg-red-900/70 text-white border border-red-800/60"
                        onClick={handleDelete}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            <GradientButton
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-cyan-600 to-purple-700 hover:from-cyan-500 hover:to-purple-600 text-white shadow-lg shadow-cyan-700/20 min-w-[100px]"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : currentStep < totalSteps ? (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </GradientButton>
          </div>
        </form>
      </div>
    </div>
  );
} 