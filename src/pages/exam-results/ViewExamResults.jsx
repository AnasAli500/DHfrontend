import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen, Calendar, Filter, Award, Search, Printer,
  FileSpreadsheet, FileText, Eye, CheckCircle2, XCircle,
  BarChart2, Users, ArrowRight, RefreshCw, AlertCircle, CheckSquare, Square
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { exportToExcel, printElement } from '../../utils/exportHelpers';
import { useSettings } from '../../context/SettingsContext';

const ViewExamResults = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSettings();

  // Filter States
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classInfo, setClassInfo] = useState(null);

  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('ALL');

  const [examTypes, setExamTypes] = useState([]); // Array of structure objects { _id, examType, maxMarks }
  const [selectedExamTypes, setSelectedExamTypes] = useState([]); // Array of selected examType strings
  const [isFullExamSelected, setIsFullExamSelected] = useState(false);

  const [studentSearch, setStudentSearch] = useState('');

  // Results State
  const [resultsData, setResultsData] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());

  // Auto-select all students when results data loads or updates
  useEffect(() => {
    if (resultsData?.results) {
      setSelectedStudentIds(new Set(resultsData.results.map((r) => r.studentId)));
    } else {
      setSelectedStudentIds(new Set());
    }
  }, [resultsData]);

  // Loading States
  const [loading, setLoading] = useState({
    years: false,
    classes: false,
    classInfo: false,
    seasons: false,
    subjects: false,
    types: false,
    results: false,
  });

  // Validation Error State
  const [validationError, setValidationError] = useState('');

  // Load initial academic years
  useEffect(() => {
    fetchAcademicYears();
  }, []);

  // Auto-refresh when exam marks are updated anywhere in the app
  useEffect(() => {
    const handleExamDataChanged = () => {
      if (selectedClassId && selectedSeasonId && selectedExamTypes.length > 0) {
        const examTypeParam = isFullExamSelected ? 'FULL_EXAM' : selectedExamTypes.join(',');
        api.get('/exam-results/results', {
          params: {
            academicYear: selectedAcademicYear,
            classId: selectedClassId,
            seasonId: selectedSeasonId,
            subject: selectedSubject,
            examType: examTypeParam,
          },
        }).then(res => {
          setResultsData(res.data);
        }).catch(() => {});
      }
    };
    window.addEventListener('examDataChanged', handleExamDataChanged);
    return () => window.removeEventListener('examDataChanged', handleExamDataChanged);
  }, [selectedClassId, selectedSeasonId, selectedSubject, selectedAcademicYear, isFullExamSelected, selectedExamTypes]);

  const fetchAcademicYears = async () => {
    setLoading(prev => ({ ...prev, years: true }));
    try {
      const res = await api.get('/exam-results/academic-years');
      const years = res.data.years || [];
      setAcademicYears(years);

      const urlYear = searchParams.get('academicYear');
      const initialYear = urlYear || years[0] || new Date().getFullYear().toString();
      setSelectedAcademicYear(initialYear);
      fetchClasses(initialYear);
    } catch (err) {
      toast.error('Failed to load academic years');
    } finally {
      setLoading(prev => ({ ...prev, years: false }));
    }
  };

  const fetchClasses = async (year) => {
    if (!year) return;
    setLoading(prev => ({ ...prev, classes: true }));
    try {
      const res = await api.get(`/exam-results/classes?academicYear=${year}`);
      const fetchedClasses = res.data.classes || [];
      setClasses(fetchedClasses);

      const urlClassId = searchParams.get('classId');
      if (urlClassId && fetchedClasses.some(c => c._id === urlClassId)) {
        setSelectedClassId(urlClassId);
        loadClassDependents(urlClassId);
      }
    } catch (err) {
      toast.error('Failed to load classes');
    } finally {
      setLoading(prev => ({ ...prev, classes: false }));
    }
  };

  const loadClassDependents = async (classId) => {
    if (!classId) return;
    setLoading(prev => ({ ...prev, classInfo: true, seasons: true, subjects: true }));
    setValidationError('');

    try {
      // 1. Fetch Class Info & Auto-detect Category
      const infoRes = await api.get(`/exam-results/class-details/${classId}`);
      const info = infoRes.data.classInfo;
      setClassInfo(info);

      // 2. Fetch Exam Seasons for Category
      const seasonRes = await api.get(`/exam-results/seasons?classId=${classId}`);
      const seasonList = seasonRes.data.seasons || [];
      setSeasons(seasonList);

      const urlSeason = searchParams.get('seasonId');
      const initialSeason = urlSeason && seasonList.some(s => s._id === urlSeason) ? urlSeason : '';
      setSelectedSeasonId(initialSeason);

      // 3. Fetch Subjects assigned to class
      const subjectRes = await api.get(`/exam-results/subjects?classId=${classId}`);
      const subjList = subjectRes.data.subjects || [];
      setSubjects(subjList);

      const urlSubject = searchParams.get('subject');
      if (urlSubject && (urlSubject === 'ALL' || subjList.includes(urlSubject))) {
        setSelectedSubject(urlSubject);
      } else {
        setSelectedSubject('ALL');
      }

      // If season exists in URL, load types as well
      if (initialSeason) {
        fetchExamTypes(classId, initialSeason);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load class details');
    } finally {
      setLoading(prev => ({ ...prev, classInfo: false, seasons: false, subjects: false }));
    }
  };

  const fetchExamTypes = async (classId, seasonId) => {
    if (!classId || !seasonId) return;
    setLoading(prev => ({ ...prev, types: true }));
    try {
      const res = await api.get(`/exam-results/types?classId=${classId}&seasonId=${seasonId}`);
      const typesList = res.data.examTypes || [];
      setExamTypes(typesList);

      const allTypeNames = typesList.map(t => t.examType);
      const urlType = searchParams.get('examType');

      if (urlType === 'FULL_EXAM' || urlType === 'ALL') {
        setSelectedExamTypes(allTypeNames);
        setIsFullExamSelected(true);
      } else if (urlType) {
        const parsed = urlType.split(',').map(t => t.trim()).filter(t => allTypeNames.includes(t));
        if (parsed.length > 0) {
          setSelectedExamTypes(parsed);
          setIsFullExamSelected(parsed.length === allTypeNames.length && allTypeNames.length > 0);
        } else {
          // Default select all (Full Exam)
          setSelectedExamTypes(allTypeNames);
          setIsFullExamSelected(true);
        }
      } else {
        // Default: Full Exam selected
        setSelectedExamTypes(allTypeNames);
        setIsFullExamSelected(true);
      }
    } catch (err) {
      toast.error('Failed to load exam types');
    } finally {
      setLoading(prev => ({ ...prev, types: false }));
    }
  };

  // Handlers with Dependency Reset Rules
  const handleAcademicYearChange = (year) => {
    setSelectedAcademicYear(year);
    setSelectedClassId('');
    setClassInfo(null);
    setSeasons([]);
    setSelectedSeasonId('');
    setSubjects([]);
    setSelectedSubject('ALL');
    setExamTypes([]);
    setSelectedExamTypes([]);
    setIsFullExamSelected(false);
    setResultsData(null);
    setValidationError('');

    fetchClasses(year);
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    setClassInfo(null);
    setSeasons([]);
    setSelectedSeasonId('');
    setSubjects([]);
    setSelectedSubject('ALL');
    setExamTypes([]);
    setSelectedExamTypes([]);
    setIsFullExamSelected(false);
    setResultsData(null);
    setValidationError('');

    if (classId) {
      loadClassDependents(classId);
    }
  };

  const handleSeasonChange = (seasonId) => {
    setSelectedSeasonId(seasonId);
    setExamTypes([]);
    setSelectedExamTypes([]);
    setIsFullExamSelected(false);
    setResultsData(null);
    setValidationError('');

    if (selectedClassId && seasonId) {
      fetchExamTypes(selectedClassId, seasonId);
    }
  };

  const handleSubjectChange = (subject) => {
    setSelectedSubject(subject);
    setResultsData(null);
    setValidationError('');
  };

  // Exam Type Checkbox Handlers
  const handleToggleFullExam = () => {
    const allTypeNames = examTypes.map(t => t.examType);
    if (!isFullExamSelected) {
      setSelectedExamTypes(allTypeNames);
      setIsFullExamSelected(true);
    } else {
      setSelectedExamTypes([]);
      setIsFullExamSelected(false);
    }
    setResultsData(null);
    setValidationError('');
  };

  const handleToggleExamType = (typeName) => {
    const allTypeNames = examTypes.map(t => t.examType);
    let updated = [];
    if (selectedExamTypes.includes(typeName)) {
      updated = selectedExamTypes.filter(t => t !== typeName);
    } else {
      updated = [...selectedExamTypes, typeName];
    }

    setSelectedExamTypes(updated);
    setIsFullExamSelected(updated.length === allTypeNames.length && allTypeNames.length > 0);
    setResultsData(null);
    setValidationError('');
  };

  // Calculate Max Marks for currently checked exam types
  const calculatedMaxMarks = selectedExamTypes.reduce((sum, typeName) => {
    const match = examTypes.find(t => t.examType === typeName);
    return sum + (match ? match.maxMarks : 0);
  }, 0);

  // View Results Click
  const handleViewResults = async () => {
    if (!selectedAcademicYear) {
      setValidationError('Please select Academic Year');
      return;
    }
    if (!selectedClassId) {
      setValidationError('Please select a Class');
      return;
    }
    if (!selectedSeasonId) {
      setValidationError('Please select an Exam Season');
      return;
    }
    if (selectedExamTypes.length === 0) {
      setValidationError('Please select at least one Exam Type or Full Exam');
      return;
    }

    setValidationError('');
    setLoading(prev => ({ ...prev, results: true }));

    const examTypeParam = isFullExamSelected ? 'FULL_EXAM' : selectedExamTypes.join(',');

    // Update URL params
    setSearchParams({
      academicYear: selectedAcademicYear,
      classId: selectedClassId,
      seasonId: selectedSeasonId,
      subject: selectedSubject,
      examType: examTypeParam,
    });

    try {
      const res = await api.get('/exam-results/results', {
        params: {
          academicYear: selectedAcademicYear,
          classId: selectedClassId,
          seasonId: selectedSeasonId,
          subject: selectedSubject,
          examType: examTypeParam,
        },
      });

      setResultsData(res.data);
      if (res.data.results.length === 0) {
        toast.info('No results found for the selected criteria');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch exam results');
      setResultsData(null);
    } finally {
      setLoading(prev => ({ ...prev, results: false }));
    }
  };

  // Filtered rows for client search
  const filteredResults = resultsData?.results?.filter(r => {
    if (!studentSearch.trim()) return true;
    const term = studentSearch.toLowerCase();
    return (
      r.name?.toLowerCase().includes(term) ||
      r.admissionNumber?.toLowerCase().includes(term)
    );
  }) || [];

  // Navigate to individual student page
  const handleViewStudentExams = (studentId) => {
    const examTypeParam = isFullExamSelected ? 'FULL_EXAM' : selectedExamTypes.join(',');
    const query = new URLSearchParams({
      classId: selectedClassId,
      seasonId: selectedSeasonId,
      subject: selectedSubject,
      examType: examTypeParam,
      academicYear: selectedAcademicYear,
    }).toString();

    navigate(`/exam-results/student/${studentId}?${query}`);
  };

  // Export handlers
  const handleExportExcel = () => {
    if (!resultsData || filteredResults.length === 0) {
      toast.error('No results available to export');
      return;
    }

    const exportResults = filteredResults.filter((r) => selectedStudentIds.has(r.studentId));
    if (exportResults.length === 0) {
      toast.error('No students selected to export');
      return;
    }

    const className = classInfo?.className || 'Class';
    const filename = `${className}_Exam_Results_${selectedAcademicYear}`;

    if (resultsData.viewType === 'single') {
      const examTypeHeaders = resultsData.isCombined ? (resultsData.selectedExamTypes || []) : [];
      const headers = ['Rank', 'Student Name', 'Admission Number', 'Subject', ...examTypeHeaders, 'Total Marks', 'Percentage', 'Grade', 'Result Status'];

      const rows = exportResults.map(r => {
        const rowData = [r.rank, r.name, r.admissionNumber, r.subject];
        if (resultsData.isCombined) {
          examTypeHeaders.forEach(t => {
            rowData.push(r.examTypeMarks && r.examTypeMarks[t] !== undefined && r.examTypeMarks[t] !== null ? r.examTypeMarks[t] : '-');
          });
        }
        rowData.push(r.marksObtained ?? r.totalDisplay, `${r.percentage}%`, r.grade, r.status);
        return rowData;
      });

      exportToExcel(filename, headers, rows);
    } else {
      const subjectHeaders = resultsData.subjects || [];
      const headers = ['Rank', 'Student Name', 'Admission Number', ...subjectHeaders, 'Total Marks', 'Average Percentage', 'Overall Grade', 'Result Status'];

      const rows = exportResults.map(r => {
        const rowData = [r.rank, r.name, r.admissionNumber];
        subjectHeaders.forEach(subj => {
          const val = r.subjectMarks[subj];
          rowData.push(val ? (val.display || val) : '-');
        });
        rowData.push(r.totalDisplay, r.averageDisplay, r.grade, r.status);
        return rowData;
      });

      exportToExcel(filename, headers, rows);
    }

    toast.success(`Exported ${exportResults.length} selected student(s) to Excel`);
  };

  return (
    <div className="space-y-6 pb-12 print:p-0 print:m-0 print:space-y-2">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 9.5px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden, nav, header, aside {
            display: none !important;
          }
          /* Allow all wrapper containers to break pages naturally so table starts on Page 1 */
          html, body, #root, main, div, section, article {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            min-height: 0 !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
            page-break-before: auto !important;
            break-before: auto !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .space-y-6 > :not([hidden]) ~ :not([hidden]),
          .space-y-5 > :not([hidden]) ~ :not([hidden]),
          .space-y-4 > :not([hidden]) ~ :not([hidden]),
          .space-y-3 > :not([hidden]) ~ :not([hidden]),
          .space-y-2 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 3px !important;
            margin-bottom: 0px !important;
          }
          .p-5, .p-4, .p-3, .p-2.5, .py-2.5 {
            padding: 3px 6px !important;
          }
          .shadow-sm, .shadow-md, .shadow-lg {
            box-shadow: none !important;
          }
          .rounded-xl, .rounded-lg {
            border-radius: 4px !important;
          }
          h3, h4 {
            font-size: 11px !important;
            line-height: 1.2 !important;
            margin: 0 !important;
          }
          img {
            max-height: 28px !important;
            width: auto !important;
            padding: 0px !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 9px !important;
            margin-top: 3px !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          tbody {
            display: table-row-group !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          th, td {
            padding: 2px 4px !important;
            border: 1px solid #cbd5e1 !important;
          }
          th {
            background-color: #f1f5f9 !important;
            color: black !important;
            font-weight: 700 !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-7 h-7 text-primary-600" />
            Exam Results
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            View single or combined exam results by class, category, season, and subject
          </p>
        </div>
      </div>

      {/* FILTER FLOW CARD */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 print:hidden">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          <Filter className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Exam Filter Criteria</h2>
        </div>

        {validationError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* 1. Academic Year */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Academic Year <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => handleAcademicYearChange(e.target.value)}
              className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500 p-2.5"
              disabled={loading.years}
            >
              <option value="">Select Year</option>
              {academicYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* 2. Select Class */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Select Class <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500 p-2.5"
              disabled={!selectedAcademicYear || loading.classes}
            >
              <option value="">Select Class</option>
              {classes.map(c => (
                <option key={c._id} value={c._id}>{c.className} ({c.gradeLevel})</option>
              ))}
            </select>
          </div>

          {/* 3. Auto Detect Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Category (Auto Detected)
            </label>
            <div className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200 p-2.5 font-medium truncate flex items-center gap-1.5">
              {loading.classInfo ? (
                <RefreshCw className="w-4 h-4 animate-spin text-primary-600" />
              ) : classInfo?.category?.name ? (
                <span className="text-primary-600 dark:text-primary-400 font-semibold">{classInfo.category.name}</span>
              ) : (
                <span className="text-gray-400 italic">Select class first</span>
              )}
            </div>
          </div>

          {/* 4. Select Exam Season */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Exam Season <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSeasonId}
              onChange={(e) => handleSeasonChange(e.target.value)}
              className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500 p-2.5"
              disabled={!selectedClassId || loading.seasons}
            >
              <option value="">Select Season</option>
              {seasons.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* 5. Select Subject / All Subjects */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500 p-2.5"
              disabled={!selectedClassId || loading.subjects}
            >
              <option value="ALL">All Subjects</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* EXAM TYPE SELECTION (SINGLE / COMBINED / FULL EXAM) */}
        {selectedSeasonId && (
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Exam Type Selection <span className="text-red-500">*</span>
              </label>
              {selectedExamTypes.length > 0 && (
                <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-full border border-primary-200 dark:border-primary-800">
                  {isFullExamSelected
                    ? `Full Exam (${calculatedMaxMarks} Marks)`
                    : selectedExamTypes.length > 1
                      ? `Combined (${selectedExamTypes.join(' + ')}) — Max Marks: ${calculatedMaxMarks}`
                      : `Single (${selectedExamTypes[0]} — Max Marks: ${calculatedMaxMarks})`
                  }
                </span>
              )}
            </div>

            {loading.types ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <RefreshCw className="w-4 h-4 animate-spin text-primary-600" /> Loading exam types...
              </div>
            ) : examTypes.length === 0 ? (
              <div className="text-xs text-amber-600 dark:text-amber-400 italic">No exam types configured for this season.</div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {/* Full Exam Checkbox Option */}
                <button
                  type="button"
                  onClick={handleToggleFullExam}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                    isFullExamSelected
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {isFullExamSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  Full Exam (All Exam Types)
                </button>

                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1 hidden sm:block"></div>

                {/* Individual Exam Type Checkboxes */}
                {examTypes.map(t => {
                  const isChecked = selectedExamTypes.includes(t.examType);
                  return (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => handleToggleExamType(t.examType)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border ${
                        isChecked
                          ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-700'
                          : 'bg-white dark:bg-gray-700/60 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" /> : <Square className="w-3.5 h-3.5 text-gray-400" />}
                      <span>{t.examType}</span>
                      <span className="text-[10px] opacity-75 font-mono">({t.maxMarks}m)</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* View Results Action Button */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleViewResults}
            disabled={loading.results || !selectedClassId || !selectedSeasonId || selectedExamTypes.length === 0}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm"
          >
            {loading.results ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading Results...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                View Results
              </>
            )}
          </button>
        </div>
      </div>

      {/* COMPACT CLASS INFORMATION CARD WITH CENTERED LOGO ALONE */}
      {classInfo && (
        <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-800 text-white rounded-xl py-2.5 px-5 shadow-md flex items-center justify-between gap-4">
          {/* Left: Class Overview */}
          <div className="min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-primary-200 font-semibold block">Selected Class</span>
            <h3 className="text-base font-bold truncate">{classInfo.className} ({classInfo.gradeLevel})</h3>
          </div>

          {/* CENTER: LOGO ALONE (ENLARGED) */}
          <div className="flex items-center justify-center shrink-0">
            {settings?.schoolLogo ? (
              <img
                src={settings.schoolLogo}
                alt="School Logo"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl bg-white p-1.5 shadow-lg border-2 border-white/40 ring-4 ring-white/10"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 shadow-md">
                <Award className="w-10 h-10 text-white" />
              </div>
            )}
          </div>

          {/* Right: Badges */}
          <div className="flex items-center gap-2 text-xs">
            <div className="bg-white/10 border border-white/10 px-2.5 py-1 rounded-lg backdrop-blur-sm hidden sm:block">
              <span className="text-[10px] text-primary-200 block font-medium">Category</span>
              <span className="font-semibold">{classInfo.category?.name || 'N/A'}</span>
            </div>

            <div className="bg-white/10 border border-white/10 px-2.5 py-1 rounded-lg backdrop-blur-sm">
              <span className="text-[10px] text-primary-200 block font-medium">Academic Year</span>
              <span className="font-semibold">{classInfo.academicYear}</span>
            </div>

            <div className="bg-white/10 border border-white/10 px-2.5 py-1 rounded-lg backdrop-blur-sm">
              <span className="text-[10px] text-primary-200 block font-medium">Students</span>
              <span className="font-semibold">{classInfo.totalStudents}</span>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS DISPLAY SECTION */}
      {resultsData && (
        <div className="space-y-6">
          {/* COMBINED EXAM BANNER HEADER */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Selected Result Mode</span>
              <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {resultsData.combinedExamLabel}
                {resultsData.isCombined && (
                  <span className="bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-primary-300 dark:border-primary-800">
                    Combined Exam
                  </span>
                )}
              </h4>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600">
                <span className="text-gray-500 dark:text-gray-400">Total Max Marks: </span>
                <span className="text-gray-900 dark:text-white font-mono font-bold">{resultsData.totalMaxMarks}</span>
              </div>
            </div>
          </div>

          {/* CLASS SUMMARY STATISTICS */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 print:grid-cols-7 print:gap-1">
            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-center print:p-1 print:rounded print:shadow-none print:border-gray-300">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium print:text-[8px] print:text-black">Total Students</span>
              <span className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5 block print:text-xs print:mt-0 print:text-black">{resultsData.summary.totalStudents}</span>
            </div>

            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-center print:p-1 print:rounded print:shadow-none print:border-gray-300">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium print:text-[8px] print:text-black">Average Marks</span>
              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 block print:text-xs print:mt-0 print:text-black">{resultsData.summary.averageMarks}</span>
            </div>

            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-center print:p-1 print:rounded print:shadow-none print:border-gray-300">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium print:text-[8px] print:text-black">Highest Score</span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block print:text-xs print:mt-0 print:text-black">{resultsData.summary.highestScore}</span>
            </div>

            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-center print:p-1 print:rounded print:shadow-none print:border-gray-300">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium print:text-[8px] print:text-black">Lowest Score</span>
              <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 block print:text-xs print:mt-0 print:text-black">{resultsData.summary.lowestScore}</span>
            </div>

            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-center print:p-1 print:rounded print:shadow-none print:border-gray-300">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium print:text-[8px] print:text-black">Pass Count</span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block print:text-xs print:mt-0 print:text-black">{resultsData.summary.passCount}</span>
            </div>

            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-center print:p-1 print:rounded print:shadow-none print:border-gray-300">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium print:text-[8px] print:text-black">Fail Count</span>
              <span className="text-sm font-extrabold text-red-600 dark:text-red-400 mt-0.5 block print:text-xs print:mt-0 print:text-black">{resultsData.summary.failCount}</span>
            </div>

            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-center print:p-1 print:rounded print:shadow-none print:border-gray-300">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium print:text-[8px] print:text-black">Pass Rate</span>
              <span className="text-sm font-extrabold text-purple-600 dark:text-purple-400 mt-0.5 block print:text-xs print:mt-0 print:text-black">{resultsData.summary.passPercentage}</span>
            </div>
          </div>

          {/* SEARCH & ACTIONS BAR */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search Student Name / Admission No..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Print Selection Counter & Select/Deselect All Toggle */}
              {filteredResults.length > 0 && (
                <div className="flex items-center gap-2 text-xs font-semibold bg-primary-50 dark:bg-primary-950/40 text-primary-900 dark:text-primary-200 px-3 py-2 rounded-lg border border-primary-200 dark:border-primary-800">
                  <CheckSquare className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
                  <span>
                    Selected for Print: <strong>{selectedStudentIds.size}</strong> / {filteredResults.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStudentIds.size === filteredResults.length) {
                        setSelectedStudentIds(new Set());
                      } else {
                        setSelectedStudentIds(new Set(filteredResults.map(r => r.studentId)));
                      }
                    }}
                    className="text-primary-600 dark:text-primary-400 hover:underline font-bold ml-1.5 cursor-pointer"
                  >
                    {selectedStudentIds.size === filteredResults.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleViewResults}
                disabled={loading.results}
                className="px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg flex items-center gap-1.5 transition-colors border border-blue-200 dark:border-blue-800"
              >
                <RefreshCw className={`w-4 h-4 ${loading.results ? 'animate-spin' : ''}`} />
                Refresh Results
              </button>
              <button
                onClick={printElement}
                disabled={selectedStudentIds.size === 0}
                className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors"
                title={selectedStudentIds.size === 0 ? 'Select at least one student to print' : `Print ${selectedStudentIds.size} student(s)`}
              >
                <Printer className="w-4 h-4" />
                Print ({selectedStudentIds.size})
              </button>
              <button
                onClick={handleExportExcel}
                disabled={selectedStudentIds.size === 0}
                className="px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors border border-emerald-200 dark:border-emerald-800"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel ({selectedStudentIds.size})
              </button>
            </div>
          </div>

          {/* RESULTS TABLE */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {filteredResults.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <h4 className="text-base font-semibold text-gray-700 dark:text-gray-300">No exam results found</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Try adjusting your filter selection or search query.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-750 text-sm font-bold text-gray-700 dark:text-gray-200 border-b-2 border-gray-200 dark:border-gray-600">
                    <tr>
                      {/* SELECT ALL CHECKBOX COLUMN */}
                      <th className="px-3 py-3.5 text-center w-10 print:hidden">
                        <input
                          type="checkbox"
                          title="Select / Deselect All for Print"
                          checked={filteredResults.length > 0 && filteredResults.every((r) => selectedStudentIds.has(r.studentId))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds(new Set(filteredResults.map((r) => r.studentId)));
                            } else {
                              setSelectedStudentIds(new Set());
                            }
                          }}
                          className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 cursor-pointer accent-primary-600"
                        />
                      </th>
                      <th className="px-4 py-3.5 text-center w-14">Rank</th>
                      <th className="px-4 py-3.5">Student Name</th>
                      <th className="px-4 py-3.5">Admission No</th>

                      {resultsData.viewType === 'single' ? (
                        <>
                          <th className="px-4 py-3.5">
                            <div className="relative group inline-block">
                              <span>Subject</span>
                            </div>
                          </th>
                          {resultsData.isCombined ? (
                            resultsData.selectedExamTypes?.map(t => (
                              <th key={t} className="px-4 py-3.5 text-center">{t}</th>
                            ))
                          ) : null}
                          <th className="px-4 py-3.5 text-center">Total Marks</th>
                          <th className="px-4 py-3.5 text-center">Percentage</th>
                          <th className="px-4 py-3.5 text-center">Grade</th>
                        </>
                      ) : (
                        <>
                          {resultsData.subjects?.map(subj => (
                            <th key={subj} className="px-4 py-3.5 text-center">
                              <div className="relative group inline-block">
                                <span className="cursor-pointer" title={`Subject: ${subj}`}>
                                  {subj}
                                </span>
                                <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:flex flex-col items-center z-50 whitespace-nowrap no-print">
                                  <div className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 text-xs font-semibold py-1 px-2.5 rounded shadow-lg border border-gray-700 dark:border-gray-300">
                                    Subject: {subj}
                                  </div>
                                  <div className="w-2 h-2 -mt-1 rotate-45 bg-gray-900 dark:bg-gray-100"></div>
                                </div>
                              </div>
                            </th>
                          ))}
                          <th className="px-4 py-3.5 text-center">Total Marks</th>
                          <th className="px-4 py-3.5 text-center">Average</th>
                          <th className="px-4 py-3.5 text-center">Grade</th>
                        </>
                      )}

                      <th className="px-4 py-3.5 text-center">Status</th>
                      <th className="px-4 py-3.5 text-right print:hidden">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredResults.map((r) => {
                      const isSelected = selectedStudentIds.has(r.studentId);
                      const totalObt = r.totalObtained ?? r.marksObtained ?? parseFloat(r.totalDisplay);
                      const singleBelow50 = resultsData.viewType === 'single' && totalObt !== undefined && totalObt !== null && Number(totalObt) < 50;

                      return (
                        <tr
                          key={r.studentId}
                          className={`hover:bg-gray-50/50 dark:hover:bg-gray-750/50 transition-colors ${
                            !isSelected ? 'opacity-40 print:hidden bg-gray-50/30 dark:bg-gray-900/30' : ''
                          }`}
                        >
                          {/* INDIVIDUAL ROW CHECKBOX */}
                          <td className="px-3 py-3.5 text-center print:hidden">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const next = new Set(selectedStudentIds);
                                if (next.has(r.studentId)) next.delete(r.studentId);
                                else next.add(r.studentId);
                                setSelectedStudentIds(next);
                              }}
                              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 cursor-pointer accent-primary-600"
                            />
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                              r.rank === 1 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300' :
                              r.rank === 2 ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300' :
                              r.rank === 3 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200' :
                              'text-gray-600 dark:text-gray-400'
                            }`}>
                              {r.rank}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-white">
                            {r.name}
                          </td>

                          <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {r.admissionNumber}
                          </td>

                          {resultsData.viewType === 'single' ? (
                            <>
                              <td className="px-4 py-3.5 text-sm font-medium">
                                <div className="relative group inline-block">
                                  <span
                                    className={`cursor-pointer transition-colors ${
                                      singleBelow50 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-700 dark:text-gray-300'
                                    }`}
                                    title={`Subject: ${r.subject}`}
                                  >
                                    {r.subject}
                                  </span>
                                  <div className="pointer-events-none absolute left-0 bottom-full mb-1.5 hidden group-hover:flex flex-col items-center z-50 whitespace-nowrap no-print">
                                    <div className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 text-xs font-semibold py-1 px-2.5 rounded shadow-lg border border-gray-700 dark:border-gray-300">
                                      Subject: {r.subject}
                                    </div>
                                    <div className="w-2 h-2 -mt-1 rotate-45 bg-gray-900 dark:bg-gray-100"></div>
                                  </div>
                                </div>
                              </td>
                              {resultsData.isCombined ? (
                                resultsData.selectedExamTypes?.map(t => (
                                  <td key={t} className="px-4 py-3.5 text-center font-mono">
                                    {r.examTypeMarks && r.examTypeMarks[t] !== undefined && r.examTypeMarks[t] !== null ? (
                                      <span className={`font-bold text-sm ${singleBelow50 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                                        {r.examTypeMarks[t]}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 dark:text-gray-600">-</span>
                                    )}
                                  </td>
                                ))
                              ) : null}

                              <td className="px-4 py-3.5 text-center font-mono font-bold text-sm">
                                <span className={singleBelow50 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}>
                                  {r.totalObtained ?? r.marksObtained ?? r.totalDisplay}
                                </span>
                              </td>
                              <td className={`px-4 py-3.5 text-center text-sm font-bold ${
                                singleBelow50 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                              }`}>
                                {r.percentage}%
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className={`px-2.5 py-1 rounded text-sm font-bold ${
                                  singleBelow50
                                    ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                }`}>
                                  {r.grade}
                                </span>
                              </td>
                            </>
                          ) : (
                            <>
                              {resultsData.subjects?.map(subj => {
                                const valObj = r.subjectMarks ? r.subjectMarks[subj] : undefined;
                                const markVal = typeof valObj === 'object' ? (valObj.obtained ?? parseFloat(valObj.display)) : parseFloat(valObj);
                                const isSubjBelow50 = valObj !== undefined && !isNaN(markVal) && markVal < 50;

                                return (
                                  <td key={subj} className="px-4 py-3.5 text-center font-mono">
                                    {valObj !== undefined ? (
                                      <span className={`font-bold text-sm ${isSubjBelow50 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                                        {typeof valObj === 'object' ? (valObj.obtained ?? valObj.display) : valObj}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 dark:text-gray-600">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-4 py-3.5 text-center font-mono font-bold text-sm text-gray-900 dark:text-white">{r.totalObtained ?? r.totalDisplay}</td>
                              <td className="px-4 py-3.5 text-center text-sm font-bold text-blue-600 dark:text-blue-400">{r.averageDisplay}</td>
                              <td className="px-4 py-3.5 text-center">
                                <span className="px-2.5 py-1 rounded text-sm font-bold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                  {r.grade}
                                </span>
                              </td>
                            </>
                          )}

                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                              r.status === 'Pass' || r.status === 'PASS'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                            }`}>
                              {r.status === 'Pass' || r.status === 'PASS' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {r.status}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right print:hidden">
                            <button
                              onClick={() => handleViewStudentExams(r.studentId)}
                              className="px-3.5 py-1.5 bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 dark:hover:bg-primary-900/60 text-primary-600 dark:text-primary-400 text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 border border-primary-200 dark:border-primary-800"
                              title="View Student Exams"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View Student Exams</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewExamResults;
