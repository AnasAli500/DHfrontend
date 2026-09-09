import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Save, Info, Pencil, Trash2, FlaskConical, Send, Eye, Upload,
  BarChart3, FileText, CheckCircle2, XCircle, Clock, Users,
  RefreshCw, BookOpen, Award, TrendingUp, ChevronRight, Printer
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ResultCardModal from '../../components/exams/ResultCardModal';
import ExamImportModal from '../../components/exams/ExamImportModal';
import AllSubjectsImportModal from '../../components/exams/AllSubjectsImportModal';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { calculateGrade, calculatePercentage, calculateGPA } from '../../utils/gradeCalculator';

// ─── Grade styles ────────────────────────────────────────────────────────────
const GRADE_STYLES = {
  'A+': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  A: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  B: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  C: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  D: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  F: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_BADGE = {
  Draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  Processed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const ATTENDANCE_OPTIONS = ['Present', 'Absent', 'Excused', 'Late'];

// ─── Main Component ──────────────────────────────────────────────────────────
const Exams = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialClassId = searchParams.get('classId') || '';

  const TABS = [
    { id: 'create', label: t('exams.addExam'), icon: Plus },
    { id: 'results', label: t('exams.processResults'), icon: FlaskConical },
    { id: 'cards', label: t('exams.examResults'), icon: Award },
    { id: 'analytics', label: t('reports.title'), icon: BarChart3 },
  ];

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const today = new Date().toISOString().split('T')[0];

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState('create');

  // ── List view state ──
  const [exams, setExams] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [filterClass, setFilterClass] = useState(initialClassId);
  const [filterPeriod, setFilterPeriod] = useState('');

  // ── Form data ──
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [structures, setStructures] = useState([]);
  const [sheetStudents, setSheetStudents] = useState([]);

  const [examForm, setExamForm] = useState({
    classId: '', teacherId: '', periodId: '',
    examSeasonId: '', examStructureId: '', examName: '',
    examDate: today, totalMarks: '',
  });

  // ── Create view toggle ──
  const [view, setView] = useState('list');
  const [editModal, setEditModal] = useState({ open: false, exam: null, marks: '' });

  // ── Process & Publish state ──
  const [processedResults, setProcessedResults] = useState([]);
  const [processLoading, setProcessLoading] = useState(false);
  const [processForm, setProcessForm] = useState({ classId: '', examSeasonId: '' });
  const [resultClasses, setResultClasses] = useState([]);
  const [resultSeasons, setResultSeasons] = useState([]);

  // ── Result Cards state ──
  const [cardStudents, setCardStudents] = useState([]);
  const [cardClassId, setCardClassId] = useState('');
  const [cardSeasonId, setCardSeasonId] = useState('');
  const [cardSeasons, setCardSeasons] = useState([]);
  const [cardData, setCardData] = useState(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);

  // ── Analytics state ──
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsClass, setAnalyticsClass] = useState('');
  const [analyticsSeason, setAnalyticsSeason] = useState('');
  const [allSeasons, setAllSeasons] = useState([]);

  // ── Exam Import Modal ──
  const [examImportOpen, setExamImportOpen] = useState(false);

  // ── All-Subjects Bulk Import Modal ──
  const [allSubjectsImportOpen, setAllSubjectsImportOpen] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // Data fetchers
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const { data } = await api.get('/students/academic-years');
        const sorted = (data.years || []).sort((a, b) => b.localeCompare(a));
        setAcademicYears(sorted);
        if (sorted.length > 0) {
          setSelectedAcademicYear(sorted[0]);
        }
      } catch (err) {
        console.error('Failed to fetch academic years', err);
      }
    };
    fetchYears();
  }, []);

  const fetchClasses = useCallback(async () => {
    const params = { limit: 100 };
    if (selectedAcademicYear) params.academicYear = selectedAcademicYear;
    const { data } = await api.get('/classes', { params });
    setClasses(data.classes || []);
    setResultClasses(data.classes || []);
  }, [selectedAcademicYear]);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filterClass) params.classId = filterClass;
      if (filterPeriod) params.periodId = filterPeriod;
      const { data } = await api.get('/exams', { params });
      setExams(data.exams);
      setPages(data.pages);
    } finally {
      setLoading(false);
    }
  }, [page, filterClass, filterPeriod]);

  const fetchTeachersForClass = useCallback(async (classId) => {
    if (!classId) { setTeachers([]); return; }
    const { data } = await api.get(`/exams/teachers/${classId}`);
    setTeachers(data.teachers);
    if (data.teachers.length === 1) {
      setExamForm((f) => ({ ...f, teacherId: data.teachers[0]._id }));
    }
  }, []);

  const fetchExamSetup = useCallback(async (classId, seasonId = '') => {
    if (!classId) return;
    try {
      const { data } = await api.get('/exams/setup', { params: { classId, seasonId } });
      setSeasons(data.seasons);
      setSubjects(data.subjects);
      setStructures(data.structures);
    } catch {
      setSeasons([]); setSubjects([]); setStructures([]);
    }
  }, []);

  const fetchPeriodsForClassTeacher = useCallback(async (classId, teacherId) => {
    if (!classId || !teacherId) { setPeriods([]); return; }
    try {
      const { data } = await api.get('/exams/periods', { params: { classId, teacherId } });
      setPeriods(data.periods);
      if (data.periods && data.periods.length > 0) {
        setExamForm((f) => ({ ...f, periodId: data.periods[0]._id }));
      }
    } catch {
      setPeriods([]);
    }
  }, []);

  const fetchSheet = useCallback(async () => {
    const { classId, teacherId, periodId, examType, examName, examDate, examSeasonId, examStructureId } = examForm;
    if (!classId || !teacherId || !periodId || !examDate) { setSheetStudents([]); return; }
    setSheetLoading(true);
    try {
      const { data } = await api.get('/exams/sheet', {
        params: { classId, teacherId, periodId, examType, examName, examDate, examSeasonId, examStructureId },
      });
      setSheetStudents(data.students);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load students');
      setSheetStudents([]);
    } finally {
      setSheetLoading(false);
    }
  }, [examForm.classId, examForm.teacherId, examForm.periodId, examForm.examType, examForm.examName, examForm.examDate, examForm.examSeasonId, examForm.examStructureId]);

  const fetchProcessedResults = useCallback(async (classId, seasonId) => {
    if (!classId || !seasonId) { setProcessedResults([]); return; }
    setProcessLoading(true);
    try {
      const { data } = await api.get('/exams/processed', { params: { classId, examSeasonId: seasonId } });
      setProcessedResults(data.results);
    } catch {
      setProcessedResults([]);
    } finally {
      setProcessLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async (classId = '', seasonId = '') => {
    setAnalyticsLoading(true);
    try {
      const { data } = await api.get('/exams/analytics', {
        params: { classId: classId || undefined, seasonId: seasonId || undefined },
      });
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Effects
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  useEffect(() => {
    if (activeTab === 'create' && view === 'list') fetchExams();
  }, [activeTab, view, fetchExams]);

  useEffect(() => {
    if (view === 'create' && examForm.classId) fetchTeachersForClass(examForm.classId);
  }, [view, examForm.classId, fetchTeachersForClass]);

  useEffect(() => {
    if (view === 'create' && examForm.classId) fetchExamSetup(examForm.classId, examForm.examSeasonId);
  }, [view, examForm.classId, examForm.examSeasonId, fetchExamSetup]);

  useEffect(() => {
    if (view === 'create' && examForm.classId && examForm.teacherId) {
      fetchPeriodsForClassTeacher(examForm.classId, examForm.teacherId);
    }
  }, [view, examForm.classId, examForm.teacherId, fetchPeriodsForClassTeacher]);

  useEffect(() => {
    if (view === 'create' && examForm.classId && examForm.teacherId && examForm.periodId && examForm.examDate) {
      fetchSheet();
    }
  }, [view, fetchSheet]);

  // Recalculate grades on totalMarks change
  useEffect(() => {
    if (view !== 'create') return;
    setSheetStudents((prev) =>
      prev.map((s) => {
        if (s.marks === '' || s.marks === null || s.marks === undefined) return s;
        const percentage = calculatePercentage(s.marks, examForm.totalMarks);
        const grade = calculateGrade(percentage);
        return { ...s, percentage, grade };
      })
    );
  }, [examForm.totalMarks, view]);

  useEffect(() => {
    if (activeTab === 'results') {
      // Load seasons for process form
      const loadSeasons = async () => {
        try {
          const { data } = await api.get('/categories');
          const allSeasonsData = [];
          for (const cat of data.categories) {
            const { data: setup } = await api.get('/exams/setup', { params: { classId: resultClasses[0]?._id || '' } }).catch(() => ({ data: { seasons: [] } }));
            // We'll lazily load when classId is set
          }
        } catch { /* */ }
      };
    }
    if (activeTab === 'analytics') fetchAnalytics(analyticsClass, analyticsSeason);
  }, [activeTab]);

  useEffect(() => {
    if (processForm.classId) {
      const loadResultSeasons = async () => {
        try {
          const { data } = await api.get('/exams/setup', { params: { classId: processForm.classId } });
          setResultSeasons(data.seasons);
        } catch { setResultSeasons([]); }
      };
      loadResultSeasons();
    } else {
      setResultSeasons([]);
    }
  }, [processForm.classId]);

  useEffect(() => {
    if (processForm.classId && processForm.examSeasonId) {
      fetchProcessedResults(processForm.classId, processForm.examSeasonId);
    }
  }, [processForm.classId, processForm.examSeasonId, fetchProcessedResults]);

  useEffect(() => {
    if (cardClassId) {
      const loadCardSeasons = async () => {
        try {
          const { data } = await api.get('/exams/setup', { params: { classId: cardClassId } });
          setCardSeasons(data.seasons);
          const students = await api.get('/students', { params: { classId: cardClassId, limit: 200 } });
          setCardStudents(students.data.students || []);
        } catch { setCardSeasons([]); setCardStudents([]); }
      };
      loadCardSeasons();
    }
  }, [cardClassId]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics(analyticsClass, analyticsSeason);
    }
  }, [analyticsClass, analyticsSeason, activeTab]);

  // Load analytics seasons from existing classes
  useEffect(() => {
    const loadAllSeasons = async () => {
      if (classes.length === 0) return;
      const data = await api.get('/exams/setup', { params: { classId: classes[0]._id } }).catch(() => ({ data: { seasons: [] } }));
      setAllSeasons(data.data?.seasons || []);
    };
    if (classes.length > 0) loadAllSeasons();
  }, [classes]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════════════════════════════════════
  const openCreateView = () => {
    setExamForm({ classId: filterClass || '', teacherId: '', periodId: '', examSeasonId: '', examStructureId: '', examName: '', examDate: today, totalMarks: '' });
    setSheetStudents([]);
    setView('create');
  };

  const updateStudentField = (studentId, field, value) => {
    setSheetStudents((prev) =>
      prev.map((s) => {
        if (s._id !== studentId) return s;
        if (field === 'marks') {
          const numMarks = value === '' ? '' : Number(value);
          if (value === '' || Number.isNaN(numMarks)) return { ...s, marks: '', grade: '', percentage: '' };
          const percentage = calculatePercentage(numMarks, examForm.totalMarks);
          const grade = calculateGrade(percentage);
          return { ...s, marks: numMarks, grade, percentage };
        }
        return { ...s, [field]: value };
      })
    );
  };

  const handleSaveBulk = async (isUpdate = false) => {
    const { classId, teacherId, periodId, examSeasonId, examStructureId, examName, examDate, totalMarks } = examForm;
    if (!classId || !teacherId || !periodId || !examSeasonId || !examStructureId || !examName || !examDate || !totalMarks) {
      return toast.error('Please fill in all exam details before saving.');
    }
    const records = sheetStudents.filter((s) => s.marks !== '' && s.marks !== null && s.marks !== undefined);
    if (!records.length) return toast.error('Enter marks for at least one student.');

    setSaving(true);
    try {
      await api.post('/exams/bulk', {
        classId, teacherId, periodId, examSeasonId, examStructureId, examName, examDate,
        totalMarks: Number(totalMarks),
        records: records.map((s) => ({
          examId: s.examId || undefined,
          studentId: s._id,
          marks: s.marks,
          attendance: s.attendance || 'Present',
          remarks: s.remarks || '',
        })),
      });
      toast.success(isUpdate ? 'Exam results updated successfully!' : 'Exam results saved as Draft!');
      setView('list');
      fetchExams();
      // Auto sync Process & Publish tab and Result Cards state
      setProcessForm({ classId, examSeasonId });
      fetchProcessedResults(classId, examSeasonId);
      setCardClassId(classId);
      setCardSeasonId(examSeasonId);
      window.dispatchEvent(new CustomEvent('examDataChanged', { detail: { classId, examSeasonId } }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save exam results');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSheet = (exam) => {
    const cId = typeof exam.classId === 'object' ? exam.classId?._id : exam.classId;
    const tId = typeof exam.teacherId === 'object' ? exam.teacherId?._id : exam.teacherId;
    const pId = typeof exam.periodId === 'object' ? exam.periodId?._id : exam.periodId;
    setExamForm({
      classId: cId || '',
      teacherId: tId || '',
      periodId: pId || '',
      examSeasonId: exam.examSeasonId || '',
      examStructureId: exam.examStructureId || '',
      examName: exam.examName || '',
      examDate: exam.examDate ? exam.examDate.split('T')[0] : today,
      totalMarks: exam.totalMarks || '',
    });
    setView('create');
  };

  const handleProcessResults = async () => {
    const { classId, examSeasonId } = processForm;
    if (!classId || !examSeasonId) return toast.error('Select Class and Exam Season first.');
    try {
      const { data } = await api.post('/exams/process', { classId, examSeasonId });
      toast.success(data.message || 'Results processed!');
      fetchProcessedResults(classId, examSeasonId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Processing failed');
    }
  };

  const handlePublishResults = async () => {
    const { classId, examSeasonId } = processForm;
    if (!classId || !examSeasonId) return toast.error('Select Class and Exam Season first.');
    if (!window.confirm('Publish results? Students will be able to view their results. This action locks edits.')) return;
    try {
      const { data } = await api.post('/exams/publish', { classId, examSeasonId });
      toast.success(data.message || 'Results published!');
      fetchProcessedResults(classId, examSeasonId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Publish failed');
    }
  };

  const handleUnpublishResults = async () => {
    const { classId, examSeasonId } = processForm;
    if (!window.confirm('Unpublish results? Edits will be unlocked.')) return;
    try {
      const { data } = await api.post('/exams/unpublish', { classId, examSeasonId });
      toast.success(data.message || 'Results unpublished!');
      fetchProcessedResults(classId, examSeasonId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unpublish');
    }
  };

  const handleOpenResultCard = async (studentId) => {
    if (!cardSeasonId) return toast.error('Select a Season first.');
    setCardLoading(true);
    try {
      const { data } = await api.get(`/exams/result-card/${studentId}/${cardSeasonId}`);
      setCardData(data);
      setCardModalOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load result card');
    } finally {
      setCardLoading(false);
    }
  };

  const handleEdit = async () => {
    try {
      await api.put(`/exams/${editModal.exam._id}`, { marks: Number(editModal.marks) });
      toast.success('Exam updated');
      setEditModal({ open: false, exam: null, marks: '' });
      fetchExams();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this exam record?')) return;
    try {
      await api.delete(`/exams/${id}`);
      toast.success('Exam deleted');
      fetchExams();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Derived data
  // ═══════════════════════════════════════════════════════════════════════════
  const allPeriods = useMemo(() => {
    const map = new Map();
    exams.forEach((e) => { if (e.periodId) map.set(e.periodId._id, e.periodId); });
    return Array.from(map.values());
  }, [exams]);

  const selectedClass = classes.find((c) => c._id === examForm.classId);

  const availableSubjects = useMemo(() => {
    if (periods && periods.length > 0) return periods;
    const filtered = subjects.filter((s) => {
      const tId = typeof s.teacherId === 'object' ? s.teacherId?._id : s.teacherId;
      return tId === examForm.teacherId;
    });
    return filtered.length > 0 ? filtered : subjects;
  }, [periods, subjects, examForm.teacherId]);

  const selectExamStructure = (value) => {
    const selected = structures.find((item) => item._id === value);
    if (!selected) return;
    const seasonName = seasons.find((s) => s._id === examForm.examSeasonId)?.name || '';
    setExamForm({
      ...examForm,
      examStructureId: selected._id,
      examName: `${seasonName} - ${selected.examType}`,
      totalMarks: selected.maxMarks,
    });
  };

  const currentResultStatus = processedResults.length > 0 ? processedResults[0].status : null;

  const handleOpenExamImport = () => {
    if (!examForm.classId) {
      toast.error('Please select a Class first');
      return;
    }
    if (!examForm.teacherId) {
      toast.error('Please select a Teacher first');
      return;
    }
    if (!examForm.periodId) {
      toast.error('Please select a Subject first');
      return;
    }
    if (!examForm.examSeasonId) {
      toast.error('Please select an Exam Season first');
      return;
    }
    if (!examForm.examStructureId) {
      toast.error('Please select an Exam Type first');
      return;
    }
    setExamImportOpen(true);
  };

  const renderExamImportModal = () => (
    <ExamImportModal
      isOpen={examImportOpen}
      onClose={() => setExamImportOpen(false)}
      examForm={examForm}
      classObj={classes.find((c) => c._id === examForm.classId)}
      subjectName={periods.find((p) => p._id === examForm.periodId)?.subject || ''}
      maxMarks={Number(examForm.totalMarks) || 0}
      sheetStudents={sheetStudents}
      onImportSuccess={(importedRecords) => {
        setSheetStudents((prev) =>
          prev.map((student) => {
            const match = importedRecords.find(
              (r) => r.studentId === student._id || r.studentDisplayId === student.studentId
            );
            if (match) {
              return {
                ...student,
                marks: match.marks,
                grade: match.grade,
                percentage: match.percentage,
                attendance: match.attendance || student.attendance,
                examId: match.examId,
              };
            }
            return student;
          })
        );
        toast.success('Sheet updated with imported marks!');
      }}
    />
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (activeTab === 'create' && view === 'create') {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Create Exam & Enter Marks</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Home / Exam Results / Create</p>
          </div>
          <button onClick={() => setView('list')} className="btn-secondary text-sm px-4 py-2">← Back to List</button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          {/* Left: Form */}
          <div className="xl:col-span-3 space-y-5">
            <div className="card space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary-500" /> Exam Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Academic Year */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Academic Year <span className="text-red-500">*</span></label>
                  <select
                    className="input-field font-semibold text-primary-600 dark:text-primary-400"
                    value={selectedAcademicYear}
                    onChange={(e) => {
                      setSelectedAcademicYear(e.target.value);
                      setExamForm((prev) => ({
                        ...prev,
                        classId: '',
                        teacherId: '',
                        periodId: '',
                        examSeasonId: '',
                        examStructureId: '',
                        examName: '',
                        totalMarks: '',
                      }));
                    }}
                  >
                    {academicYears.length > 0 ? (
                      academicYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))
                    ) : (
                      <option value="2026-2027">2026-2027</option>
                    )}
                  </select>
                </div>

                {/* Class */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Class <span className="text-red-500">*</span></label>
                  <select className="input-field" value={examForm.classId}
                    onChange={(e) => setExamForm({ ...examForm, classId: e.target.value, teacherId: '', periodId: '', examSeasonId: '', examStructureId: '', examName: '', examDate: examForm.examDate, totalMarks: '' })}>
                    <option value="">Select Class</option>
                    {classes.map((c) => <option key={c._id} value={c._id}>{c.className}</option>)}
                  </select>
                </div>

                {/* Category (read-only) */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Category <span className="text-gray-400 text-xs">(Auto)</span></label>
                  <input className="input-field bg-gray-50 dark:bg-gray-800 cursor-not-allowed" readOnly
                    value={selectedClass?.category ? selectedClass.category.name || '' : ''} placeholder="Auto-detected from class" />
                </div>

                {/* Exam Season */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Exam Season <span className="text-red-500">*</span></label>
                  <select className="input-field" value={examForm.examSeasonId} disabled={!examForm.classId}
                    onChange={(e) => setExamForm({ ...examForm, examSeasonId: e.target.value, examStructureId: '', examName: '', totalMarks: '' })}>
                    <option value="">Select Season</option>
                    {seasons.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>

                {/* Teacher */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Teacher <span className="text-red-500">*</span></label>
                  <select className="input-field" value={examForm.teacherId} disabled={!examForm.classId}
                    onChange={(e) => setExamForm({ ...examForm, teacherId: e.target.value, periodId: '' })}>
                    <option value="">Select Teacher</option>
                    {teachers.map((t) => <option key={t._id} value={t._id}>{t.name} {t.subject ? `(${t.subject})` : ''}</option>)}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Subject <span className="text-red-500">*</span></label>
                  <select className="input-field" value={examForm.periodId} disabled={!examForm.teacherId}
                    onChange={(e) => setExamForm({ ...examForm, periodId: e.target.value })}>
                    <option value="">Select Subject</option>
                    {availableSubjects.map((s) => <option key={s._id} value={s._id}>{s.subject || s.periodName}</option>)}
                  </select>
                </div>

                {/* Exam Type */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Exam Type <span className="text-red-500">*</span></label>
                  <select className="input-field" value={examForm.examStructureId}
                    disabled={!examForm.examSeasonId || !structures.length}
                    onChange={(e) => selectExamStructure(e.target.value)}>
                    <option value="">Select Exam Type</option>
                    {structures.map((item) => <option key={item._id} value={item._id}>{item.examType} ({item.maxMarks} marks)</option>)}
                  </select>
                </div>

                {/* Exam Name (auto) */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Exam Name</label>
                  <input type="text" className="input-field bg-gray-50 dark:bg-gray-800" value={examForm.examName} readOnly placeholder="Auto-generated" />
                </div>

                {/* Exam Date */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Exam Date <span className="text-red-500">*</span></label>
                  <input type="date" className="input-field" value={examForm.examDate}
                    onChange={(e) => setExamForm({ ...examForm, examDate: e.target.value })} />
                </div>

                {/* Max Marks (auto) */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Max Marks <span className="text-gray-400 text-xs">(Auto)</span></label>
                  <input type="number" className="input-field bg-gray-50 dark:bg-gray-800" value={examForm.totalMarks} readOnly />
                </div>
              </div>
            </div>

            {/* Student Marks Sheet */}
            <div className="card">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-500" /> Students Marks Sheet
                </h3>
                <div className="flex items-center flex-wrap gap-2">
                  {sheetStudents.some((s) => s.examId) && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Existing Results Loaded (Editable)
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenExamImport}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-900 rounded-lg transition-colors border border-purple-300 dark:border-purple-700 shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" /> Import Excel
                  </button>
                </div>
              </div>

              {sheetLoading ? <LoadingSpinner /> :
                !examForm.classId || !examForm.teacherId || !examForm.periodId ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <BookOpen className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm">Select class, teacher, and subject to load students.</p>
                  </div>
                ) : sheetStudents.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">No students found in this class.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700 text-xs uppercase tracking-wide text-gray-500">
                            <th className="text-left py-3 px-3 w-8">#</th>
                            <th className="text-left py-3 px-3">Adm No</th>
                            <th className="text-left py-3 px-3">Student Name</th>
                            <th className="text-left py-3 px-3">Marks</th>
                            <th className="text-left py-3 px-3">Grade</th>
                            <th className="text-left py-3 px-3">%</th>
                            <th className="text-left py-3 px-3">Attendance</th>
                            <th className="text-left py-3 px-3">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sheetStudents.map((s, i) => (
                            <tr key={s._id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                              <td className="py-2.5 px-3 text-gray-400 text-xs">{i + 1}</td>
                              <td className="py-2.5 px-3 font-mono text-primary-600 text-xs">{s.studentId}</td>
                              <td className="py-2.5 px-3 font-medium">{s.name}</td>
                              <td className="py-2.5 px-3">
                                <input type="number" min="0" max={examForm.totalMarks} className="input-field w-20 py-1.5 text-sm"
                                  value={s.marks} placeholder="0"
                                  onChange={(e) => updateStudentField(s._id, 'marks', e.target.value)} />
                              </td>
                              <td className="py-2.5 px-3">
                                {s.grade ? <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${GRADE_STYLES[s.grade] || ''}`}>{s.grade}</span> : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-sm">{s.percentage !== '' && s.percentage !== undefined ? `${s.percentage}%` : '-'}</td>
                              <td className="py-2.5 px-3">
                                <select className="input-field py-1 text-xs"
                                  value={s.attendance || 'Present'}
                                  onChange={(e) => updateStudentField(s._id, 'attendance', e.target.value)}>
                                  {ATTENDANCE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                              </td>
                              <td className="py-2.5 px-3">
                                <input type="text" className="input-field py-1 text-xs w-28" placeholder="Remark..."
                                  value={s.remarks || ''}
                                  onChange={(e) => updateStudentField(s._id, 'remarks', e.target.value)} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-start gap-3 p-3 mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Marks saved as <strong>Draft</strong> or <strong>Updated</strong>. Use <strong>Process & Publish</strong> tab to calculate final results and publish.
                      </p>
                    </div>
                  </>
                )}
            </div>

            {/* Save & Cancel */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* Grade scale */}
              <div className="card p-3 text-xs">
                <p className="font-semibold mb-1.5 text-gray-700 dark:text-gray-300">Grade Scale</p>
                <div className="space-y-0.5 text-gray-600 dark:text-gray-400">
                  <p><span className="font-medium text-emerald-600">A+</span> (90–100) · <span className="font-medium text-green-600">A</span> (80–89)</p>
                  <p><span className="font-medium text-blue-600">B</span> (70–79) · <span className="font-medium text-yellow-600">C</span> (60–69)</p>
                  <p><span className="font-medium text-orange-600">D</span> (50–59) · <span className="font-medium text-red-600">F</span> (Below 50)</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setView('list')} className="btn-secondary px-5">Cancel</button>
                <button onClick={() => handleSaveBulk(false)} disabled={saving || !sheetStudents.length}
                  className="btn-secondary flex items-center gap-2 px-5 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Save className="w-4 h-4 text-blue-500" />{saving ? 'Saving...' : 'Save as Draft'}
                </button>
                <button onClick={() => handleSaveBulk(true)} disabled={saving || !sheetStudents.length}
                  className="btn-primary flex items-center gap-2 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all hover:shadow">
                  <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />{saving ? 'Updating...' : 'Update Result'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Steps Guide */}
          <div className="card h-fit">
            <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-600 dark:text-gray-400">Exam Workflow</h3>
            <ol className="space-y-2.5">
              {[
                'Select Class (Category auto-detected)',
                'Select Exam Season (filtered by category)',
                'Select Teacher',
                'Select Subject (teacher\'s assigned subjects)',
                'Select Exam Type (max marks auto-loaded)',
                'Enter Marks & Attendance for each student',
                'Save as Draft',
                'Go to Process & Publish tab to finalize',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {renderExamImportModal()}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN LAYOUT WITH TABS
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Exam Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage exams, results, report cards, and analytics</p>
        </div>
        {activeTab === 'create' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setAllSubjectsImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              <Upload className="w-4 h-4" /> Import All Subjects
            </button>
            <button onClick={openCreateView} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Exam
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab 1: Create & Enter Marks (list view) ── */}
      {activeTab === 'create' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card">
            <div className="flex flex-col sm:flex-row gap-3">
              {academicYears.length > 0 && (
                <select
                  className="input-field flex-1 font-semibold text-primary-600 dark:text-primary-400"
                  value={selectedAcademicYear}
                  onChange={(e) => {
                    setSelectedAcademicYear(e.target.value);
                    setFilterClass('');
                    setPage(1);
                  }}
                >
                  {academicYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              )}
              <select className="input-field flex-1" value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setPage(1); }}>
                <option value="">All Classes</option>
                {classes.map((c) => <option key={c._id} value={c._id}>{c.className}</option>)}
              </select>
              <select className="input-field flex-1" value={filterPeriod} onChange={(e) => { setFilterPeriod(e.target.value); setPage(1); }}>
                <option value="">All Subjects</option>
                {allPeriods.map((p) => <option key={p._id} value={p._id}>{p.subject}</option>)}
              </select>
            </div>
          </div>

          {/* Exam List Table */}
          {loading ? <LoadingSpinner /> : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="text-left py-3 px-4">Student</th>
                    <th className="text-left py-3 px-4">Class</th>
                    <th className="text-left py-3 px-4">Subject</th>
                    <th className="text-left py-3 px-4">Exam</th>
                    <th className="text-center py-3 px-4">Marks</th>
                    <th className="text-center py-3 px-4">Grade</th>
                    <th className="text-center py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Date</th>
                    {isAdmin && <th className="text-right py-3 px-4">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {exams.length === 0 ? (
                    <tr><td colSpan="9" className="text-center py-10 text-gray-400 text-sm">No exam records found. Create your first exam!</td></tr>
                  ) : exams.map((exam) => (
                    <tr key={exam._id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-4">
                        <p className="font-medium">{exam.studentId?.name || '-'}</p>
                        <p className="text-xs text-gray-500 font-mono">{exam.studentId?.studentId || ''}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{exam.classId?.className || '-'}</td>
                      <td className="py-3 px-4">{exam.periodId?.subject || exam.examType}</td>
                      <td className="py-3 px-4 text-xs text-gray-600">{exam.examName}</td>
                      <td className="py-3 px-4 text-center font-mono font-medium">{exam.marks}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${GRADE_STYLES[exam.grade] || ''}`}>{exam.grade}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[exam.status] || ''}`}>{exam.status || 'Draft'}</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">{new Date(exam.examDate).toLocaleDateString()}</td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right flex justify-end items-center gap-1">
                          <button onClick={() => handleEditSheet(exam)} title="Edit Exam Sheet & Update Results" className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded flex items-center gap-1 text-xs font-medium px-2">
                            <RefreshCw className="w-3.5 h-3.5" /> Edit Sheet
                          </button>
                          <button onClick={() => setEditModal({ open: true, exam, marks: exam.marks })} title="Edit Single Mark" className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(exam._id)} title="Delete Record" className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} pages={pages} onChange={setPage} />
        </div>
      )}

      {/* ── Tab 2: Process & Publish ── */}
      {activeTab === 'results' && (
        <div className="space-y-5">
          {/* Control Panel */}
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><FlaskConical className="w-5 h-5 text-primary-500" /> Process & Publish Results</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Select Class <span className="text-red-500">*</span></label>
                <select className="input-field" value={processForm.classId}
                  onChange={(e) => setProcessForm({ classId: e.target.value, examSeasonId: '' })}>
                  <option value="">Select Class</option>
                  {classes.map((c) => <option key={c._id} value={c._id}>{c.className}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Exam Season <span className="text-red-500">*</span></label>
                <select className="input-field" value={processForm.examSeasonId} disabled={!processForm.classId}
                  onChange={(e) => setProcessForm({ ...processForm, examSeasonId: e.target.value })}>
                  <option value="">Select Season</option>
                  {resultSeasons.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button onClick={handleProcessResults} disabled={!processForm.classId || !processForm.examSeasonId}
                className="btn-primary flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Process Results
              </button>
              {isAdmin && currentResultStatus === 'Processed' && (
                <button onClick={handlePublishResults} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">
                  <Send className="w-4 h-4" /> Publish Results
                </button>
              )}
              {isAdmin && currentResultStatus === 'Published' && (
                <button onClick={handleUnpublishResults} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">
                  <XCircle className="w-4 h-4" /> Unpublish (Admin)
                </button>
              )}

              {currentResultStatus && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold ${STATUS_BADGE[currentResultStatus]}`}>
                  {currentResultStatus === 'Published' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  Current Status: {currentResultStatus}
                </span>
              )}
            </div>
          </div>

          {/* Processed Results Table */}
          {processLoading ? <LoadingSpinner /> : processedResults.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
              <FlaskConical className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">Select a class and exam season, then click Process Results.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="text-center py-3 px-4">Rank</th>
                    <th className="text-left py-3 px-4">Student</th>
                    <th className="text-center py-3 px-4">Total Marks</th>
                    <th className="text-center py-3 px-4">%</th>
                    <th className="text-center py-3 px-4">Grade</th>
                    <th className="text-center py-3 px-4">GPA</th>
                    <th className="text-center py-3 px-4">Passed</th>
                    <th className="text-center py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {processedResults.map((r) => (
                    <tr key={r._id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          r.rank === 1 ? 'bg-yellow-100 text-yellow-700' : r.rank === 2 ? 'bg-gray-100 text-gray-600' : r.rank === 3 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-500'
                        }`}>{r.position}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium">{r.studentId?.name || '-'}</p>
                        <p className="text-xs text-gray-500 font-mono">{r.studentId?.studentId || ''}</p>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">{r.totalMarksObtained}</td>
                      <td className="py-3 px-4 text-center font-semibold">{r.percentage}%</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${GRADE_STYLES[r.overallGrade] || ''}`}>{r.overallGrade}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-sm">{r.gpa?.toFixed(1)}</td>
                      <td className="py-3 px-4 text-center">
                        {r.isOverallPassed
                          ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                          : <XCircle className="w-5 h-5 text-red-500 mx-auto" />}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Result Cards ── */}
      {activeTab === 'cards' && (
        <div className="space-y-5">
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-primary-500" /> Generate Report Cards</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Select Class</label>
                <select className="input-field" value={cardClassId} onChange={(e) => { setCardClassId(e.target.value); setCardSeasonId(''); }}>
                  <option value="">Select Class</option>
                  {classes.map((c) => <option key={c._id} value={c._id}>{c.className}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Exam Season</label>
                <select className="input-field" value={cardSeasonId} disabled={!cardClassId} onChange={(e) => setCardSeasonId(e.target.value)}>
                  <option value="">Select Season</option>
                  {cardSeasons.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {cardStudents.length === 0 && cardClassId && (
            <div className="card flex flex-col items-center justify-center py-12 text-gray-400">
              <Users className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No students found for this class.</p>
            </div>
          )}

          {cardStudents.length > 0 && (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="text-left py-3 px-4">#</th>
                    <th className="text-left py-3 px-4">Student Name</th>
                    <th className="text-left py-3 px-4">Admission No</th>
                    <th className="text-right py-3 px-4">Report Card</th>
                  </tr>
                </thead>
                <tbody>
                  {cardStudents.map((s, i) => (
                    <tr key={s._id} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-3 px-4 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-3 px-4 font-medium">{s.name}</td>
                      <td className="py-3 px-4 font-mono text-primary-600 text-xs">{s.studentId}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleOpenResultCard(s._id)} disabled={!cardSeasonId || cardLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                          <Printer className="w-3.5 h-3.5" /> View Card
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 4: Analytics ── */}
      {activeTab === 'analytics' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="card">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Filter by Class</label>
                <select className="input-field" value={analyticsClass} onChange={(e) => setAnalyticsClass(e.target.value)}>
                  <option value="">All Classes</option>
                  {classes.map((c) => <option key={c._id} value={c._id}>{c.className}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Filter by Season</label>
                <select className="input-field" value={analyticsSeason} onChange={(e) => setAnalyticsSeason(e.target.value)}>
                  <option value="">All Seasons</option>
                  {allSeasons.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {analyticsLoading ? <LoadingSpinner /> : !analytics ? (
            <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
              <BarChart3 className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">No analytics data available yet. Process results first.</p>
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Students', value: analytics.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { label: 'Passed', value: analytics.passedStudents, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                  { label: 'Failed', value: analytics.failedStudents, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
                  { label: 'Pass Rate', value: `${analytics.passRate}%`, icon: TrendingUp, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/20' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className={`card flex items-center gap-4 ${bg}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                      <p className={`text-2xl font-black ${color}`}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grade Distribution */}
              <div className="card">
                <h4 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary-500" /> Grade Distribution</h4>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.entries(analytics.gradeCount || {}).map(([grade, count]) => (
                    <div key={grade} className={`rounded-xl p-3 text-center ${GRADE_STYLES[grade] || 'bg-gray-100 text-gray-700'}`}>
                      <p className="text-2xl font-black">{count}</p>
                      <p className="text-xs font-bold mt-0.5">Grade {grade}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Students */}
              <div className="card">
                <h4 className="font-semibold mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-yellow-500" /> Top Students</h4>
                {analytics.topStudents?.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200 dark:border-gray-700">
                          <th className="text-center py-2 px-3">Rank</th>
                          <th className="text-left py-2 px-3">Student</th>
                          <th className="text-left py-2 px-3">Class</th>
                          <th className="text-center py-2 px-3">Total Marks</th>
                          <th className="text-center py-2 px-3">%</th>
                          <th className="text-center py-2 px-3">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.topStudents?.map((s, i) => (
                          <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'
                              }`}>{s.rank}</span>
                            </td>
                            <td className="py-2.5 px-3 font-medium">{s.name}<br /><span className="text-xs font-mono text-gray-400">{s.studentId}</span></td>
                            <td className="py-2.5 px-3 text-gray-500">{s.className}</td>
                            <td className="py-2.5 px-3 text-center font-mono">{s.totalMarks}</td>
                            <td className="py-2.5 px-3 text-center font-semibold">{s.percentage}%</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${GRADE_STYLES[s.grade] || ''}`}>{s.grade}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Edit Exam Modal */}
      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, exam: null, marks: '' })} title="Edit Exam Marks">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Student: <strong>{editModal.exam?.studentId?.name}</strong> · Subject: <strong>{editModal.exam?.periodId?.subject}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium mb-1.5">Marks (max {editModal.exam?.totalMarks})</label>
            <input type="number" className="input-field" min="0" max={editModal.exam?.totalMarks}
              value={editModal.marks} onChange={(e) => setEditModal((m) => ({ ...m, marks: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditModal({ open: false, exam: null, marks: '' })} className="btn-secondary">Cancel</button>
            <button onClick={handleEdit} className="btn-primary">Save Changes</button>
          </div>
        </div>
      </Modal>

      {/* Result Card Modal */}
      <ResultCardModal open={cardModalOpen} onClose={() => setCardModalOpen(false)} cardData={cardData} />

      {/* Exam Marks Import Modal */}
      {renderExamImportModal()}

      {/* All-Subjects Bulk Import Modal */}
      <AllSubjectsImportModal
        isOpen={allSubjectsImportOpen}
        onClose={() => setAllSubjectsImportOpen(false)}
        classes={classes}
        onImportSuccess={(data) => {
          fetchExams();
          if (data.records?.length > 0) {
            const first = data.records[0];
            if (first.studentId) {
              // Auto-sync process tab with the imported class/season
              // data.classId / data.examSeasonId come from the successful import
            }
          }
          window.dispatchEvent(new CustomEvent('examDataChanged'));
        }}
      />
    </div>
  );
};

export default Exams;
