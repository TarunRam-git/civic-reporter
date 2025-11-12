'use client';

import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Location, MapObject, ObjectType } from '@/types';

interface StaffMapProps {
  userLocation: Location;
  selectedLocation: Location | null;
  onMapClick: (lat: number, lng: number) => void;
  objectList: MapObject[];
  onObjectEdit: (obj: MapObject) => void;
  onObjectDelete: (objId: string) => void;
}

const userIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/747/747376.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const objectIcon = (type: ObjectType) =>
  L.icon({
    iconUrl: `https://cdn-icons-png.flaticon.com/512/${
      type === 'streetlight'
        ? '2058/2058505'
        : type === 'garbage_can'
        ? '1631/1631486'
        : type === 'road'
        ? '1524/1524821'
        : type === 'sidewalk'
        ? '2436/2436481'
        : type === 'park'
        ? '1379/1379790'
        : '1160/1160358'
    }.png`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });

export default function StaffMap({
  userLocation,
  objectList,
  onObjectEdit,
  onObjectDelete,
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
      <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon} />
      {objectList
        .filter(
          (obj) =>
            obj.location &&
            Array.isArray(obj.location.coordinates) &&
            obj.location.coordinates.length === 2
        )
        .map((obj) => (
          <Marker
            key={obj.id || obj._id?.toString() || Math.random().toString()}
            position={[
              obj.location.coordinates[1], // latitude
              obj.location.coordinates[0], // longitude
            ]}
            icon={objectIcon(obj.objectType)}
          >
            <Popup>
              <div>
                <p>Type: {obj.objectType}</p>
                <p>Address: {obj.address || ""}</p>
                <button
                  className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                  onClick={() => onObjectEdit(obj)}
                >
                  Edit
                </button>
                <button
                  className="bg-red-500 text-white px-2 py-1 rounded"
                  onClick={() =>
                    onObjectDelete(obj.id || obj._id?.toString() || "")
                  }
                >
                  Delete
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      <Circle
        center={[userLocation.latitude, userLocation.longitude]}
        radius={1000}
        pathOptions={{ color: 'blue', fillOpacity: 0.1 }}
      />
    </MapContainer>
  );
}
