'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Location, ObjectType } from '@/types';

const StaffMapComponent = dynamic(() => import('@/components/Staffmap'), {
  ssr: false,
  loading: () => <div className="w-full h-screen flex items-center justify-center">Loading map...</div>
});

export default function CreateObjectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [objectType, setObjectType] = useState<ObjectType>('streetlight');
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.role !== 'staff') {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  const enableGPS = (): void => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      setUserLocation({ latitude, longitude });
      setSelectedLocation({ latitude, longitude });
      setGpsEnabled(true);
    });
  };

  const handleMapClick = (lat: number, lng: number): void => {
    setSelectedLocation({ latitude: lat, longitude: lng });
  };

  const handleCreateObject = async (): Promise<void> => {
    if (!selectedLocation) {
      alert('Please select a location on the map');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/map/create-object', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectType,
          address,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          createdBy: session?.user?.staffId
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Object created successfully! ID: ${data.objectId}`);
        router.push('/staff/dashboard');
      } else {
        alert('Error creating object');
      }
    } catch (error) {
      alert('Error creating object');
    }
    setLoading(false);
  };

  if (status === 'loading' || !session) {
    return <div className="w-full h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header */}
      <div className="bg-blue-500 text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Create New Object</h1>
          <button
            onClick={() => router.push('/staff/dashboard')}
            className="bg-white text-blue-500 px-4 py-2 rounded hover:bg-gray-100"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-100 p-4 border-b">
        <div className="max-w-6xl mx-auto grid grid-cols-4 gap-4">
          <div>
            <button
              onClick={enableGPS}
              disabled={loading || gpsEnabled}
              className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400"
            >
              {gpsEnabled ? '✓ GPS Enabled' : '📍 Enable GPS'}
            </button>
          </div>

          <div>
            <select
              value={objectType}
              onChange={(e) => setObjectType(e.target.value as ObjectType)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="streetlight">Street Light</option>
              <option value="garbage_can">Garbage Can</option>
              <option value="road">Road</option>
              <option value="sidewalk">Sidewalk</option>
              <option value="park">Park</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <input
              type="text"
              placeholder="Address (optional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <button
              onClick={handleCreateObject}
              disabled={loading || !selectedLocation}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Object'}
            </button>
          </div>
        </div>

        {selectedLocation && (
          <div className="mt-2 text-sm text-gray-700">
            Selected: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1">
        {gpsEnabled && userLocation && (
          <StaffMapComponent
            userLocation={userLocation}
            selectedLocation={selectedLocation}
            onMapClick={handleMapClick}
          />
        )}
        {!gpsEnabled && (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <p className="text-xl text-gray-700">Enable GPS to create objects</p>
          </div>
        )}
      </div>
    </div>
  );
}
