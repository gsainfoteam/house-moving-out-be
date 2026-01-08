export interface PolicyVersion {
  version: string;
  createdAt: Date;
}

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
