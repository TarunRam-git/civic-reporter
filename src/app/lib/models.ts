// Database collections structure
export const collections = {
  users: 'users',
  issues: 'issues',
  qrCodes: 'qrCodes'
};

// User schema
export const UserSchema = {
  aadharNumber: String,
  password: String, // hashed
  role: String, // 'citizen' or 'staff'
  staffId: String, // only for staff
  createdAt: Date
};

// Issue schema
export const IssueSchema = {
  trackingId: String,
  userId: String,
  aadharNumber: String,
  title: String,
  description: String,
  imageUrl: String,
  qrCodeId: String,
  objectLocation: String,
  objectType: String,
  status: String, // 'open', 'processing', 'closed'
  comments: Array,
  createdAt: Date,
  updatedAt: Date
};

// QR Code schema
export const QRCodeSchema = {
  qrCodeId: String,
  objectLocation: String,
  objectType: String, // 'streetlight', 'garbage_can', 'road', etc.
  createdBy: String,
  createdAt: Date
};
