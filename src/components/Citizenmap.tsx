'use client';

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Location, MapObject } from '@/types';

interface CitizenMapProps {
  userLocation: Location;
  mapObjects: MapObject[];
  onObjectClick: (object: MapObject) => void;
}

// Custom icons
const userIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/747/747376.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const objectIcon = (type: string) => {
  const icons: { [key: string]: string } = {
    streetlight: 'https://cdn-icons-png.flaticon.com/512/2058/2058505.png',
    garbage_can: 'https://cdn-icons-png.flaticon.com/512/1631/1631486.png',
    road: 'https://cdn-icons-png.flaticon.com/512/1524/1524821.png',
    sidewalk: 'https://cdn-icons-png.flaticon.com/512/2436/2436481.png',
    park: 'https://cdn-icons-png.flaticon.com/512/1379/1379790.png',
    other: 'https://cdn-icons-png.flaticon.com/512/1160/1160358.png'
  };
  return L.icon({
    iconUrl: icons[type] || icons.other,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
};

export default function CitizenMap({
  userLocation,
  mapObjects,
  onObjectClick
}: CitizenMapProps) {
  return (
    <MapContainer
      center={[userLocation.latitude, userLocation.longitude]}
      zoom={16}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      {/* Citizen current location */}
      <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
        <Popup>Your Location</Popup>
      </Marker>
      {/* Visual search radius */}
      <Circle
        center={[userLocation.latitude, userLocation.longitude]}
        radius={5000}
        pathOptions={{ color: 'blue', fillOpacity: 0.1 }}
      />
      {/* Municipal tagged objects */}
      {mapObjects.map((obj) => {
        // For your interface: _id (ObjectId), id (string), address (string), etc.
        // [longitude, latitude] in obj.location.coordinates
        const key = obj.id || obj._id?.toString();
        const lat = obj.location.coordinates[1];
        const lng = obj.location.coordinates[0];
        return (
          <Marker
            key={key}
            position={[lat, lng]}
            icon={objectIcon(obj.objectType)}
            eventHandlers={{
              click: () => onObjectClick(obj)
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold capitalize">{obj.objectType}</p>
                <p className="text-gray-600">{obj.address}</p>
                <button
                  onClick={() => onObjectClick(obj)}
                  className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                >
                  Report Issue
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
