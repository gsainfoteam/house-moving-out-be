import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Gender,
  InspectionTargetInfo,
  MoveOutSchedule,
  RoomInspectionType,
  ScheduleStatus,
  Season,
} from 'generated/prisma/client';
import { Semester } from './types/semester.type';
import { Loggable } from '@lib/logger';
import * as ExcelJS from 'exceljs';
import {
  RoomInfo,
  ExcelParserService,
  ExcelValidatorService,
} from '@lib/excel-parser';
import {
  DatabaseService,
  MoveOutScheduleWithSlots,
  MoveOutScheduleRepository,
  InspectionSlotRepository,
  InspectionTargetInfoRepository,
  SemesterRepository,
  InspectionApplicationRepository,
  InspectorRepository,
  PrismaTransaction,
} from '@lib/database';
import { User } from 'generated/prisma/client';
import { InspectorResDto } from 'src/inspector/dto/res/inspector-res.dto';
import {
  CreateMoveOutScheduleWithTargetsDto,
  InspectionTimeRange,
} from './dto/req/create-move-out-schedule-with-targets.dto';
import { InspectionTargetStudent } from './types/inspection-target.type';
import { InspectionTargetCount } from './types/inspection-target-count.type';
import { BulkUpdateCleaningServiceDto } from './dto/req/bulk-update-cleaning-service.dto';
import { InspectionTargetsGroupedByRoomResDto } from './dto/res/find-all-inspection-target-infos-res.dto';
import { ApplicationListQueryDto } from 'src/schedule/dto/req/application-list-query.dto';
import { ApplicationListResDto } from 'src/application/dto/res/application-res.dto';
import { FileService } from '@lib/file';
import { PDFDocument } from 'pdf-lib';
import pLimit from 'p-limit';

@Loggable()
@Injectable()
export class ScheduleService {
  private readonly WEIGHT_FACTOR = 1.5;
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly excelParserService: ExcelParserService,
    private readonly excelValidatorService: ExcelValidatorService,
    private readonly fileService: FileService,
    private readonly moveOutScheduleRepository: MoveOutScheduleRepository,
    private readonly inspectionSlotRepository: InspectionSlotRepository,
    private readonly inspectionTargetInfoRepository: InspectionTargetInfoRepository,
    private readonly semesterRepository: SemesterRepository,
    private readonly inspectionApplicationRepository: InspectionApplicationRepository,
    private readonly inspectorRepository: InspectorRepository,
  ) {}

  async findAllMoveOutSchedules(): Promise<MoveOutSchedule[]> {
    return await this.moveOutScheduleRepository.findAllMoveOutSchedules();
  }

  async createMoveOutScheduleWithTargets(
    currentSemesterFile: Express.Multer.File,
    nextSemesterFile: Express.Multer.File,
    {
      title,
      applicationStartTime,
      applicationEndTime,
      currentYear,
      currentSeason,
      nextYear,
      nextSeason,
      inspectionTimeRange,
      residentGenderByHouseFloorKey,
    }: CreateMoveOutScheduleWithTargetsDto,
  ): Promise<MoveOutSchedule> {
    this.validateScheduleAndRanges(
      applicationStartTime,
      applicationEndTime,
      inspectionTimeRange,
    );

    const currentSemester: Semester = {
      year: currentYear,
      season: currentSeason,
    };
    const nextSemester: Semester = {
      year: nextYear,
      season: nextSeason,
    };

    this.validateSemesterOrder(currentSemester, nextSemester);

    const { inspectionTargets, targetCounts } =
      await this.generateInspectionTargetsAndCounts(
        currentSemesterFile,
        nextSemesterFile,
        residentGenderByHouseFloorKey,
      );

    const currentSemesterEntity =
      await this.semesterRepository.findOrCreateSemester(
        currentSemester.year,
        currentSemester.season,
      );
    const nextSemesterEntity =
      await this.semesterRepository.findOrCreateSemester(
        nextSemester.year,
        nextSemester.season,
      );

    const baseSlots = inspectionTimeRange.map((slot) => ({
      startTime: slot.start,
      endTime: slot.end,
    }));

    const { maleCapacity, femaleCapacity } = this.calculateCapacity(
      baseSlots.length,
      targetCounts,
      this.WEIGHT_FACTOR,
    );

    const slotsData = baseSlots.flatMap((slot) => [
      {
        ...slot,
        gender: Gender.MALE,
        capacity: maleCapacity,
      },
      {
        ...slot,
        gender: Gender.FEMALE,
        capacity: femaleCapacity,
      },
    ]);

    const scheduleData = {
      title,
      applicationStartTime,
      applicationEndTime,
      currentSemesterUuid: currentSemesterEntity.uuid,
      nextSemesterUuid: nextSemesterEntity.uuid,
    };

    return await this.databaseService.$transaction(
      async (tx: PrismaTransaction) => {
        const schedule =
          await this.moveOutScheduleRepository.createMoveOutScheduleInTx(
            scheduleData,
            slotsData,
            tx,
          );

        await this.inspectionTargetInfoRepository.createInspectionTargetsInTx(
          schedule.uuid,
          inspectionTargets,
          tx,
        );

        return schedule;
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  async findMoveOutScheduleWithSlots(
    uuid: string,
  ): Promise<MoveOutScheduleWithSlots> {
    return await this.moveOutScheduleRepository.findMoveOutScheduleWithSlotsByUuid(
      uuid,
    );
  }

  async findActiveMoveOutScheduleWithSlots(): Promise<MoveOutScheduleWithSlots> {
    return await this.moveOutScheduleRepository.findActiveMoveOutScheduleWithSlots();
  }

  async findInspectorsByScheduleUuid(uuid: string): Promise<InspectorResDto[]> {
    const inspectors =
      await this.inspectorRepository.findInspectorByScheduleUuid(uuid);
    return inspectors.map((inspector) => new InspectorResDto(inspector));
  }

  async findApplicationsByScheduleUuid(
    { offset, limit }: ApplicationListQueryDto,
    scheduleUuid: string,
  ): Promise<ApplicationListResDto> {
    const [applications, totalCount] = await Promise.all([
      this.inspectionApplicationRepository.findApplicationsByScheduleUuid(
        offset ?? 0,
        limit ?? 20,
        scheduleUuid,
      ),
      this.inspectionApplicationRepository.countApplications(scheduleUuid),
    ]);
    return new ApplicationListResDto(
      await Promise.all(
        applications.map(async (app) => ({
          ...app,
          document:
            app.document === null
              ? null
              : await this.fileService.getUrl(app.document),
        })),
      ),
      totalCount,
    );
  }

  async updateInspectionTargetsAndUpdateSlotCapacities(
    currentSemesterFile: Express.Multer.File,
    nextSemesterFile: Express.Multer.File,
    residentGenderByHouseFloorKey: Record<string, Gender>,
    scheduleUuid: string,
  ): Promise<{ count: number }> {
    const { inspectionTargets, targetCounts } =
      await this.generateInspectionTargetsAndCounts(
        currentSemesterFile,
        nextSemesterFile,
        residentGenderByHouseFloorKey,
      );

    return await this.databaseService.$transaction(
      async (tx: PrismaTransaction) => {
        const schedule =
          await this.moveOutScheduleRepository.findMoveOutScheduleWithSlotsByUuidWithXLockInTx(
            scheduleUuid,
            tx,
          );

        const now = new Date();
        if (now >= schedule.applicationStartTime) {
          throw new ForbiddenException(
            'Inspection targets cannot be replaced after the application period has started.',
          );
        }

        if (!schedule.inspectionSlots?.length) {
          throw new BadRequestException(
            'Schedule has no slots. Cannot update inspection targets.',
          );
        }

        const slotCount = schedule.inspectionSlots.length;
        const { maleCapacity, femaleCapacity } = this.calculateCapacity(
          slotCount,
          targetCounts,
          this.WEIGHT_FACTOR,
        );

        await this.inspectionTargetInfoRepository.deleteInspectionTargetsByScheduleUuidInTx(
          scheduleUuid,
          tx,
        );

        const createdCount =
          await this.inspectionTargetInfoRepository.createInspectionTargetsInTx(
            scheduleUuid,
            inspectionTargets,
            tx,
          );

        await this.inspectionSlotRepository.updateSlotCapacitiesByScheduleUuidInTx(
          scheduleUuid,
          maleCapacity,
          femaleCapacity,
          tx,
        );

        return createdCount;
      },
    );
  }

  async bulkUpdateCleaningService(
    scheduleUuid: string,
    { targetUuids, applyCleaningService }: BulkUpdateCleaningServiceDto,
  ): Promise<void> {
    const uniqueTargetUuids = [...new Set(targetUuids)];

    await this.databaseService.$transaction(async (tx: PrismaTransaction) => {
      const schedule =
        await this.moveOutScheduleRepository.findMoveOutScheduleWithSlotsByUuidWithXLockInTx(
          scheduleUuid,
          tx,
        );

      if (schedule.status !== ScheduleStatus.DRAFT) {
        throw new ForbiddenException(
          'Cleaning service application can be modified only when the schedule status is DRAFT.',
        );
      }

      const count =
        await this.inspectionTargetInfoRepository.countInspectionTargetsByScheduleAndUuidsInTx(
          scheduleUuid,
          uniqueTargetUuids,
          tx,
        );

      if (count !== uniqueTargetUuids.length) {
        throw new BadRequestException(
          'Request contains invalid inspection target UUID(s).',
        );
      }

      await this.inspectionTargetInfoRepository.updateApplyCleaningServiceByScheduleAndUuidsInTx(
        scheduleUuid,
        uniqueTargetUuids,
        applyCleaningService,
        tx,
      );
    });
  }

  async updateStatus(uuid: string, newStatus: ScheduleStatus): Promise<void> {
    const schedule =
      await this.moveOutScheduleRepository.findMoveOutScheduleWithUuid(uuid);

    const allowedTransitions: Record<ScheduleStatus, ScheduleStatus[]> = {
      [ScheduleStatus.DRAFT]: [ScheduleStatus.ACTIVE, ScheduleStatus.CANCELED],
      [ScheduleStatus.ACTIVE]: [
        ScheduleStatus.COMPLETED,
        ScheduleStatus.CANCELED,
      ],
      [ScheduleStatus.COMPLETED]: [],
      [ScheduleStatus.CANCELED]: [],
    };

    if (!allowedTransitions[schedule.status].includes(newStatus)) {
      throw new ForbiddenException(
        `Invalid status transition: ${schedule.status} -> ${newStatus}`,
      );
    }

    if (
      schedule.status === ScheduleStatus.DRAFT &&
      newStatus === ScheduleStatus.ACTIVE
    ) {
      const slotsWithInspectorCount =
        await this.inspectionSlotRepository.findSlotsWithInspectorCountByScheduleUuid(
          uuid,
        );

      const slotsWithoutInspector = slotsWithInspectorCount.filter(
        (slot) => slot._count.inspectors === 0,
      );

      if (slotsWithoutInspector.length > 0) {
        throw new ForbiddenException(
          'All inspection slots must have at least one inspector assigned before activating the schedule.',
        );
      }
    }

    await this.moveOutScheduleRepository.updateMoveOutSchedule(uuid, {
      status: newStatus,
    });
  }

  async findTargetInfoByUserInfo(
    user: User,
  ): Promise<InspectionTargetInfo | null> {
    try {
      const schedule =
        await this.moveOutScheduleRepository.findActiveSchedule();

      const targetInfo =
        await this.inspectionTargetInfoRepository.findInspectionTargetInfoByUserInfo(
          user.studentNumber,
          user.name,
          schedule.uuid,
        );

      return targetInfo;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        return null;
      throw error;
    }
  }

  async findAllInspectionTargetInfoByScheduleUuid(
    scheduleUuid: string,
  ): Promise<InspectionTargetsGroupedByRoomResDto[]> {
    const inspectionTargetInfosWithApplications =
      await this.inspectionTargetInfoRepository.findAllInspectionTargetInfoWithApplicationAndSlotByScheduleUuid(
        scheduleUuid,
      );
    return inspectionTargetInfosWithApplications.map(
      (target): InspectionTargetsGroupedByRoomResDto => {
        const residents = [
          target.student1Name && target.student1StudentNumber
            ? {
                studentNumber: target.student1StudentNumber,
                name: target.student1Name,
              }
            : null,
          target.student2Name && target.student2StudentNumber
            ? {
                studentNumber: target.student2StudentNumber,
                name: target.student2Name,
              }
            : null,
          target.student3Name && target.student3StudentNumber
            ? {
                studentNumber: target.student3StudentNumber,
                name: target.student3Name,
              }
            : null,
        ].filter(
          (v): v is { studentNumber: string; name: string } => v !== null,
        );

        const [latestApplication, previousApplication] =
          target.inspectionApplication;

        let lastInspectionTime: Date | null = null;

        if (latestApplication && latestApplication.isPassed !== null) {
          lastInspectionTime = latestApplication.updatedAt;
        } else if (
          previousApplication &&
          previousApplication.isPassed !== null
        ) {
          lastInspectionTime = previousApplication.updatedAt;
        }

        return {
          uuid: target.uuid,
          houseName: target.houseName,
          roomNumber: target.roomNumber,
          residents,
          inspectionType: target.inspectionType,
          inspectionCount: target.inspectionCount,
          applyCleaningService: target.applyCleaningService,
          lastInspectionTime,
          isPassed: latestApplication?.isPassed ?? null,
          gender: target.gender,
        };
      },
    );
  }

  private findInspectionTargetRooms(
    currentSemesterRooms: Map<string, RoomInfo>,
    nextSemesterRooms: Map<string, RoomInfo>,
  ): InspectionTargetStudent[] {
    const inspectionTargets: InspectionTargetStudent[] = [];

    for (const [
      roomKey,
      currentSemesterRoom,
    ] of currentSemesterRooms.entries()) {
      const nextSemesterRoom = nextSemesterRooms.get(roomKey);

      const originalStudents = currentSemesterRoom.students.filter(
        (s): s is { name: string; studentNumber: string } =>
          !!s && !!s.name && !!s.studentNumber,
      );

      const leavingStudents = originalStudents
        .filter((current) => {
          if (!nextSemesterRoom || nextSemesterRoom.students.length === 0) {
            return true;
          }
          return !nextSemesterRoom.students.some(
            (next) =>
              current.name === next.name &&
              current.studentNumber === next.studentNumber,
          );
        })
        .map((s) => ({
          studentName: s.name,
          studentNumber: s.studentNumber,
        }));

      const originalCount = originalStudents.length;
      const leavingCount = leavingStudents.length;

      const roomCapacity = currentSemesterRoom.roomCapacity;

      if (!Number.isFinite(roomCapacity) || roomCapacity <= 0) {
        throw new BadRequestException(
          `Invalid room capacity. Check Excel data for houseName=${currentSemesterRoom.houseName}, roomNumber=${currentSemesterRoom.roomNumber}`,
        );
      }

      if (originalCount > 0 && leavingCount === 0) {
        continue;
      }

      if (currentSemesterRoom.limitType === '기타' || originalCount === 0) {
        inspectionTargets.push({
          houseName: currentSemesterRoom.houseName,
          gender: currentSemesterRoom.gender,
          roomNumber: currentSemesterRoom.roomNumber,
          roomCapacity,
          students: [],
          inspectionType: RoomInspectionType.EMPTY,
          applyCleaningService: false,
        });
        continue;
      }

      if (originalCount === leavingCount) {
        inspectionTargets.push({
          houseName: currentSemesterRoom.houseName,
          gender: currentSemesterRoom.gender,
          roomNumber: currentSemesterRoom.roomNumber,
          roomCapacity,
          students: leavingStudents.slice(0, 3),
          inspectionType: RoomInspectionType.FULL,
          applyCleaningService: false,
        });
        continue;
      }

      if (roomCapacity === 3 && leavingCount === 2) {
        const [student1, student2] = leavingStudents;
        const baseRoomNumber = currentSemesterRoom.roomNumber;

        if (student1) {
          inspectionTargets.push({
            houseName: currentSemesterRoom.houseName,
            gender: currentSemesterRoom.gender,
            roomNumber: `${baseRoomNumber}-1`,
            roomCapacity,
            students: [student1],
            inspectionType: RoomInspectionType.SOLO,
            applyCleaningService: false,
          });
        }

        if (student2) {
          inspectionTargets.push({
            houseName: currentSemesterRoom.houseName,
            gender: currentSemesterRoom.gender,
            roomNumber: `${baseRoomNumber}-2`,
            roomCapacity,
            students: [student2],
            inspectionType: RoomInspectionType.SOLO,
            applyCleaningService: false,
          });
        }
        continue;
      }

      if ((roomCapacity === 3 || roomCapacity === 2) && leavingCount === 1) {
        inspectionTargets.push({
          houseName: currentSemesterRoom.houseName,
          gender: currentSemesterRoom.gender,
          roomNumber: currentSemesterRoom.roomNumber,
          roomCapacity,
          students: leavingStudents.slice(0, 1),
          inspectionType: RoomInspectionType.SOLO,
          applyCleaningService: false,
        });
        continue;
      }

      inspectionTargets.push({
        houseName: currentSemesterRoom.houseName,
        gender: currentSemesterRoom.gender,
        roomNumber: currentSemesterRoom.roomNumber,
        roomCapacity,
        students: leavingStudents.slice(0, 3),
        inspectionType: RoomInspectionType.FULL,
        applyCleaningService: false,
      });
    }

    return inspectionTargets;
  }

  private async generateInspectionTargetsAndCounts(
    currentSemesterFile: Express.Multer.File,
    nextSemesterFile: Express.Multer.File,
    residentGenderByHouseFloorKey: Record<string, Gender>,
  ): Promise<{
    inspectionTargets: InspectionTargetStudent[];
    targetCounts: InspectionTargetCount;
  }> {
    await this.excelValidatorService.validateExcelFile(currentSemesterFile);
    await this.excelValidatorService.validateExcelFile(nextSemesterFile);

    if (!currentSemesterFile.buffer || !nextSemesterFile.buffer) {
      throw new BadRequestException('File buffer is missing');
    }

    const currentWorkbook = new ExcelJS.Workbook();
    const nextWorkbook = new ExcelJS.Workbook();
    // @ts-expect-error - Express.Multer.File의 buffer 타입과 ExcelJS가 기대하는 Buffer 타입이 불일치하지만 런타임에서는 정상 동작
    await currentWorkbook.xlsx.load(currentSemesterFile.buffer);
    // @ts-expect-error - Express.Multer.File의 buffer 타입과 ExcelJS가 기대하는 Buffer 타입이 불일치하지만 런타임에서는 정상 동작
    await nextWorkbook.xlsx.load(nextSemesterFile.buffer);

    const currentSemesterSheet = currentWorkbook.worksheets[0];
    const nextSemesterSheet = nextWorkbook.worksheets[0];

    if (!currentSemesterSheet || !nextSemesterSheet) {
      throw new BadRequestException('Excel file has invalid sheets');
    }

    const currentSemesterRooms =
      this.excelParserService.parseSheetToRoomInfoMap(
        currentSemesterSheet,
        residentGenderByHouseFloorKey,
      );
    const nextSemesterRooms = this.excelParserService.parseSheetToRoomInfoMap(
      nextSemesterSheet,
      residentGenderByHouseFloorKey,
    );

    const inspectionTargets = this.findInspectionTargetRooms(
      currentSemesterRooms,
      nextSemesterRooms,
    );

    const targetCounts =
      this.calculateTargetCountsFromInspectionTargets(inspectionTargets);

    return {
      inspectionTargets,
      targetCounts,
    };
  }

  private calculateCapacity(
    totalSlots: number,
    targetCounts: InspectionTargetCount,
    weightFactor: number,
  ): {
    maleCapacity: number;
    femaleCapacity: number;
  } {
    const totalTargetCount = targetCounts.male + targetCounts.female;
    const weightedTotalCount = totalTargetCount * weightFactor;
    const totalCapacity = Math.ceil(weightedTotalCount / totalSlots);

    if (totalTargetCount === 0) {
      return {
        maleCapacity: 0,
        femaleCapacity: 0,
      };
    }

    const maleRatio = targetCounts.male / totalTargetCount;
    const femaleRatio = targetCounts.female / totalTargetCount;

    const maleCapacity = Math.ceil(totalCapacity * maleRatio);
    const femaleCapacity = Math.ceil(totalCapacity * femaleRatio);

    return {
      maleCapacity,
      femaleCapacity,
    };
  }

  private calculateTargetCountsFromInspectionTargets(
    inspectionTargets: InspectionTargetStudent[],
  ): InspectionTargetCount {
    const counts: InspectionTargetCount = { male: 0, female: 0 };

    for (const { gender } of inspectionTargets) {
      if (gender === Gender.MALE) {
        counts.male += 1;
      } else {
        counts.female += 1;
      }
    }

    if (counts.male === 0 && counts.female === 0) {
      throw new BadRequestException(
        'Inspection target info not found for the given semesters.',
      );
    }

    return counts;
  }

  private validateScheduleAndRanges(
    applicationStartTime: Date,
    applicationEndTime: Date,
    inspectionTimeRange: InspectionTimeRange[],
  ): void {
    if (!inspectionTimeRange || inspectionTimeRange.length === 0) {
      throw new BadRequestException('Inspection time range must be provided.');
    }

    inspectionTimeRange.sort((a, b) => a.start.getTime() - b.start.getTime());

    for (let i = 0; i < inspectionTimeRange.length; i++) {
      const currentStartTime = inspectionTimeRange[i].start.getTime();
      const currentEndTime = inspectionTimeRange[i].end.getTime();

      if (currentStartTime >= currentEndTime) {
        throw new BadRequestException(
          `Inspection range #${i + 1}: start time must be before end time.`,
        );
      }

      if (i > 0) {
        const prevEnd = inspectionTimeRange[i - 1].end.getTime();
        if (currentStartTime < prevEnd) {
          throw new BadRequestException(
            'Inspection time ranges must not overlap.',
          );
        }
      }
    }

    const inspectionStartTime = inspectionTimeRange[0].start;
    const inspectionEndTime =
      inspectionTimeRange[inspectionTimeRange.length - 1].end;

    if (applicationStartTime > applicationEndTime) {
      throw new BadRequestException(
        'Application start date cannot be after application end date',
      );
    }
    if (inspectionStartTime > inspectionEndTime) {
      throw new BadRequestException(
        'Inspection start date cannot be after inspection end date',
      );
    }
    if (applicationStartTime > inspectionStartTime) {
      throw new BadRequestException(
        'Application start date cannot be after inspection start date',
      );
    }
    if (applicationEndTime > inspectionEndTime) {
      throw new BadRequestException(
        'Application end date cannot be after inspection end date',
      );
    }
  }

  private validateSemesterOrder(
    currentSemester: Semester,
    nextSemester: Semester,
  ): void {
    const { year: currentYear, season: currentSeason } = currentSemester;
    const { year: nextYear, season: nextSeason } = nextSemester;

    if (currentYear > nextYear) {
      throw new BadRequestException(
        `Current semester (${currentYear} ${currentSeason}) must be before next semester (${nextYear} ${nextSeason})`,
      );
    }

    if (currentYear === nextYear) {
      const seasonOrder: Record<Season, number> = {
        [Season.SPRING]: 0,
        [Season.SUMMER]: 1,
        [Season.FALL]: 2,
        [Season.WINTER]: 3,
      };

      if (seasonOrder[currentSeason] >= seasonOrder[nextSeason]) {
        throw new BadRequestException(
          `Current semester (${currentYear} ${currentSeason}) must be before next semester (${nextYear} ${nextSeason})`,
        );
      }
    }
  }

  async downloadInspectionDocuments(scheduleUuid: string): Promise<Buffer> {
    const schedule =
      await this.moveOutScheduleRepository.findMoveOutScheduleWithUuid(
        scheduleUuid,
      );
    const applications =
      await this.inspectionApplicationRepository.findApplicationDocumentsByScheduleUuid(
        schedule.uuid,
      );
    const documents = applications
      .map((app) => app.document)
      .filter((u) => u !== null);
    if (documents.length === 0) {
      throw new NotFoundException('No inspection documents found');
    }
    const limit = pLimit(30);
    const documentBuffers = await Promise.all(
      documents.map((doc) => limit(() => this.fileService.getBytesArray(doc))),
    );
    const merged = await PDFDocument.create();
    for (const buffer of documentBuffers) {
      const pdf = await PDFDocument.load(buffer);
      const pages = await merged.copyPages(pdf, pdf.getPageIndices());
      for (const page of pages) {
        merged.addPage(page);
      }
    }
    const out = await merged.save();
    return Buffer.from(out);
  }
}
