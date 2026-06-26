// Shared domain types — kept in sync with supabase/migrations/0001_init.sql.

export type Status =
  | "admitted"
  | "discharged"
  | "transferred"
  | "deceased"
  | "unknown";

export type VerificationStatus =
  | "unverified"
  | "community_confirmed"
  | "coordinator_verified"
  | "disputed";

export type RecordSource = "drive" | "public_report" | "coordinator";

export interface HospitalRow {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  drive_folder_id: string | null;
}

export interface RecordRow {
  id: string;
  full_name: string;
  cedula: string | null;
  hospital_id: string;
  status: Status;
  admission_date: string | null;
  age: number | null;
  sex: string | null;
  notes: string | null;
  source: RecordSource;
  source_file: string | null;
  source_row_ref: string | null;
  confidence: number;
  verification_status: VerificationStatus;
  verified_by: string | null;
  verified_at: string | null;
  needs_review: boolean;
  hidden: boolean;
  duplicate_group: string | null;
  person_id_proof_path: string | null;
  submitter_name: string | null;
  submitter_contact: string | null;
  created_at: string;
  updated_at: string;
}

/** Public-safe DTO returned to anonymous users (cédula masked, no proof/identity). */
export interface PublicRecord {
  id: string;
  fullName: string;
  hospitalId: string;
  hospitalName: string;
  status: Status;
  admissionDate: string | null;
  maskedCedula: string | null;
  verificationStatus: VerificationStatus;
}
