'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Location, MapObject } from '@/types';

// Dynamic import to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/Citizenmap'), {
  ssr: false,
  loading: () => <div className="w-full h-screen flex items-center justify-center">Loading map...</div>
});

export default function CitizenMapPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [mapObjects, setMapObjects] = useState<MapObject[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.role !== 'citizen') {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  const enableGPS = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setGpsEnabled(true);

        // Fetch nearby objects
        await fetchNearbyObjects(latitude, longitude);
        setLoading(false);
      },
      (err) => {
        setError('Failed to get your location. Please enable GPS.');
        setLoading(false);
      }
    );
  }, []);

  const fetchNearbyObjects = async (lat: number, lng: number): Promise<void> => {
    try {
      const res = await fetch('/api/map/nearby-objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng, maxDistance: 5000 }) // 5km
      });

      const data = await res.json();
      setMapObjects(data.objects || []);
    } catch (err) {
      console.error('Error fetching nearby objects:', err);
    }
  };

  const handleObjectClick = (object: MapObject): void => {
    router.push(
      `/citizen/report-issue?objectId=${object.id}&lat=${object.location.coordinates[1]}&lng=${object.location.coordinates[0]}`
    );
  };

  if (status === 'loading' || !session) {
    return <div className="w-full h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header */}
      <div className="bg-blue-500 text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Nearby Objects</h1>
          <button
            onClick={() => router.push('/citizen/home')}
            className="bg-white text-blue-500 px-4 py-2 rounded hover:bg-gray-100"
          >
            Back to Home
          </button>
        </div>
      </div>

      {/* GPS Control */}
      <div className="bg-gray-100 p-4 border-b">
        <div className="max-w-6xl mx-auto flex items-center space-x-4">
          {!gpsEnabled ? (
            <button
              onClick={enableGPS}
              disabled={loading}
              className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 disabled:bg-gray-400"
            >
              {loading ? 'Enabling GPS...' : '📍 Enable GPS'}
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600 font-semibold">GPS Enabled</span>
              <span className="text-gray-600 text-sm ml-2">
                Found {mapObjects.length} objects nearby
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      {/* Map */}
      <div className="flex-1">
        {gpsEnabled && userLocation && (
          <MapComponent
            userLocation={userLocation}
            mapObjects={mapObjects}
            onObjectClick={handleObjectClick}
          />
        )}
        {!gpsEnabled && (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <div className="text-center">
              <p className="text-xl text-gray-700 mb-4">Enable GPS to see nearby objects on the map</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
