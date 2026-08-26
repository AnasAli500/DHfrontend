import { useState } from 'react';
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';
import Modal from '../common/Modal';
import { parseExcelFile, downloadStudentTemplate } from '../../utils/excelUtils';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const StudentImportModal = ({ isOpen, onClose, classes = [], onSuccess }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [summary, setSummary] = useState({ total: 0, valid: 0, invalid: 0 });

  const resetState = () => {
    setFile(null);
    setFileName('');
    setPreviewData([]);
    setSummary({ total: 0, valid: 0, invalid: 0 });
    setParsing(false);
    setImporting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    const inputElement = e.target;

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setParsing(true);

    try {
      const rawRows = await parseExcelFile(selectedFile);
      if (!rawRows || rawRows.length === 0) {
        toast.error('The selected Excel file is empty.');
        setParsing(false);
        return;
      }

      // Build case-insensitive class map
      const classMap = new Map();
      classes.forEach((c) => {
        if (c.className) classMap.set(c.className.trim().toLowerCase(), c);
      });

      const parsedPreview = [];
      let validCount = 0;
      let invalidCount = 0;
      const seenRows = new Set();

      rawRows.forEach((row, index) => {
        const rowNum = index + 1;
        const name = (row.Name || row.name || row['Full Name'] || '').toString().trim();
        const rawGender = (row.Gender || row.gender || '').toString().trim();
        const className = (row.Class || row.class || row['Class Name'] || '').toString().trim();
        const address = (row.Address || row.address || '').toString().trim();
        const phone = (row.Phone || row.phone || '').toString().trim();
        const parent = (row.Parent || row.parent || row['Parent Name'] || row.motherName || '').toString().trim();
        const parentPhone = (row['Parent Phone'] || row.parentPhone || row.ParentPhone || '').toString().trim();

        const formattedGender = rawGender ? (rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase()) : '';
        let error = null;

        if (!name) {
          error = 'Name is required';
        } else if (!['Male', 'Female'].includes(formattedGender)) {
          error = `Gender must be Male or Female (got "${rawGender || 'empty'}")`;
        } else if (!className) {
          error = 'Class is required';
        } else if (!classMap.has(className.toLowerCase())) {
          error = `Class "${className}" not found`;
        } else {
          const dedupeKey = `${name.toLowerCase()}_${className.toLowerCase()}_${phone}`;
          if (seenRows.has(dedupeKey)) {
            error = 'Duplicate student record in file';
          } else {
            seenRows.add(dedupeKey);
          }
        }

        const isValid = !error;
        if (isValid) validCount++;
        else invalidCount++;

        parsedPreview.push({
          rowNum,
          name,
          gender: formattedGender || rawGender,
          className,
          address,
          phone,
          parent,
          parentPhone,
          isValid,
          error,
        });
      });

      setPreviewData(parsedPreview);
      setSummary({ total: rawRows.length, valid: validCount, invalid: invalidCount });
    } catch (err) {
      toast.error(err.message || 'Failed to read Excel file');
      resetState();
    } finally {
      setParsing(false);
      if (inputElement) inputElement.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (importing) return;
    const validRows = previewData.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error('No valid rows to import.');
      return;
    }

    setImporting(true);
    try {
      const payload = validRows.map((r) => ({
        name: r.name,
        gender: r.gender,
        class: r.className,
        address: r.address,
        phone: r.phone,
        parent: r.parent,
        parentPhone: r.parentPhone,
      }));

      const { data } = await api.post('/students/import', { students: payload });

      if (data.success) {
        toast.success(`Successfully imported ${data.summary.imported} students!`);
        if (data.errors && data.errors.length > 0) {
          toast.error(`${data.errors.length} rows failed during server insert.`);
        }
        onSuccess();
        handleClose();
      } else {
        toast.error(data.message || 'Import failed.');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Server error during import.';
      toast.error(errorMsg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Students from Excel">
      <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
        {/* Template download & file upload area */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/40">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600 text-white rounded-lg shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Excel File Upload</h4>
              <p className="text-xs text-gray-5-00 dark:text-gray-400">Supported formats: .xlsx, .xls</p>
            </div>
          </div>
          <button
            type="button"
            onClick={downloadStudentTemplate}
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
                {parsing ? 'Reading Excel file...' : 'Click or drag & drop Excel file here'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Student IDs will be automatically generated upon import
              </p>
            </div>
          </div>
        )}

        {/* Preview Summary Cards */}
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
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Gender</th>
                    <th className="p-2.5">Class</th>
                    <th className="p-2.5">Phone</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                  {previewData.map((row) => (
                    <tr key={row.rowNum} className={row.isValid ? '' : 'bg-red-50/50 dark:bg-red-950/20'}>
                      <td className="p-2.5 font-medium text-gray-500">{row.rowNum}</td>
                      <td className="p-2.5 font-medium text-gray-900 dark:text-white">{row.name || '—'}</td>
                      <td className="p-2.5 text-gray-700 dark:text-gray-300">{row.gender || '—'}</td>
                      <td className="p-2.5 text-gray-700 dark:text-gray-300">{row.className || '—'}</td>
                      <td className="p-2.5 text-gray-700 dark:text-gray-300">{row.phone || '—'}</td>
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
                <span>Invalid rows will be skipped during import. Only the {summary.valid} valid rows will be saved to MongoDB.</span>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Controls */}
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
            {importing ? 'Importing...' : `Import ${summary.valid} Students`}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default StudentImportModal;
