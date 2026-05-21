export const ENCRYPTION_PURPOSE = {
  USER: {
    NAME: 'user:name',
    EMAIL: 'user:email',
    PHONE_NUMBER: 'user:phoneNumber',
    STUDENT_NUMBER: 'user:studentNumber',
  },
  INSPECTOR: {
    NAME: 'inspector:name',
    EMAIL: 'inspector:email',
    STUDENT_NUMBER: 'inspector:studentNumber',
  },
  TARGET: {
    NAME: 'target:name',
    STUDENT_NUMBER: 'target:studentNumber',
  },
} as const;

export type EncryptionPurpose =
  | (typeof ENCRYPTION_PURPOSE.USER)[keyof typeof ENCRYPTION_PURPOSE.USER]
  | (typeof ENCRYPTION_PURPOSE.INSPECTOR)[keyof typeof ENCRYPTION_PURPOSE.INSPECTOR]
  | (typeof ENCRYPTION_PURPOSE.TARGET)[keyof typeof ENCRYPTION_PURPOSE.TARGET];
