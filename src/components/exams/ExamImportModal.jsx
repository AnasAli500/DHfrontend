import { useState, useEffect, useCallback } from 'react';
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';
import Modal from '../common/Modal';
import { parseExcelFile, exportToExcel } from '../../utils/excelUtils';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const ExamImportModal = ({
  isOpen,
  onClose,
  examForm,
  classObj,
  subjectName,
  maxMarks,
  sheetStudents = [],
  onImportSuccess,
}) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [previewData, setPreviewData] = useState([]);
  const [summary, setSummary] = useState({ total: 0, valid: 0, invalid: 0 });

  const resetState = () => {
    setFile(null);
    setFileName('');
    setRawRows([]);
    setPreviewData([]);
    setSummary({ total: 0, valid: 0, invalid: 0 });
    setParsing(false);
    setImporting(false);
    setOverwriteExisting(true);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const validateRows = useCallback(
    (rows, overwrite) => {
      if (!rows || rows.length === 0) {
        setPreviewData([]);
        setSummary({ total: 0, valid: 0, invalid: 0 });
        return;
      }

      // Build roster lookup map: by studentId (e.g. STU000001), Mongo _id, or student name
      const rosterMap = new Map();
      sheetStudents.forEach((s) => {
        if (s.studentId) rosterMap.set(s.studentId.toString().trim().toUpperCase(), s);
        if (s._id) rosterMap.set(s._id.toString(), s);
        if (s.name) rosterMap.set(s.name.toString().trim().toUpperCase(), s);
      });

      const parsedPreview = [];
      let validCount = 0;
      let invalidCount = 0;
      const seenStudentIds = new Set();

      rows.forEach((row, index) => {
        const rowNum = index + 1;
        const studentIdInput = (
          row['Student ID'] ||
          row['studentId'] ||
          row['StudentId'] ||
          row['ID'] ||
          row['Adm No'] ||
          row['Admission No'] ||
          row['Student Name'] ||
          row['Name'] ||
          row['name'] ||
          ''
        )
          .toString()
          .trim();

        const rawMarks =
          row.Marks !== undefined && row.Marks !== ''
            ? row.Marks
            : row.marks !== undefined && row.marks !== ''
            ? row.marks
            : row.Mark !== undefined
            ? row.Mark
            : row.mark;

        const attendance = (row.Attendance || row.attendance || 'Present').toString().trim();

        let error = null;
        let matchedStudent = null;

        if (!studentIdInput) {
          error = 'Student ID or Name is required';
        } else {
          const key = studentIdInput.toUpperCase();
          if (seenStudentIds.has(key)) {
            error = 'Duplicate Student record in file';
          } else {
            seenStudentIds.add(key);
            matchedStudent = rosterMap.get(key);
            if (!matchedStudent) {
              error = 'Student not found in selected class';
            }
          }
        }

        if (!error) {
          if (rawMarks === '' || rawMarks === null || rawMarks === undefined) {
            error = 'Marks field is empty';
          } else {
            const marksNum = Number(rawMarks);
            if (Number.isNaN(marksNum)) {
              error = 'Marks must be a valid number';
            } else if (marksNum < 0) {
              error = 'Marks cannot be negative';
            } else if (maxMarks > 0 && marksNum > maxMarks) {
              error = `Marks ${marksNum} cannot be greater than maximum ${maxMarks}`;
            }
          }
        }

        if (
          !error &&
          matchedStudent &&
          matchedStudent.marks !== '' &&
          matchedStudent.marks !== null &&
          matchedStudent.marks !== undefined
        ) {
          if (!overwrite) {
            error = `Student ${matchedStudent.studentId || matchedStudent.name} already has marks recorded`;
          }
        }

        const isValid = !error;
        if (isValid) validCount++;
        else invalidCount++;

        parsedPreview.push({
          rowNum,
          studentIdInput,
          studentName: matchedStudent ? matchedStudent.name : '—',
          studentMongoId: matchedStudent ? matchedStudent._id : null,
          studentDisplayId: matchedStudent ? (matchedStudent.studentId || studentIdInput) : studentIdInput,
          marks: rawMarks,
          attendance: ['Present', 'Absent', 'Excused', 'Late'].includes(attendance) ? attendance : 'Present',
          isValid,
          error,
        });
      });

      setPreviewData(parsedPreview);
      setSummary({ total: rows.length, valid: validCount, invalid: invalidCount });
    },
    [sheetStudents, maxMarks]
  );

  // Re-run validation when overwriteExisting checkbox changes
  useEffect(() => {
    if (rawRows.length > 0) {
      validateRows(rawRows, overwriteExisting);
    }
  }, [overwriteExisting, rawRows, validateRows]);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    const inputElement = e.target;

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setParsing(true);

    try {
      const rows = await parseExcelFile(selectedFile);
      if (!rows || rows.length === 0) {
        toast.error('The selected Excel file is empty.');
        setParsing(false);
        return;
      }
      setRawRows(rows);
      validateRows(rows, overwriteExisting);
    } catch (err) {
      toast.error(err.message || 'Failed to read Excel file');
      resetState();
    } finally {
      setParsing(false);
      if (inputElement) inputElement.value = '';
    }
  };

  const downloadCustomTemplate = () => {
    if (sheetStudents && sheetStudents.length > 0) {
      const templateRows = sheetStudents.map((s) => ({
        'Student ID': s.studentId || '',
        'Student Name': s.name || '',
        Marks: s.marks !== '' && s.marks !== undefined ? s.marks : '',
        Attendance: s.attendance || 'Present',
      }));
      exportToExcel(
        templateRows,
        `${classObj?.className || 'class'}_${subjectName || 'exam'}_marks_template.xlsx`,
        'Exam Marks'
      );
      toast.success('Downloaded class roster template pre-filled with student IDs!');
    } else {
      const sampleData = [
        { 'Student ID': 'STU000001', 'Student Name': 'Ahmed Ali', Marks: 45, Attendance: 'Present' },
        { 'Student ID': 'STU000002', 'Student Name': 'Mohamed Hassan', Marks: 38, Attendance: 'Present' },
      ];
      exportToExcel(sampleData, 'exam_marks_template.xlsx', 'Exam Marks');
      toast.success('Downloaded sample exam marks template.');
    }
  };

  const handleConfirmImport = async () => {
    if (importing) return;
    const validRows = previewData.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error('No valid marks to import.');
      return;
    }

    setImporting(true);
    try {
      const records = validRows.map((r) => ({
        studentId: r.studentDisplayId || r.studentMongoId,
        marks: Number(r.marks),
        attendance: r.attendance,
      }));

      const payload = {
        classId: examForm.classId,
        teacherId: examForm.teacherId,
        periodId: examForm.periodId,
        examSeasonId: examForm.examSeasonId,
        examStructureId: examForm.examStructureId,
        examName: examForm.examName,
        examDate: examForm.examDate,
        records,
        overwriteExisting,
      };

      const { data } = await api.post('/exams/import-marks', payload);

      if (data.success) {
        toast.success(`Successfully imported marks for ${data.summary.imported} students!`);
        if (data.errors && data.errors.length > 0) {
          toast.error(`${data.errors.length} rows had issues.`);
        }
        if (onImportSuccess && data.records) {
          onImportSuccess(data.records);
        }
        handleClose();
      } else {
        toast.error(data.message || 'Import failed.');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Server error during marks import.';
      toast.error(errorMsg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Exam Marks from Excel">
      <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
        {/* Exam Context Banner */}
        <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-gray-500 dark:text-gray-400">Class</div>
            <div className="font-semibold text-purple-900 dark:text-purple-200">{classObj?.className || '—'}</div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400">Subject</div>
            <div className="font-semibold text-purple-900 dark:text-purple-200">{subjectName || '—'}</div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400">Max Marks</div>
            <div className="font-bold text-emerald-600 dark:text-emerald-400">{maxMarks || '—'}</div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400">Exam Name</div>
            <div className="font-semibold text-purple-900 dark:text-purple-200">{examForm?.examName || '—'}</div>
          </div>
        </div>

        {/* Upload Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600 text-white rounded-lg shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Exam Sheet File</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Requires columns: Student ID, Marks, Attendance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={downloadCustomTemplate}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-900 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Excel Template
          </button>
        </div>

        {/* Upload Drop Zone */}
        {!previewData.length && (
          <div className="border-2 border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 dark:hover:border-purple-500 rounded-xl p-8 text-center bg-gray-50 dark:bg-gray-800/50 transition-colors cursor-pointer relative">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={parsing}
            />
            <div className="flex flex-col items-center">
              <Upload className="w-10 h-10 text-purple-500 mb-3 animate-bounce" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {parsing ? 'Reading Excel file...' : 'Click or drag & drop Excel marks sheet here'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Marks will be validated against Max Marks ({maxMarks})
              </p>
            </div>
          </div>
        )}

        {/* Preview Summary Cards & Table */}
        {previewData.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Selected File:</span>
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">{fileName}</span>
              </div>
              <button
                type="button"
                onClick={resetState}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
              >
                <X className="w-3.5 h-3.5" /> Re-upload File
              </button>
            </div>

            {/* Overwrite Checkbox Option */}
            <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-100 dark:border-purple-900/40">
              <input
                type="checkbox"
                id="overwriteExisting"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              <label htmlFor="overwriteExisting" className="text-xs font-medium text-purple-900 dark:text-purple-200 cursor-pointer">
                Update/Overwrite marks for students who already have recorded marks for this exam
              </label>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{summary.total}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Rows</div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/40 rounded-lg text-center border border-green-200 dark:border-green-800">
                <div className="text-xl font-bold text-green-600 dark:text-green-400">{summary.valid}</div>
                <div className="text-xs text-green-700 dark:text-green-300">Valid Rows</div>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-lg text-center border border-red-200 dark:border-red-800">
                <div className="text-xl font-bold text-red-600 dark:text-red-400">{summary.invalid}</div>
                <div className="text-xs text-red-700 dark:text-red-300">Invalid Rows</div>
              </div>
            </div>

            {/* Table Preview */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 sticky top-0">
                  <tr>
                    <th className="p-2.5">Row</th>
                    <th className="p-2.5">Student ID</th>
                    <th className="p-2.5">Student Name</th>
                    <th className="p-2.5">Marks</th>
                    <th className="p-2.5">Attendance</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                  {previewData.map((row) => (
                    <tr key={row.rowNum} className={row.isValid ? '' : 'bg-red-50/50 dark:bg-red-950/20'}>
                      <td className="p-2.5 font-medium text-gray-500">{row.rowNum}</td>
                      <td className="p-2.5 font-semibold text-purple-700 dark:text-purple-300">{row.studentIdInput || '—'}</td>
                      <td className="p-2.5 font-medium text-gray-900 dark:text-white">{row.studentName}</td>
                      <td className="p-2.5 font-bold text-gray-800 dark:text-gray-200">{row.marks !== undefined ? row.marks : '—'}</td>
                      <td className="p-2.5 text-gray-700 dark:text-gray-300">{row.attendance}</td>
                      <td className="p-2.5 font-medium">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                            <XCircle className="w-3.5 h-3.5" /> {row.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {summary.invalid > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Rows with errors will be skipped. Only the {summary.valid} valid records will be saved to MongoDB.</span>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={importing || summary.valid === 0}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
          >
            {importing ? 'Importing...' : `Import ${summary.valid} Marks`}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ExamImportModal;
