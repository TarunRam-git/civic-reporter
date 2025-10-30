'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IssueDocument } from '@/types';

export default function CitizenHome() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeIssues, setActiveIssues] = useState<IssueDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.role !== 'citizen') {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  useEffect(() => {
    fetchActiveIssues();
  }, []);

  const fetchActiveIssues = async (): Promise<void> => {
    try {
      const res = await fetch('/api/issues/active');
      const data = await res.json();
      setActiveIssues(data.issues || []);
    } catch (error) {
      console.error('Error fetching issues:', error);
    }
    setLoading(false);
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Civic Reporter - Citizen Portal</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/citizen/scan-qr"
            className="bg-blue-500 text-white p-6 rounded-lg text-center hover:bg-blue-600 transition"
          >
            <div className="text-xl font-semibold">Scan QR Code</div>
            <p className="text-sm mt-2">Report a new issue</p>
          </Link>

          <Link
            href="/citizen/my-issues"
            className="bg-green-500 text-white p-6 rounded-lg text-center hover:bg-green-600 transition"
          >
            <div className="text-xl font-semibold">Track Your Issues</div>
            <p className="text-sm mt-2">View your reported issues</p>
          </Link>

          <button
            onClick={() => router.push('/api/auth/signout')}
            className="bg-red-500 text-white p-6 rounded-lg text-center hover:bg-red-600 transition"
          >
            <div className="text-xl font-semibold">Sign Out</div>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Active Issues in Your Area</h2>
          
          {activeIssues.length === 0 ? (
            <p className="text-gray-500">No active issues at the moment</p>
          ) : (
            <div className="space-y-4">
              {activeIssues.map((issue) => (
                <div key={issue._id?.toString()} className="border p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{issue.title}</h3>
                      <p className="text-gray-600 mt-1">{issue.description}</p>
                      <div className="mt-2 text-sm text-gray-500">
                        <span className="mr-4">📍 {issue.objectLocation}</span>
                        <span className="mr-4">🏷️ {issue.objectType}</span>
                        <span className="mr-4">🆔 {issue.trackingId}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      issue.status === 'open' ? 'bg-yellow-200 text-yellow-800' :
                      issue.status === 'processing' ? 'bg-blue-200 text-blue-800' :
                      'bg-green-200 text-green-800'
                    }`}>
                      {issue.status}
                    </span>
                  </div>
                  {issue.imageUrl && (
                    <img src={issue.imageUrl} alt="Issue" className="mt-3 rounded max-w-xs" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
