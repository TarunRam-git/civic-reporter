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
        
        router.push(`/citizen/report-issue?qrData=${encodeURIComponent(qrData)}`);
      } catch (error) {
        alert('Invalid QR code');
        setPause(false);
      }
    }
  };

  const handleError = (error: unknown): void => {
    console.error('QR Scanner error:', error);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
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
