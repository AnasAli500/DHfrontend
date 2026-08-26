import * as XLSX from 'xlsx';

/**
 * Parses an Excel file (.xlsx, .xls) and returns an array of row objects from the first sheet.
 * @param {File} file 
 * @returns {Promise<Array<Object>>}
 */
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided'));
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return reject(new Error('Please select a valid Excel file (.xlsx or .xls)'));
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          return reject(new Error('Excel file is empty'));
        }
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(json);
      } catch (err) {
        reject(new Error('Failed to parse Excel file: ' + err.message));
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Export data array to an Excel file download
 * @param {Array<Object>} data 
 * @param {string} filename 
 * @param {string} sheetName 
 */
export const exportToExcel = (data, filename = 'export.xlsx', sheetName = 'Sheet1') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};

/**
 * Download sample Student Import Excel Template
 */
export const downloadStudentTemplate = () => {
  const sampleData = [
    {
      Name: 'Ahmed Ali',
      Gender: 'Male',
      Class: 'F4',
      Address: 'Hargeisa',
      Phone: '0634441122',
      Parent: 'Ali Hassan',
      'Parent Phone': '0634443344',
    },
    {
      Name: 'Mohamed Hassan',
      Gender: 'Male',
      Class: 'F4',
      Address: 'Hargeisa',
      Phone: '0635552233',
      Parent: 'Hassan Omar',
      'Parent Phone': '0635556677',
    },
    {
      Name: 'Ayaan Cabdi',
      Gender: 'Female',
      Class: 'Grade 8',
      Address: 'Mogadishu',
      Phone: '0616663344',
      Parent: 'Cabdi Jama',
      'Parent Phone': '0616668899',
    },
  ];
  exportToExcel(sampleData, 'students_import_template.xlsx', 'Students Template');
};

/**
 * Download sample Exam Marks Import Excel Template
 */
export const downloadExamMarksTemplate = () => {
  const sampleData = [
    {
      'Student ID': 'STU000001',
      Marks: 45,
      Attendance: 'Present',
    },
    {
      'Student ID': 'STU000002',
      Marks: 38,
      Attendance: 'Present',
    },
    {
      'Student ID': 'STU000003',
      Marks: 42,
      Attendance: 'Present',
    },
    {
      'Student ID': 'STU000004',
      Marks: 0,
      Attendance: 'Absent',
    },
  ];
  exportToExcel(sampleData, 'exam_marks_template.xlsx', 'Exam Marks Template');
};
