export interface UserConsent {
  version: string;
  agreedAt: Date;
}

export interface ConsentRequirement {
  needsConsent: boolean;
  hasNeverConsented: boolean;
  currentVersion?: string;
  requiredVersion: string;
}

export interface ConsentData {
  agreedToTerms?: boolean;
  agreedToPrivacy?: boolean;
  termsVersion?: string;
  privacyVersion?: string;
}

export interface ValidatedConsentData {
  termsVersion: string;
  privacyVersion: string;
}

export interface LatestPolicyVersionResponse {
  service: string;
  privacy: string;
  tos: string;
}

export interface LatestPolicyVersions {
  terms: string;
  privacy: string;
}
