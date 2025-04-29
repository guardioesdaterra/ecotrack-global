"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
  Loader2
} from "lucide-react"
import { AuthButtons } from "@/components/auth-buttons"
import Image from "next/image"
import type { ChangeEvent, FormEvent } from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useGeolocation } from "@/lib/hooks/useGeolocation"
import { v4 as uuidv4 } from 'uuid'
import { useOverlay } from "@/contexts/overlay-context"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/contexts/auth-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

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
  locationType: 'coordinates' | 'address';
}

export default function SubmitForm() {
  const { hideOverlay } = useOverlay()
  const geolocation = useGeolocation()
  const { user } = useAuth() // Use the auth context to get the current user
  const supabase = createClientComponentClient<Database>() // Create Supabase client
  
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
    locationType: 'address',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(!!user) // Set based on user auth status
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [showHttpsWarning, setShowHttpsWarning] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false)
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)
  const totalSteps = 3

  // Update email and isLoggedIn when user changes
  useEffect(() => {
    setIsLoggedIn(!!user)
    if (user?.email) {
      setFormState(prev => ({ ...prev, email: user.email || "" }))
    }
  }, [user])

  useEffect(() => {
    setShowHttpsWarning(window.location.protocol !== 'https:')
  }, [])

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFormState((prev) => ({ ...prev, type: value }))
  }

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormState(prev => ({
      ...prev,
      images: files,
      imagePreview: files.map(file => URL.createObjectURL(file)),
    }));
  }

  const handleRemoveImage = (idx: number) => {
    setFormState(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
      imagePreview: prev.imagePreview.filter((_, i) => i !== idx),
    }));
  }

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
    
    try {
      // Use the geocoding function from the useGeolocation hook
      const result = await geolocation.geocode(addressQuery);
      
      if (result) {
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
        setErrorMsg(geolocation.error || "Could not find coordinates for this address. Please try a more specific address.");
      }
    } catch (error) {
      setErrorMsg("Failed to convert address to coordinates. Please check your address and try again.");
      console.error("Geocoding error:", error);
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  // Function to convert coordinates to address
  const handleCoordinatesToAddress = async () => {
    if (!formState.latitude || !formState.longitude) {
      setErrorMsg("Please enter both latitude and longitude to find the address.");
      return;
    }

    setErrorMsg(null);
    setIsReverseGeocoding(true);
    
    try {
      // Use the reverse geocoding function from the useGeolocation hook
      const result = await geolocation.reverseGeocode(formState.latitude, formState.longitude);
      
      if (result) {
        // Update form state with the address components
        setFormState(prev => ({
          ...prev,
          street: result.street || "",
          city: result.city || "",
          country: result.country || ""
        }));
        setErrorMsg(null);
      } else {
        setErrorMsg(geolocation.error || "Could not find an address for these coordinates. Please check the values and try again.");
      }
    } catch (error) {
      setErrorMsg("Failed to convert coordinates to address. Please check your values and try again.");
      console.error("Reverse geocoding error:", error);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleLocation = async () => {
    setErrorMsg(null);
    
    // Check if running on HTTPS, show warning if not
    if (window.location.protocol !== 'https:' && !errorMsg) {
      setErrorMsg("Geolocation requires HTTPS. Consider running the app with npm run dev:https for full functionality.");
      return;
    }

    setIsGettingLocation(true);
    
    try {
      // Try to get the user's current position
      const success = await geolocation.getFullLocation({
        // Increase accuracy
        enableHighAccuracy: true,
        timeout: 15000
      });
      
      if (success) {
        // Update form state with the location data
        setFormState(prev => ({
          ...prev,
          latitude: geolocation.latitude || "",
          longitude: geolocation.longitude || "",
          location: geolocation.latitude && geolocation.longitude 
            ? `${parseFloat(geolocation.latitude).toFixed(4)}, ${parseFloat(geolocation.longitude).toFixed(4)}`
            : "",
          street: geolocation.address.street || "",
          city: geolocation.address.city || "",
          country: geolocation.address.country || ""
        }));
      } else if (geolocation.error) {
        setErrorMsg(geolocation.error);
      }
    } catch (error) {
      setErrorMsg("Failed to get your location. Please try again or enter your location manually.");
      console.error("Geolocation error:", error);
    } finally {
      setIsGettingLocation(false);
    }
  };

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
      setErrorMsg("You must be logged in to submit an activity.")
      return
    }
    
    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      // Upload images to Supabase storage
      let imageUrls: string[] = [];
      
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
          
          imageUrls.push(publicUrl);
        }
        
        setIsUploading(false);
      }
      
      // Build data object for insertion
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
        photos: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
        user_id: user.id, // Include the user_id
        created_at: new Date().toISOString(),
      };
      
      // Insert data into the ecotrack table
      const { error: insertError } = await supabase
        .from('ecotrack')
        .insert([activityData]);
      
      if (insertError) {
        throw new Error(`Error submitting activity: ${insertError.message}`);
      }
      
      // Show success message
      setIsSuccess(true)
      setSuccessMsg("Your environmental activity has been submitted successfully!")
    } catch (error: any) {
      console.error("Error submitting form:", error)
      setErrorMsg(`There was an error submitting your activity: ${error.message}`)
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
              <Input
                id="title"
                name="title"
                value={formState.title}
                onChange={handleInputChange}
                placeholder="e.g., Community Forest Restoration"
                required
                className="bg-gray-800/80 border-cyan-900/60 focus:border-cyan-500 focus:ring-cyan-500"
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
              <Textarea
                id="description"
                name="description"
                value={formState.description}
                onChange={handleInputChange}
                placeholder="Describe your activity and its impact..."
                required
                className="bg-gray-800/80 border-cyan-900/60 focus:border-cyan-500 focus:ring-cyan-500 min-h-[150px]"
              />
            </div>
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
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={toggleLocationType}
                      className="text-xs border-cyan-900/50 text-cyan-400 hover:bg-cyan-950/30"
                    >
                      <span className="mr-1.5">Switch to</span>
                      <Badge variant="secondary" className="bg-cyan-900/30 text-cyan-300 hover:bg-cyan-900/40">
                        {formState.locationType === 'coordinates' ? 'Address' : 'Coordinates'}
                      </Badge>
                    </Button>
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
                  <Input
                    id="country"
                    name="country"
                    value={formState.country}
                    onChange={handleInputChange}
                    placeholder="Country"
                    className="bg-gray-800/80 border-cyan-900/60"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="city" className="text-cyan-300">
                    City
                  </Label>
                  <Input
                    id="city"
                    name="city"
                    value={formState.city}
                    onChange={handleInputChange}
                    placeholder="City"
                    className="bg-gray-800/80 border-cyan-900/60"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="street" className="text-cyan-300">
                    Street (optional)
                  </Label>
                  <Input
                    id="street"
                    name="street"
                    value={formState.street}
                    onChange={handleInputChange}
                    placeholder="Street address"
                    className="bg-gray-800/80 border-cyan-900/60"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Button
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
                  </Button>
                  
                  <Button
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
                    variant="outline"
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
                  </Button>
                </div>

                {formState.latitude && formState.longitude && (
                  <div className="p-3 rounded-md bg-gray-800/30 border border-cyan-900/30">
                    <p className="text-xs text-gray-400 mb-1">Coordinates</p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          value={formState.latitude}
                          onChange={handleInputChange}
                          name="latitude"
                          className="bg-gray-800/80 border-cyan-900/60 text-sm"
                          placeholder="Latitude"
                          readOnly
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          value={formState.longitude}
                          onChange={handleInputChange}
                          name="longitude"
                          className="bg-gray-800/80 border-cyan-900/60 text-sm"
                          placeholder="Longitude"
                          readOnly
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
                    <Input
                      id="latitude"
                      name="latitude"
                      value={formState.latitude}
                      onChange={handleInputChange}
                      placeholder="e.g., 40.7128"
                      className="bg-gray-800/80 border-cyan-900/60"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="longitude" className="text-cyan-300">
                      Longitude
                    </Label>
                    <Input
                      id="longitude"
                      name="longitude"
                      value={formState.longitude}
                      onChange={handleInputChange}
                      placeholder="e.g., -74.0060"
                      className="bg-gray-800/80 border-cyan-900/60"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
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
                  </Button>
                  
                  <Button
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
                    disabled={isReverseGeocoding || isGeocodingAddress}
                    className={cn(
                      "w-full justify-center gap-2 border-cyan-500 text-cyan-400 hover:bg-cyan-950/30",
                      (isReverseGeocoding || isGeocodingAddress) && "opacity-80"
                    )}
                    variant="outline"
                  >
                    {isReverseGeocoding || isGeocodingAddress ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isReverseGeocoding ? "Finding address..." : "Converting to coordinates..."}
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4" />
                        Convert: Address ↔ Coordinates
                      </>
                    )}
                  </Button>
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
              <Input
                id="email"
                name="email"
                type="email"
                value={formState.email}
                onChange={handleInputChange}
                placeholder="For notifications about your activity"
                className="bg-gray-800/80 border-cyan-900/60"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="hyperlink" className="text-cyan-300">
                Website or Social Media (optional)
              </Label>
              <Input
                id="hyperlink"
                name="hyperlink"
                value={formState.hyperlink}
                onChange={handleInputChange}
                placeholder="e.g., https://example.com/my-initiative"
                className="bg-gray-800/80 border-cyan-900/60"
              />
            </div>

            <div className="space-y-2.5">
              <Label className="text-cyan-300">Images (optional)</Label>
              <div className="flex items-center gap-4">
                <Label 
                  htmlFor="images" 
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer border-cyan-900/50 bg-gray-800/30 hover:bg-gray-800/50 transition-colors duration-200"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-cyan-400" />
                    <p className="text-sm text-gray-400">Click to upload images</p>
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
                    <div key={idx} className="relative group">
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
  };

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center h-full">
        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
          <AlertCircle className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
          Login Required
        </h2>
        <p className="text-gray-300 max-w-md">
          You need to be logged in to submit environmental activities.
        </p>
        <div className="flex gap-4">
          <AuthButtons />
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center h-full">
        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
          <Check className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
          Submission Successful
        </h2>
        <p className="text-gray-300 max-w-md">
          {successMsg}
        </p>
        <div className="flex gap-4">
          <Button
            onClick={hideOverlay}
            className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white shadow-lg shadow-cyan-700/30"
          >
            Close
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header section */}
      <div className="px-6 py-5 border-b border-cyan-900/30 relative">
        <div className="absolute left-0 right-0 -bottom-px h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
        <div className="flex flex-col space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
            Add Environmental Activity
          </h2>
          <p className="text-sm text-gray-400">
            Share your environmental initiative with the global community
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {renderStepContent()}

          {/* Form buttons */}
          <div className="flex justify-between mt-8 pt-4 border-t border-gray-800">
            {currentStep > 1 ? (
              <Button
                type="button"
                onClick={prevStep}
                variant="outline"
                className="border-cyan-900/50 text-cyan-400 hover:bg-cyan-950/30"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button
                type="button"
                onClick={hideOverlay}
                variant="outline"
                className="border-red-900/50 text-red-400 hover:bg-red-950/30"
              >
                Cancel
              </Button>
            )}

            <Button
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
                'Submit'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 