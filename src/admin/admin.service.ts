import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DatabaseService,
  PrismaTransaction,
  UserRepository,
} from '@lib/database';
import { Role } from 'generated/prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly userRepository: UserRepository,
  ) {}

  async listAdmins() {
    return await this.userRepository.findActiveAdmins();
  }

  async promoteToAdmin(name: string, studentNumber: string): Promise<void> {
    const user = await this.userRepository.findUserByNameAndStudentNumber(
      name,
      studentNumber,
    );
    if (user.role === Role.SUPERADMIN) {
      throw new ConflictException('User is already SUPERADMIN');
    }
    if (user.role === Role.ADMIN) {
      throw new ConflictException('User is already ADMIN');
    }
    await this.userRepository.updateUserRole(user.uuid, Role.ADMIN);
  }

  async demoteAdminToUser(userUuid: string): Promise<void> {
    const user = await this.userRepository.findUser(userUuid);
    if (user.role === Role.SUPERADMIN) {
      throw new BadRequestException('Cannot demote SUPERADMIN with this API');
    }
    if (user.role !== Role.ADMIN) {
      throw new ConflictException('User is not ADMIN');
    }
    await this.userRepository.updateUserRole(userUuid, Role.USER);
  }

  async transferSuperAdmin(targetUserUuid: string): Promise<void> {
    if (!targetUserUuid)
      throw new BadRequestException('targetUserUuid missing');

    await this.databaseService.$transaction(async (tx: PrismaTransaction) => {
      // Lock current superadmin row (if exists) to serialize transfers.
      const currentSuperAdminUuid =
        await this.userRepository.lockActiveSuperAdminUuidInTx(tx);

      // Ensure target exists and is active
      const target = await tx.user.findFirst({
        where: { uuid: targetUserUuid, deletedAt: null },
      });
      if (!target) throw new NotFoundException('User not found');

      // Demote current superadmin (if any)
      if (currentSuperAdminUuid) {
        await this.userRepository.updateUserRoleInTx(
          currentSuperAdminUuid,
          Role.ADMIN,
          tx,
        );
      }

      // Promote target to superadmin (DB unique index enforces single active SUPERADMIN)
      await this.userRepository.updateUserRoleInTx(
        targetUserUuid,
        Role.SUPERADMIN,
        tx,
      );
    });
  }
}
