'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useState } from 'react';

function MapClickHandler({ onPick, setMarker }) {
  useMapEvents({
    click(e) {
      setMarker(e.latlng);
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function MapPicker({ onPick, initialCenter }) {
  const [marker, setMarker] = useState(initialCenter);

  return (
    <MapContainer center={initialCenter} zoom={16} style={{ height: 250, width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      <MapClickHandler onPick={onPick} setMarker={setMarker} />
      {marker && <Marker position={[marker.lat, marker.lng]} />}
    </MapContainer>
  );
}
