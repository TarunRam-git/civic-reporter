'use client';

import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Location } from '@/types';

interface StaffMapProps {
  userLocation: Location;
  selectedLocation: Location | null;
  onMapClick: (lat: number, lng: number) => void;
}

const userIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/747/747376.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const selectedIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1197/1197764.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

function MapClickHandler({
  onMapClick
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });

  return null;
}

export default function StaffMap({
  userLocation,
  selectedLocation,
  onMapClick
}: StaffMapProps) {
  return (
    <MapContainer
      center={[userLocation.latitude, userLocation.longitude]}
      zoom={16}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      <MapClickHandler onMapClick={onMapClick} />

      {/* User Location */}
      <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon} />

      {/* Selected Location */}
      {selectedLocation && (
        <Marker
          position={[selectedLocation.latitude, selectedLocation.longitude]}
          icon={selectedIcon}
        />
      )}

      {/* Search Radius */}
      <Circle
        center={[userLocation.latitude, userLocation.longitude]}
        radius={1000}
        pathOptions={{ color: 'blue', fillOpacity: 0.1 }}
      />
    </MapContainer>
  );
}
