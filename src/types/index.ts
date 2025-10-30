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
  qrCodeId: string;
  objectLocation: string;
  objectType: ObjectType;
  status: IssueStatus;
  comments: CommentDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QRCodeDocument {
  _id?: ObjectId;
  qrCodeId: string;
  objectLocation: string;
  objectType: ObjectType;
  createdBy: string;
  createdAt: Date;
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
  qrCodeId: string;
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
}

// Component Props Types
export interface IssueCardProps {
  issue: IssueDocument;
  onStatusUpdate?: (issueId: string, status: IssueStatus) => void;
  onAddComment?: (issueId: string) => void;
  isStaff?: boolean;
}
