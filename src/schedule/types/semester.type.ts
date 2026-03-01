import { Season } from 'generated/prisma/client';

export type Semester = {
  year: number;
  season: Season;
};
