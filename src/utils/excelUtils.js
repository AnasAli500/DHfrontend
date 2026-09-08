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
      'Registered Date': '2026-09-01',
      Name: 'Ahmed Ali',
      'Mother Name': 'Fadumo Cabdi',
      Gender: 'Male',
      Telephone: '0615551122',
      Birthday: '2008-05-14',
      Birthplace: 'Mogadishu',
      Nationality: 'Somali',
      'Student State': 'Banaadir',
      'Student Region': 'Banaadir',
      'Student District': 'Hodan',
      'Student Village': 'Taleex',
      'Orphan Status': 'No',
      'Disability Status': 'No',
      'Guardian Name': 'Ali Hassan',
      'Guardian Telephone': '0615553344',
      'Refugee Status': 'No',
      'School Type': 'Secondary',
      'School Name': 'Main Campus',
      Class: 'Form 1',
      'Transfer Status': 'In Progress',
      'Monthly Fee': 15,
      'Admission Fee': 5,
    },
    {
      'Registered Date': '2026-09-01',
      Name: 'Ayaan Cabdi',
      'Mother Name': 'Halima Omar',
      Gender: 'Female',
      Telephone: '0616663344',
      Birthday: '2010-09-20',
      Birthplace: 'Hargeisa',
      Nationality: 'Somali',
      'Student State': 'Banaadir',
      'Student Region': 'Banaadir',
      'Student District': 'Wadajir',
      'Student Village': 'Halane',
      'Orphan Status': 'No',
      'Disability Status': 'No',
      'Guardian Name': 'Cabdi Jama',
      'Guardian Telephone': '0616668899',
      'Refugee Status': 'No',
      'School Type': 'Primary',
      'School Name': 'Main Campus',
      Class: 'Grade 8',
      'Transfer Status': 'In Progress',
      'Monthly Fee': 10,
      'Admission Fee': 5,
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
