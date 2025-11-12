'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types';

interface FormData {
  aadharNumber: string;
  password: string;
  staffId: string;
}

export default function SignInPage() {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [role, setRole] = useState<UserRole>('citizen');
  const [formData, setFormData] = useState<FormData>({
    aadharNumber: '',
    password: '',
    staffId: ''
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, role })
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error);
          setLoading(false);
          return;
        }

        setIsSignUp(false);
        alert('Account created! Please sign in.');
      } else {
        const result = await signIn('credentials', {
          redirect: false,
          aadharNumber: formData.aadharNumber,
          password: formData.password,
          staffId: formData.staffId,
          role: role
        });

        if (result?.error) {
          setError('Invalid credentials');
        } else {
          if (role === 'staff') {
            router.push('/staff/dashboard');
          } else {
            router.push('/citizen/home');
          }
        }
      }
    } catch (err) {
      setError('An error occurred');
    }
    setLoading(false);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="bg-blue-300 p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold text-black mb-6 text-center">
          Civic Reporter
        </h1>

        <div className="flex mb-4">
          <button
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-2 ${!isSignUp ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-2 ${isSignUp ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
          >
            Sign Up
          </button>
        </div>

        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-black">Role:</label>
          <div className="flex space-x-4">
            <label className="flex items-center text-black">
              <input
                type="radio"
                value="citizen"
                checked={role === 'citizen'}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="mr-2"
              />
              Citizen
            </label>
            <label className="flex items-center text-black">
              <input
                type="radio"
                value="staff"
                checked={role === 'staff'}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="mr-2"
              />
              Municipal Staff
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-black">
              Aadhar Number
            </label>
            <input
              type="text"
              name="aadharNumber"
              value={formData.aadharNumber}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded "
              required
            />
          </div>

          {role === 'staff' && (
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-black">
                Staff ID
              </label>
              <input
                type="text"
                name="staffId"
                value={formData.staffId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-black">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
