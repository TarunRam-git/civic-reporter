'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import dynamic from 'next/dynamic';
import {
  IssueDocument,
  IssueStatus,
  ObjectType,
  GenerateQRResponse,
  QRCodeData,
  MapObject,
  Location
} from '@/types';

// Dynamic import for components
const StaffMapComponent = dynamic(() => import('@/components/Staffmap'), { ssr: false });
const MapPicker = dynamic(() => import('@/components/Mappicker'), { ssr: false });

interface QRFormData {
  objectLocation: string;
  objectType: ObjectType | '';
  selectedObjectId?: string;  // For selecting from existing map objects
}

export default function StaffDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'issues' | 'qr' | 'objects'>('issues');
  const [issues, setIssues] = useState<IssueDocument[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [qrForm, setQrForm] = useState<QRFormData>({ objectLocation: '', objectType: '' });
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number, lng: number } | null>(null);

  // For "Manage Objects" tab
  const [objectList, setObjectList] = useState<MapObject[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.role !== 'staff') {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (activeTab === 'issues') fetchAllIssues();
    if (activeTab === 'objects') fetchObjects();
  }, [activeTab]);

  const fetchAllIssues = async () => {
    try {
      const res = await fetch('/api/issues/all');
      const data = await res.json();
      setIssues(data.issues || []);
    } catch (error) {
      console.error('Error fetching issues:', error);
    }
  };

  const fetchObjects = async () => {
    try {
      const res = await fetch('/api/map/all-objects');
      const data = await res.json();
      setObjectList(data.objects ?? []);
    } catch (error) {
      console.error('Error fetching objects:', error);
    }
  };

  // Group issues by objectLocation
  const groupedIssues = issues.reduce((acc, issue) => {
    const key = issue.objectLocation || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        objectLocation: issue.objectLocation,
        objectType: issue.objectType,
        qrCodeId: issue.qrCodeId || undefined,
        issues: []
      };
    }
    acc[key].issues.push(issue);
    return acc;
  }, {} as Record<string, { objectLocation: string; objectType: ObjectType; qrCodeId?: string; issues: IssueDocument[] }>);

  const groupedIssuesArray = Object.entries(groupedIssues).sort((a, b) => {
    // Sort by number of issues (most reported first)
    return b[1].issues.length - a[1].issues.length;
  });

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  // --- QR code tab
  const handleGenerateQR = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate location selected on map
    if (!selectedCoords) {
      alert('Please select a location on the map');
      return;
    }

    // Validate object type selected
    if (!qrForm.objectType) {
      alert('Please select an object type');
      return;
    }
    
    let objectLocationForQR = qrForm.objectLocation?.trim() || '';
    
    // If a map object is selected, use its address
    if (qrForm.selectedObjectId) {
      const selectedObject = objectList.find(obj => obj.id === qrForm.selectedObjectId);
      if (selectedObject && selectedObject.address) {
        objectLocationForQR = selectedObject.address;
      }
    }

    // Validate that we have a location name
    if (!objectLocationForQR || objectLocationForQR.length < 5) {
      alert('Please enter or select an object location with at least 5 characters');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectLocation: objectLocationForQR,
          objectType: qrForm.objectType,
          latitude: selectedCoords.lat,
          longitude: selectedCoords.lng,
          createdBy: session?.user?.staffId
        })
      });
      const data: GenerateQRResponse = await res.json();
      if (res.ok) {
        const qrData: QRCodeData = {
          qrCodeId: data.qrCodeId,
          objectLocation: objectLocationForQR,
          objectType: qrForm.objectType as ObjectType,
          latitude: selectedCoords.lat,
          longitude: selectedCoords.lng
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

  // --- Issues tab
  const handleStatusUpdate = async (issueId: string, newStatus: IssueStatus) => {
    try {
      const res = await fetch('/api/issues/update-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, status: newStatus })
      });
      if (res.ok) {
        fetchAllIssues();
        alert('Status updated');
      }
    } catch {
      alert('Error updating status');
    }
  };

  const handleAddComment = async (issueId: string) => {
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
        alert('Comment added');
      }
    } catch {
      alert('Error adding comment');
    }
  };

  const handleQRInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setQrForm({ ...qrForm, [e.target.name]: e.target.value });

  // --- Object tab, edit/delete only ---
  const handleEditObject = async (obj: MapObject) => {
    const newAddress = prompt('New address:', obj.address || "");
    if (newAddress == null) return;
    try {
      await fetch('/api/map/update-object', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: obj.id || obj._id?.toString(),
          address: newAddress
        })
      });
      fetchObjects();
    } catch {
      alert('Error editing object');
    }
  };

  const handleDeleteObject = async (objId: string) => {
    if (!confirm('Delete this object?')) return;
    try {
      await fetch('/api/map/delete-object', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: objId })
      });
      fetchObjects();
    } catch {
      alert('Error deleting object');
    }
  };

  const initialMapCenter = { latitude: 12.93081, longitude: 77.58326 };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Municipal Staff Dashboard</h1>
          <button
            onClick={() => router.push('/api/auth/signout')}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >Sign Out</button>
        </div>
        {/* Tab bar */}
        <div className="flex space-x-4 mb-6 ">
          <button
            onClick={() => setActiveTab('issues')}
            className={`px-6 py-3 rounded-lg font-medium ${activeTab === 'issues' ? 'bg-blue-500 text-white' : 'bg-white text-black'}`}
          >Manage Issues</button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`px-6 py-3 rounded-lg font-medium ${activeTab === 'qr' ? 'bg-blue-500 text-white' : 'bg-white text-black'}`}
          >Generate QR Codes</button>
          <button
            onClick={() => setActiveTab('objects')}
            className={`px-6 py-3 rounded-lg font-medium ${activeTab === 'objects' ? 'bg-blue-500 text-white' : 'bg-white text-black'}`}
          >Manage Objects</button>
        </div>

        {/* Issues Tab */}
        {activeTab === 'issues' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mb-4">Current Issues</h2>
            {issues.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <p className="text-black">No issues reported yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groupedIssuesArray.map(([groupKey, group]) => (
                  <div key={groupKey}>
                    {/* Group Header */}
                    <div
                      onClick={() => toggleGroup(groupKey)}
                      className="bg-blue-400 p-4 rounded-lg shadow cursor-pointer hover:bg-blue-500 transition"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">
                            📍 {group.objectLocation}
                          </h3>
                          <p className="text-sm text-blue-100">🏷️ {group.objectType}</p>
                        </div>
                        <div className="text-right">
                          <div className="bg-red-600 text-white rounded-full px-4 py-2 font-bold text-lg">
                            {group.issues.length} {group.issues.length === 1 ? 'Issue' : 'Issues'}
                          </div>
                          <span className="text-white text-2xl ml-2">
                            {expandedGroups.has(groupKey) ? '▼' : '▶'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Issues List */}
                    {expandedGroups.has(groupKey) && (
                      <div className="ml-4 mt-2 space-y-3 border-l-4 border-blue-400 pl-4">
                        {group.issues.map((issue) => (
                          <div key={issue._id?.toString()} className="bg-blue-300 p-4 rounded-lg shadow">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="text-lg font-semibold text-black">{issue.title}</h4>
                                <p className="text-sm text-black">Tracking ID: {issue.trackingId}</p>
                                <p className="text-xs text-gray-700">Reporter: {issue.aadharNumber}</p>
                              </div>
                              <div className="flex space-x-2 text-black">
                                <select
                                  value={issue.status}
                                  onChange={(e) => handleStatusUpdate(issue._id!.toString(), e.target.value as IssueStatus)}
                                  className="px-3 py-1 border rounded"
                                >
                                  <option className='text-black' value="open">Open</option>
                                  <option className='text-black' value="processing">Processing</option>
                                  <option className='text-black' value="closed">Closed</option>
                                </select>
                              </div>
                            </div>

                            <p className="text-black mb-3">{issue.description}</p>

                            <div className="text-sm text-black space-y-1 mb-4">
                              <p>� Reported: {new Date(issue.createdAt).toLocaleDateString()}</p>
                              <p>� QR Code ID: {issue.qrCodeId}</p>
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
                              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
                            >
                              Add Comment
                            </button>

                            {issue.comments && issue.comments.length > 0 && (
                              <div className="mt-3 bg-gray-100 p-3 rounded">
                                <h5 className="font-semibold text-black text-sm mb-2">Comments ({issue.comments.length}):</h5>
                                {issue.comments.map((comment, idx) => (
                                  <div key={idx} className="bg-white p-2 rounded mb-2 text-sm">
                                    <p className="text-black">{comment.text}</p>
                                    <p className="text-xs text-gray-600">
                                      Staff: {comment.staffId} - {new Date(comment.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QR code tab */}
        {activeTab === 'qr' && (
          <div className="bg-blue-300 p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-6 text-black ">Generate New QR Code</h2>
            <div className="mb-6">
              <div className="block text-black mb-2 font-semibold">
                Pin Location on Map&nbsp;
                <span className="text-xs text-black">(Click to set location - required)</span>
              </div>
              <MapPicker
                onPick={(lat: number, lng: number) => setSelectedCoords({ lat, lng })}
                initialCenter={{ lat: 12.93081, lng: 77.58326 }}
              />
              <div className="mt-2 text-black text-sm">
                Selected Coordinates:
                {selectedCoords
                  ? <span className="font-mono ml-2">{selectedCoords.lat.toFixed(6)}, {selectedCoords.lng.toFixed(6)}</span>
                  : <span className="ml-2 text-black">Not set</span>
                }
              </div>
            </div>
            <form onSubmit={handleGenerateQR} className="space-y-4">
              <div>
                <div className="block mb-2 font-medium text-black">Select Existing Object (Recommended)</div>
                <select
                  name="selectedObjectId"
                  value={qrForm.selectedObjectId || ''}
                  onChange={handleQRInputChange}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">-- Choose an object or enter custom location below --</option>
                  {objectList.map(obj => (
                    <option key={obj.id} value={obj.id}>
                      {obj.address} ({obj.objectType})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="block mb-2 font-medium text-black">Object Location (Description) - Select above OR enter custom location</div>
                <div className='text-black'><input
                  type="text"
                  name="objectLocation"
                  value={qrForm.objectLocation}
                  onChange={handleQRInputChange}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., Main Street Corner, Zone A (minimum 5 characters)"
                />
                </div>
                {qrForm.objectLocation && qrForm.objectLocation.length < 5 && (
                  <p className="text-red-600 text-sm mt-1">⚠️ Location must be at least 5 characters</p>
                )}
              </div>
              <div className='text-black'>
                <div className="block mb-2 font-medium text-black">Object Type</div>
                <select
                  name="objectType"
                  value={qrForm.objectType}
                  onChange={handleQRInputChange}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option className='text-black' value="" >Select type...</option>
                  <option className='text-black' value="streetlight">Street Light</option>
                  <option className='text-black' value="garbage_can">Garbage Can</option>
                  <option className='text-black' value="road">Road</option>
                  <option className='text-black' value="sidewalk">Sidewalk</option>
                  <option className='text-black' value="park">Park</option>
                  <option className='text-black' value="other">Other</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading || !selectedCoords || !qrForm.objectType || (!qrForm.selectedObjectId && qrForm.objectLocation.trim().length < 5)}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                title={!selectedCoords ? 'Select location on map' : !qrForm.objectType ? 'Select object type' : (!qrForm.selectedObjectId && qrForm.objectLocation.trim().length < 5) ? 'Enter object location (5+ chars) or select from dropdown' : ''}
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
                >Download QR Code</a>
              </div>
            )}
          </div>
        )}

        {/* Objects tab */}
        {activeTab === 'objects' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Municipal Objects Map</h2>
            <div className="rounded shadow h-[600px] mt-4 mb-6 bg-white border">
              <StaffMapComponent
                userLocation={initialMapCenter}
                selectedLocation={null}
                onMapClick={() => {}}
                objectList={objectList}
                onObjectEdit={handleEditObject}
                onObjectDelete={handleDeleteObject}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
