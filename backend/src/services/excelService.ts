import * as XLSX from 'xlsx';

export interface RowError {
  row: number;
  identifier?: string;
  reason: string;
}

export interface BulkUploadResult<T> {
  totalRecords: number;
  successfulUploads: number;
  failedRecords: number;
  errors: RowError[];
  data: T[];
}

export class ExcelService {
  /**
   * Parse an Excel file buffer into an array of objects with normalized keys
   */
  static parseExcelBuffer(buffer: Buffer): Record<string, any>[] {
    if (!buffer || buffer.length === 0) {
      throw new Error('Uploaded file is empty.');
    }

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error('No worksheets found in the Excel file.');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
    });

    if (!rawData || rawData.length === 0) {
      throw new Error('The worksheet is empty. No data rows found.');
    }

    // Normalize keys (trim and lower-case)
    return rawData.map((row) => {
      const normalizedRow: Record<string, any> = {};
      Object.keys(row).forEach((key) => {
        const cleanKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
        normalizedRow[cleanKey] = typeof row[key] === 'string' ? row[key].trim() : row[key];
      });
      return normalizedRow;
    });
  }

  /**
   * Helper email validator regex
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return Boolean(email && emailRegex.test(email));
  }

  /**
   * Helper phone number normalizer / validator
   */
  static normalizePhone(phone: any): string {
    if (!phone) return '+91 98000 00000';
    const str = String(phone).trim();
    return str.length >= 6 ? str : '+91 98000 00000';
  }
}
