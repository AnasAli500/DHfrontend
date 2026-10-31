import { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  BookOpen,
  School,
  AlertCircle,
  Check,
  X,
  PlusCircle,
  CheckCircle2,
} from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

// Generate academic year options: current-1 to current+3
const currentYear = new Date().getFullYear();
const ACADEMIC_YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = currentYear - 1 + i;
  return `${y}-${y + 1}`;
});

const emptyForm = {
  name: '',
  gender: 'Male',
  phone: '',
  email: '',
  address: '',
  academicYear: '',
  assignments: [{ subject: '', classes: [] }],
};

const Teachers = () => {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Form modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // View details modal states
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedTeacherForView, setSelectedTeacherForView] = useState(null);

  // Add new subject modal states
  const [newSubjectModalOpen, setNewSubjectModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectLevel, setNewSubjectLevel] = useState('Both');
  const [addingSubject, setAddingSubject] = useState(false);
  const [activeSubjectRowIndex, setActiveSubjectRowIndex] = useState(null);

  // Per-row level filter: { [rowIndex]: 'All' | 'Primary' | 'Secondary' }
  const [subjectLevel, setSubjectLevel] = useState('');

  const fetchInitialData = async () => {
    try {
      const [subjectsRes, classesRes] = await Promise.all([
        api.get('/subjects').catch(() => api.get('/teachers/subjects')),
        api.get('/classes', { params: { limit: 100 } }),
      ]);
      setAvailableSubjects(subjectsRes.data.subjects || []);
      setAvailableClasses(classesRes.data.classes || []);
    } catch (err) {
      console.error('Failed to load subjects or classes', err);
    }
  };

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/teachers', { params: { search, page, limit: 10 } });
      setTeachers(data.teachers || []);
      setPages(data.pages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [search, page]);

  // Lookup map for fast class name retrieval
  const classMap = useMemo(() => {
    const map = new Map();
    availableClasses.forEach((c) => {
      map.set(c._id.toString(), c);
    });
    return map;
  }, [availableClasses]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditId(null);
    setForm({
      name: '',
      gender: 'Male',
      phone: '',
      email: '',
      address: '',
      assignments: [{ subject: '', classes: [] }],
    });
    setAcademicLevel('');
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (teacherItem) => {
    setEditId(teacherItem._id);

    // Normalize assignments
    let initialAssignments = [];
    if (Array.isArray(teacherItem.assignments) && teacherItem.assignments.length > 0) {
      initialAssignments = teacherItem.assignments.map((a) => ({
        subject: a.subject,
        classes: (a.classes || []).map((c) => (c && c._id ? c._id.toString() : c.toString())),
      }));
    } else if (teacherItem.subject) {
      // Split legacy comma-separated subjects
      const parts = teacherItem.subject.split(',').map((s) => s.trim()).filter(Boolean);
      initialAssignments = parts.map((sub) => ({ subject: sub, classes: [] }));
    }

    if (initialAssignments.length === 0) {
      initialAssignments = [{ subject: '', classes: [] }];
    }

    setForm({
      name: teacherItem.name || '',
      gender: teacherItem.gender || 'Male',
      phone: teacherItem.phone || '',
      email: teacherItem.email || '',
      address: teacherItem.address || '',
      assignments: initialAssignments,
    });
    setModalOpen(true);
  };

  // View Details Modal
  const handleOpenDetails = (teacherItem) => {
    setSelectedTeacherForView(teacherItem);
    setDetailsModalOpen(true);
  };

  // Subject Assignment helpers
  const handleAddAssignmentRow = () => {
    setForm((prev) => ({
      ...prev,
      assignments: [...prev.assignments, { subject: '', classes: [] }],
    }));
  };

  const handleRemoveAssignmentRow = (index) => {
    setForm((prev) => {
      const updated = prev.assignments.filter((_, idx) => idx !== index);
      return {
        ...prev,
        assignments: updated.length > 0 ? updated : [{ subject: '', classes: [] }],
      };
    });
  };

  const handleSubjectChange = (index, subjectValue) => {
    setForm((prev) => {
      const updated = [...prev.assignments];
      updated[index] = { ...updated[index], subject: subjectValue };
      return { ...prev, assignments: updated };
    });
  };

  const handleToggleClass = (rowIndex, classId) => {
    setForm((prev) => {
      const updated = [...prev.assignments];
      const currentClasses = updated[rowIndex].classes || [];
      const classIdStr = classId.toString();

      if (currentClasses.includes(classIdStr)) {
        updated[rowIndex] = {
          ...updated[rowIndex],
          classes: currentClasses.filter((id) => id !== classIdStr),
        };
      } else {
        updated[rowIndex] = {
          ...updated[rowIndex],
          classes: [...currentClasses, classIdStr],
        };
      }
      return { ...prev, assignments: updated };
    });
  };

  const handleSelectAllClasses = (rowIndex) => {
    setForm((prev) => {
      const updated = [...prev.assignments];
      updated[rowIndex] = {
        ...updated[rowIndex],
        classes: availableClasses.map((c) => c._id.toString()),
      };
      return { ...prev, assignments: updated };
    });
  };

  const handleClearAllClasses = (rowIndex) => {
    setForm((prev) => {
      const updated = [...prev.assignments];
      updated[rowIndex] = {
        ...updated[rowIndex],
        classes: [],
      };
      return { ...prev, assignments: updated };
    });
  };

  // Quick Add New Subject
  const handleCreateNewSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setAddingSubject(true);
    try {
      const { data } = await api.post('/subjects', {
        name: newSubjectName.trim(),
        level: newSubjectLevel,
      });
      toast.success(t('teachers.subjectAdded') || 'Subject added successfully');
      setAvailableSubjects((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));

      // If triggered from an assignment row, automatically select it
      if (activeSubjectRowIndex !== null) {
        handleSubjectChange(activeSubjectRowIndex, data.name);
      }
      setNewSubjectName('');
      setNewSubjectLevel('Both');
      setNewSubjectModalOpen(false);
      setActiveSubjectRowIndex(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add subject');
    } finally {
      setAddingSubject(false);
    }
  };


  // Form Validation & Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.name.trim()) {
      return toast.error(t('students.fullName') + ' is required');
    }

    // Check assignments validation
    const seenSubjects = new Set();
    const validAssignments = [];

    for (let i = 0; i < form.assignments.length; i++) {
      const row = form.assignments[i];
      const subject = (row.subject || '').trim();

      if (!subject && row.classes.length === 0) {
        continue; // skip entirely empty row
      }

      if (!subject) {
        return toast.error(`Row ${i + 1}: Please select a subject.`);
      }

      const lowerSub = subject.toLowerCase();
      if (seenSubjects.has(lowerSub)) {
        return toast.error(
          t('teachers.duplicateSubjectWarning') ||
            `Duplicate subject "${subject}". Each subject can only be assigned once with its classes.`
        );
      }
      seenSubjects.add(lowerSub);

      if (!row.classes || row.classes.length === 0) {
        return toast.error(
          t('teachers.atLeastOneClassRequired') ||
            `Please select at least one class for "${subject}".`
        );
      }

      validAssignments.push({
        subject,
        classes: row.classes,
      });
    }

    const payload = {
      name: form.name.trim(),
      gender: form.gender,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      assignments: validAssignments,
    };

    setSubmitting(true);
    try {
      if (editId) {
        await api.put(`/teachers/${editId}`, payload);
        toast.success(t('teachers.teacherUpdated'));
      } else {
        await api.post('/teachers', payload);
        toast.success(t('teachers.teacherCreated'));
      }
      setModalOpen(false);
      fetchTeachers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('teachers.deleteTeacherConfirm'))) return;
    try {
      await api.delete(`/teachers/${id}`);
      toast.success(t('teachers.teacherDeleted'));
      fetchTeachers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('teachers.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage teacher profiles and their subject-to-class assignments
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t('teachers.addTeacher')}
        </button>
      </div>

      <SearchBar
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder={t('teachers.searchTeachers')}
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <th className="text-left py-3 px-4 font-semibold">{t('common.id')}</th>
                <th className="text-left py-3 px-4 font-semibold">{t('common.name')}</th>
                <th className="text-left py-3 px-4 font-semibold">
                  {t('teachers.subjectClassAssignments') || 'Assigned Subjects & Classes'}
                </th>
                <th className="text-left py-3 px-4 font-semibold">{t('common.phone')}</th>
                <th className="text-left py-3 px-4 font-semibold">{t('students.account')}</th>
                <th className="text-right py-3 px-4 font-semibold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    No teachers found. Click "{t('teachers.addTeacher')}" to create one.
                  </td>
                </tr>
              ) : (
                teachers.map((teacherItem) => {
                  const assignments = teacherItem.assignments || [];
                  return (
                    <tr
                      key={teacherItem._id}
                      className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      {/* Teacher ID */}
                      <td className="py-3 px-4 font-mono font-medium text-primary-600 dark:text-primary-400">
                        {teacherItem.teacherId}
                      </td>

                      {/* Name & Email */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {teacherItem.name}
                        </div>
                        {teacherItem.email && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {teacherItem.email}
                          </div>
                        )}
                      </td>

                      {/* Subject & Class Assignments */}
                      <td className="py-3 px-4">
                        {assignments.length > 0 ? (
                          <div className="space-y-1.5 max-w-md">
                            {assignments.map((assign, idx) => {
                              const classNames = (assign.classes || [])
                                .map((c) => (c && c.className ? c.className : classMap.get(c?.toString())?.className || 'Class'))
                                .join(', ');

                              return (
                                <div
                                  key={idx}
                                  className="inline-flex items-center flex-wrap gap-1.5 mr-2 mb-1 text-xs"
                                >
                                  <span className="font-semibold px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                                    {assign.subject}
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    &rarr; {classNames || t('teachers.noClassesAssigned') || 'No classes'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : teacherItem.subject ? (
                          <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {teacherItem.subject}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            {t('teachers.noAssignments') || 'No assignments'}
                          </span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {teacherItem.phone || '-'}
                      </td>

                      {/* Account status */}
                      <td className="py-3 px-4">
                        {teacherItem.hasAccount ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
                            <Check className="w-3 h-3" /> {t('common.active')}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">{t('common.none')}</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(teacherItem)}
                            title={t('teachers.viewAssignments') || 'View Details'}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(teacherItem)}
                            title={t('common.edit')}
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(teacherItem._id)}
                            title={t('common.delete')}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </div>
      )}

      {/* Add / Edit Teacher Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? t('teachers.editTeacher') : t('teachers.addTeacher')}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1 pr-2">
          {/* Section 1: Teacher Personal Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800 pb-1.5 flex items-center gap-2">
              <School className="w-4 h-4 text-primary-600" />
              1. Teacher Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('students.fullName')} <span className="text-red-500">*</span>
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. Mohamed Ali"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('students.gender')} <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="Male">{t('common.male')}</option>
                  <option value="Female">{t('common.female')}</option>
                  <option value="Other">{t('common.other')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="teacher@school.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.phone')}
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. +252 61..."
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.address')}
              </label>
              <textarea
                className="input-field"
                placeholder={t('common.address')}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {/* Section 2: Subject & Class Assignments */}
          <div className="space-y-3 pt-2">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-2 space-y-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary-600" />
                2. Subject &amp; Class Assignments
              </h3>

              {/* Academic Year selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
                  Academic Year:
                </span>
                <div className="flex gap-1.5">
                  {['Primary', 'Secondary'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        setAcademicLevel(lvl);
                        setForm((prev) => ({ ...prev, assignments: [{ subject: '', classes: [] }] }));
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        academicLevel === lvl
                          ? lvl === 'Primary'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!academicLevel ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                ☝️ Please select an Academic Year (Primary or Secondary) first.
              </p>
            ) : (
              <>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddAssignmentRow}
                    className="btn-secondary !text-xs !py-1 flex items-center gap-1 text-primary-600 dark:text-primary-400 border-primary-200 hover:bg-primary-50 dark:hover:bg-primary-950/40"
                  >
                    <Plus className="w-3 h-3" />
                    {t('teachers.addAssignment') || '+ Add Subject'}
                  </button>
                </div>

            {/* Assignment Rows */}
            <div className="space-y-3">
              {form.assignments.map((assignmentRow, rowIndex) => {
                // Find subjects already chosen in other rows to prevent duplicate selection
                const chosenInOtherRows = new Set(
                  form.assignments
                    .filter((_, idx) => idx !== rowIndex)
                    .map((a) => (a.subject || '').trim().toLowerCase())
                    .filter(Boolean)
                );

                return (
                  <div
                    key={rowIndex}
                    className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-gray-50/70 dark:bg-gray-800/40 space-y-3 relative transition-all"
                  >
                    {/* Row header: Subject selector & Remove */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-[11px] font-bold flex items-center justify-center">
                              {rowIndex + 1}
                            </span>
                            {t('teachers.subject')}:
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSubjectRowIndex(rowIndex);
                              setNewSubjectModalOpen(true);
                            }}
                            className="text-[11px] text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium flex items-center gap-1 hover:underline"
                          >
                            <PlusCircle className="w-3 h-3" />
                            {t('teachers.addNewSubject') || '+ New Subject'}
                          </button>
                        </div>

                        {/* Subject dropdown — filtered by academicLevel selected above */}
                        <select
                          className="input-field !py-1.5 text-sm"
                          value={assignmentRow.subject}
                          onChange={(e) => handleSubjectChange(rowIndex, e.target.value)}
                          required
                        >
                          <option value="">-- {t('teachers.selectSubject') || 'Select Subject'} --</option>
                          {availableSubjects
                            .filter((sub) => {
                              if (!academicLevel) return true;
                              return sub.level === academicLevel || sub.level === 'Both' || !sub.level;
                            })
                            .map((sub) => {
                              const isChosenElsewhere = chosenInOtherRows.has(sub.name.toLowerCase());
                              return (
                                <option key={sub._id || sub.name} value={sub.name} disabled={isChosenElsewhere}>
                                  {sub.name}{isChosenElsewhere ? ' (Already Assigned)' : ''}
                                </option>
                              );
                            })}
                        </select>


                      </div>

                      {/* Remove Row button */}
                      {form.assignments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignmentRow(rowIndex)}
                          title="Remove this subject assignment"
                          className="mt-6 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Class Selector for this Subject */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {t('teachers.assignedClasses') || 'Assigned Classes for this Subject'}:
                          <span className="ml-2 font-normal text-gray-500">
                            ({assignmentRow.classes.length} {t('teachers.classesSelected') || 'classes selected'})
                          </span>
                        </label>
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleSelectAllClasses(rowIndex)}
                            className="text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            {t('teachers.selectAllClasses') || 'Select All'}
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => handleClearAllClasses(rowIndex)}
                            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:underline"
                          >
                            {t('teachers.clearAllClasses') || 'Clear'}
                          </button>
                        </div>
                      </div>

                      {availableClasses.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">
                          {t('teachers.noClassesFound') || 'No classes found in the database. Please create classes first.'}
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                          {availableClasses.map((cls) => {
                            const isSelected = assignmentRow.classes.includes(cls._id.toString());
                            return (
                              <label
                                key={cls._id}
                                className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer border text-xs transition ${
                                  isSelected
                                    ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-300 dark:border-primary-700 text-primary-900 dark:text-primary-200 font-medium'
                                    : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="rounded text-primary-600 focus:ring-primary-500 h-3.5 w-3.5"
                                  checked={isSelected}
                                  onChange={() => handleToggleClass(rowIndex, cls._id)}
                                />
                                <span className="truncate" title={`${cls.className} (${cls.gradeLevel})`}>
                                  {cls.className}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Subject-Class Preview */}
            {form.assignments.some((a) => a.subject && a.classes.length > 0) && (
              <div className="mt-1 p-2.5 rounded-lg border border-primary-200/70 dark:border-primary-900/50 bg-primary-50/40 dark:bg-primary-950/20">
                <div className="text-xs font-semibold text-primary-800 dark:text-primary-300 mb-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-primary-600" />
                  Assignments Summary
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-primary-200 dark:border-primary-800 text-left text-gray-600 dark:text-gray-300">
                      <th className="py-1 px-1.5 font-semibold">Subject</th>
                      <th className="py-1 px-1.5 font-semibold">Classes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.assignments
                      .filter((a) => a.subject && a.classes.length > 0)
                      .map((a, idx) => (
                        <tr key={idx} className="border-b border-primary-100 dark:border-primary-900/30">
                          <td className="py-1 px-1.5 font-medium text-gray-800 dark:text-gray-200">{a.subject}</td>
                          <td className="py-1 px-1.5 text-primary-700 dark:text-primary-300">
                            {a.classes.map((cId) => classMap.get(cId)?.className || 'Class').join(', ')}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
            </>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setModalOpen(false)}
              className="btn-secondary"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary disabled:opacity-50 flex items-center gap-2"
            >
              {submitting
                ? t('common.loading')
                : editId
                ? t('common.update')
                : t('common.create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Teacher Details & Assignment Table Modal */}
      {selectedTeacherForView && (
        <Modal
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          title={t('teachers.teacherDetails') || 'Teacher Details & Subject Assignments'}
        >
          <div className="space-y-4">
            {/* Header / Info card */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedTeacherForView.name}
                  </h4>
                  <div className="text-xs text-primary-600 font-mono font-medium">
                    {selectedTeacherForView.teacherId}
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    selectedTeacherForView.hasAccount
                      ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {selectedTeacherForView.hasAccount ? 'Account Active' : 'No Account'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 text-gray-600 dark:text-gray-300">
                <div>
                  <strong>Gender:</strong> {selectedTeacherForView.gender || '-'}
                </div>
                <div>
                  <strong>Phone:</strong> {selectedTeacherForView.phone || '-'}
                </div>
                <div>
                  <strong>Email:</strong> {selectedTeacherForView.email || '-'}
                </div>
                <div>
                  <strong>Address:</strong> {selectedTeacherForView.address || '-'}
                </div>
              </div>
            </div>

            {/* Subject - Class Relationship Table */}
            <div>
              <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary-600" />
                {t('teachers.subjectClassAssignments') || 'Subject-Class Relationships'}
              </h5>

              {(!selectedTeacherForView.assignments || selectedTeacherForView.assignments.length === 0) ? (
                <div className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg text-center">
                  No specific subject-class combinations assigned.
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium">
                      <tr>
                        <th className="py-2.5 px-4 text-left">Subject</th>
                        <th className="py-2.5 px-4 text-left">Assigned Classes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {selectedTeacherForView.assignments.map((assignmentItem, idx) => {
                        const classNames = (assignmentItem.classes || [])
                          .map((c) => (c && c.className ? c.className : classMap.get(c?.toString())?.className || 'Class'))
                          .join(', ');

                        return (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-2.5 px-4 font-semibold text-primary-700 dark:text-primary-300">
                              {assignmentItem.subject}
                            </td>
                            <td className="py-2.5 px-4 text-gray-700 dark:text-gray-300">
                              {classNames || (
                                <span className="text-gray-400 italic">No classes assigned</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                className="btn-secondary !py-1.5 !px-4 text-sm"
              >
                {t('common.close') || 'Close'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Modal
        isOpen={newSubjectModalOpen}
        onClose={() => {
          setNewSubjectModalOpen(false);
          setNewSubjectName('');
          setNewSubjectLevel('Both');
          setActiveSubjectRowIndex(null);
        }}
        title={t('teachers.addNewSubject') || 'Add New Subject'}
      >
        <form onSubmit={handleCreateNewSubject} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('teachers.subjectName') || 'Subject Name'} <span className="text-red-500">*</span>
            </label>
            <input
              className="input-field"
              placeholder="e.g. Computer Science, Economics"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Level selector */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Academic Level
            </label>
            <div className="flex gap-2">
              {[
                { val: 'Secondary', label: 'Secondary', color: 'indigo' },
                { val: 'Primary',   label: 'Primary',   color: 'emerald' },
                { val: 'Both',      label: 'Both',      color: 'gray' },
              ].map(({ val, label, color }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setNewSubjectLevel(val)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    newSubjectLevel === val
                      ? color === 'indigo'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : color === 'emerald'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-gray-600 text-white border-gray-600'
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={addingSubject}
              onClick={() => {
                setNewSubjectModalOpen(false);
                setNewSubjectName('');
                setActiveSubjectRowIndex(null);
              }}
              className="btn-secondary text-xs"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={addingSubject || !newSubjectName.trim()}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              {addingSubject ? t('common.loading') : t('common.create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Teachers;
