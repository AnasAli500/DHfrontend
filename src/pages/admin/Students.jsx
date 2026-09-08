import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Download, Upload, Eye, GraduationCap, History, Filter } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StudentImportModal from '../../components/students/StudentImportModal';
import StudentFormModal from '../../components/students/StudentFormModal';
import { exportToExcel } from '../../utils/excelUtils';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const Students = () => {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Student Profile Modal State
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');

  // Filters inside Profile Modal
  const [examYearFilter, setExamYearFilter] = useState('ALL');
  const [examClassFilter, setExamClassFilter] = useState('ALL');
  const [examSubjectFilter, setExamSubjectFilter] = useState('ALL');

  const [attendanceYearFilter, setAttendanceYearFilter] = useState('ALL');
  const [attendanceClassFilter, setAttendanceClassFilter] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { search, page, limit: 10 };
      if (filterGender) params.gender = filterGender;
      if (filterClassId) params.classId = filterClassId;
      if (filterStatus) params.status = filterStatus;
      const [s, c] = await Promise.all([
        api.get('/students', { params }),
        api.get('/classes', { params: { limit: 1000 } }),
      ]);
      setStudents(s.data.students);
      setPages(s.data.pages);
      setClasses(c.data.classes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, page, filterGender, filterClassId, filterStatus]);

  const openCreate = () => { setSelectedStudent(null); setModalOpen(true); };

  const openView = async (s) => {
    setProfileLoading(true);
    setViewOpen(true);
    setActiveTab('Overview');
    setExamYearFilter('ALL');
    setExamClassFilter('ALL');
    setExamSubjectFilter('ALL');
    setAttendanceYearFilter('ALL');
    setAttendanceClassFilter('ALL');

    try {
      const { data } = await api.get(`/students/academic-history/${s._id}`);
      setProfileData(data);
    } catch (err) {
      toast.error(t('students.failedToLoadHistory'));
    } finally {
      setProfileLoading(false);
    }
  };

  const openEdit = (s) => {
    setSelectedStudent(s);
    setModalOpen(true);
  };

  const handleSaveStudent = async (formData) => {
    if (selectedStudent?._id) {
      await api.put(`/students/${selectedStudent._id}`, formData);
      toast.success(t('students.studentUpdated'));
    } else {
      await api.post('/students', formData);
      toast.success(t('students.studentCreated'));
    }
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete or deactivate this student?')) return;
    try {
      const res = await api.delete(`/students/${id}`);
      toast.success(res.data?.message || t('students.studentDeleted'));
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get('/students/export');
      const rows = data.map((s) => ({
        'Student ID': s.studentId || '',
        'Registered Date': s.registeredDate ? new Date(s.registeredDate).toLocaleDateString() : '',
        Name: s.name || '',
        'Mother Name': s.motherName || '',
        Gender: s.gender || '',
        Telephone: s.phone || '',
        Birthday: s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString() : '',
        Birthplace: s.birthplace || '',
        Nationality: s.nationality || '',
        Address: s.address || '',
        'Student State': s.state || '',
        'Student Region': s.region || '',
        'Student District': s.district || '',
        'Student Village': s.village || '',
        'Orphan Status': s.orphanStatus || 'No',
        'Disability Status': s.disabilityStatus || 'No',
        'Guardian Name': s.guardianName || '',
        'Guardian Telephone': s.guardianPhone || s.parentPhone || '',
        'Refugee Status': s.refugeeStatus || 'No',
        'School Type': s.schoolType || '',
        'School Name': s.schoolName || '',
        Class: s.classId?.className || '',
        'Transfer Status': s.transferStatus || '',
        'Monthly Fee ($)': s.monthlyFee || 0,
        'Admission Fee ($)': s.admissionFee || 0,
        'Account Status': s.hasAccount ? 'Active' : 'None',
      }));
      exportToExcel(rows, 'students_export.xlsx', 'Students');
      toast.success('Students exported successfully!');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const renderStudentProfileModal = () => {
    if (!profileData || profileLoading) return <LoadingSpinner />;
    const { student, currentClass, enrollments = [], exams = [], results = [], attendance = [] } = profileData;

    const enrollmentMap = {};
    enrollments.forEach((e) => {
      enrollmentMap[e._id] = { academicYear: e.academicYear, className: e.classId?.className || '' };
    });

    const getExamYear = (ex) => ex.classId?.academicYear || enrollmentMap[ex.enrollmentId]?.academicYear || '';
    const getExamClass = (ex) => ex.classId?.className || enrollmentMap[ex.enrollmentId]?.className || '';
    const getAttYear = (att) => att.classId?.academicYear || enrollmentMap[att.enrollmentId]?.academicYear || '';
    const getAttClass = (att) => att.classId?.className || enrollmentMap[att.enrollmentId]?.className || '';

    const uniqueYears = [...new Set(enrollments.map((e) => e.academicYear))].filter(Boolean);
    const uniqueClasses = [...new Set(enrollments.map((e) => e.classId?.className))].filter(Boolean);
    const uniqueSubjects = [...new Set(exams.map((ex) => ex.periodId?.subject))].filter(Boolean);

    const filteredExams = exams.filter((ex) => {
      if (examYearFilter !== 'ALL' && getExamYear(ex) !== examYearFilter) return false;
      if (examClassFilter !== 'ALL' && getExamClass(ex) !== examClassFilter) return false;
      if (examSubjectFilter !== 'ALL' && (ex.periodId?.subject || '') !== examSubjectFilter) return false;
      return true;
    });

    const filteredAttendance = attendance.filter((att) => {
      if (attendanceYearFilter !== 'ALL' && getAttYear(att) !== attendanceYearFilter) return false;
      if (attendanceClassFilter !== 'ALL' && getAttClass(att) !== attendanceClassFilter) return false;
      return true;
    });

    return (
      <div className="space-y-4">
        {/* Student Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl gap-3 border border-gray-200 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{student.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                {student.studentId}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('students.currentClass')}: <span className="font-semibold text-gray-700 dark:text-gray-200">{currentClass?.className ? `${currentClass.className} (${currentClass.gradeLevel})` : t('students.notEnrolled')}</span>
              {currentClass?.academicYear && <span className="ml-2 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">{currentClass.academicYear}</span>}
            </p>
          </div>
          <button
            onClick={() => setActiveTab('Academic History')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg hover:bg-blue-100 transition"
          >
            <History className="w-4 h-4" />
            {t('students.viewAcademicHistory')}
          </button>
        </div>

        {/* Profile Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {['Overview', 'Current Class', 'Academic History', 'Exams', 'Results', 'Attendance'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab === 'Overview' ? t('students.overview') :
               tab === 'Current Class' ? t('students.currentClass') :
               tab === 'Academic History' ? t('students.academicHistory') :
               tab === 'Exams' ? t('navigation.exams') :
               tab === 'Results' ? t('students.results') :
               t('navigation.attendance')}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="pt-2">
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">{t('students.studentId')}</p>
                <p className="font-mono text-primary-600 font-semibold">{student.studentId}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">{t('students.fullName')}</p>
                <p className="font-medium">{student.name}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">Registered Date</p>
                <p>{student.registeredDate ? new Date(student.registeredDate).toLocaleDateString() : '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">{t('common.gender')}</p>
                <p>{student.gender === 'Male' ? t('common.male') : student.gender === 'Female' ? t('common.female') : student.gender}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">{t('students.dateOfBirth')}</p>
                <p>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">Birthplace</p>
                <p>{student.birthplace || '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">Nationality</p>
                <p>{student.nationality || '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">{t('students.motherName')}</p>
                <p>{student.motherName || '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">{t('common.phone')}</p>
                <p>{student.phone || '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">State / Region</p>
                <p>{[student.state, student.region].filter(Boolean).join(' / ') || '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">District / Village</p>
                <p>{[student.district, student.village].filter(Boolean).join(' / ') || '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">Guardian Name & Phone</p>
                <p>{student.guardianName || student.parentPhone ? `${student.guardianName || '-'} (${student.guardianPhone || student.parentPhone || '-'})` : '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">Orphan / Disability / Refugee</p>
                <p>Orphan: <span className="font-semibold">{student.orphanStatus || 'No'}</span> | Disability: <span className="font-semibold">{student.disabilityStatus || 'No'}</span> | Refugee: <span className="font-semibold">{student.refugeeStatus || 'No'}</span></p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">School Type & Name</p>
                <p>{student.schoolType || student.schoolName ? `${student.schoolType || '-'} - ${student.schoolName || '-'}` : '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">Fees (Monthly / Admission)</p>
                <p className="font-semibold text-emerald-600">${student.monthlyFee || 0} / ${student.admissionFee || 0}</p>
              </div>
            </div>
          )}

          {activeTab === 'Current Class' && (
            <div className="space-y-4 text-sm">
              {currentClass ? (
                <div className="card space-y-3 bg-gray-50 dark:bg-gray-800/60 p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between border-b pb-2 dark:border-gray-700">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary-600" />
                      {currentClass.className}
                    </h3>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                      {t('students.currentlyActive')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500">{t('students.gradeLevel')}:</span> <span className="font-semibold">{currentClass.gradeLevel}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('students.academicYear')}:</span> <span className="font-semibold">{currentClass.academicYear}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('students.category')}:</span> <span className="font-semibold">{currentClass.category?.name || '-'} ({currentClass.category?.academicType || ''})</span>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('students.classStatus')}:</span> <span className="font-semibold">{currentClass.status}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center py-6 text-gray-500">{t('students.noActiveClassAssignment')}</p>
              )}
            </div>
          )}

          {activeTab === 'Academic History' && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-primary-600" />
                  {t('students.permanentAcademicHistory')}
                </h3>
                <span className="text-xs text-gray-500">{enrollments.length} {t('students.enrollmentRecords')}</span>
              </div>
              <div className="overflow-x-auto card p-0 border border-gray-200 dark:border-gray-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    <tr>
                      <th className="py-2.5 px-3">{t('students.academicYear')}</th>
                      <th className="py-2.5 px-3">{t('students.class')}</th>
                      <th className="py-2.5 px-3">{t('students.category')}</th>
                      <th className="py-2.5 px-3">{t('students.promotionStatus')}</th>
                      <th className="py-2.5 px-3">{t('students.enrollmentStatus')}</th>
                      <th className="py-2.5 px-3">{t('students.startDate')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {enrollments.map((e) => (
                      <tr key={e._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="py-2.5 px-3 font-semibold text-primary-600">{e.academicYear}</td>
                        <td className="py-2.5 px-3 font-medium">{e.classId?.className || '-'} ({e.classId?.gradeLevel || '-'})</td>
                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{e.classId?.category?.name || '-'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            e.promotionStatus === 'Promoted' ? 'bg-green-100 text-green-700' :
                            e.promotionStatus === 'Graduated' ? 'bg-purple-100 text-purple-700' :
                            e.promotionStatus === 'Repeating' ? 'bg-amber-100 text-amber-700' :
                            e.promotionStatus === 'Transferred' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {e.promotionStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            e.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">{e.startDate ? new Date(e.startDate).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                    {enrollments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-gray-500">{t('students.noEnrollmentHistory')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Exams' && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1 text-gray-500 font-medium mr-1">
                  <Filter className="w-3.5 h-3.5" /> {t('students.filterExams')}
                </div>
                <select className="input-field !py-1 !text-xs !w-auto" value={examYearFilter} onChange={(e) => setExamYearFilter(e.target.value)}>
                  <option value="ALL">{t('students.allAcademicYears')}</option>
                  {uniqueYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <select className="input-field !py-1 !text-xs !w-auto" value={examClassFilter} onChange={(e) => setExamClassFilter(e.target.value)}>
                  <option value="ALL">{t('students.allClasses')}</option>
                  {uniqueClasses.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="input-field !py-1 !text-xs !w-auto" value={examSubjectFilter} onChange={(e) => setExamSubjectFilter(e.target.value)}>
                  <option value="ALL">{t('students.allSubjects')}</option>
                  {uniqueSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="overflow-x-auto card p-0 border border-gray-200 dark:border-gray-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    <tr>
                      <th className="py-2.5 px-3">{t('students.year')}</th>
                      <th className="py-2.5 px-3">{t('students.class')}</th>
                      <th className="py-2.5 px-3">{t('students.subject')}</th>
                      <th className="py-2.5 px-3">{t('students.examSeason')}</th>
                      <th className="py-2.5 px-3">{t('students.examType')}</th>
                      <th className="py-2.5 px-3">{t('students.marks')}</th>
                      <th className="py-2.5 px-3">{t('students.grade')}</th>
                      <th className="py-2.5 px-3">{t('common.date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredExams.map((ex) => (
                      <tr key={ex._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="py-2.5 px-3 font-semibold text-primary-600">{getExamYear(ex) || '-'}</td>
                        <td className="py-2.5 px-3 font-medium">{getExamClass(ex) || '-'}</td>
                        <td className="py-2.5 px-3">{ex.periodId?.subject || '-'}</td>
                        <td className="py-2.5 px-3">{ex.examSeasonId?.name || ex.examPhase || '-'}</td>
                        <td className="py-2.5 px-3">{ex.examType}</td>
                        <td className="py-2.5 px-3 font-semibold">{ex.marks} / {ex.totalMarks} ({ex.percentage}%)</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${ex.isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {ex.grade}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">{ex.examDate ? new Date(ex.examDate).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                    {filteredExams.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-4 text-gray-500">{t('students.noExamRecords')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Results' && (
            <div className="space-y-3 text-sm">
              <div className="overflow-x-auto card p-0 border border-gray-200 dark:border-gray-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    <tr>
                      <th className="py-2.5 px-3">{t('students.year')}</th>
                      <th className="py-2.5 px-3">{t('students.class')}</th>
                      <th className="py-2.5 px-3">{t('students.examSeason')}</th>
                      <th className="py-2.5 px-3">{t('students.totalMarks')}</th>
                      <th className="py-2.5 px-3">{t('students.percentage')}</th>
                      <th className="py-2.5 px-3">{t('students.grade')}</th>
                      <th className="py-2.5 px-3">{t('students.position')}</th>
                      <th className="py-2.5 px-3">{t('students.overallResult')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {results.map((r) => (
                      <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="py-2.5 px-3 font-semibold text-primary-600">{r.academicYear || r.classId?.academicYear || '-'}</td>
                        <td className="py-2.5 px-3 font-medium">{r.classId?.className || '-'}</td>
                        <td className="py-2.5 px-3">{r.examSeasonId?.name || '-'}</td>
                        <td className="py-2.5 px-3 font-semibold">{r.totalMarksObtained} / {r.totalMaxMarks}</td>
                        <td className="py-2.5 px-3">{r.percentage}%</td>
                        <td className="py-2.5 px-3 font-bold">{r.overallGrade}</td>
                        <td className="py-2.5 px-3 text-primary-600 font-medium">{r.position || (r.rank ? `${r.rank}th` : '-')}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${r.isOverallPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {r.isOverallPassed ? t('students.pass') : t('students.fail')}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {results.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-4 text-gray-500">{t('students.noResultRecords')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Attendance' && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1 text-gray-500 font-medium mr-1">
                  <Filter className="w-3.5 h-3.5" /> {t('students.filterAttendance')}
                </div>
                <select className="input-field !py-1 !text-xs !w-auto" value={attendanceYearFilter} onChange={(e) => setAttendanceYearFilter(e.target.value)}>
                  <option value="ALL">{t('students.allAcademicYears')}</option>
                  {uniqueYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <select className="input-field !py-1 !text-xs !w-auto" value={attendanceClassFilter} onChange={(e) => setAttendanceClassFilter(e.target.value)}>
                  <option value="ALL">{t('students.allClasses')}</option>
                  {uniqueClasses.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-2.5 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-lg font-medium border border-green-200 dark:border-green-800">
                  {t('students.present')}: {filteredAttendance.filter((a) => a.status === 'Present').length}
                </div>
                <div className="p-2.5 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-lg font-medium border border-red-200 dark:border-red-800">
                  {t('students.absent')}: {filteredAttendance.filter((a) => a.status === 'Absent').length}
                </div>
                <div className="p-2.5 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-lg font-medium border border-amber-200 dark:border-amber-800">
                  {t('students.late')}: {filteredAttendance.filter((a) => a.status === 'Late').length}
                </div>
              </div>

              <div className="overflow-x-auto card p-0 border border-gray-200 dark:border-gray-700 max-h-60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">{t('common.date')}</th>
                      <th className="py-2.5 px-3">{t('students.year')}</th>
                      <th className="py-2.5 px-3">{t('students.class')}</th>
                      <th className="py-2.5 px-3">{t('students.teacher')}</th>
                      <th className="py-2.5 px-3">{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAttendance.map((att) => (
                      <tr key={att._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="py-2 px-3 font-medium">{att.date ? new Date(att.date).toLocaleDateString() : '-'}</td>
                        <td className="py-2 px-3 font-semibold text-primary-600">{getAttYear(att) || '-'}</td>
                        <td className="py-2 px-3">{getAttClass(att) || '-'}</td>
                        <td className="py-2 px-3">{att.teacherId?.name || '-'}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            att.status === 'Present' ? 'bg-green-100 text-green-700' :
                            att.status === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {att.status === 'Present' ? t('students.present') : att.status === 'Absent' ? t('students.absent') : t('students.late')}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredAttendance.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-gray-500">{t('students.noAttendanceRecords')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={() => setViewOpen(false)} className="btn-secondary">{t('students.closeProfile')}</button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('students.title')}</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2"><Download className="w-4 h-4" /> {t('common.export')}</button>
          <button onClick={() => setImportOpen(true)} className="btn-secondary flex items-center gap-2 text-purple-700 border-purple-300 hover:bg-purple-50 dark:text-purple-300 dark:border-purple-700 dark:hover:bg-purple-950/40"><Upload className="w-4 h-4" /> Import Excel</button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> {t('students.addStudent')}</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('students.searchStudents')} />
        <select
          className="input-field !py-1.5 !text-sm !w-auto"
          value={filterGender}
          onChange={(e) => { setFilterGender(e.target.value); setPage(1); }}
        >
          <option value="">{t('students.allGenders')}</option>
          <option value="Male">{t('common.male')}</option>
          <option value="Female">{t('common.female')}</option>
        </select>
        <select
          className="input-field !py-1.5 !text-sm !w-auto"
          value={filterClassId}
          onChange={(e) => { setFilterClassId(e.target.value); setPage(1); }}
        >
          <option value="">{t('students.allClasses')}</option>
          {classes.map((c) => (
            <option key={c._id} value={c._id}>{c.className} - {c.gradeLevel} ({c.academicYear})</option>
          ))}
        </select>
        <select
          className="input-field !py-1.5 !text-sm !w-auto"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="Active">Active Only</option>
          <option value="Inactive">Inactive Only</option>
        </select>
        {(filterGender || filterClassId || filterStatus) && (
          <button
            onClick={() => { setFilterGender(''); setFilterClassId(''); setFilterStatus(''); setPage(1); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 transition"
          >
            ✕ {t('common.clearFilters')}
          </button>
        )}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4">{t('students.studentId')}</th>
                <th className="text-left py-3 px-4">{t('common.name')}</th>
                <th className="text-left py-3 px-4">{t('common.gender')}</th>
                <th className="text-left py-3 px-4">{t('students.currentClass')}</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">{t('students.account')}</th>
                <th className="text-right py-3 px-4">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s._id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-3 px-4 font-mono text-primary-600">{s.studentId}</td>
                  <td className="py-3 px-4 font-medium">{s.name}</td>
                  <td className="py-3 px-4">{s.gender === 'Male' ? t('common.male') : s.gender === 'Female' ? t('common.female') : s.gender}</td>
                  <td className="py-3 px-4">
                    {s.classId?.className ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs">
                        {s.classId.className} - {s.classId.gradeLevel}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      s.status === 'Inactive'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    }`}>
                      {s.status || 'Active'}
                    </span>
                  </td>
                  <td className="py-3 px-4">{s.hasAccount ? <span className="text-green-500 text-xs">{t('common.active')}</span> : <span className="text-gray-400 text-xs">{t('common.none')}</span>}</td>
                  <td className="py-3 px-4 text-right flex justify-end gap-1">
                    <button onClick={() => openView(s)} title={t('students.viewAcademicHistory')} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded flex items-center gap-1 text-xs">
                      <Eye className="w-4 h-4" /> {t('students.history')}
                    </button>
                    <button onClick={() => openEdit(s)} title={t('students.editStudent')} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(s._id)} title={t('common.delete')} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </div>
      )}

      {/* STUDENT PROFILE & ACADEMIC HISTORY MODAL */}
      <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title={t('students.studentProfile')} size="xl">
        {renderStudentProfileModal()}
      </Modal>

      {/* STUDENT EXCEL IMPORT MODAL */}
      <StudentImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        classes={classes}
        onSuccess={() => { fetchData(); }}
      />

      {/* CREATE / EDIT STUDENT MODAL */}
      <StudentFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={selectedStudent}
        classes={classes}
        onSubmit={handleSaveStudent}
      />
    </div>
  );
};

export default Students;
