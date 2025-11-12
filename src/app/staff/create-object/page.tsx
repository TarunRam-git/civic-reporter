'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, ChangeEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Location, ObjectType, MapObject } from '@/types';

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
  const [addressError, setAddressError] = useState<string>('');
  const [objectList, setObjectList] = useState<MapObject[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
    else if (session?.user?.role !== 'staff') router.push('/auth/signin');
  }, [session, status, router]);

  useEffect(() => {
    async function fetchObjects() {
      const res = await fetch('/api/map/all-objects');
      const data = await res.json();
      setObjectList(data.objects ?? []);
    }
    fetchObjects();
  }, []);

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

  const validateAddress = (value: string): string => {
    if (!value || value.trim().length === 0) {
      return 'Address is required';
    }
    if (value.trim().length < 5) {
      return 'Address must be at least 5 characters';
    }
    return '';
  };

  const handleAddressChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setAddress(value);
    setAddressError(validateAddress(value));
  };

  const handleCreateObject = async (): Promise<void> => {
    // Validate address
    const error = validateAddress(address);
    if (error) {
      setAddressError(error);
      alert(error);
      return;
    }

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
        setAddress('');
        setAddressError('');
        setSelectedLocation(null);
        window.location.reload();
      } else alert(`Error creating object: ${data.error}`);
    } catch (error) {
      alert('Error creating object: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    setLoading(false);
  };

  const handleEditObject = async (obj: MapObject) => {
    const objToEdit = obj as MapObject & { objectLocation?: string; qrCodeId?: string; _id?: { toString: () => string } };
    const newAddress = prompt('New address:', obj.address ?? objToEdit.objectLocation);
    if (newAddress == null) return;
    try {
      await fetch('/api/map/update-object', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: obj.id || objToEdit.qrCodeId || objToEdit._id?.toString(),
          address: newAddress
        })
      });
      window.location.reload();
    } catch {
      alert('Error editing object');
    }
  };

  const handleDeleteObject = async (objId: string) => {
    if (!confirm('Are you sure you want to delete this object?')) return;
    try {
      await fetch('/api/map/delete-object', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: objId })
      });
      window.location.reload();
    } catch (err) {
      alert('Error deleting object');
    }
  };

  if (status === 'loading' || !session) {
    return <div className="w-full h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header */}
      <div className="bg-blue-500 text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Create/Manage Objects</h1>
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
              placeholder="Address (required - citizens will see this)"
              value={address}
              onChange={handleAddressChange}
              className={`w-full px-3 py-2 border rounded ${addressError ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              title="Citizens see this address on the map when reporting issues"
            />
            {addressError && (
              <p className="text-red-600 text-sm mt-1">⚠️ {addressError}</p>
            )}
          </div>
          <div>
            <button
              onClick={handleCreateObject}
              disabled={loading || !selectedLocation || addressError !== ''}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              title={addressError ? addressError : !selectedLocation ? 'Select a location on the map' : 'Create new civic object'}
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
            objectList={objectList}
            onObjectEdit={handleEditObject}
            onObjectDelete={handleDeleteObject}
          />
        )}
        {!gpsEnabled && (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <p className="text-xl text-gray-700">Enable GPS to create/manage objects</p>
          </div>
        )}
      </div>
    </div>
  );
}
