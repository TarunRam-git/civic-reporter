'use client';

import { useState } from 'react';
import { Scanner, IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { QRCodeData } from '@/types';

export default function ScanQRPage() {
  const [scannedData, setScannedData] = useState<QRCodeData | null>(null);
  const [pause, setPause] = useState<boolean>(false);
  const router = useRouter();
  const { data: session } = useSession();

  const handleScan = async (detectedCodes: IDetectedBarcode[]): Promise<void> => {
    if (detectedCodes && detectedCodes.length > 0) {
      setPause(true);
      const qrData = detectedCodes[0].rawValue;
      
      try {
        const parsedData: QRCodeData = JSON.parse(qrData);
        setScannedData(parsedData);
        
        // Pass the same parameters as map flow does
        // This makes QR flow identical to map flow in report-issue page
        const params = new URLSearchParams();
        
        // Only add lat/lng if they actually exist and are valid numbers
        if (parsedData.latitude !== undefined && parsedData.latitude !== null && !isNaN(parsedData.latitude)) {
          params.append('lat', String(parsedData.latitude));
        }
        if (parsedData.longitude !== undefined && parsedData.longitude !== null && !isNaN(parsedData.longitude)) {
          params.append('lng', String(parsedData.longitude));
        }
        
        // Always add these required fields
        params.append('objectType', parsedData.objectType);
        params.append('locationName', parsedData.objectLocation);
        params.append('qrCodeId', parsedData.qrCodeId);
        
        console.log('QR Scan - Parsed Data:', parsedData);
        console.log('QR Scan - URL Params:', params.toString());
        
        router.push(`/citizen/report-issue?${params.toString()}`);
      } catch (error) {
        console.error('QR Parse Error:', error);
        alert('Invalid QR code');
        setPause(false);
      }
    }
  };

  const handleError = (error: unknown): void => {
    console.error('QR Scanner error:', error);
  };

  return (
    <div className="min-h-screen bg-black-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Scan QR Code</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="mb-4 text-gray-600">
            Point your camera at the QR code on the object you want to report
          </p>
          
          <div className="flex justify-center">
            <Scanner
              onScan={handleScan}
              onError={handleError}
              constraints={{ facingMode: 'environment' }}
              styles={{ container: { width: '100%', maxWidth: '500px' } }}
              paused={pause}
            />
          </div>

          <button
            onClick={() => router.back()}
            className="mt-4 w-full bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


// <div>  text {obj.views} x</div>