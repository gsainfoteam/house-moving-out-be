export const EXCEL_PARSING_CONSTANTS = {
  BATCH_COLS_NORMAL: 5,
  BATCH_COLS_EXTENDED: 7,
  SEPARATOR_COLS: 1,
  COLUMN_SETS: 6,
  ROW_SETS: 4,
  MAX_SEARCH_ROWS: 5,
  QUOTE_CHECK_COLS: 5,
} as const;

export const EXCEL_VALIDATION_CONSTANTS = {
  ALLOWED_MIME_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  ALLOWED_EXTENSIONS: ['.xlsx'],
  MAX_FILE_SIZE: 10 * 1024 * 1024,
} as const;
