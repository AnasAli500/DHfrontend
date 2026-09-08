import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { User, MapPin, ShieldAlert, GraduationCap, DollarSign, Loader2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_NATIONALITIES = [
  'Somali',
  'Djiboutian',
  'Ethiopian',
  'Kenyan',
  'Ugandan',
  'Sudanese',
  'Yemeni',
  'American',
  'British',
  'Canadian',
  'Other'
];

const DEFAULT_REGIONS = [
  'Banaadir',
  'Bari',
  'Nugaal',
  'Mudug',
  'Galguduud',
  'Hiraan',
  'Middle Shabelle',
  'Lower Shabelle',
  'Bay',
  'Bakool',
  'Gedo',
  'Middle Juba',
  'Lower Juba',
  'Togdheer',
  'Sanaag',
  'Sool',
  'Awdal',
  'Woqooyi Galbeed',
  'Other'
];

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const calculateAge = (dobString) => {
  if (!dobString) return '';
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? `${age} ${age === 1 ? 'year' : 'years'}` : '';
};

const getInitialFormState = (initialData) => {
  if (initialData) {
    const dob = initialData.dateOfBirth ? initialData.dateOfBirth.split('T')[0] : '';
    const regDate = initialData.registeredDate ? initialData.registeredDate.split('T')[0] : getTodayDate();
    return {
      studentId: initialData.studentId || '',
      registeredDate: regDate,
      name: initialData.name || '',
      motherName: initialData.motherName || '',
      gender: initialData.gender || 'Male',
      phone: initialData.phone || '',
      dateOfBirth: dob,
      birthplace: initialData.birthplace || '',
      nationality: initialData.nationality || 'Somali',
      state: initialData.state || '',
      region: initialData.region || 'Banaadir',
      district: initialData.district || '',
      village: initialData.village || '',
      orphanStatus: initialData.orphanStatus || 'No',
      disabilityStatus: initialData.disabilityStatus || 'No',
      guardianName: initialData.guardianName || '',
      guardianPhone: initialData.guardianPhone || initialData.parentPhone || '',
      refugeeStatus: initialData.refugeeStatus || 'No',
      schoolType: initialData.schoolType || '',
      schoolName: initialData.schoolName || '',
      classId: initialData.classId?._id || initialData.classId || '',
      transferStatus: initialData.transferStatus || 'In Progress',
      monthlyFee: initialData.monthlyFee !== undefined ? initialData.monthlyFee : 0,
      admissionFee: initialData.admissionFee !== undefined ? initialData.admissionFee : 0,
    };
  }

  return {
    studentId: '',
    registeredDate: getTodayDate(),
    name: '',
    motherName: '',
    gender: 'Male',
    phone: '',
    dateOfBirth: '',
    birthplace: '',
    nationality: 'Somali',
    state: '',
    region: 'Banaadir',
    district: '',
    village: '',
    orphanStatus: 'No',
    disabilityStatus: 'No',
    guardianName: '',
    guardianPhone: '',
    refugeeStatus: 'No',
    schoolType: '',
    schoolName: '',
    classId: '',
    transferStatus: 'In Progress',
    monthlyFee: 0,
    admissionFee: 0,
  };
};

const StudentFormModal = ({ isOpen, onClose, initialData, classes = [], onSubmit }) => {
  const [form, setForm] = useState(getInitialFormState(initialData));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const isEdit = Boolean(initialData && initialData._id);

  useEffect(() => {
    if (isOpen) {
      setForm(getInitialFormState(initialData));
      setErrors({});
      setApiError('');
    }
  }, [isOpen, initialData]);

  const computedAge = calculateAge(form.dateOfBirth);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
    if (apiError) setApiError('');
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) {
      newErrors.name = 'Student Name is required';
    }
    if (form.monthlyFee < 0 || isNaN(form.monthlyFee)) {
      newErrors.monthlyFee = 'Monthly fee must be a valid non-negative number';
    }
    if (form.admissionFee < 0 || isNaN(form.admissionFee)) {
      newErrors.admissionFee = 'Admission fee must be a valid non-negative number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the validation errors before submitting.');
      return;
    }

    setIsSubmitting(true);
    setApiError('');

    try {
      const payload = {
        ...form,
        parentPhone: form.guardianPhone || form.phone,
        monthlyFee: Number(form.monthlyFee) || 0,
        admissionFee: Number(form.admissionFee) || 0,
      };

      if (!payload.classId) {
        delete payload.classId;
      }

      await onSubmit(payload);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Operation failed. Please try again.';
      setApiError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClasses = classes.filter((c) => {
    if (!form.schoolType) return true;
    const catName = (c.category?.name || c.gradeLevel || '').toLowerCase();
    const typeLower = form.schoolType.toLowerCase();
    if (typeLower === 'primary') {
      return catName.includes('primary') || catName.includes('element') || catName.includes('grade 1') || catName.includes('grade 2') || catName.includes('grade 3') || catName.includes('grade 4') || catName.includes('grade 5') || catName.includes('grade 6') || catName.includes('grade 7') || catName.includes('grade 8');
    }
    if (typeLower === 'secondary') {
      return catName.includes('second') || catName.includes('high') || catName.includes('form') || catName.includes('grade 9') || catName.includes('grade 10') || catName.includes('grade 11') || catName.includes('grade 12');
    }
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Update Student' : 'Create Student'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
        {apiError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between">
            <span>{apiError}</span>
            <button
              type="button"
              onClick={() => setApiError('')}
              className="text-red-500 font-bold hover:text-red-800 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* SECTION 1: PERSONAL INFORMATION */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700 text-primary-600 dark:text-primary-400 font-bold text-sm">
            <User className="w-4 h-4" />
            <span>1. Personal Information</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs sm:text-sm">
            {/* 1. Student ID */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Student ID <span className="text-gray-400 font-normal">(Auto-generated)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={isEdit ? form.studentId : 'Auto-generated on creation'}
                  className="input-field bg-gray-100 dark:bg-gray-700/60 text-gray-500 cursor-not-allowed font-mono font-semibold"
                />
                <Lock className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3" />
              </div>
            </div>

            {/* 2. Registered Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Registered Date
              </label>
              <input
                type="date"
                value={form.registeredDate}
                onChange={(e) => handleChange('registeredDate', e.target.value)}
                className="input-field"
              />
            </div>

            {/* 3. Student Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Student Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter full student name"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`input-field ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
                required
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* 4. Mother Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Mother Name
              </label>
              <input
                type="text"
                placeholder="Enter mother's name"
                value={form.motherName}
                onChange={(e) => handleChange('motherName', e.target.value)}
                className="input-field"
              />
            </div>

            {/* 5. Sex */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Sex
              </label>
              <select
                value={form.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="input-field"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* 6. Telephone */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Telephone
              </label>
              <input
                type="tel"
                placeholder="e.g. +252 61 XXXXXXX"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="input-field"
              />
            </div>

            {/* 7. Birthday */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Birthday
              </label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                className="input-field"
              />
            </div>

            {/* 8. Birthplace */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Birthplace
              </label>
              <input
                type="text"
                placeholder="e.g. Mogadishu"
                value={form.birthplace}
                onChange={(e) => handleChange('birthplace', e.target.value)}
                className="input-field"
              />
            </div>

            {/* 9. Age */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Age <span className="text-gray-400 font-normal">(Auto calculated)</span>
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={computedAge ? computedAge : 'Select Birthday to calculate'}
                className="input-field bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 font-semibold cursor-not-allowed"
              />
            </div>

            {/* 10. Nationality */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Nationality
              </label>
              <select
                value={form.nationality}
                onChange={(e) => handleChange('nationality', e.target.value)}
                className="input-field"
              >
                {DEFAULT_NATIONALITIES.map((nat) => (
                  <option key={nat} value={nat}>{nat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: ADDRESS INFORMATION */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700 text-primary-600 dark:text-primary-400 font-bold text-sm">
            <MapPin className="w-4 h-4" />
            <span>2. Address Information</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 11. Student State */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Student State
              </label>
              <input
                type="text"
                placeholder="e.g. Banaadir / Hirshabelle"
                value={form.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="input-field"
              />
            </div>

            {/* 12. Student Region */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Student Region
              </label>
              <select
                value={form.region}
                onChange={(e) => handleChange('region', e.target.value)}
                className="input-field"
              >
                {DEFAULT_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* 13. Student District */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Student District
              </label>
              <input
                type="text"
                placeholder="e.g. Hodan / Wadajir"
                value={form.district}
                onChange={(e) => handleChange('district', e.target.value)}
                className="input-field"
              />
            </div>

            {/* 14. Student Village */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Student Village
              </label>
              <input
                type="text"
                placeholder="e.g. Taleex / Digfer"
                value={form.village}
                onChange={(e) => handleChange('village', e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: ADDITIONAL INFORMATION */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700 text-primary-600 dark:text-primary-400 font-bold text-sm">
            <ShieldAlert className="w-4 h-4" />
            <span>3. Additional Information</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 15. Orphan Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Orphan Status
              </label>
              <select
                value={form.orphanStatus}
                onChange={(e) => handleChange('orphanStatus', e.target.value)}
                className="input-field"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            {/* 16. Disability Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Disability Status
              </label>
              <select
                value={form.disabilityStatus}
                onChange={(e) => handleChange('disabilityStatus', e.target.value)}
                className="input-field"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            {/* 17. Guardian Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Guardian Name
              </label>
              <input
                type="text"
                placeholder="Enter guardian full name"
                value={form.guardianName}
                onChange={(e) => handleChange('guardianName', e.target.value)}
                className="input-field"
              />
            </div>

            {/* 18. Guardian Telephone */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Guardian Telephone
              </label>
              <input
                type="tel"
                placeholder="e.g. +252 61 XXXXXXX"
                value={form.guardianPhone}
                onChange={(e) => handleChange('guardianPhone', e.target.value)}
                className="input-field"
              />
            </div>

            {/* 19. Refugee Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Refugee Status
              </label>
              <select
                value={form.refugeeStatus}
                onChange={(e) => handleChange('refugeeStatus', e.target.value)}
                className="input-field"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 4: SCHOOL INFORMATION */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700 text-primary-600 dark:text-primary-400 font-bold text-sm">
            <GraduationCap className="w-4 h-4" />
            <span>4. School Information</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 20. Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={form.schoolType}
                onChange={(e) => handleChange('schoolType', e.target.value)}
                className="input-field"
              >
                <option value="">Select Type</option>
                <option value="Primary">Primary</option>
                <option value="Secondary">Secondary</option>
              </select>
            </div>

            {/* 21. School Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                School Name
              </label>
              <input
                type="text"
                placeholder="e.g. Main Campus / Branch"
                value={form.schoolName}
                onChange={(e) => handleChange('schoolName', e.target.value)}
                className="input-field"
              />
            </div>

            {/* 22. Class Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Class Name
              </label>
              <select
                value={form.classId}
                onChange={(e) => handleChange('classId', e.target.value)}
                className="input-field"
              >
                <option value="">Select Class</option>
                {filteredClasses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.className} - {c.gradeLevel} ({c.academicYear})
                  </option>
                ))}
              </select>
            </div>

            {/* 23. Transfer Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Transfer Status
              </label>
              <select
                value={form.transferStatus}
                onChange={(e) => handleChange('transferStatus', e.target.value)}
                className="input-field"
              >
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 5: FEES */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700 text-primary-600 dark:text-primary-400 font-bold text-sm">
            <DollarSign className="w-4 h-4" />
            <span>5. Fees</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 24. Monthly Fee */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Monthly Fee ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.monthlyFee}
                onChange={(e) => handleChange('monthlyFee', e.target.value)}
                className={`input-field ${errors.monthlyFee ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.monthlyFee && <p className="text-xs text-red-500 mt-1">{errors.monthlyFee}</p>}
            </div>

            {/* 25. Admission Fee */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Admission Fee ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.admissionFee}
                onChange={(e) => handleChange('admissionFee', e.target.value)}
                className={`input-field ${errors.admissionFee ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.admissionFee && <p className="text-xs text-red-500 mt-1">{errors.admissionFee}</p>}
            </div>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-secondary w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : isEdit ? (
              'Update Student'
            ) : (
              'Create Student'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StudentFormModal;
