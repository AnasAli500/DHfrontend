import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, XCircle,
  AlertTriangle, X, Users, BookOpen, Hash, BarChart3, RefreshCw
} from "lucide-react";
import Modal from "../common/Modal";
import { parseExcelFile, exportToExcel } from "../../utils/excelUtils";
import api from "../../api/axios";
import toast from "react-hot-toast";

const FIXED_COLS = ["student id", "studentid", "id", "adm no", "admission no", "student name", "name", "studentname"];
const isSubjectCol = (colName) => !FIXED_COLS.includes(colName.toLowerCase().trim());

const AllSubjectsImportModal = ({ isOpen, onClose, classes = [], onImportSuccess }) => {
  const [classId, setClassId] = useState("");
  const [examSeasonId, setExamSeasonId] = useState("");
  const [examStructureId, setExamStructureId] = useState("");
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);
  const [seasons, setSeasons] = useState([]);
  const [structures, setStructures] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [maxMarks, setMaxMarks] = useState(0);
  const [setupLoading, setSetupLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [previewData, setPreviewData] = useState([]);
  const [detectedSubjectCols, setDetectedSubjectCols] = useState([]);
  const [summary, setSummary] = useState(null);
  const [serverErrors, setServerErrors] = useState([]);
  const fileInputRef = useRef(null);
  const selectedClass = classes.find((c) => c._id === classId);

  const fullReset = useCallback(() => {
    setClassId(""); setExamSeasonId(""); setExamStructureId(""); setExamName("");
    setExamDate(new Date().toISOString().split("T")[0]);
    setSeasons([]); setStructures([]); setSubjects([]); setClassStudents([]);
    setMaxMarks(0); setFileName(""); setRawRows([]); setPreviewData([]);
    setDetectedSubjectCols([]); setSummary(null); setServerErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const fileReset = () => {
    setFileName(""); setRawRows([]); setPreviewData([]); setDetectedSubjectCols([]);
    setSummary(null); setServerErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => { fullReset(); onClose(); };

  useEffect(() => {
    if (!classId) { setSeasons([]); setStructures([]); setExamSeasonId(""); setExamStructureId(""); return; }
    const fetch = async () => {
      setSetupLoading(true);
      try {
        const { data } = await api.get("/exams/setup", { params: { classId } });
        setSeasons(data.seasons || []); setStructures([]); setExamSeasonId(""); setExamStructureId("");
      } catch { setSeasons([]); } finally { setSetupLoading(false); }
    };
    fetch(); fileReset();
  }, [classId]);

  useEffect(() => {
    if (!classId || !examSeasonId) { setStructures([]); setExamStructureId(""); return; }
    const fetch = async () => {
      try {
        const { data } = await api.get("/exams/setup", { params: { classId, seasonId: examSeasonId } });
        setStructures(data.structures || []); setExamStructureId("");
      } catch { setStructures([]); }
    };
    fetch(); fileReset();
  }, [classId, examSeasonId]);

  useEffect(() => {
    if (!examStructureId || !examSeasonId) { setExamName(""); setMaxMarks(0); setSubjects([]); setClassStudents([]); fileReset(); return; }
    const struct = structures.find((s) => s._id === examStructureId);
    const season = seasons.find((s) => s._id === examSeasonId);
    if (struct && season) { setExamName(`${season.name} - ${struct.examType}`); setMaxMarks(struct.maxMarks || 100); }
    const fetchSubjects = async () => {
      setSubjectsLoading(true);
      try {
        const { data } = await api.get("/exams/class-subjects", { params: { classId, examSeasonId, examStructureId } });
        setSubjects(data.subjects || []); setClassStudents(data.students || []); setMaxMarks(data.maxMarks || struct?.maxMarks || 100);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load subjects"); setSubjects([]); setClassStudents([]);
      } finally { setSubjectsLoading(false); }
    };
    fetchSubjects(); fileReset();
  }, [examStructureId]);

  const handleDownloadTemplate = () => {
    if (!subjects.length) return toast.error("Please select a Class, Exam Season, and Exam Type first.");
    if (!classStudents.length) return toast.error("No students found in this class.");
    const subjectHeaders = subjects.map((s) => s.subject);
    const rows = classStudents.map((s) => {
      const row = { "Student ID": s.studentId, "Student Name": s.name };
      subjectHeaders.forEach((subj) => { row[subj] = ""; });
      return row;
    });
    exportToExcel(rows, `${selectedClass?.className || "class"}_${examName || "exam"}_all_subjects.xlsx`, "All Subjects Marks");
    toast.success(`Template downloaded with ${subjects.length} subjects and ${classStudents.length} students!`);
  };

  const validateRows = useCallback((rows, overwrite) => {
    if (!rows || rows.length === 0) { setPreviewData([]); setSummary(null); return; }
    const rosterById = new Map();
    classStudents.forEach((s) => { if (s.studentId) rosterById.set(s.studentId.toString().toUpperCase(), s); });
    const knownSubjects = new Map();
    subjects.forEach((s) => knownSubjects.set(s.subject.toUpperCase(), s));
    const firstRow = rows[0] || {};
    const detectedCols = Object.keys(firstRow).filter(isSubjectCol);
    setDetectedSubjectCols(detectedCols);
    const unknownCols = detectedCols.filter((col) => !knownSubjects.has(col.toUpperCase().trim()));
    const parsedPreview = [];
    const seenIds = new Set();
    let totalValid = 0, totalInvalid = 0, totalMissing = 0, totalDuplicate = 0, validCells = 0, invalidCells = 0;

    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      const studentIdInput = (row["Student ID"] || row["studentId"] || row["StudentId"] || row["ID"] || row["Adm No"] || row["Admission No"] || "").toString().trim();
      const studentNameInput = (row["Student Name"] || row["studentName"] || row["Name"] || row["name"] || "").toString().trim();
      let rowError = null, matchedStudent = null;
      if (!studentIdInput) {
        rowError = "Student ID is required";
      } else {
        const key = studentIdInput.toUpperCase();
        if (seenIds.has(key)) { rowError = "Duplicate Student ID"; totalDuplicate++; }
        else {
          seenIds.add(key);
          matchedStudent = rosterById.get(key);
          if (!matchedStudent) rowError = "Student not found in selected class";
          else if (studentNameInput && matchedStudent.name.toLowerCase() !== studentNameInput.toLowerCase())
            rowError = `Name does not match record '${matchedStudent.name}'`;
        }
      }
      const subjectMarks = {};
      detectedCols.forEach((col) => {
        const rawMark = row[col];
        if (unknownCols.includes(col)) { subjectMarks[col] = { value: rawMark, status: "unknown", error: "Unknown subject" }; invalidCells++; return; }
        if (rowError) { subjectMarks[col] = { value: rawMark, status: "row-error" }; return; }
        if (rawMark === "" || rawMark === null || rawMark === undefined) {
          subjectMarks[col] = { value: "", status: "missing", error: "Missing" }; totalMissing++; invalidCells++;
        } else {
          const num = Number(rawMark);
          if (Number.isNaN(num)) { subjectMarks[col] = { value: rawMark, status: "invalid", error: "Not a number" }; invalidCells++; }
          else if (num < 0) { subjectMarks[col] = { value: rawMark, status: "invalid", error: "Negative" }; invalidCells++; }
          else if (maxMarks > 0 && num > maxMarks) { subjectMarks[col] = { value: rawMark, status: "invalid", error: `>${maxMarks}` }; invalidCells++; }
          else { subjectMarks[col] = { value: num, status: "valid" }; validCells++; }
        }
      });
      const allSubjectsValid = !rowError && detectedCols.every((col) => subjectMarks[col]?.status === "valid");
      if (allSubjectsValid) totalValid++; else totalInvalid++;
      parsedPreview.push({
        rowNum, studentIdInput, studentName: matchedStudent ? matchedStudent.name : (studentNameInput || "—"),
        studentDisplayId: matchedStudent?.studentId || studentIdInput, studentMongoId: matchedStudent?._id || null,
        subjectMarks, rowError, isValid: allSubjectsValid,
      });
    });
    setPreviewData(parsedPreview);
    setSummary({ totalStudents: rows.length, totalSubjects: detectedCols.length, totalMarks: rows.length * detectedCols.length,
      validStudents: totalValid, invalidStudents: totalInvalid, validCells, invalidCells, missingMarks: totalMissing,
      duplicateStudents: totalDuplicate, unknownSubjectCols: unknownCols });
  }, [classStudents, subjects, maxMarks]);

  useEffect(() => { if (rawRows.length > 0) validateRows(rawRows, overwriteExisting); }, [overwriteExisting, rawRows, validateRows]);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!examStructureId) { toast.error("Please select a Class, Exam Season, and Exam Type first."); if (fileInputRef.current) fileInputRef.current.value = ""; return; }
    setFileName(selectedFile.name); setParsing(true); setServerErrors([]);
    try {
      const rows = await parseExcelFile(selectedFile);
      if (!rows || rows.length === 0) { toast.error("The selected Excel file is empty."); setParsing(false); return; }
      setRawRows(rows); validateRows(rows, overwriteExisting);
    } catch (err) { toast.error(err.message || "Failed to read Excel file"); fileReset(); }
    finally { setParsing(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleImportAll = async () => {
    if (importing) return;
    const validRows = previewData.filter((r) => r.isValid);
    if (validRows.length === 0) return toast.error("No valid rows to import.");
    setImporting(true); setServerErrors([]);
    try {
      const records = validRows.map((r) => ({
        studentId: r.studentDisplayId,
        studentName: r.studentName,
        subjectMarks: Object.fromEntries(
          detectedSubjectCols.filter((col) => r.subjectMarks[col]?.status === "valid").map((col) => [col, r.subjectMarks[col].value])
        ),
      }));
      const { data } = await api.post("/exams/import-all-subjects", { classId, examSeasonId, examStructureId, examName, examDate, overwriteExisting, records });
      if (data.success) {
        toast.success(data.message || `Successfully imported ${data.summary?.totalMarks} marks!`);
        if (onImportSuccess) onImportSuccess(data);
        handleClose();
      } else { toast.error(data.message || "Import failed."); if (data.errors?.length) setServerErrors(data.errors); }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Server error during import.";
      toast.error(msg);
      if (err.response?.data?.errors?.length) setServerErrors(err.response.data.errors);
    } finally { setImporting(false); }
  };

  const cellClass = (status) => {
    if (status === "valid") return "text-green-700 dark:text-green-400 font-semibold";
    if (status === "missing") return "text-amber-600 dark:text-amber-400 italic";
    if (status === "invalid") return "text-red-600 dark:text-red-400 font-semibold";
    if (status === "unknown") return "text-purple-600 dark:text-purple-400 line-through";
    return "text-gray-400";
  };

  const canImport = previewData.length > 0 && previewData.some((r) => r.isValid) && !importing;
  const validCount = previewData.filter((r) => r.isValid).length;
  const readyToImport = summary && summary.invalidStudents === 0 && summary.duplicateStudents === 0 && summary.validStudents > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import All Subjects — Bulk Excel Import">
      <div className="space-y-5 max-h-[85vh] overflow-y-auto pr-1">

        {/* Step 1: Selectors */}
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800">
          <h4 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</span>
            Select Class &amp; Exam
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Class <span className="text-red-500">*</span></label>
              <select className="input-field text-sm py-2" value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Select Class</option>
                {classes.map((c) => <option key={c._id} value={c._id}>{c.className}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Exam Season <span className="text-red-500">*</span></label>
              <select className="input-field text-sm py-2" value={examSeasonId} disabled={!classId || setupLoading} onChange={(e) => setExamSeasonId(e.target.value)}>
                <option value="">{setupLoading ? "Loading..." : "Select Season"}</option>
                {seasons.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Exam Type <span className="text-red-500">*</span></label>
              <select className="input-field text-sm py-2" value={examStructureId} disabled={!examSeasonId || !structures.length} onChange={(e) => setExamStructureId(e.target.value)}>
                <option value="">Select Exam Type</option>
                {structures.map((s) => <option key={s._id} value={s._id}>{s.examType} ({s.maxMarks} marks)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Max Marks <span className="text-gray-400">(Auto)</span></label>
              <input type="text" readOnly className="input-field text-sm py-2 bg-gray-100 dark:bg-gray-800 cursor-not-allowed font-bold text-emerald-600 dark:text-emerald-400" value={maxMarks || "—"} />
            </div>
          </div>
          {examName && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Exam Name (Auto)</label>
                <input readOnly className="input-field text-sm py-2 bg-gray-100 dark:bg-gray-800 cursor-not-allowed" value={examName} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Exam Date</label>
                <input type="date" className="input-field text-sm py-2" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
              </div>
            </div>
          )}
          {subjectsLoading && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 animate-pulse">Loading subjects...</p>}
          {!subjectsLoading && subjects.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Subjects in this class ({subjects.length}):</p>
              <div className="flex flex-wrap gap-1.5">
                {subjects.map((s) => (
                  <span key={s._id} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">{s.subject}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Download Template */}
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold shrink-0">2</span>
            <div>
              <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Download All-Subjects Excel Template</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                Template includes all {subjects.length} subjects + {classStudents.length} students pre-filled
              </p>
            </div>
          </div>
          <button type="button" onClick={handleDownloadTemplate} disabled={!subjects.length || subjectsLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm shrink-0">
            <Download className="w-4 h-4" /> Download Template
          </button>
        </div>

        {/* Step 3: Upload */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold shrink-0">3</span>
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Upload Filled Excel File</h4>
          </div>

          {!previewData.length ? (
            <div className="border-2 border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 dark:hover:border-purple-500 rounded-xl p-8 text-center bg-gray-50 dark:bg-gray-800/50 transition-colors cursor-pointer relative">
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={parsing || !examStructureId} />
              <div className="flex flex-col items-center pointer-events-none">
                <Upload className="w-10 h-10 text-purple-500 mb-3 animate-bounce" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {parsing ? "Reading Excel file..." : !examStructureId ? "Select Class, Exam Season & Exam Type first" : "Click or drag & drop your Excel file here"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Supports .xlsx and .xls — All subjects validated against max marks ({maxMarks})</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{fileName}</span>
                </div>
                <button type="button" onClick={fileReset} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium">
                  <X className="w-3.5 h-3.5" /> Re-upload File
                </button>
              </div>

              <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-100 dark:border-purple-900/40">
                <input type="checkbox" id="overwriteChk" checked={overwriteExisting} onChange={(e) => setOverwriteExisting(e.target.checked)} className="w-4 h-4 text-purple-600 rounded" />
                <label htmlFor="overwriteChk" className="text-xs font-medium text-purple-900 dark:text-purple-200 cursor-pointer">
                  Update/Overwrite marks for students who already have recorded marks for this exam
                </label>
              </div>

              {summary?.unknownSubjectCols?.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-xs text-red-800 dark:text-red-300">
                    <strong>Unknown subject columns:</strong> {summary.unknownSubjectCols.join(", ")} — not assigned to this class.
                  </span>
                </div>
              )}

              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                    <Users className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                    <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{summary.totalStudents}</div>
                    <div className="text-xs text-gray-500">Total Students</div>
                  </div>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                    <BookOpen className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                    <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{summary.totalSubjects}</div>
                    <div className="text-xs text-gray-500">Total Subjects</div>
                  </div>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                    <Hash className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                    <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{summary.totalMarks}</div>
                    <div className="text-xs text-gray-500">Total Marks</div>
                  </div>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                    <BarChart3 className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                    <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{summary.validCells}</div>
                    <div className="text-xs text-gray-500">Valid Cells</div>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950/40 rounded-lg text-center border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-green-500" />
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">{summary.validStudents}</div>
                    <div className="text-xs text-green-700 dark:text-green-300">Valid Students</div>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-lg text-center border border-red-200 dark:border-red-800">
                    <XCircle className="w-4 h-4 mx-auto mb-1 text-red-500" />
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">{summary.invalidStudents}</div>
                    <div className="text-xs text-red-700 dark:text-red-300">Invalid Students</div>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-center border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{summary.missingMarks}</div>
                    <div className="text-xs text-amber-700 dark:text-amber-300">Missing Marks</div>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/40 rounded-lg text-center border border-orange-200 dark:border-orange-800">
                    <RefreshCw className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                    <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{summary.duplicateStudents}</div>
                    <div className="text-xs text-orange-700 dark:text-orange-300">Duplicates</div>
                  </div>
                </div>
              )}

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs min-w-max">
                  <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 sticky top-0 z-10">
                    <tr>
                      <th className="p-2 text-left whitespace-nowrap">#</th>
                      <th className="p-2 text-left whitespace-nowrap">Student ID</th>
                      <th className="p-2 text-left whitespace-nowrap">Student Name</th>
                      {detectedSubjectCols.map((col) => (
                        <th key={col} className="p-2 text-center whitespace-nowrap">
                          {col}{summary?.unknownSubjectCols?.includes(col) && <span className="ml-1 text-red-400">?</span>}
                        </th>
                      ))}
                      <th className="p-2 text-left whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                    {previewData.map((row) => (
                      <tr key={row.rowNum} className={row.isValid ? "" : "bg-red-50/40 dark:bg-red-950/20"}>
                        <td className="p-2 text-gray-400">{row.rowNum}</td>
                        <td className="p-2 font-mono font-semibold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">{row.studentDisplayId || row.studentIdInput || "—"}</td>
                        <td className="p-2 font-medium whitespace-nowrap">{row.studentName}</td>
                        {detectedSubjectCols.map((col) => {
                          const cell = row.subjectMarks[col];
                          return (
                            <td key={col} className={`p-2 text-center whitespace-nowrap ${cellClass(cell?.status)}`} title={cell?.error || ""}>
                              {cell?.status === "missing" ? "—" : cell?.status === "row-error" ? "·" : cell?.value !== undefined && cell?.value !== "" ? cell.value : "—"}
                              {cell?.error && cell.status !== "valid" ? <span className="ml-1 text-xs opacity-70">({cell.error})</span> : null}
                            </td>
                          );
                        })}
                        <td className="p-2 whitespace-nowrap font-medium">
                          {row.isValid
                            ? <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle2 className="w-3.5 h-3.5" /> Valid</span>
                            : <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"><XCircle className="w-3.5 h-3.5" /> {row.rowError || "Has errors"}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {serverErrors.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg space-y-1 max-h-32 overflow-y-auto">
                  <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-1">Server validation errors:</p>
                  {serverErrors.map((e, i) => <p key={i} className="text-xs text-red-600 dark:text-red-400">Row {e.row}: {e.message}</p>)}
                </div>
              )}

              {summary && summary.invalidStudents > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>{summary.invalidStudents} student row(s) have errors</strong> and will be skipped. Only <strong>{summary.validStudents} valid</strong> rows will be imported.</span>
                </div>
              )}
              {readyToImport && (
                <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-xs text-green-800 dark:text-green-300">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span>All {summary.validStudents} students and {summary.totalSubjects} subjects are valid. Ready to import {summary.validStudents * summary.totalSubjects} marks!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleImportAll} disabled={!canImport}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors">
            {importing
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importing...</>
              : <><CheckCircle2 className="w-4 h-4" /> Import All Marks ({validCount} Students)</>}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AllSubjectsImportModal;
