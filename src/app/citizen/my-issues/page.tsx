'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { IssueDocument } from '@/types';

export default function MyIssuesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [issues, setIssues] = useState<IssueDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (session?.user?.aadharNumber) {
      fetchMyIssues();
    }
  }, [session]);

  const fetchMyIssues = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/issues/my-issues?aadharNumber=${session?.user?.aadharNumber}`);
      const data = await res.json();
      setIssues(data.issues || []);
    } catch (error) {
      console.error('Error fetching issues:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Your Reported Issues</h1>
          <button
            onClick={() => router.back()}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back to Home
          </button>
        </div>

        {issues.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-white">You haven&apos;t reported any issues yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {issues.map((issue) => (
              <div key={issue._id?.toString()} className="bg-blue-300 p-6 rounded-lg shadow text-black ">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{issue.title}</h2>
                    <p className="text-sm  mt-1">
                      Tracking ID: {issue.trackingId}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    issue.status === 'open' ? 'bg-yellow-200 text-yellow-800' :
                    issue.status === 'processing' ? 'bg-blue-200 text-blue-800' :
                    'bg-green-200 text-green-800'
                  }`}>
                    {issue.status.toUpperCase()}
                  </span>
                </div>

                <p className=" mb-3">{issue.description}</p>

                <div className="text-sm  space-y-1">
                  <p>📍 Location: {issue.objectLocation}</p>
                  <p>🏷️ Type: {issue.objectType}</p>
                  <p>📅 Reported: {new Date(issue.createdAt).toLocaleDateString()}</p>
                </div>

                {issue.imageUrl && (
                  <img
                    src={issue.imageUrl}
                    alt="Issue"
                    className="mt-4 rounded max-w-md"
                  />
                )}

                {issue.comments && issue.comments.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h3 className="font-semibold mb-2">Comments from Staff:</h3>
                    {issue.comments.map((comment, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded mb-2">
                        <p className="text-sm">{comment.text}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(comment.createdAt).toLocaleString()}
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
    </div>
  );
}
