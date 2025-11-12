import { DefaultSession } from 'next-auth';
import { ObjectId } from 'mongodb';

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      role: 'citizen' | 'staff';
      aadharNumber: string;
      staffId?: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: 'citizen' | 'staff';
    aadharNumber: string;
    staffId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'citizen' | 'staff';
    aadharNumber: string;
    staffId?: string;
  }
}

// Database Models
export interface UserDocument {
  _id?: ObjectId;
  aadharNumber: string;
  password: string;
  role: 'citizen' | 'staff';
  staffId?: string;
  createdAt: Date;
}

export interface CommentDocument {
  text: string;
  staffId: string;
  createdAt: Date;
}

export interface IssueDocument {
  _id?: ObjectId;
  trackingId: string;
  userId: string;
  aadharNumber: string;
  title: string;
  description: string;
  imageUrl?: string;
  imageData?: string;
  qrCodeId?: string;
  objectLocation: string;
  objectType: ObjectType;
  status: IssueStatus;
  comments: CommentDocument[];
  createdAt: Date;
  updatedAt: Date;
}

// Legacy: QRCodeDocument is now stored as CivicObject with qrCodeId field
// Kept for backward compatibility in API responses
export interface QRCodeDocument extends CivicObject {
  qrCodeId: string;
}


// Enums and Types
export type IssueStatus = 'open' | 'processing' | 'closed';
export type UserRole = 'citizen' | 'staff';
export type ObjectType = 'streetlight' | 'garbage_can' | 'road' | 'sidewalk' | 'park' | 'other';

// API Request/Response Types
export interface SignUpRequest {
  aadharNumber: string;
  password: string;
  role: UserRole;
  staffId?: string;
}

export interface SignUpResponse {
  message?: string;
  error?: string;
}

export interface CreateIssueRequest {
  title: string;
  description: string;
  imageUrl?: string;
  imageData?: string;
  qrCodeId?: string;
  objectLocation: string;
  objectType: ObjectType;
  aadharNumber: string;
}

export interface CreateIssueResponse {
  success: boolean;
  trackingId: string;
  issueId: string;
}

export interface GenerateQRRequest {
  objectLocation: string;
  objectType: ObjectType;
  createdBy: string;
  latitude?: number;
  longitude?: number;
}

export interface GenerateQRResponse {
  success: boolean;
  qrCodeId: string;
}

export interface UpdateStatusRequest {
  issueId: string;
  status: IssueStatus;
}

export interface AddCommentRequest {
  issueId: string;
  comment: CommentDocument;
}

export interface QRCodeData {
  qrCodeId: string;
  objectLocation: string;
  objectType: ObjectType;
  latitude?: number;
  longitude?: number;
}

// Component Props Types
export interface IssueCardProps {
  issue: IssueDocument;
  onStatusUpdate?: (issueId: string, status: IssueStatus) => void;
  onAddComment?: (issueId: string) => void;
  isStaff?: boolean;
}

export interface Location {
  latitude: number;
  longitude: number;
}

// Unified Civic Object - combines mapObjects and qrCodes functionality
export interface CivicObject {
  _id?: ObjectId;
  id: string; // OBJ-{timestamp}-{random} or QR-{timestamp}-{random}
  objectType: ObjectType;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  address: string; // Required: descriptive location name
  createdBy: string;
  createdAt: Date;
  // For QR codes specifically
  qrCodeId?: string; // QR-{timestamp}-{random} - included when created as QR
}

// Legacy: MapObject is now an alias for CivicObject
export type MapObject = CivicObject;
