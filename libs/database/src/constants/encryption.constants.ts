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
    STUDENT1_NAME: 'target:student1:name',
    STUDENT1_STUDENT_NUMBER: 'target:student1:studentNumber',
    STUDENT2_NAME: 'target:student2:name',
    STUDENT2_STUDENT_NUMBER: 'target:student2:studentNumber',
    STUDENT3_NAME: 'target:student3:name',
    STUDENT3_STUDENT_NUMBER: 'target:student3:studentNumber',
  },
} as const;

export type EncryptionPurpose =
  | (typeof ENCRYPTION_PURPOSE.USER)[keyof typeof ENCRYPTION_PURPOSE.USER]
  | (typeof ENCRYPTION_PURPOSE.INSPECTOR)[keyof typeof ENCRYPTION_PURPOSE.INSPECTOR]
  | (typeof ENCRYPTION_PURPOSE.TARGET)[keyof typeof ENCRYPTION_PURPOSE.TARGET];
