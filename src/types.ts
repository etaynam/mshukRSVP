export interface RSVPFormData {
  firstName: string;
  lastName: string;
  fullName?: string;
  phone: string;
  branch: string;
  branchDisplayName?: string;
  customBranch?: string;
  needsTransportation: boolean;
  transportationNote?: string;
  submittedAt?: string;
  lastModifiedAt?: string;
  ipAddress?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
}

export interface Branch {
  value: string;
  label: string;
  city?: string;
  address?: string;
}

export interface StoredRSVP {
  id: string;
  data: RSVPFormData;
}