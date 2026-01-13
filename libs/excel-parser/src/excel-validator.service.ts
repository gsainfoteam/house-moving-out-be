import { BadRequestException, Injectable } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import AdmZip from 'adm-zip';
import { EXCEL_VALIDATION_CONSTANTS } from './constants/room-assignment-parser.constants';

@Injectable()
export class ExcelValidatorService {
  async validateExcelFile(
    file: Express.Multer.File | undefined,
  ): Promise<void> {
    if (!file) {
      throw new BadRequestException('File is not uploaded');
    }

    if (!file.originalname) {
      throw new BadRequestException('File name is missing');
    }

    const lastDotIndex = file.originalname.lastIndexOf('.');
    if (lastDotIndex === -1) {
      throw new BadRequestException('File extension is missing');
    }

    const fileExtension = file.originalname
      .toLowerCase()
      .substring(lastDotIndex);

    if (
      !(
        EXCEL_VALIDATION_CONSTANTS.ALLOWED_EXTENSIONS as readonly string[]
      ).includes(fileExtension)
    ) {
      throw new BadRequestException(
        `Invalid file format. Allowed formats: ${EXCEL_VALIDATION_CONSTANTS.ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    if (
      !file.mimetype ||
      !(
        EXCEL_VALIDATION_CONSTANTS.ALLOWED_MIME_TYPES as readonly string[]
      ).includes(file.mimetype)
    ) {
      throw new BadRequestException('Invalid MIME type');
    }

    if (file.size === 0) {
      throw new BadRequestException('Empty file cannot be uploaded');
    }

    if (file.size > EXCEL_VALIDATION_CONSTANTS.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size is too large. Maximum size: ${EXCEL_VALIDATION_CONSTANTS.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    if (!file.buffer) {
      throw new BadRequestException('File buffer is missing');
    }

    const detectedFileType = await fileTypeFromBuffer(file.buffer);

    if (!detectedFileType) {
      throw new BadRequestException(
        'Unable to detect file type from file signature',
      );
    }

    const isAllowedMimeType =
      EXCEL_VALIDATION_CONSTANTS.ALLOWED_MIME_TYPES.some(
        (allowedType) => allowedType === detectedFileType.mime,
      );

    if (!isAllowedMimeType) {
      throw new BadRequestException(
        'File signature does not match Excel file format',
      );
    }

    let zip: AdmZip;
    try {
      zip = new AdmZip(file.buffer);
    } catch {
      throw new BadRequestException(
        'File is not a valid ZIP archive (xlsx files are ZIP-based)',
      );
    }

    const entries = zip.getEntries();
    const entryNames = entries.map((entry) => entry.entryName);

    const required = ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml'];

    const normalized = new Set(entryNames.map((n) => n.replace(/\\/g, '/')));

    for (const r of required) {
      if (!normalized.has(r)) {
        throw new BadRequestException('Invalid XLSX structure');
      }
    }
  }
}
