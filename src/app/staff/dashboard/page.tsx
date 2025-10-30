'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { IssueDocument, IssueStatus, ObjectType, GenerateQRResponse, QRCodeData } from '@/types';

interface QRFormData {
  objectLocation: string;
  objectType: ObjectType | '';
}

export default function StaffDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'issues' | 'qr'>('issues');
  const [issues, setIssues] = useState<IssueDocument[]>([]);
  const [qrForm, setQrForm] = useState<QRFormData>({
    objectLocation: '',
    objectType: ''
  });
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.role !== 'staff') {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (activeTab === 'issues') {
      fetchAllIssues();
    }
  }, [activeTab]);

  const fetchAllIssues = async (): Promise<void> => {
    try {
      const res = await fetch('/api/issues/all');
      const data = await res.json();
      setIssues(data.issues || []);
    } catch (error) {
      console.error('Error fetching issues:', error);
    }
  };

  const handleGenerateQR = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...qrForm,
          createdBy: session?.user?.staffId
        })
      });

      const data: GenerateQRResponse = await res.json();

      if (res.ok) {
        const qrData: QRCodeData = {
          qrCodeId: data.qrCodeId,
          objectLocation: qrForm.objectLocation,
          objectType: qrForm.objectType as ObjectType
        };

        const qrUrl = await QRCode.toDataURL(JSON.stringify(qrData));
        setQrCodeUrl(qrUrl);
        
        alert(`QR Code generated! ID: ${data.qrCodeId}`);
      } else {
        alert('Error generating QR code');
      }
    } catch (error) {
      alert('Error generating QR code');
    }
    setLoading(false);
  };

  const handleStatusUpdate = async (issueId: string, newStatus: IssueStatus): Promise<void> => {
    try {
      const res = await fetch('/api/issues/update-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, status: newStatus })
      });

      if (res.ok) {
        fetchAllIssues();
        alert('Status updated successfully');
      }
    } catch (error) {
      alert('Error updating status');
    }
  };

  const handleAddComment = async (issueId: string): Promise<void> => {
    const comment = prompt('Enter your comment:');
    if (!comment) return;

    try {
      const res = await fetch('/api/issues/add-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueId,
          comment: {
            text: comment,
            staffId: session?.user?.staffId || '',
            createdAt: new Date()
          }
        })
      });

      if (res.ok) {
        fetchAllIssues();
        alert('Comment added successfully');
      }
    } catch (error) {
      alert('Error adding comment');
    }
  };

  const handleQRInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    setQrForm({ ...qrForm, [e.target.name]: e.target.value });
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Municipal Staff Dashboard</h1>
          <button
            onClick={() => router.push('/api/auth/signout')}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>

        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('issues')}
            className={`px-6 py-3 rounded-lg font-medium ${
              activeTab === 'issues'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700'
            }`}
          >
            Manage Issues
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`px-6 py-3 rounded-lg font-medium ${
              activeTab === 'qr'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700'
            }`}
          >
            Generate QR Codes
          </button>
        </div>

        {activeTab === 'issues' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mb-4">Current Issues</h2>
            {issues.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <p className="text-gray-500">No issues reported yet</p>
              </div>
            ) : (
              issues.map((issue) => (
                <div key={issue._id?.toString()} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{issue.title}</h3>
                      <p className="text-sm text-gray-500">
                        Tracking ID: {issue.trackingId}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <select
                        value={issue.status}
                        onChange={(e) => handleStatusUpdate(issue._id!.toString(), e.target.value as IssueStatus)}
                        className="px-3 py-1 border rounded"
                      >
                        <option value="open">Open</option>
                        <option value="processing">Processing</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-3">{issue.description}</p>

                  <div className="text-sm text-gray-600 space-y-1 mb-4">
                    <p>📍 Location: {issue.objectLocation}</p>
                    <p>🏷️ Type: {issue.objectType}</p>
                    <p>📅 Reported: {new Date(issue.createdAt).toLocaleDateString()}</p>
                  </div>

                  {issue.imageUrl && (
                    <img
                      src={issue.imageUrl}
                      alt="Issue"
                      className="rounded max-w-md mb-4"
                    />
                  )}

                  <button
                    onClick={() => handleAddComment(issue._id!.toString())}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Add Comment
                  </button>

                  {issue.comments && issue.comments.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="font-semibold mb-2">Comments:</h4>
                      {issue.comments.map((comment, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded mb-2">
                          <p className="text-sm">{comment.text}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Staff ID: {comment.staffId} - {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'qr' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-6">Generate New QR Code</h2>

            <form onSubmit={handleGenerateQR} className="space-y-4">
              <div>
                <label className="block mb-2 font-medium">Object Location</label>
                <input
                  type="text"
                  name="objectLocation"
                  value={qrForm.objectLocation}
                  onChange={handleQRInputChange}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., Main Street Corner, Zone A"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">Object Type</label>
                <select
                  name="objectType"
                  value={qrForm.objectType}
                  onChange={handleQRInputChange}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="">Select type...</option>
                  <option value="streetlight">Street Light</option>
                  <option value="garbage_can">Garbage Can</option>
                  <option value="road">Road</option>
                  <option value="sidewalk">Sidewalk</option>
                  <option value="park">Park</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {loading ? 'Generating...' : 'Generate QR Code'}
              </button>
            </form>

            {qrCodeUrl && (
              <div className="mt-8 text-center">
                <h3 className="text-xl font-semibold mb-4">Generated QR Code</h3>
                <img src={qrCodeUrl} alt="QR Code" className="mx-auto mb-4" />
                <a
                  href={qrCodeUrl}
                  download="qr-code.png"
                  className="inline-block bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
                >
                  Download QR Code
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
