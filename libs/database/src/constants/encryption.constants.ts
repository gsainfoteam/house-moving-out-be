const USER = {
  NAME: 'user:name',
  EMAIL: 'user:email',
  PHONE_NUMBER: 'user:phoneNumber',
  STUDENT_NUMBER: 'user:studentNumber',
} as const;

const INSPECTOR = {
  NAME: 'inspector:name',
  EMAIL: 'inspector:email',
  STUDENT_NUMBER: 'inspector:studentNumber',
} as const;

const TARGET = {
  STUDENT1_NAME: 'target:student1:name',
  STUDENT1_STUDENT_NUMBER: 'target:student1:studentNumber',
  STUDENT2_NAME: 'target:student2:name',
  STUDENT2_STUDENT_NUMBER: 'target:student2:studentNumber',
  STUDENT3_NAME: 'target:student3:name',
  STUDENT3_STUDENT_NUMBER: 'target:student3:studentNumber',
} as const;

const APPLICATION = {
  DOCUMENT: 'application:document',
} as const;

export const ENCRYPTION_PURPOSE = {
  USER,
  INSPECTOR,
  TARGET,
  APPLICATION,
} as const;

export type EncryptionPurpose =
  | (typeof USER)[keyof typeof USER]
  | (typeof INSPECTOR)[keyof typeof INSPECTOR]
  | (typeof TARGET)[keyof typeof TARGET]
  | (typeof APPLICATION)[keyof typeof APPLICATION];
