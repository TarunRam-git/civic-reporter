'use client';

import { useState, useEffect, FormEvent, ChangeEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { QRCodeData, CreateIssueResponse } from '@/types';

interface IssueFormData {
  title: string;
  description: string;
  imageUrl: string;
}

function ReportIssueForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [formData, setFormData] = useState<IssueFormData>({
    title: '',
    description: '',
    imageUrl: ''
  });
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const qrParam = searchParams.get('qrData');
    if (qrParam) {
      try {
        const parsed: QRCodeData = JSON.parse(decodeURIComponent(qrParam));
        setQrData(parsed);
      } catch (error) {
        console.error('Error parsing QR data:', error);
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/issues/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          qrCodeId: qrData?.qrCodeId,
          objectLocation: qrData?.objectLocation,
          objectType: qrData?.objectType,
          aadharNumber: session?.user?.aadharNumber
        })
      });

      const data: CreateIssueResponse = await res.json();

      if (res.ok) {
        alert(`Issue reported successfully! Tracking ID: ${data.trackingId}`);
        router.push('/citizen/my-issues');
      } else {
        alert('Error reporting issue');
      }
    } catch (error) {
      alert('Error reporting issue');
    }
    setLoading(false);
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Report Issue</h1>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Object Details</h2>
          {qrData ? (
            <div className="space-y-2 text-gray-700">
              <p><strong>Location:</strong> {qrData.objectLocation}</p>
              <p><strong>Type:</strong> {qrData.objectType}</p>
              <p><strong>QR Code ID:</strong> {qrData.qrCodeId}</p>
            </div>
          ) : (
            <p className="text-gray-500">No QR data available</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
          <div className="mb-4">
            <label className="block mb-2 font-medium">Issue Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded"
              rows={4}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Image URL</label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Submitting...' : 'Submit Issue'}
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
