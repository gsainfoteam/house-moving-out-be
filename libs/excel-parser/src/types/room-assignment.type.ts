export type ParsedExcelSet = {
  houseName: string;
  data: ParsedExcelRow[];
};

export type ParsedExcelRow = {
  room?: string;
  student1?: StudentInfo;
  student2?: StudentInfo;
  student3?: StudentInfo;
  info?: string;
};

export type StudentInfo = {
  name?: string;
  admissionYear?: string;
};

export type InfoGroup = {
  name: string;
  headers: { col1: string; col2: string };
};

export type RoomInfo = {
  houseName: string;
  roomNumber: string;
  students: Array<{
    name?: string;
    admissionYear?: string;
  }>;
};
