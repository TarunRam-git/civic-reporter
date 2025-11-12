'use client';

import { useState, useEffect, FormEvent, ChangeEvent, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { QRCodeData, CreateIssueResponse, Location } from '@/types';

interface IssueFormData {
  title: string;
  description: string;
  imageData: string[];
}

function ReportIssueForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrCodeId, setQrCodeId] = useState<string | null>(null);
  const [objectType, setObjectType] = useState<string | null>(null);
  const [objectLocationName, setObjectLocationName] = useState<string | null>(null);
  const [formData, setFormData] = useState<IssueFormData>({
    title: '',
    description: '',
    imageData: []
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [objectLocation, setObjectLocation] = useState<Location | null>(null);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [distanceToObject, setDistanceToObject] = useState<number | null>(null);
  const [isWithinRange, setIsWithinRange] = useState<boolean>(false);
  const [gettingLocation, setGettingLocation] = useState<boolean>(false);

  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const objectTypeParam = searchParams.get('objectType');
    const locationNameParam = searchParams.get('locationName');
    const qrCodeIdParam = searchParams.get('qrCodeId');

    console.log('URL Params - lat:', lat, 'lng:', lng, 'objectType:', objectTypeParam, 'locationName:', locationNameParam, 'qrCodeId:', qrCodeIdParam);

    // Set QR code ID if present (indicates this came from QR scan)
    if (qrCodeIdParam) {
      setQrCodeId(qrCodeIdParam);
    } else {
      setQrCodeId(null); // Map flow: no QR code ID
    }

    // Set object details
    if (objectTypeParam && locationNameParam) {
      setObjectType(objectTypeParam);
      setObjectLocationName(decodeURIComponent(locationNameParam));
      console.log('Object details set:', { objectTypeParam, locationNameParam });
    } else {
      console.warn('Missing object parameters in URL');
    }

    // Parse object location from URL params - only if BOTH lat and lng exist and are valid
    const latNum = lat ? parseFloat(lat) : null;
    const lngNum = lng ? parseFloat(lng) : null;
    
    if (latNum !== null && lngNum !== null && !isNaN(latNum) && !isNaN(lngNum)) {
      // Valid coordinates provided
      const objLoc: Location = {
        latitude: latNum,
        longitude: lngNum
      };
      setObjectLocation(objLoc);
      console.log('Set object location from URL:', objLoc);
      
      // Immediately mark as within range (will refine with actual geolocation)
      setIsWithinRange(true);
    } else {
      // No valid coordinates in URL - will rely on geolocation
      console.log('No valid coordinates in URL - will use geolocation only');
      setObjectLocation(null);
    }

    // Get user's current location to calculate actual distance
    if (navigator.geolocation) {
      setGettingLocation(true);
      const geolocationTimeout = setTimeout(() => {
        console.warn('Geolocation timeout after 10 seconds');
        setGettingLocation(false);
        // If we got this far and still no isWithinRange, allow submission anyway
        // This handles cases where QR has no coordinates but user is trying to report
        if (!objectLocation) {
          console.log('No object location, allowing submission attempt anyway');
          setIsWithinRange(true);
        }
      }, 10000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(geolocationTimeout);
          const userLoc: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserLocation(userLoc);
          setGettingLocation(false);
          console.log('Got user location:', userLoc);

          // Calculate distance if we have object location
          if (latNum !== null && lngNum !== null && !isNaN(latNum) && !isNaN(lngNum)) {
            const objLoc: Location = {
              latitude: latNum,
              longitude: lngNum
            };
            const distance = calculateDistance(userLoc, objLoc);
            setDistanceToObject(distance);
            const withinRange = distance <= 100;
            setIsWithinRange(withinRange);
            console.log('Distance calculated:', distance, 'meters. Within range:', withinRange);
          } else {
            // No object location, so just allow submission
            setIsWithinRange(true);
            console.log('No object location in QR - allowing submission');
          }
        },
        (error) => {
          clearTimeout(geolocationTimeout);
          console.error('Geolocation error:', error);
          setGettingLocation(false);
          // Allow submission if we have any valid data
          setIsWithinRange(true);
          console.log('Geolocation failed, allowing submission attempt');
        }
      );
    } else {
      console.warn('Geolocation not available');
      // If no geolocation and we have coordinates, allow submission
      // If no coordinates and no geolocation, still allow (worst case user has to try)
      setIsWithinRange(true);
    }
  }, [searchParams]);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (loc1: Location, loc2: Location): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const dLng = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((loc1.latitude * Math.PI) / 180) *
        Math.cos((loc2.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };

  const startCamera = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setCameraStream(stream);
      setShowCamera(true);
      // Add a small delay to ensure state updates
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => console.error('Play error:', err));
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = (): void => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = (): void => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        // Get actual video dimensions
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;
        
        if (videoWidth > 0 && videoHeight > 0) {
          canvasRef.current.width = videoWidth;
          canvasRef.current.height = videoHeight;
          context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
          
          // Use high quality JPEG compression
          const imageData = canvasRef.current.toDataURL('image/jpeg', 0.95);
          
          if (imageData && imageData !== 'data:image/jpeg;base64,') {
            setCapturedImage(imageData);
            stopCamera();
          } else {
            alert('Failed to capture image. Please try again.');
          }
        } else {
          alert('Camera not ready. Please wait a moment and try again.');
        }
      }
    }
  };

  const addImage = (): void => {
    if (capturedImage && uploadedImages.length < 3) {
      setUploadedImages([...uploadedImages, capturedImage]);
      setCapturedImage(null);
      alert('Image added! You can take more photos or submit.');
    }
  };

  const removeImage = (index: number): void => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const retakePhoto = (): void => {
    setCapturedImage(null);
    startCamera();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    // Validate at least 1 image
    if (uploadedImages.length === 0) {
      alert('Please upload at least 1 image');
      return;
    }

    // Validate within 100m
    if (!isWithinRange) {
      alert('You must be within 100 meters of the object to report an issue');
      return;
    }

    // Validate object details are available
    if (!objectLocationName || !objectType) {
      alert('Object details are missing. Please start from the map.');
      console.error('Missing object details:', { objectLocationName, objectType });
      return;
    }

    const submitData = {
      ...formData,
      imageData: uploadedImages[0], // Use first image for now
      objectLocation: objectLocationName,
      objectType: objectType,
      aadharNumber: session?.user?.aadharNumber
    } as any;

    // Only include qrCodeId if it exists (came from QR scan)
    if (qrCodeId) {
      submitData.qrCodeId = qrCodeId;
    }

    console.log('Submitting issue with data:', submitData);
    console.log('qrCodeId:', qrCodeId, 'objectType:', objectType, 'objectLocationName:', objectLocationName);

    setLoading(true);

    try {
      const res = await fetch('/api/issues/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const responseData = await res.json();
      console.log('API Response:', responseData, 'Status:', res.status);

      if (res.ok) {
        const data: CreateIssueResponse = responseData;
        alert(`Issue reported successfully! Tracking ID: ${data.trackingId}`);
        router.push('/citizen/my-issues');
      } else {
        const errorData = responseData as { error?: string };
        alert(`Error reporting issue: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error during submission:', error);
      alert('Error reporting issue: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    setLoading(false);
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Report Issue</h1>

        <div className="bg-blue-300 p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4 text-black">Object Details</h2>
          {objectLocationName && objectType ? (
            <div className="space-y-2 text-gray-700">
              <p><strong>Location:</strong> {objectLocationName}</p>
              <p><strong>Type:</strong> {objectType}</p>
              {distanceToObject !== null && (
                <p><strong>Distance:</strong> {distanceToObject.toFixed(2)} meters {isWithinRange ? '✓' : '✗'}</p>
              )}
              {qrCodeId && (
                <p><strong>QR Code ID:</strong> {qrCodeId}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No object data available</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-blue-300 p-6 rounded-lg shadow">
          <div className="mb-4">
            <div className="block mb-2 font-medium text-black">Issue Title</div>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-black rounded"
              required
            />
          </div>

          <div className="mb-4">
            <div className="block mb-2 font-medium text-black">Description</div>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded border-black"
              rows={4}
              required
            />
          </div>

          <div className="mb-4">
            <div className="block mb-2 font-medium text-black">Photos ({uploadedImages.length}/3)</div>
            
            {!showCamera && !capturedImage && uploadedImages.length < 3 && (
              <button
                type="button"
                onClick={startCamera}
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 mb-3"
              >
                📷 Take Photo
              </button>
            )}

            {!showCamera && !capturedImage && uploadedImages.length >= 3 && (
              <div className="w-full bg-yellow-200 text-yellow-900 p-2 rounded mb-3 text-sm">
                ⚠️ Maximum 3 images reached
              </div>
            )}

            {showCamera && (
              <div className="space-y-2 mb-3">
                <div className="relative w-full bg-black rounded border-2 border-black" style={{ paddingBottom: '100%' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    className="absolute top-0 left-0 rounded"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                  >
                    ✓ Capture
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600"
                  >
                    ✕ Cancel
                  </button>
                </div>
              </div>
            )}

            {capturedImage && (
              <div className="space-y-2 mb-3">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full rounded border-2 border-black"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addImage}
                    disabled={uploadedImages.length >= 3}
                    className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                  >
                    ✓ Add Image
                  </button>
                  <button
                    type="button"
                    onClick={retakePhoto}
                    className="flex-1 bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600"
                  >
                    📷 Retake
                  </button>
                </div>
              </div>
            )}

            {/* Display uploaded images */}
            {uploadedImages.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-black mb-2">Uploaded Images:</p>
                <div className="grid grid-cols-3 gap-2">
                  {uploadedImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img}
                        alt={`Uploaded ${index + 1}`}
                        className="w-full h-24 object-cover rounded border border-black"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                        title="Remove image"
                      >
                        ✕
                      </button>
                      <p className="text-xs text-center text-black mt-1">#{index + 1}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Distance and image validation status */}
          <div className="space-y-3 mb-4">
            {/* Image count status */}
            <div className="p-3 rounded bg-blue-200 text-black">
              {uploadedImages.length === 0 ? (
                <p className="text-red-700 font-semibold">📸 Please upload at least 1 image</p>
              ) : (
                <p className="text-green-700 font-semibold">✓ {uploadedImages.length} image(s) uploaded</p>
              )}
            </div>

            {/* Distance status */}
            {objectLocation && (
              <div className="p-3 rounded bg-blue-200 text-black">
                {gettingLocation ? (
                  <p>📍 Getting your location...</p>
                ) : userLocation ? (
                  <>
                    <p>
                      📍 Distance to object: <strong>{distanceToObject?.toFixed(1)}m</strong>
                    </p>
                    {isWithinRange ? (
                      <p className="text-green-700 font-semibold">✓ Within 100m - You can report this issue</p>
                    ) : (
                      <p className="text-red-700 font-semibold">✕ You must be within 100m of the object to report</p>
                    )}
                  </>
                ) : (
                  <p className="text-red-700">Failed to get your location</p>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !isWithinRange || gettingLocation || uploadedImages.length === 0}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            title={
              uploadedImages.length === 0 ? 'Please upload at least 1 image' : 
              !isWithinRange ? 'You must be within 100m of the object to submit' : 
              ''
            }
          >
            {loading ? 'Submitting...' : gettingLocation ? 'Getting location...' : `Submit Issue (${uploadedImages.length}/3 images)`}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ReportIssuePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReportIssueForm />
    </Suspense>
  );
}
