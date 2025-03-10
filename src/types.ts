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
}

export interface Branch {
  value: string;
  label: string;
  city?: string;
}

export interface StoredRSVP {
  id: string;
  data: RSVPFormData;
}