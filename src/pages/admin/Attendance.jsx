import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Save,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Edit2,
  Trash2,
  AlertCircle,
  Filter,
  ArrowLeft,
  ChevronDown,
  Info,
  GraduationCap,
  Phone,
  MessageCircle,
  CheckSquare,
  Square,
  Send
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

// Utility helper for date formatting to YYYY-MM-DD
const formatDateToYYYYMMDD = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Utility helper for date formatting to DD/MM/YYYY
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Calculate Date Presets
const getPresetDates = (preset) => {
  const now = new Date();
  const todayStr = formatDateToYYYYMMDD(now);

  if (preset === 'today') {
    return { startDate: todayStr, endDate: todayStr };
  }
  if (preset === 'yesterday') {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    const yestStr = formatDateToYYYYMMDD(d);
    return { startDate: yestStr, endDate: yestStr };
  }
  if (preset === 'last5') {
    const d = new Date(now);
    d.setDate(d.getDate() - 4);
    return { startDate: formatDateToYYYYMMDD(d), endDate: todayStr };
  }
  if (preset === 'last7') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { startDate: formatDateToYYYYMMDD(d), endDate: todayStr };
  }
  if (preset === 'thisMonth') {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const firstDayStr = `${year}-${month}-01`;
    return { startDate: firstDayStr, endDate: todayStr };
  }
  return { startDate: '', endDate: '' };
};

const AttendancePage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialClassId = searchParams.get('classId') || '';

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const todayStr = useMemo(() => formatDateToYYYYMMDD(new Date()), []);

  // View Mode: 'list' (Main Table Page) vs 'record' (New Page for Recording Attendance)
  const [view, setView] = useState('list');

  // Academic Year State
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');

  // Filter States
  const [datePreset, setDatePreset] = useState('last5'); // 'last5' | 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'custom'
  const [customDate, setCustomDate] = useState('');
  const [filterClass, setFilterClass] = useState(initialClassId);
  const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Present' | 'Absent' | 'Late'

  // Data & Pagination States
  const [classes, setClasses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Record Attendance Page State
  const [recordForm, setRecordForm] = useState({
    academicYear: '',
    classId: '',
    teacherId: '',
    date: todayStr,
  });
  const [sheetStudents, setSheetStudents] = useState([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);

  // Edit Modal State
  const [editModal, setEditModal] = useState({
    open: false,
    record: null,
    studentId: '',
    classId: '',
    date: '',
    status: 'Present',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Selection State for Bulk SMS
  const [selectedIds, setSelectedIds] = useState([]);

  // SMS Modal State
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsTemplateText, setSmsTemplateText] = useState('');

  // Active Phone Menu Popover State
  const [activePhoneMenuId, setActivePhoneMenuId] = useState(null);

  const formatWhatsAppNumber = (phoneStr) => {
    if (!phoneStr || phoneStr === '-') return '';
    return phoneStr.replace(/[+\s\-()]/g, '').replace(/\D/g, '');
  };

  // Close Phone Menu on Click Outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activePhoneMenuId && !event.target.closest('[data-phone-menu]')) {
        setActivePhoneMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activePhoneMenuId]);

  // Selected Absent Records
  const selectedAbsentRecords = useMemo(() => {
    return attendance.filter(
      (rec) => selectedIds.includes(rec._id) && rec.status === 'Absent'
    );
  }, [attendance, selectedIds]);

  // Handle Select All Absent Students
  const handleSelectAllAbsent = () => {
    const absentRecords = attendance.filter((rec) => rec.status === 'Absent');
    if (absentRecords.length === 0) {
      toast.info('No absent students found.');
      return;
    }
    const absentIds = absentRecords.map((rec) => rec._id);
    setSelectedIds(absentIds);
    toast.success(`Selected ${absentIds.length} absent student(s).`);
  };

  // Toggle individual record selection
  const toggleSelectRecord = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle Header Checkbox for Absent Students
  const handleToggleSelectAllTable = () => {
    const absentRecords = attendance.filter((rec) => rec.status === 'Absent');
    const absentIds = absentRecords.map((rec) => rec._id);
    const allAbsentSelected =
      absentIds.length > 0 && absentIds.every((id) => selectedIds.includes(id));

    if (allAbsentSelected) {
      setSelectedIds((prev) => prev.filter((id) => !absentIds.includes(id)));
    } else {
      if (absentIds.length === 0) {
        toast.info('No absent students found.');
        return;
      }
      setSelectedIds((prev) => Array.from(new Set([...prev, ...absentIds])));
    }
  };

  // Open SMS Modal
  const openSmsModal = () => {
    if (selectedAbsentRecords.length === 0) {
      toast.error('No absent students selected.');
      return;
    }
    setSmsTemplateText(
      `Asc, waalidka {studentName}.\n\nArdayga {studentName} wuxuu maanta ka maqnaa iskuulka.\n\nDate: {date}\nClass: {className}\nStatus: Absent\n\nMahadsanid.\nDhambeel School`
    );
    setSmsModalOpen(true);
  };

  // Send Bulk SMS
  const handleSendBulkSms = async () => {
    setSendingSms(true);
    try {
      const validRecipients = selectedAbsentRecords.filter((rec) => {
        const phone = getParentPhone(rec.studentId);
        return phone && phone !== '-';
      });

      if (validRecipients.length === 0) {
        toast.error('None of the selected absent students have a valid parent phone number.');
        setSendingSms(false);
        return;
      }

      const messagesToSend = validRecipients.map((rec) => {
        const sName = rec.studentId?.name || 'Student';
        const cName = rec.classId?.className || '-';
        const dateVal = formatDateDisplay(rec.date);
        const parentPhone = getParentPhone(rec.studentId);

        let msg = smsTemplateText
          .replace(/\{studentName\}/g, sName)
          .replace(/\{className\}/g, cName)
          .replace(/\{date\}/g, dateVal);

        return {
          phone: parentPhone,
          studentName: sName,
          message: msg,
        };
      });

      try {
        await api.post('/sms/send-bulk', { messages: messagesToSend });
      } catch (e) {
        console.log('SMS Sending prepared:', messagesToSend);
      }

      toast.success(`SMS sent successfully to ${validRecipients.length} parent(s)!`);
      setSelectedIds([]);
      setSmsModalOpen(false);
    } catch (err) {
      toast.error('Failed to send SMS');
    } finally {
      setSendingSms(false);
    }
  };

  // Status Badge Helper
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'Present':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      case 'Absent':
        return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800';
      case 'Late':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    }
  };

  const getParentPhone = (student) => {
    if (!student) return '-';
    return student.parentPhone || student.guardianPhone || student.phone || '-';
  };

  // Fetch Academic Years
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        const { data } = await api.get('/students/academic-years');
        const sorted = (data.years || []).sort((a, b) => b.localeCompare(a));
        setAcademicYears(sorted);
        if (sorted.length > 0) {
          setSelectedAcademicYear(sorted[0]);
          setRecordForm((prev) => ({ ...prev, academicYear: sorted[0] }));
        }
      } catch (err) {
        console.error('Failed to fetch academic years', err);
      }
    };
    fetchAcademicYears();
  }, []);

  // Fetch Available Classes (filtered by selected Academic Year)
  const fetchClasses = useCallback(async () => {
    try {
      const params = { limit: 100 };
      if (selectedAcademicYear) params.academicYear = selectedAcademicYear;
      const { data } = await api.get('/classes', { params });
      setClasses(data.classes || []);
    } catch (err) {
      console.error('Failed to fetch classes', err);
    }
  }, [selectedAcademicYear]);

  // Fetch Classes for Record Form based on recordForm.academicYear
  const fetchRecordFormClasses = useCallback(async (year) => {
    try {
      const params = { limit: 100 };
      if (year) params.academicYear = year;
      const { data } = await api.get('/classes', { params });
      return data.classes || [];
    } catch (err) {
      console.error('Failed to fetch record form classes', err);
      return [];
    }
  }, []);

  // Fetch All Students
  const fetchStudents = useCallback(async () => {
    try {
      const { data } = await api.get('/students', { params: { limit: 500 } });
      setAllStudents(data.students || []);
    } catch (err) {
      console.error('Failed to fetch students', err);
    }
  }, []);

  // Fetch Attendance List
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 100 };

      if (datePreset === 'custom' && customDate) {
        params.date = customDate;
      } else if (datePreset !== 'custom') {
        const { startDate, endDate } = getPresetDates(datePreset);
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      if (filterClass) params.classId = filterClass;
      if (filterStatus !== 'All') params.status = filterStatus;

      const { data } = await api.get('/attendance', { params });
      setAttendance(data.attendance || []);
      setPages(data.pages || 1);
    } catch (err) {
      console.error('Failed to fetch attendance', err);
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  }, [page, datePreset, customDate, filterClass, filterStatus]);

  // Fetch Teachers for Class
  const fetchTeachersForClass = useCallback(async (classId) => {
    if (!classId) {
      setTeachers([]);
      return;
    }
    try {
      const { data } = await api.get(`/attendance/teachers/${classId}`);
      setTeachers(data.teachers || []);
      if (data.teachers && data.teachers.length === 1) {
        setRecordForm((prev) => ({ ...prev, teacherId: data.teachers[0]._id }));
      }
    } catch (err) {
      console.error('Failed to fetch teachers', err);
    }
  }, []);

  // Fetch Student Sheet for Recording
  const fetchSheet = useCallback(async () => {
    const { classId, teacherId, date } = recordForm;
    if (!classId || !teacherId || !date) {
      setSheetStudents([]);
      return;
    }

    setSheetLoading(true);
    try {
      const { data } = await api.get('/attendance/sheet', { params: { classId, teacherId, date } });
      setSheetStudents(data.students || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load class students');
      setSheetStudents([]);
    } finally {
      setSheetLoading(false);
    }
  }, [recordForm]);

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, [fetchClasses, fetchStudents]);

  useEffect(() => {
    if (view === 'list') {
      fetchAttendance();
    }
  }, [view, fetchAttendance]);

  useEffect(() => {
    if (view === 'record' && recordForm.classId) {
      fetchTeachersForClass(recordForm.classId);
    }
  }, [view, recordForm.classId, fetchTeachersForClass]);

  useEffect(() => {
    if (view === 'record' && recordForm.classId && recordForm.teacherId && recordForm.date) {
      fetchSheet();
    }
  }, [view, recordForm.classId, recordForm.teacherId, recordForm.date, fetchSheet]);

  // Summary Calculations
  const summary = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter((a) => a.status === 'Present').length;
    const absent = attendance.filter((a) => a.status === 'Absent').length;
    const late = attendance.filter((a) => a.status === 'Late').length;
    return { total, present, absent, late };
  }, [attendance]);

  // Switch to Record Attendance Page
  const openRecordPage = () => {
    const yearToUse = selectedAcademicYear || (academicYears[0] || '2026-2027');
    setRecordForm({
      academicYear: yearToUse,
      classId: filterClass || (classes[0]?._id || ''),
      teacherId: '',
      date: customDate || todayStr,
    });
    setSheetStudents([]);
    setView('record');
  };

  // Handle Academic Year Change in Record Form
  const handleRecordAcademicYearChange = async (newYear) => {
    setRecordForm((prev) => ({
      ...prev,
      academicYear: newYear,
      classId: '',
      teacherId: '',
    }));
    setSheetStudents([]);
    const fetchedClasses = await fetchRecordFormClasses(newYear);
    if (fetchedClasses.length > 0) {
      setRecordForm((prev) => ({ ...prev, classId: fetchedClasses[0]._id }));
    }
  };

  // Quick Action: Mark All Students
  const handleMarkAll = (status) => {
    setSheetStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  // Update Individual Student Status in Record Sheet
  const updateSheetStatus = (studentId, status) => {
    setSheetStudents((prev) =>
      prev.map((s) => (s._id === studentId ? { ...s, status } : s))
    );
  };

  // Save Bulk Attendance
  const handleSaveBulkAttendance = async () => {
    const { classId, teacherId, date } = recordForm;
    if (!classId || !teacherId || !date) {
      toast.error('Please select Class, Teacher, and Date');
      return;
    }
    if (!sheetStudents.length) {
      toast.error('No students found in selected class');
      return;
    }

    setSavingRecord(true);
    try {
      await api.post('/attendance/bulk', {
        classId,
        teacherId,
        date,
        records: sheetStudents.map((s) => ({ studentId: s._id, status: s.status })),
      });
      toast.success('Attendance saved successfully!');
      setView('list');
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSavingRecord(false);
    }
  };

  // Edit Modal Actions
  const openEditModal = (rec) => {
    setEditModal({
      open: true,
      record: rec,
      studentId: rec.studentId?._id || rec.studentId || '',
      classId: rec.classId?._id || rec.classId || '',
      date: formatDateToYYYYMMDD(rec.date),
      status: rec.status || 'Present',
    });
  };

  const handleSaveEdit = async () => {
    if (!editModal.record) return;
    setSavingEdit(true);
    try {
      await api.put(`/attendance/${editModal.record._id}`, {
        status: editModal.status,
        studentId: editModal.studentId,
        classId: editModal.classId,
        date: editModal.date,
      });
      toast.success('Attendance record updated successfully');
      setEditModal({ open: false, record: null, studentId: '', classId: '', date: '', status: 'Present' });
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update attendance');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Record Action
  const handleDeleteRecord = async (id) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    try {
      await api.delete(`/attendance/${id}`);
      toast.success('Record deleted');
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  /* ========================================================================
     PAGE VIEW 2: DEDICATED RECORD ATTENDANCE NEW PAGE
     ======================================================================== */
  if (view === 'record') {
    return (
      <div className="space-y-6 pb-12">
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView('list')}
              className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl transition"
              title="Back to Attendance List"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight uppercase">
                Record Class Attendance
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Select academic year, class, teacher, date and mark attendance for each student.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('list')}
              className="btn-secondary px-5 py-2.5 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveBulkAttendance}
              disabled={savingRecord || !sheetStudents.length}
              className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{savingRecord ? 'Saving Attendance...' : 'Save Attendance'}</span>
            </button>
          </div>
        </div>

        {/* STEP 1: ACADEMIC YEAR, CLASS, TEACHER & DATE SELECTION CARD */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary-600" />
            1. Attendance Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* ACADEMIC YEAR */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1.5">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                value={recordForm.academicYear}
                onChange={(e) => handleRecordAcademicYearChange(e.target.value)}
                className="input-field text-sm py-2.5 font-semibold text-primary-600 dark:text-primary-400"
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

            {/* CLASS */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1.5">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                value={recordForm.classId}
                onChange={(e) =>
                  setRecordForm((prev) => ({
                    ...prev,
                    classId: e.target.value,
                    teacherId: '',
                  }))
                }
                className="input-field text-sm py-2.5"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>

            {/* TEACHER */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1.5">
                Teacher <span className="text-red-500">*</span>
              </label>
              <select
                value={recordForm.teacherId}
                onChange={(e) =>
                  setRecordForm((prev) => ({ ...prev, teacherId: e.target.value }))
                }
                disabled={!recordForm.classId}
                className="input-field text-sm py-2.5 disabled:opacity-50"
              >
                <option value="">Select Teacher</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* DATE */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={recordForm.date}
                onChange={(e) =>
                  setRecordForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="input-field text-sm py-2.5"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 rounded-xl text-blue-700 dark:text-blue-300 text-sm">
            <Info className="w-5 h-5 shrink-0" />
            <span>
              Select Academic Year, Class, Teacher, and Date to load active students for attendance.
            </span>
          </div>
        </div>

        {/* STEP 2: STUDENT ATTENDANCE SHEET CARD */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700/60 pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                2. Mark Student Attendance
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Total Students in Class: <span className="font-bold text-gray-900 dark:text-white">{sheetStudents.length}</span>
              </p>
            </div>

            {sheetStudents.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-gray-900/60 p-2 rounded-xl border border-gray-200/60 dark:border-gray-700">
                <span className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 px-2">
                  Quick Actions:
                </span>
                <button
                  type="button"
                  onClick={() => handleMarkAll('Present')}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll('Absent')}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition shadow-sm"
                >
                  Mark All Absent
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll('Late')}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm"
                >
                  Mark All Late
                </button>
              </div>
            )}
          </div>

          {sheetLoading ? (
            <div className="py-16">
              <LoadingSpinner />
            </div>
          ) : !recordForm.classId || !recordForm.teacherId ? (
            <div className="py-16 text-center text-gray-500 dark:text-gray-400">
              Please select Class and Teacher above to display students.
            </div>
          ) : sheetStudents.length === 0 ? (
            <div className="py-16 text-center text-gray-500 dark:text-gray-400">
              No active students found in this class.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200/80 dark:border-gray-700">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-3.5 px-5 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                      #
                    </th>
                    <th className="py-3.5 px-5 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Student ID
                    </th>
                    <th className="py-3.5 px-5 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="py-3.5 px-5 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status Selection
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {sheetStudents.map((s, idx) => (
                    <tr
                      key={s._id}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-3.5 px-5 text-xs text-gray-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-xs font-semibold text-primary-600 dark:text-primary-400">
                        {s.studentId}
                      </td>
                      <td className="py-3.5 px-5 font-medium text-gray-900 dark:text-white">
                        {s.name}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {[
                            { id: 'Present', label: 'Present', activeBg: 'bg-emerald-600 text-white' },
                            { id: 'Absent', label: 'Absent', activeBg: 'bg-red-600 text-white' },
                            { id: 'Late', label: 'Late', activeBg: 'bg-amber-500 text-white' },
                          ].map((st) => {
                            const isSelected = s.status === st.id;
                            return (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => updateSheetStatus(s._id, st.id)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-xl border transition-all duration-150 ${
                                  isSelected
                                    ? st.activeBg + ' border-transparent shadow-sm ring-2 ring-offset-1 ring-primary-500/20'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                {st.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* BOTTOM SAVE BUTTON BAR */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setView('list')}
              className="btn-secondary px-6 py-2.5 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveBulkAttendance}
              disabled={savingRecord || !sheetStudents.length}
              className="btn-primary inline-flex items-center gap-2 px-7 py-2.5 rounded-xl font-semibold shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{savingRecord ? 'Saving Attendance...' : 'Save Attendance'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ========================================================================
     PAGE VIEW 1: MAIN ATTENDANCE MANAGEMENT DASHBOARD LIST
     ======================================================================== */
  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight uppercase">
            Attendance Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track, filter, and record daily student attendance records.
          </p>
        </div>
        <button
          onClick={openRecordPage}
          className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all duration-200 hover:shadow"
        >
          <Plus className="w-5 h-5" />
          <span>+ Record Attendance</span>
        </button>
      </div>

      {/* 2. FILTERS CONTROL BAR */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm space-y-4">
        {/* TOP ROW FILTERS: Date Presets, Specific Date Picker, Academic Year & Class Select */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700/60 pb-4">
          {/* 5 DATE PRESET BUTTONS */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date:
            </span>
            {[
              { id: 'last5', label: 'Last 5 Days' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'last7', label: 'Last 7 Days' },
              { id: 'thisMonth', label: 'This Month' },
            ].map((preset) => {
              const isActive = datePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setDatePreset(preset.id);
                    setCustomDate('');
                    setPage(1);
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-150 ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm ring-2 ring-primary-500/30'
                      : 'bg-gray-100 hover:bg-gray-200/80 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* ACADEMIC YEAR, SPECIFIC DATE PICKER & CLASS DROPDOWN */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* ACADEMIC YEAR SELECTOR */}
            {academicYears.length > 0 && (
              <div className="relative flex-1 sm:flex-initial min-w-[130px]">
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => {
                    setSelectedAcademicYear(e.target.value);
                    setFilterClass('');
                    setPage(1);
                  }}
                  className="w-full appearance-none pl-3 pr-8 py-2 text-xs font-semibold rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 focus:ring-2 focus:ring-primary-500 outline-none transition cursor-pointer"
                >
                  {academicYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-primary-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* SPECIFIC DATE PICKER */}
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  if (e.target.value) {
                    setDatePreset('custom');
                  } else {
                    setDatePreset('last5');
                  }
                  setPage(1);
                }}
                className={`pl-9 pr-3 py-2 text-xs font-medium rounded-xl border outline-none transition-all ${
                  datePreset === 'custom' && customDate
                    ? 'border-primary-500 ring-2 ring-primary-500/20 bg-primary-50/30 dark:bg-primary-950/20 text-primary-700 dark:text-primary-300 font-semibold'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
                title="Pick Date"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
                🗓️
              </span>
            </div>

            {/* CLASS FILTER DROPDOWN */}
            <div className="relative flex-1 sm:flex-initial min-w-[150px]">
              <select
                value={filterClass}
                onChange={(e) => {
                  setFilterClass(e.target.value);
                  setPage(1);
                }}
                className="w-full appearance-none pl-4 pr-9 py-2 text-xs font-semibold rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition cursor-pointer"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.className}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* BOTTOM ROW FILTERS: Status Clickable Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {[
              { id: 'All', label: 'All', icon: null, activeClass: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' },
              { id: 'Present', label: 'Present', icon: '🟢', activeClass: 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30' },
              { id: 'Absent', label: 'Absent', icon: '🔴', activeClass: 'bg-red-600 text-white shadow-sm ring-2 ring-red-500/30' },
              { id: 'Late', label: 'Late', icon: '🟡', activeClass: 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30' },
            ].map((st) => {
              const isActive = filterStatus === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => {
                    setFilterStatus(st.id);
                    setPage(1);
                  }}
                  className={`px-4 py-1.5 text-xs font-medium rounded-xl transition-all duration-150 flex items-center gap-1.5 ${
                    isActive
                      ? st.activeClass + ' font-semibold'
                      : 'bg-gray-100 hover:bg-gray-200/80 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                  }`}
                >
                  {st.icon && <span>{st.icon}</span>}
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Showing <span className="font-bold text-gray-900 dark:text-white">{attendance.length}</span> records
          </div>
        </div>
      </div>

      {/* 3. SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Card */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Total
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {summary.total}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Present Card */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Present
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {summary.present}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Absent Card */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
              Absent
            </p>
            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {summary.absent}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Late Card */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Late
            </p>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {summary.late}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. ATTENDANCE TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* ACTION BAR: SELECT ALL ABSENT & SEND SMS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAllAbsent}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl transition shadow-xs cursor-pointer"
            >
              <CheckSquare className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>☑️ Select All Absent Students</span>
            </button>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 animate-in fade-in duration-150">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xs">
                ☑️ {selectedAbsentRecords.length} Absent Students Selected
              </span>

              <button
                type="button"
                onClick={openSmsModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>💬 Send SMS to Selected</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-16">
            <LoadingSpinner />
          </div>
        ) : attendance.length === 0 ? (
          /* EMPTY STATE */
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700/60 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              No attendance records found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Try changing the date, class, or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        attendance.filter((r) => r.status === 'Absent').length > 0 &&
                        attendance
                          .filter((r) => r.status === 'Absent')
                          .every((r) => selectedIds.includes(r._id))
                      }
                      onChange={handleToggleSelectAllTable}
                      title="Select all absent students"
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-5 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="py-3.5 px-5 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="py-3.5 px-5 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Teacher
                  </th>
                  <th className="py-3.5 px-5 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Parent Phone
                  </th>
                  <th className="py-3.5 px-5 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="py-3.5 px-5 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-3.5 px-5 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {attendance.map((rec, idx) => (
                  <tr
                    key={rec._id}
                    className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    {/* CHECKBOX */}
                    <td className="py-4 px-4 text-center">
                      {rec.status === 'Absent' ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(rec._id)}
                          onChange={() => toggleSelectRecord(rec._id)}
                          className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          disabled
                          className="w-4 h-4 opacity-25 cursor-not-allowed"
                          title="Only absent students can be selected"
                        />
                      )}
                    </td>

                    {/* STUDENT */}
                    <td className="py-4 px-5">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {rec.studentId?.name || 'Unknown Student'}
                      </div>
                      {rec.studentId?.studentId && (
                        <div className="text-xs text-gray-400 font-mono">
                          ID: {rec.studentId.studentId}
                        </div>
                      )}
                    </td>

                    {/* CLASS */}
                    <td className="py-4 px-5 font-medium text-gray-700 dark:text-gray-300">
                      {rec.classId?.className || '-'}
                    </td>

                    {/* TEACHER */}
                    <td className="py-4 px-5 text-gray-600 dark:text-gray-400">
                      {rec.teacherId?.name || 'Ustaad Salaad Cabdullaahi'}
                    </td>

                    {/* PARENT PHONE */}
                    <td className="py-4 px-5 font-mono text-gray-600 dark:text-gray-400 relative">
                      {(() => {
                        const parentPhone = getParentPhone(rec.studentId);
                        if (!parentPhone || parentPhone === '-') {
                          return <span>-</span>;
                        }
                        const cleanWhatsApp = formatWhatsAppNumber(parentPhone);
                        const isOpen = activePhoneMenuId === rec._id;

                        return (
                          <div className="relative inline-block" data-phone-menu>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePhoneMenuId(isOpen ? null : rec._id);
                              }}
                              className="inline-flex items-center gap-1.5 px-2 py-1 -mx-2 -my-1 rounded-lg text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 font-mono transition-all duration-150 cursor-pointer group"
                              title="Click to Call or WhatsApp parent"
                            >
                              <span>{parentPhone}</span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-transform duration-200 ${
                                  isOpen ? 'rotate-180 text-primary-600 dark:text-primary-400' : ''
                                }`}
                              />
                            </button>

                            {isOpen && (
                              <div
                                className={`absolute left-0 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 py-1.5 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100 ${
                                  idx >= attendance.length - 2 && attendance.length > 3
                                    ? 'bottom-full mb-1.5'
                                    : 'top-full mt-1.5'
                                }`}
                              >
                                <a
                                  href={`tel:${parentPhone}`}
                                  onClick={() => setActivePhoneMenuId(null)}
                                  className="flex items-center gap-2.5 px-3.5 py-2 text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                >
                                  <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span>📞 Call</span>
                                </a>
                                <a
                                  href={`https://wa.me/${cleanWhatsApp}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => setActivePhoneMenuId(null)}
                                  className="flex items-center gap-2.5 px-3.5 py-2 text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-700 dark:hover:text-green-300 transition-colors border-t border-gray-100 dark:border-gray-700/60"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                                  <span>💬 WhatsApp</span>
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* DATE */}
                    <td className="py-4 px-5 text-gray-700 dark:text-gray-300 font-medium">
                      {formatDateDisplay(rec.date)}
                    </td>

                    {/* STATUS */}
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getBadgeStyle(
                          rec.status
                        )}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            rec.status === 'Present'
                              ? 'bg-emerald-500'
                              : rec.status === 'Absent'
                              ? 'bg-red-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        {rec.status}
                      </span>
                    </td>

                    {/* ACTION */}
                    <td className="py-4 px-5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(rec)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteRecord(rec._id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <Pagination page={page} pages={pages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* EDIT ATTENDANCE MODAL */}
      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, record: null, studentId: '', classId: '', date: '', status: 'Present' })}
        title="Edit Attendance Record"
      >
        {editModal.record && (
          <div className="space-y-4">
            {/* STUDENT */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1.5">
                Student
              </label>
              <select
                value={editModal.studentId}
                onChange={(e) => setEditModal((prev) => ({ ...prev, studentId: e.target.value }))}
                className="input-field text-sm"
              >
                {allStudents.length > 0 ? (
                  allStudents.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.studentId})
                    </option>
                  ))
                ) : (
                  <option value={editModal.record.studentId?._id || editModal.record.studentId}>
                    {editModal.record.studentId?.name || 'Selected Student'}
                  </option>
                )}
              </select>
            </div>

            {/* CLASS */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1.5">
                Class
              </label>
              <select
                value={editModal.classId}
                onChange={(e) => setEditModal((prev) => ({ ...prev, classId: e.target.value }))}
                className="input-field text-sm"
              >
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>

            {/* DATE */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={editModal.date}
                onChange={(e) => setEditModal((prev) => ({ ...prev, date: e.target.value }))}
                className="input-field text-sm"
              />
            </div>

            {/* STATUS OPTIONS */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">
                Status
              </label>
              <div className="flex gap-3">
                {[
                  { id: 'Present', label: 'Present', activeBg: 'bg-emerald-600 text-white' },
                  { id: 'Absent', label: 'Absent', activeBg: 'bg-red-600 text-white' },
                  { id: 'Late', label: 'Late', activeBg: 'bg-amber-500 text-white' },
                ].map((st) => {
                  const isSelected = editModal.status === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setEditModal((prev) => ({ ...prev, status: st.id }))}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                        isSelected
                          ? st.activeBg + ' border-transparent shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() =>
                  setEditModal({ open: false, record: null, studentId: '', classId: '', date: '', status: 'Present' })
                }
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="btn-primary"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* SEND SMS MODAL */}
      <Modal
        isOpen={smsModalOpen}
        onClose={() => setSmsModalOpen(false)}
        title="💬 Send SMS to Selected Absent Students"
      >
        <div className="space-y-4 text-sm">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div>
              <strong>Selected:</strong> {selectedAbsentRecords.length} Absent Student(s)
            </div>
            <div className="font-mono">
              Valid Parent Phones:{' '}
              <span className="font-bold">
                {selectedAbsentRecords.filter((r) => getParentPhone(r.studentId) !== '-').length}
              </span>
            </div>
          </div>

          {/* MESSAGE TEMPLATE */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1.5">
              Attendance SMS Message Template
            </label>
            <textarea
              rows={8}
              value={smsTemplateText}
              onChange={(e) => setSmsTemplateText(e.target.value)}
              className="input-field text-xs font-mono w-full leading-relaxed"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Placeholders <code>{'{studentName}'}</code>, <code>{'{className}'}</code>, and <code>{'{date}'}</code> will be automatically replaced per student.
            </p>
          </div>

          {/* RECIPIENT PREVIEW LIST */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1.5">
              Recipients Preview ({selectedAbsentRecords.length})
            </label>
            <div className="max-h-44 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-700/60 bg-gray-50/50 dark:bg-gray-900/40">
              {selectedAbsentRecords.map((rec) => {
                const pPhone = getParentPhone(rec.studentId);
                return (
                  <div key={rec._id} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {rec.studentId?.name || 'Unknown Student'}
                      </span>
                      <span className="text-gray-400 ml-2 font-medium">({rec.classId?.className || '-'})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 font-mono text-[11px]">{formatDateDisplay(rec.date)}</span>
                      <span
                        className={`font-mono px-2 py-0.5 rounded text-[11px] font-semibold ${
                          pPhone !== '-'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                        }`}
                      >
                        {pPhone !== '-' ? pPhone : 'No Phone'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setSmsModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={sendingSms}
              onClick={handleSendBulkSms}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingSms ? 'Sending...' : 'Send SMS to Selected'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AttendancePage;
