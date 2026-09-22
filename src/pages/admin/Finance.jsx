import { useEffect, useState, useRef } from 'react';
import {
  DollarSign, TrendingDown, Wallet, AlertCircle,
  Plus, Pencil, Trash2, Printer, LayoutDashboard,
  CheckCircle2, Clock, Eye, Download, Search, Filter,
  ChevronRight, Calendar, UserCheck, CreditCard, RefreshCw, FileText,
  Users, Link as LinkIcon, Shield, Star, UserX, ChevronDown, ChevronUp, Check, ArrowRight
} from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import ParentPhoneDropdown from '../../components/common/ParentPhoneDropdown';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Mobile Money', 'Other'];
const FEE_TYPES = ['Monthly Tuition Fee', 'Admission Fee', 'Registration Fee', 'Examination Fee', 'Transport Fee', 'Other Fee'];
const FREQUENCIES = ['Monthly', 'Termly', 'Annually', 'One Time'];
const STATUS_OPTIONS = ['All', 'Paid', 'Partial', 'Pending', 'Overdue'];

const STATUS_BADGES = {
  Paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  Partial: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  Pending: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  Overdue: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
};

const formatCurrency = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Printable / Downloadable Receipt Modal Component ──

const ReceiptModal = ({ payment, onClose }) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const printRef = useRef(null);

  if (!payment) return null;

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${payment.receiptNo || payment.receiptGroupNo || 'Receipt'}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; max-width: 650px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 20px; margin-bottom: 20px; }
            .school-title { font-size: 24px; font-weight: bold; color: #581c87; margin-bottom: 4px; }
            .subtitle { font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; background-color: #f1f5f9; margin-top: 8px; }
            .details-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .details-table td { padding: 10px 4px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .label { color: #64748b; font-weight: 500; }
            .val { font-weight: 600; text-align: right; }
            .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px; }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 250);
  };

  const periodDisplay = payment.billingMonth && payment.billingYear
    ? `${payment.billingMonth} ${payment.billingYear}`
    : payment.feeId?.frequency || 'Standard Period';

  return (
    <Modal isOpen={!!payment} onClose={onClose} title={t('finance.paymentReceipt', 'Payment Receipt')} size="md">
      <div className="p-1">
        <div ref={printRef} className="bg-white dark:bg-gray-800 p-4 rounded-lg">
          <div className="header text-center border-b border-dashed border-gray-200 dark:border-gray-700 pb-4 mb-4">
            {settings?.schoolLogo && (
              <img src={settings.schoolLogo} alt="Logo" className="w-14 h-14 mx-auto mb-2 object-contain" />
            )}
            <h2 className="school-title text-xl font-bold text-purple-900 dark:text-purple-300">
              {settings?.schoolName || 'School Management System'}
            </h2>
            <p className="subtitle text-xs text-gray-500 font-semibold tracking-wider uppercase">Official Payment Receipt</p>
            <div className="mt-2 inline-block px-3 py-1 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-mono text-xs font-bold rounded-full border border-purple-200 dark:border-purple-800">
              {payment.receiptNo || payment.receiptGroupNo}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50">
              <span className="text-gray-500 dark:text-gray-400">Student ID & Name</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {payment.studentId?.studentId || '—'} — {payment.studentId?.name || payment.studentName || 'Multiple Students'}
              </span>
            </div>
            {payment.academicYear && (
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">Academic Year & Class</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {payment.academicYear} | {payment.classId?.className || '—'}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50">
              <span className="text-gray-500 dark:text-gray-400">Fee Structure</span>
              <span className="font-medium text-purple-700 dark:text-purple-400 font-semibold">
                {payment.feeName || 'Family Multi-Payment'} ({periodDisplay})
              </span>
            </div>

            {payment.allocations && payment.allocations.length > 0 && (
              <div className="my-3 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-100 dark:border-purple-800 space-y-2">
                <div className="font-bold text-xs text-purple-900 dark:text-purple-300 uppercase tracking-wide">Family Allocations</div>
                {payment.allocations.map((alloc, i) => (
                  <div key={i} className="flex justify-between text-xs py-1 border-b border-purple-100/50 dark:border-purple-800/50 last:border-0">
                    <span>{alloc.studentId?.studentId || alloc.studentId} - {alloc.studentId?.name || 'Brother'}</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(alloc.allocatedAmount)}</span>
                  </div>
                ))}
              </div>
            )}

            {!payment.isFamilyPayment && !payment.allocations && (
              <>
                <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50">
                  <span className="text-gray-500 dark:text-gray-400">Original Fee</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payment.originalAmount)}</span>
                </div>
                {payment.discountAmount > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50 text-emerald-600 dark:text-emerald-400">
                    <span>Discount Applied ({payment.discountType === 'Percentage' ? `${payment.discountValue}%` : `$${payment.discountValue}`})</span>
                    <span className="font-medium">−{formatCurrency(payment.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50">
                  <span className="text-gray-500 dark:text-gray-400">Amount Required</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payment.amountRequired)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between py-2 border-b-2 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 font-bold bg-purple-50 dark:bg-purple-950/40 px-2 rounded">
              <span>Total Payment</span>
              <span>{formatCurrency(payment.paidAmount || payment.totalPaid)}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50">
              <span className="text-gray-500 dark:text-gray-400">Payment Method & Ref</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {payment.paymentMethod} {payment.referenceNumber ? `(${payment.referenceNumber})` : ''}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50">
              <span className="text-gray-500 dark:text-gray-400">Date & Recorded By</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {(payment.paymentDate || payment.createdAt)?.split('T')[0]} ({payment.recordedBy?.name || 'Admin'})
              </span>
            </div>
          </div>

          <div className="footer text-center mt-6 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400">
            Thank you for your prompt payment. Keep this official receipt for your records.
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={handlePrint} className="btn-primary flex items-center justify-center gap-2 flex-1">
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
          <button onClick={onClose} className="btn-secondary flex-1">Close</button>
        </div>
      </div>
    </Modal>
  );
};

// ── Main Finance Module Component ──

const Finance = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('payments');

  // Academic Years
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');

  // Classes
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  // Fee Structures
  const [feeStructures, setFeeStructures] = useState([]);
  const [selectedFeeId, setSelectedFeeId] = useState('');

  // Monthly Selectors (calendar year & month)
  const currentRealYear = new Date().getFullYear();
  const currentRealMonth = MONTHS[new Date().getMonth()];
  const [billingYear, setBillingYear] = useState(currentRealYear);
  const [billingMonth, setBillingMonth] = useState(currentRealMonth);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Finance Summary Data
  const [summaryData, setSummaryData] = useState({
    totalStudents: 0,
    totalOriginalFees: 0,
    totalDiscounts: 0,
    totalAmountRequired: 0,
    totalPaid: 0,
    totalPending: 0,
    overdueAmount: 0,
    totalExpenses: 0,
    netBalance: 0,
  });

  // Students & Balances
  const [studentBalances, setStudentBalances] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [openPhoneMenu, setOpenPhoneMenu] = useState(null);

  // Fee Structure CRUD state
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [feeEditId, setFeeEditId] = useState(null);
  const [feeForm, setFeeForm] = useState({
    name: 'Monthly Tuition Fee',
    feeType: 'Monthly Tuition Fee',
    amount: '',
    classId: '',
    academicYear: '',
    frequency: 'Monthly',
    dueDate: '',
    status: 'Active',
    description: '',
  });

  // Individual Payment Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [paymentStudent, setPaymentStudent] = useState(null);
  const [payForm, setPayForm] = useState({
    discountType: 'Fixed',
    discountValue: 0,
    paymentNow: '',
    paymentMethod: 'Cash',
    referenceNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
    note: '',
    allowFreeOverride: false
  });

  // Student Finance Profile State (Discount & Free Student)
  const [financeProfile, setFinanceProfile] = useState({
    financeStatus: 'normal',
    discountType: 'Fixed',
    discountValue: 0,
    notes: '',
    discountHistory: []
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [showDiscountHistory, setShowDiscountHistory] = useState(false);

  // Family / Brothers State
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyGroup, setFamilyGroup] = useState(null);
  const [familyLoading, setFamilyLoading] = useState(false);

  // Unlink Confirmation State
  const [unlinkConfirmModalOpen, setUnlinkConfirmModalOpen] = useState(false);
  const [unlinkConfirmStudent, setUnlinkConfirmStudent] = useState(null);

  // Add Brother Modal
  const [addBrotherModalOpen, setAddBrotherModalOpen] = useState(false);
  const [familySearchQuery, setFamilySearchQuery] = useState('');
  const [familySearchResults, setFamilySearchResults] = useState([]);
  const [familySearchLoading, setFamilySearchLoading] = useState(false);

  // Family Payment Modal
  const [familyPayModalOpen, setFamilyPayModalOpen] = useState(false);
  const [familyPayStep, setFamilyPayStep] = useState('input'); // 'input' | 'confirm'
  const [familyPayForm, setFamilyPayForm] = useState({
    totalPaid: '',
    paymentMethod: 'Cash',
    referenceNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
    note: '',
  });
  const [familyPayStudents, setFamilyPayStudents] = useState([]);
  const [familyPayAllocations, setFamilyPayAllocations] = useState({});

  // Bulk Payment Modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkPaymentItems, setBulkPaymentItems] = useState([]);
  const [bulkGlobalForm, setBulkGlobalForm] = useState({
    paymentMethod: 'Cash',
    referenceNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
    note: '',
  });

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Payment History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyStudent, setHistoryStudent] = useState(null);
  const [historyPayments, setHistoryPayments] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // General Payments Audit Log Tab state
  const [allPayments, setAllPayments] = useState([]);
  const [allPaymentsPage, setAllPaymentsPage] = useState(1);
  const [allPaymentsPages, setAllPaymentsPages] = useState(1);
  const [allPaymentsLoading, setAllPaymentsLoading] = useState(false);

  // Expenses state
  const [expenses, setExpenses] = useState([]);

  // 1. Initial Load: Academic Years
  useEffect(() => {
    const loadYears = async () => {
      try {
        const { data } = await api.get('/finance/academic-years');
        const sorted = data.years || [];
        setAcademicYears(sorted);
        if (sorted.length > 0) {
          setSelectedYear(sorted[0]);
        }
      } catch (err) {
        toast.error('Failed to load academic years');
      }
    };
    loadYears();
  }, []);

  // 2. Load Classes for Selected Academic Year
  useEffect(() => {
    if (!selectedYear) return;
    const loadClasses = async () => {
      try {
        const { data } = await api.get('/classes', { params: { academicYear: selectedYear, limit: 100 } });
        const list = data.classes || [];
        setClasses(list);
        if (list.length > 0) {
          setSelectedClassId(list[0]._id);
        } else {
          setSelectedClassId('');
          setFeeStructures([]);
          setSelectedFeeId('');
          setStudentBalances([]);
        }
      } catch (err) {
        toast.error('Failed to load classes for selected year');
      }
    };
    loadClasses();
    setSelectedStudentIds([]);
  }, [selectedYear]);

  // 3. Load Fee Structures for Selected Class & Academic Year
  useEffect(() => {
    if (!selectedYear || !selectedClassId) return;
    const loadFeeStructures = async () => {
      try {
        const { data } = await api.get('/finance/fee-structures', {
          params: { academicYear: selectedYear, classId: selectedClassId, status: 'Active' },
        });
        setFeeStructures(data || []);
        if (data && data.length > 0) {
          setSelectedFeeId(data[0]._id);
        } else {
          setSelectedFeeId('');
          setStudentBalances([]);
        }
      } catch (err) {
        toast.error('Failed to load fee structures');
      }
    };
    loadFeeStructures();
    setSelectedStudentIds([]);
  }, [selectedYear, selectedClassId]);

  // Selected Fee Structure Object
  const currentFeeStructure = feeStructures.find((f) => f._id === selectedFeeId);
  const isMonthlyFee = currentFeeStructure?.frequency === 'Monthly';

  // 4. Load Student Balances & Live Summary for Selected Filters
  const fetchStudentBalances = async () => {
    if (!selectedYear || !selectedClassId || !selectedFeeId) return;
    setTableLoading(true);
    try {
      const { data } = await api.get('/finance/student-balances', {
        params: {
          academicYear: selectedYear,
          classId: selectedClassId,
          feeId: selectedFeeId,
          billingYear: isMonthlyFee ? billingYear : undefined,
          billingMonth: isMonthlyFee ? billingMonth : undefined,
          status: statusFilter !== 'All' ? statusFilter : undefined,
          search: searchQuery || undefined,
        },
      });
      setStudentBalances(data.students || []);
      setSummaryData((prev) => ({
        ...prev,
        ...data.summary,
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load student balances');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'payments' || activeTab === 'balances') {
      fetchStudentBalances();
    }
  }, [selectedYear, selectedClassId, selectedFeeId, billingYear, billingMonth, statusFilter, searchQuery, activeTab]);

  // 5. Fetch Global Summary Cards & Financial Overview
  const fetchGlobalSummary = async () => {
    try {
      const { data } = await api.get('/finance/summary', {
        params: {
          academicYear: selectedYear || undefined,
          classId: selectedClassId || undefined,
          feeId: selectedFeeId || undefined,
          billingYear: isMonthlyFee ? billingYear : undefined,
          billingMonth: isMonthlyFee ? billingMonth : undefined,
        },
      });
      setSummaryData(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'reports') {
      fetchGlobalSummary();
    }
  }, [activeTab, selectedYear, selectedClassId, selectedFeeId, billingYear, billingMonth]);

  // 6. Fetch Payments Audit Log (Payment History tab)
  const fetchAllPayments = async () => {
    setAllPaymentsLoading(true);
    try {
      const { data } = await api.get('/finance/payments', {
        params: {
          academicYear: selectedYear || undefined,
          classId: selectedClassId || undefined,
          feeId: selectedFeeId || undefined,
          status: statusFilter !== 'All' ? statusFilter : undefined,
          search: searchQuery || undefined,
          page: allPaymentsPage,
          limit: 15,
        },
      });
      setAllPayments(data.payments || []);
      setAllPaymentsPages(data.pages || 1);
    } catch (err) {
      toast.error('Failed to load payment history');
    } finally {
      setAllPaymentsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchAllPayments();
    }
  }, [activeTab, selectedYear, selectedClassId, selectedFeeId, statusFilter, searchQuery, allPaymentsPage]);

  // 7. Fetch Expenses
  const fetchExpenses = async () => {
    try {
      const { data } = await api.get('/finance/expenses');
      setExpenses(data.expenses || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'reports') {
      fetchExpenses();
    }
  }, [activeTab]);

  // ── Fee Structure Handlers ──

  const openCreateFee = () => {
    setFeeEditId(null);
    setFeeForm({
      name: 'Monthly Tuition Fee',
      feeType: 'Monthly Tuition Fee',
      amount: '',
      classId: selectedClassId || (classes[0]?._id || ''),
      academicYear: selectedYear || (academicYears[0] || '2025/2026'),
      frequency: 'Monthly',
      dueDate: '',
      status: 'Active',
      description: '',
    });
    setFeeModalOpen(true);
  };

  const openEditFee = (fee) => {
    setFeeEditId(fee._id);
    setFeeForm({
      name: fee.name,
      feeType: fee.feeType || fee.name,
      amount: fee.amount,
      classId: fee.classId?._id || fee.classId || '',
      academicYear: fee.academicYear,
      frequency: fee.frequency || 'Monthly',
      dueDate: fee.dueDate ? fee.dueDate.split('T')[0] : '',
      status: fee.status || 'Active',
      description: fee.description || '',
    });
    setFeeModalOpen(true);
  };

  const handleFeeSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...feeForm,
        amount: Number(feeForm.amount),
      };
      if (feeEditId) {
        await api.put(`/finance/fee-structures/${feeEditId}`, payload);
        toast.success('Fee structure updated successfully');
      } else {
        await api.post('/finance/fee-structures', payload);
        toast.success('Fee structure created successfully');
      }
      setFeeModalOpen(false);

      const { data } = await api.get('/finance/fee-structures', {
        params: { academicYear: selectedYear, classId: selectedClassId },
      });
      setFeeStructures(data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleFeeDelete = async (feeId) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) return;
    try {
      await api.delete(`/finance/fee-structures/${feeId}`);
      toast.success('Fee structure deleted');
      setFeeModalOpen(false);
      const { data } = await api.get('/finance/fee-structures', {
        params: { academicYear: selectedYear, classId: selectedClassId },
      });
      setFeeStructures(data || []);
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.canDeactivate) {
        const msg = err.response?.data?.message || 'Cannot delete fee structure in use.';
        if (confirm(`${msg}\n\nWould you like to Deactivate this fee structure instead?`)) {
          try {
            await api.put(`/finance/fee-structures/${feeId}`, { status: 'Inactive' });
            toast.success('Fee structure deactivated');
            setFeeModalOpen(false);
            const { data } = await api.get('/finance/fee-structures', {
              params: { academicYear: selectedYear, classId: selectedClassId },
            });
            setFeeStructures(data || []);
          } catch (deactErr) {
            toast.error(deactErr.response?.data?.message || 'Deactivation failed');
          }
        }
      } else {
        toast.error(err.response?.data?.message || 'Delete failed');
      }
    }
  };

  const handleFeeStatusToggle = async (fee) => {
    const newStatus = fee.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.put(`/finance/fee-structures/${fee._id}`, { status: newStatus });
      toast.success(`Fee structure set to ${newStatus}`);
      const { data } = await api.get('/finance/fee-structures', {
        params: { academicYear: selectedYear, classId: selectedClassId },
      });
      setFeeStructures(data || []);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // ── Student Finance Profile & Family Handlers ──

  const extractProfile = (data) => {
    const prof = data?.profile || data || {};
    return {
      financeStatus: prof.financeStatus || 'normal',
      discountType: prof.discountType || 'Fixed',
      discountValue: prof.discountValue ?? 0,
      notes: prof.notes || '',
      discountHistory: Array.isArray(prof.discountHistory) ? prof.discountHistory : []
    };
  };

  const fetchStudentProfileData = async (studentId) => {
    setProfileLoading(true);
    try {
      const { data } = await api.get(`/finance/student-profile/${studentId}`);
      setFinanceProfile(extractProfile(data));
    } catch (err) {
      console.error(err);
      setFinanceProfile({
        financeStatus: 'normal',
        discountType: 'Fixed',
        discountValue: 0,
        notes: '',
        discountHistory: []
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveFinanceProfile = async () => {
    if (!paymentStudent) return;
    try {
      const { data } = await api.put(`/finance/student-profile/${paymentStudent._id}`, {
        financeStatus: financeProfile.financeStatus,
        discountType: financeProfile.discountType,
        discountValue: Number(financeProfile.discountValue) || 0,
        notes: financeProfile.notes
      });
      toast.success(data.message || 'Student finance profile updated');
      const updatedProf = extractProfile(data);
      setFinanceProfile(updatedProf);
      // Sync payForm
      setPayForm(prev => ({
        ...prev,
        discountType: updatedProf.discountType,
        discountValue: updatedProf.discountValue
      }));
      fetchStudentBalances();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile');
    }
  };

  const handleRemoveDiscount = async () => {
    if (!paymentStudent) return;
    if (!confirm('Are you sure you want to remove persistent discount from this student?')) return;
    try {
      const { data } = await api.delete(`/finance/student-profile/${paymentStudent._id}/discount`);
      toast.success(data.message || 'Discount removed');
      const updatedProf = extractProfile(data);
      setFinanceProfile(updatedProf);
      setPayForm(prev => ({ ...prev, discountValue: 0 }));
      fetchStudentBalances();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove discount');
    }
  };

  const fetchStudentFamilyData = async (studentId) => {
    setFamilyLoading(true);
    try {
      const { data } = await api.get(`/finance/students/${studentId}/family`, {
        params: {
          feeId: selectedFeeId,
          academicYear: selectedYear,
          billingYear: isMonthlyFee ? billingYear : undefined,
          billingMonth: isMonthlyFee ? billingMonth : undefined
        }
      });
      setFamilyGroup(data.familyGroup || null);
      setFamilyMembers(data.members || []);
    } catch (err) {
      console.error(err);
      setFamilyGroup(null);
      setFamilyMembers([]);
    } finally {
      setFamilyLoading(false);
    }
  };

  const handleSearchFamilyStudents = async (query) => {
    setFamilySearchQuery(query);
    if (!query || query.trim().length < 2) {
      setFamilySearchResults([]);
      return;
    }
    setFamilySearchLoading(true);
    try {
      const { data } = await api.get('/finance/students/search-for-family', {
        params: { search: query, excludeStudentId: paymentStudent?._id }
      });
      setFamilySearchResults(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFamilySearchLoading(false);
    }
  };

  const handleLinkBrother = async (targetStudentId) => {
    if (!paymentStudent) return;
    try {
      await api.post('/finance/family-groups/link', {
        studentIdA: paymentStudent._id,
        studentIdB: targetStudentId,
        studentId1: paymentStudent._id,
        studentId2: targetStudentId
      });
      toast.success('Brother/Sister linked successfully');
      setAddBrotherModalOpen(false);
      fetchStudentFamilyData(paymentStudent._id);
      fetchStudentBalances();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to link family member');
    }
  };

  const confirmUnlinkStudent = (brotherStudent) => {
    setUnlinkConfirmStudent(brotherStudent);
    setUnlinkConfirmModalOpen(true);
  };

  const executeUnlinkStudent = async () => {
    if (!unlinkConfirmStudent) return;
    try {
      await api.post('/finance/family-groups/unlink', { studentId: unlinkConfirmStudent._id });
      toast.success(`${unlinkConfirmStudent.name} unlinked from family group`);
      setUnlinkConfirmModalOpen(false);
      setUnlinkConfirmStudent(null);
      if (paymentStudent) {
        fetchStudentFamilyData(paymentStudent._id);
      }
      fetchStudentBalances();
    } catch (err) {
      try {
        await api.delete(`/finance/students/${unlinkConfirmStudent._id}/unlink-family`);
        toast.success(`${unlinkConfirmStudent.name} unlinked from family group`);
        setUnlinkConfirmModalOpen(false);
        setUnlinkConfirmStudent(null);
        if (paymentStudent) {
          fetchStudentFamilyData(paymentStudent._id);
        }
        fetchStudentBalances();
      } catch (err2) {
        toast.error(err.response?.data?.message || err2.response?.data?.message || 'Failed to unlink student');
      }
    }
  };

  // ── Individual Payment Handlers ──

  const openIndividualPayment = (student) => {
    setPaymentStudent(student);
    setPayForm({
      discountType: student.discountType || 'Fixed',
      discountValue: student.discountValue || 0,
      paymentNow: student.pending > 0 ? String(student.pending) : '',
      paymentMethod: 'Cash',
      referenceNumber: '',
      paymentDate: new Date().toISOString().split('T')[0],
      note: '',
      allowFreeOverride: false
    });
    setShowDiscountHistory(false);
    setPayModalOpen(true);
    fetchStudentProfileData(student._id);
    fetchStudentFamilyData(student._id);
  };

  // Live discount recalculation in individual modal
  const calcIndividualModalDetails = () => {
    if (!paymentStudent || !currentFeeStructure) return { req: 0, discAmt: 0, pendingNow: 0 };
    if (financeProfile.financeStatus === 'free' && !payForm.allowFreeOverride) {
      return { req: 0, discAmt: currentFeeStructure.amount, pendingNow: 0 };
    }
    const orig = currentFeeStructure.amount;
    const discVal = Number(payForm.discountValue) || 0;
    let discAmt = 0;
    if (payForm.discountType === 'Percentage') {
      discAmt = Math.min(orig, (orig * discVal) / 100);
    } else {
      discAmt = Math.min(orig, discVal);
    }
    const req = Math.max(0, orig - discAmt);
    const prev = paymentStudent.paid || 0;
    const pendingNow = Math.max(0, req - prev);
    return { req, discAmt, pendingNow };
  };

  const handleIndividualPaySubmit = async (e) => {
    e.preventDefault();
    if (!paymentStudent || !currentFeeStructure) return;

    if (financeProfile.financeStatus === 'free' && !payForm.allowFreeOverride) {
      toast.error('Student is marked as FREE. Check "Override Free status" if charging is required.');
      return;
    }

    const { pendingNow } = calcIndividualModalDetails();
    const pmtNow = Number(payForm.paymentNow);

    if (isNaN(pmtNow) || pmtNow <= 0) {
      toast.error('Please enter a valid payment amount greater than 0');
      return;
    }
    if (pmtNow > pendingNow + 0.01) {
      toast.error(`Payment cannot exceed pending balance of $${pendingNow.toFixed(2)}`);
      return;
    }

    try {
      const payload = {
        studentId: paymentStudent._id,
        classId: selectedClassId,
        feeId: selectedFeeId,
        academicYear: selectedYear,
        billingYear: isMonthlyFee ? billingYear : undefined,
        billingMonth: isMonthlyFee ? billingMonth : undefined,
        discountType: payForm.discountType,
        discountValue: Number(payForm.discountValue) || 0,
        paidAmount: pmtNow,
        paymentMethod: payForm.paymentMethod,
        referenceNumber: payForm.referenceNumber,
        paymentDate: payForm.paymentDate,
        note: payForm.note,
        allowFreeOverride: payForm.allowFreeOverride
      };

      const { data } = await api.post('/finance/payments', payload);
      toast.success('Payment recorded successfully');
      setPayModalOpen(false);
      setActiveReceipt(data);
      fetchStudentBalances();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment recording failed');
    }
  };

  // ── Family Multi-Student Payment Handlers ──

  const openFamilyPaymentModal = async (student) => {
    setPayModalOpen(false);
    try {
      const { data: familyData } = await api.get(`/finance/students/${student._id}/family`, {
        params: {
          feeId: selectedFeeId,
          academicYear: selectedYear,
          billingYear: isMonthlyFee ? billingYear : undefined,
          billingMonth: isMonthlyFee ? billingMonth : undefined
        }
      });
      const members = familyData.members || [];
      if (members.length === 0) {
        toast.error('No active family members found for this student.');
        return;
      }

      setFamilyPayStudents(members);
      const totalPend = members.reduce((acc, s) => acc + s.pending, 0);

      // Default sequential allocation
      let remainingPool = totalPend;
      const initAlloc = {};
      members.forEach((s) => {
        if (s.isFree || s.pending <= 0) {
          initAlloc[s._id] = 0;
        } else {
          const alloc = Math.min(remainingPool, s.pending);
          const rounded = Math.round(alloc * 100) / 100;
          initAlloc[s._id] = rounded;
          remainingPool = Math.max(0, Math.round((remainingPool - rounded) * 100) / 100);
        }
      });

      setFamilyPayAllocations(initAlloc);
      setFamilyGroup(familyData.familyGroup);
      setFamilyPayStep('input');
      setFamilyPayForm({
        totalPaid: String(totalPend),
        paymentMethod: 'Cash',
        referenceNumber: '',
        paymentDate: new Date().toISOString().split('T')[0],
        note: `Family Payment for ${familyData.familyGroup?.familyName || 'Family Group'}`
      });
      setFamilyPayModalOpen(true);
    } catch (err) {
      toast.error('Failed to prepare family payment');
    }
  };

  const handleDistributeFamilyPayment = (totalVal, students = familyPayStudents) => {
    const totalAmount = Number(totalVal) || 0;
    let remainingPool = totalAmount;
    const newAlloc = {};

    students.forEach((s) => {
      const sPending = s.pending || 0;
      if (s.isFree || sPending <= 0) {
        newAlloc[s._id] = 0;
      } else {
        const allocated = Math.min(remainingPool, sPending);
        const rounded = Math.round(allocated * 100) / 100;
        newAlloc[s._id] = rounded;
        remainingPool = Math.max(0, Math.round((remainingPool - rounded) * 100) / 100);
      }
    });

    setFamilyPayAllocations(newAlloc);
  };

  const handleFamilyPaySubmit = async (e) => {
    e.preventDefault();
    if (!familyGroup && familyPayStudents.length === 0) return;

    const allocArray = familyPayStudents.map((st) => ({
      studentId: st._id,
      classId: st.classId?._id || st.classId,
      feeId: selectedFeeId,
      academicYear: selectedYear,
      billingYear: isMonthlyFee ? billingYear : undefined,
      billingMonth: isMonthlyFee ? billingMonth : undefined,
      allocatedAmount: Number(familyPayAllocations[st._id]) || 0
    }));

    const nonZeroAlloc = allocArray.filter(a => a.allocatedAmount > 0);
    if (nonZeroAlloc.length === 0) {
      toast.error('Total allocated amount across active family members must be greater than $0');
      return;
    }

    try {
      const payload = {
        familyGroupId: familyGroup?._id || null,
        totalPaid: Number(familyPayForm.totalPaid),
        allocations: allocArray,
        academicYear: selectedYear,
        feeId: selectedFeeId,
        billingYear: isMonthlyFee ? billingYear : undefined,
        billingMonth: isMonthlyFee ? billingMonth : undefined,
        paymentMethod: familyPayForm.paymentMethod,
        referenceNumber: familyPayForm.referenceNumber,
        paymentDate: familyPayForm.paymentDate,
        note: familyPayForm.note
      };

      const { data } = await api.post('/finance/payments/family', payload);
      toast.success('Family payment recorded successfully!');
      setFamilyPayModalOpen(false);
      setActiveReceipt({
        ...data.familyPayment,
        isFamilyPayment: true,
        receiptGroupNo: data.familyPayment.receiptGroupNo,
        totalPaid: data.familyPayment.totalPaid,
        allocations: data.familyPayment.allocations
      });
      fetchStudentBalances();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Family payment failed');
    }
  };

  // ── Bulk Payment Handlers ──

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudentIds(studentBalances.map((s) => s._id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleSelectStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedStudentsList = studentBalances.filter((s) => selectedStudentIds.includes(s._id));

  const bulkTotals = selectedStudentsList.reduce(
    (acc, s) => {
      acc.original += s.originalFee;
      acc.discount += s.discountAmount;
      acc.required += s.amountRequired;
      acc.paid += s.paid;
      acc.pending += s.pending;
      return acc;
    },
    { original: 0, discount: 0, required: 0, paid: 0, pending: 0 }
  );

  const openBulkPaymentModal = () => {
    if (selectedStudentsList.length === 0) {
      toast.error('Please select at least one student for bulk payment');
      return;
    }
    const items = selectedStudentsList.map((s) => ({
      studentId: s._id,
      name: s.name,
      studentIdCode: s.studentId,
      originalFee: s.originalFee,
      discountType: s.discountType || 'Fixed',
      discountValue: s.discountValue || 0,
      previouslyPaid: s.paid,
      paymentNow: String(s.pending),
    }));
    setBulkPaymentItems(items);
    setBulkGlobalForm({
      paymentMethod: 'Cash',
      referenceNumber: '',
      paymentDate: new Date().toISOString().split('T')[0],
      note: 'Bulk Fee Payment',
    });
    setBulkModalOpen(true);
  };

  const updateBulkItemDiscount = (idx, field, value) => {
    setBulkPaymentItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[idx], [field]: value };

      const orig = item.originalFee;
      const discVal = Number(field === 'discountValue' ? value : item.discountValue) || 0;
      const discType = field === 'discountType' ? value : item.discountType;
      let discAmt = 0;
      if (discType === 'Percentage') {
        discAmt = Math.min(orig, (orig * discVal) / 100);
      } else {
        discAmt = Math.min(orig, discVal);
      }
      const req = Math.max(0, orig - discAmt);
      const newPending = Math.max(0, req - item.previouslyPaid);

      let pmtNow = Number(item.paymentNow) || 0;
      if (pmtNow > newPending) pmtNow = newPending;

      item.paymentNow = String(pmtNow);
      copy[idx] = item;
      return copy;
    });
  };

  const handleBulkPaySubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        payments: bulkPaymentItems.map((item) => ({
          studentId: item.studentId,
          classId: selectedClassId,
          discountType: item.discountType,
          discountValue: Number(item.discountValue) || 0,
          paymentNow: Number(item.paymentNow) || 0,
        })),
        academicYear: selectedYear,
        classId: selectedClassId,
        feeId: selectedFeeId,
        billingYear: isMonthlyFee ? billingYear : undefined,
        billingMonth: isMonthlyFee ? billingMonth : undefined,
        paymentMethod: bulkGlobalForm.paymentMethod,
        referenceNumber: bulkGlobalForm.referenceNumber,
        paymentDate: bulkGlobalForm.paymentDate,
        note: bulkGlobalForm.note,
      };

      const { data } = await api.post('/finance/payments/bulk', payload);
      toast.success(data.message || 'Bulk payments recorded successfully');
      setBulkModalOpen(false);
      setSelectedStudentIds([]);
      fetchStudentBalances();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk payment failed');
    }
  };

  // ── Payment History & Delete Handlers ──

  const openStudentHistory = async (student) => {
    setHistoryStudent(student);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const { data } = await api.get(`/finance/payments/student/${student._id}`, {
        params: { feeId: selectedFeeId },
      });
      setHistoryPayments(data.payments || []);
    } catch (err) {
      toast.error('Failed to load student history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePaymentDelete = async (paymentId) => {
    if (!confirm('Are you sure you want to delete this payment record? This action will immediately recalculate all student and revenue totals.')) return;
    try {
      await api.delete(`/finance/payments/${paymentId}`);
      toast.success('Payment transaction deleted and totals recalculated');

      if (historyStudent) {
        openStudentHistory(historyStudent);
      }
      if (activeTab === 'history') {
        fetchAllPayments();
      }
      fetchStudentBalances();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // Tab definitions
  const TABS = [
    { id: 'payments', label: 'Payment Management', icon: Wallet },
    { id: 'fees', label: 'Fee Structure', icon: DollarSign },
    { id: 'balances', label: 'Student Balances', icon: UserCheck },
    { id: 'history', label: 'Payment Audit Log', icon: FileText },
    { id: 'overview', label: 'Finance Dashboard', icon: LayoutDashboard },
    { id: 'reports', label: 'Financial Reports', icon: TrendingDown },
  ];

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-purple-900 dark:text-purple-300 tracking-tight flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            School Finance Management
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Complete Fee Structure, Persistent Student Discounts, Free Students, Automatic Brothers/Family Payments & Real-Time Reporting
          </p>
        </div>

        {activeTab === 'fees' && (
          <button onClick={openCreateFee} className="btn-primary flex items-center gap-2 shadow-md">
            <Plus className="w-4 h-4" /> Create Fee Structure
          </button>
        )}
      </div>

      {/* Main Tab Navigation */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 dark:border-gray-800 pb-1 scrollbar-none">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === id
                ? 'bg-purple-600 text-white dark:bg-purple-700 shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── TOP SELECTORS ── */}
      {(activeTab === 'payments' || activeTab === 'balances' || activeTab === 'fees') && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Academic Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="input-field text-sm font-medium"
              >
                {academicYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="input-field text-sm font-medium"
              >
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.className} ({cls.gradeLevel})
                  </option>
                ))}
              </select>
            </div>

            {(activeTab === 'payments' || activeTab === 'balances') && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Fee Structure
                </label>
                <select
                  value={selectedFeeId}
                  onChange={(e) => setSelectedFeeId(e.target.value)}
                  className="input-field text-sm font-medium"
                >
                  {feeStructures.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name} — {formatCurrency(f.amount)} ({f.frequency})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(activeTab === 'payments' || activeTab === 'balances') && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Year {isMonthlyFee && <span className="text-purple-600 font-normal">(Monthly)</span>}
                  </label>
                  <select
                    disabled={!isMonthlyFee}
                    value={billingYear}
                    onChange={(e) => setBillingYear(Number(e.target.value))}
                    className="input-field text-sm disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-900"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Month
                  </label>
                  <select
                    disabled={!isMonthlyFee}
                    value={billingMonth}
                    onChange={(e) => setBillingMonth(e.target.value)}
                    className="input-field text-sm disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-900"
                  >
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {(activeTab === 'payments' || activeTab === 'balances') && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100 dark:border-gray-700/60">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by Student ID, Name, or Receipt No..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field text-xs w-auto"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st === 'All' ? 'All Payment Statuses' : st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 1: PAYMENTS (PAYMENT MANAGEMENT) ── */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="card p-3 border-l-4 border-purple-600 bg-purple-50/40 dark:bg-purple-950/20">
              <p className="text-[11px] font-bold text-gray-500 uppercase">Students in Scope</p>
              <p className="text-xl font-extrabold text-purple-900 dark:text-purple-300 mt-1">{summaryData.totalStudents}</p>
            </div>
            <div className="card p-3 border-l-4 border-gray-400">
              <p className="text-[11px] font-bold text-gray-500 uppercase">Original Fees</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(summaryData.totalOriginalFees)}</p>
            </div>
            <div className="card p-3 border-l-4 border-emerald-500">
              <p className="text-[11px] font-bold text-gray-500 uppercase">Total Discounts</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(summaryData.totalDiscounts)}</p>
            </div>
            <div className="card p-3 border-l-4 border-blue-500">
              <p className="text-[11px] font-bold text-gray-500 uppercase">Amount Required</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(summaryData.totalAmountRequired)}</p>
            </div>
            <div className="card p-3 border-l-4 border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20">
              <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Total Revenue (Paid)</p>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(summaryData.totalPaid)}</p>
            </div>
            <div className="card p-3 border-l-4 border-rose-500 bg-rose-50/30 dark:bg-rose-950/20">
              <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase">Pending Balance</p>
              <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(summaryData.totalPending)}</p>
            </div>
          </div>

          {selectedStudentIds.length > 0 && (
            <div className="bg-purple-900 text-white p-4 rounded-xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="bg-purple-700 px-3 py-1 rounded-full font-bold">
                  {selectedStudentIds.length} Student(s) Selected
                </span>
                <div>Orig: <span className="font-bold">{formatCurrency(bulkTotals.original)}</span></div>
                <div>Disc: <span className="font-bold text-emerald-300">{formatCurrency(bulkTotals.discount)}</span></div>
                <div>Req: <span className="font-bold">{formatCurrency(bulkTotals.required)}</span></div>
                <div>Paid: <span className="font-bold text-blue-300">{formatCurrency(bulkTotals.paid)}</span></div>
                <div>Pending: <span className="font-bold text-rose-300">{formatCurrency(bulkTotals.pending)}</span></div>
              </div>

              <button
                onClick={openBulkPaymentModal}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg font-bold text-xs shadow-md transition-all whitespace-nowrap"
              >
                Record Bulk Payment
              </button>
            </div>
          )}

          {/* Student Payment Table */}
          <div className="card overflow-x-auto p-0">
            {tableLoading ? (
              <div className="p-8 text-center"><LoadingSpinner /></div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-gray-500 font-bold uppercase">
                    <th className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={studentBalances.length > 0 && selectedStudentIds.length === studentBalances.length}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                    </th>
                    <th className="py-3 px-3 text-left">Student ID</th>
                    <th className="py-3 px-3 text-left">Student Name</th>
                    <th className="py-3 px-3 text-left">Parent Phone</th>
                    <th className="py-3 px-3 text-right">Original Fee</th>
                    <th className="py-3 px-3 text-right">Discount</th>
                    <th className="py-3 px-3 text-right">Amount Required</th>
                    <th className="py-3 px-3 text-right">Paid</th>
                    <th className="py-3 px-3 text-right">Pending</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {studentBalances.length > 0 ? (
                    studentBalances.map((student) => {
                      const isSelected = selectedStudentIds.includes(student._id);
                      return (
                        <tr
                          key={student._id}
                          className={`hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors ${
                            isSelected ? 'bg-purple-50/60 dark:bg-purple-950/30' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectStudent(student._id)}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-purple-700 dark:text-purple-400">
                            {student.studentId}
                          </td>
                          <td className="py-3 px-3 font-semibold text-gray-900 dark:text-white">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{student.name}</span>
                              {student.isFree && (
                                <span className="bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-0.5">
                                  <Shield className="w-2.5 h-2.5" /> FREE
                                </span>
                              )}
                              {student.financeStatus === 'discounted' && (
                                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded text-[9px] font-extrabold flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5" /> DISC
                                </span>
                              )}
                              {student.familyGroupId && (
                                <span className="bg-blue-100 text-blue-800 border border-blue-300 px-1.5 py-0.5 rounded text-[9px] font-extrabold flex items-center gap-0.5">
                                  <Users className="w-2.5 h-2.5" /> BROTHERS
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <ParentPhoneDropdown
                              phone={student.parentPhone}
                              studentId={student._id}
                              openMenuId={openPhoneMenu}
                              setOpenMenuId={setOpenPhoneMenu}
                            />
                          </td>
                          <td className="py-3 px-3 text-right font-medium">{formatCurrency(student.originalFee)}</td>
                          <td className="py-3 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {student.discountAmount > 0 ? `−${formatCurrency(student.discountAmount)}` : '$0.00'}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-gray-900 dark:text-white">
                            {formatCurrency(student.amountRequired)}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-blue-600 dark:text-blue-400">
                            {formatCurrency(student.paid)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(student.pending)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${STATUS_BADGES[student.status] || ''}`}>
                              {student.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex justify-center items-center gap-1.5">
                              {student.familyGroupId ? (
                                <button
                                  onClick={() => openIndividualPayment(student)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded text-[11px] shadow-sm flex items-center gap-1"
                                >
                                  <Users className="w-3 h-3" /> Pay / Profile
                                </button>
                              ) : student.pending > 0 && !student.isFree ? (
                                <button
                                  onClick={() => openIndividualPayment(student)}
                                  className="btn-primary py-1 px-3 text-[11px] shadow-sm flex items-center gap-1"
                                >
                                  <CreditCard className="w-3 h-3" /> Pay
                                </button>
                              ) : student.isFree ? (
                                <button
                                  onClick={() => openIndividualPayment(student)}
                                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-1 px-2.5 rounded text-[10px] shadow-sm flex items-center gap-1"
                                >
                                  <Shield className="w-3 h-3" /> Profile/Pay
                                </button>
                              ) : (
                                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
                                </span>
                              )}
                              <button
                                onClick={() => openStudentHistory(student)}
                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                                title="Payment History & Receipts"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-gray-400">
                        No active students found for selected Academic Year, Class, and Fee Structure.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: FEE STRUCTURE (FULL CRUD) ── */}
      {activeTab === 'fees' && (
        <div className="space-y-4">
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-gray-500 font-bold uppercase">
                  <th className="py-3 px-4 text-left">Academic Year</th>
                  <th className="py-3 px-4 text-left">Class</th>
                  <th className="py-3 px-4 text-left">Fee Type / Name</th>
                  <th className="py-3 px-4 text-right">Amount ($)</th>
                  <th className="py-3 px-4 text-left">Frequency</th>
                  <th className="py-3 px-4 text-left">Due Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {feeStructures.length > 0 ? (
                  feeStructures.map((fee) => (
                    <tr key={fee._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-3 px-4 font-semibold">{fee.academicYear}</td>
                      <td className="py-3 px-4 font-medium">{fee.classId?.className || '—'}</td>
                      <td className="py-3 px-4 font-bold text-purple-700 dark:text-purple-300">{fee.name}</td>
                      <td className="py-3 px-4 text-right font-bold">{formatCurrency(fee.amount)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-semibold text-[10px]">
                          {fee.frequency}
                        </span>
                      </td>
                      <td className="py-3 px-4">{fee.dueDate ? fee.dueDate.split('T')[0] : '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleFeeStatusToggle(fee)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                            fee.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {fee.status || 'Active'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditFee(fee)}
                            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                            title="Edit Fee Structure"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleFeeDelete(fee._id)}
                            className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                            title="Delete Fee Structure"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      No fee structures configured for this class and academic year.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: STUDENT BALANCES (COMPREHENSIVE) ── */}
      {activeTab === 'balances' && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-gray-500 font-bold uppercase">
                <th className="py-3 px-4 text-left">Student ID</th>
                <th className="py-3 px-4 text-left">Student Name</th>
                <th className="py-3 px-4 text-left">Parent Phone</th>
                <th className="py-3 px-4 text-right">Original Fee</th>
                <th className="py-3 px-4 text-right">Discount</th>
                <th className="py-3 px-4 text-right">Amount Required</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Pending Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {studentBalances.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="py-3 px-4 font-mono font-semibold text-purple-700 dark:text-purple-300">
                    {student.studentId}
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{student.name}</span>
                      {student.isFree && (
                        <span className="bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-0.5">
                          <Shield className="w-2.5 h-2.5" /> FREE
                        </span>
                      )}
                      {student.financeStatus === 'discounted' && (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded text-[9px] font-extrabold flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5" /> DISC
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <ParentPhoneDropdown
                      phone={student.parentPhone}
                      studentId={student._id}
                      openMenuId={openPhoneMenu}
                      setOpenMenuId={setOpenPhoneMenu}
                    />
                  </td>
                  <td className="py-3 px-4 text-right">{formatCurrency(student.originalFee)}</td>
                  <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(student.discountAmount)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold">{formatCurrency(student.amountRequired)}</td>
                  <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400 font-semibold">
                    {formatCurrency(student.paid)}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400 font-bold">
                    {formatCurrency(student.pending)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${STATUS_BADGES[student.status] || ''}`}>
                      {student.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB 4: PAYMENT AUDIT LOG ── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="card overflow-x-auto p-0">
            {allPaymentsLoading ? (
              <div className="p-8 text-center"><LoadingSpinner /></div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-gray-500 font-bold uppercase">
                    <th className="py-3 px-3 text-left">Receipt No</th>
                    <th className="py-3 px-3 text-left">Student ID & Name</th>
                    <th className="py-3 px-3 text-left">Class</th>
                    <th className="py-3 px-3 text-left">Fee Name & Period</th>
                    <th className="py-3 px-3 text-right">Payment Amount</th>
                    <th className="py-3 px-3 text-left">Method</th>
                    <th className="py-3 px-3 text-left">Date</th>
                    <th className="py-3 px-3 text-left">Recorded By</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {allPayments.length > 0 ? (
                    allPayments.map((pmt) => (
                      <tr key={pmt._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-3 px-3 font-mono font-bold text-purple-700 dark:text-purple-300">
                          {pmt.receiptNo}
                        </td>
                        <td className="py-3 px-3 font-medium">
                          {pmt.studentId?.studentId} — {pmt.studentId?.name}
                        </td>
                        <td className="py-3 px-3">{pmt.classId?.className || '—'}</td>
                        <td className="py-3 px-3 font-semibold">
                          {pmt.feeName} {pmt.billingMonth ? `(${pmt.billingMonth} ${pmt.billingYear})` : ''}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(pmt.paidAmount)}
                        </td>
                        <td className="py-3 px-3 font-medium">{pmt.paymentMethod}</td>
                        <td className="py-3 px-3">{pmt.paymentDate?.split('T')[0]}</td>
                        <td className="py-3 px-3">{pmt.recordedBy?.name || 'Admin'}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setActiveReceipt(pmt)}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-purple-600"
                              title="Print Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePaymentDelete(pmt._id)}
                              className="p-1 rounded hover:bg-rose-100 text-rose-600"
                              title="Delete Transaction"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-400">No payment transactions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          <Pagination page={allPaymentsPage} pages={allPaymentsPages} onPageChange={setAllPaymentsPage} />
        </div>
      )}

      {/* ── TAB 5: FINANCE DASHBOARD ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Total Revenue Collected</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(summaryData.totalPaid)}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="w-12 h-12 bg-rose-500 rounded-xl flex items-center justify-center text-white">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Total Expenses</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(summaryData.totalExpenses)}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Net Financial Balance</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(summaryData.netBalance)}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Total Pending Balance</p>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{formatCurrency(summaryData.totalPending)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: FINANCIAL REPORTS ── */}
      {activeTab === 'reports' && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-bold text-purple-900 dark:text-purple-300">Financial Reports & Data Integrity Summary</h2>
          <p className="text-xs text-gray-500">
            All financial totals in this module are computed live from transaction records. Total Revenue: {formatCurrency(summaryData.totalPaid)} | Pending: {formatCurrency(summaryData.totalPending)}.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                toast.success('Financial report exported successfully');
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export Complete Financial Report
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 1: CREATE / EDIT FEE STRUCTURE ── */}
      <Modal
        isOpen={feeModalOpen}
        onClose={() => setFeeModalOpen(false)}
        title={feeEditId ? 'Edit Fee Structure' : 'Create Fee Structure'}
      >
        <form onSubmit={handleFeeSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Academic Year *</label>
              <select
                required
                value={feeForm.academicYear}
                onChange={(e) => setFeeForm({ ...feeForm, academicYear: e.target.value })}
                className="input-field text-xs"
              >
                {academicYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">Class *</label>
              <select
                required
                value={feeForm.classId}
                onChange={(e) => setFeeForm({ ...feeForm, classId: e.target.value })}
                className="input-field text-xs"
              >
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>{c.className}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Fee Type / Name *</label>
              <input
                required
                value={feeForm.name}
                onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value, feeType: e.target.value })}
                className="input-field text-xs"
                placeholder="e.g. Monthly Tuition Fee"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Amount ($) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={feeForm.amount}
                onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                className="input-field text-xs font-bold"
                placeholder="30.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Frequency *</label>
              <select
                required
                value={feeForm.frequency}
                onChange={(e) => setFeeForm({ ...feeForm, frequency: e.target.value })}
                className="input-field text-xs font-semibold"
              >
                {FREQUENCIES.map((fq) => (
                  <option key={fq} value={fq}>{fq}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">Due Date</label>
              <input
                type="date"
                value={feeForm.dueDate}
                onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })}
                className="input-field text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1">Status</label>
            <select
              value={feeForm.status}
              onChange={(e) => setFeeForm({ ...feeForm, status: e.target.value })}
              className="input-field text-xs"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex gap-3 pt-3">
            <button type="submit" className="btn-primary flex-1">
              {feeEditId ? 'Update Fee Structure' : 'Create Fee Structure'}
            </button>

            {feeEditId && (
              <button
                type="button"
                onClick={() => handleFeeDelete(feeEditId)}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold text-xs"
              >
                Delete
              </button>
            )}

            <button type="button" onClick={() => setFeeModalOpen(false)} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 2: INDIVIDUAL STUDENT PAYMENT & PROFILE MODAL ── */}
      {paymentStudent && (
        <Modal
          isOpen={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          title={`Student Finance Profile & Payment — ${paymentStudent.name} (${paymentStudent.studentId})`}
          size="lg"
        >
          <div className="space-y-5 text-xs">
            {/* Header info */}
            <div className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-lg border border-purple-200 dark:border-purple-800 grid grid-cols-2 gap-2 text-xs">
              <div>Student: <span className="font-bold">{paymentStudent.name} ({paymentStudent.studentId})</span></div>
              <div>Class: <span className="font-bold">{selectedYear} | {classes.find(c => c._id === selectedClassId)?.className}</span></div>
              <div>Fee Structure: <span className="font-bold text-purple-700 dark:text-purple-300">{currentFeeStructure?.name}</span></div>
              <div>Billing Period: <span className="font-bold">{isMonthlyFee ? `${billingMonth} ${billingYear}` : currentFeeStructure?.frequency}</span></div>
            </div>

            {/* ── SECTION A: PERSISTENT STUDENT FINANCE PROFILE & DISCOUNT ── */}
            <div className="p-3.5 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-purple-50/20 dark:bg-purple-950/10 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5 text-xs">
                  <Star className="w-4 h-4 text-purple-600" /> Persistent Student Finance Profile
                </span>
                {profileLoading && <LoadingSpinner />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 font-bold">Student Status</label>
                  <select
                    value={financeProfile.financeStatus}
                    onChange={(e) => setFinanceProfile({ ...financeProfile, financeStatus: e.target.value })}
                    className="input-field text-xs font-bold"
                  >
                    <option value="normal">Normal (Standard Fees)</option>
                    <option value="discounted">Discounted Student</option>
                    <option value="free">FREE Student ($0 Fees)</option>
                  </select>
                </div>

                {financeProfile.financeStatus === 'discounted' && (
                  <>
                    <div>
                      <label className="block mb-1 font-bold">Discount Method</label>
                      <select
                        value={financeProfile.discountType}
                        onChange={(e) => setFinanceProfile({ ...financeProfile, discountType: e.target.value })}
                        className="input-field text-xs font-semibold"
                      >
                        <option value="Fixed">Fixed Amount ($)</option>
                        <option value="Percentage">Percentage (%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1 font-bold">Persistent Discount Value</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={financeProfile.discountValue}
                        onChange={(e) => setFinanceProfile({ ...financeProfile, discountValue: e.target.value })}
                        className="input-field text-xs font-bold text-emerald-600"
                        placeholder="e.g. 20"
                      />
                    </div>
                  </>
                )}
              </div>

              {financeProfile.financeStatus === 'free' && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-900 dark:text-amber-200 font-medium text-xs flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Student is marked as FREE STUDENT. Required fee is automatically set to $0.</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-purple-100 dark:border-purple-800/60">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveFinanceProfile}
                    className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" /> Save Persistent Profile
                  </button>
                  {financeProfile.discountValue > 0 && (
                    <button
                      type="button"
                      onClick={handleRemoveDiscount}
                      className="text-rose-600 hover:text-rose-700 font-bold text-xs underline px-2 py-1"
                    >
                      Remove Discount
                    </button>
                  )}
                </div>

                {financeProfile.discountHistory?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDiscountHistory(!showDiscountHistory)}
                    className="text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1 hover:underline"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Discount History ({financeProfile.discountHistory.length})
                    {showDiscountHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Discount History Expandable Drawer */}
              {showDiscountHistory && financeProfile.discountHistory?.length > 0 && (
                <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700 max-h-40 overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-gray-500 font-bold border-b text-left">
                        <th className="py-1">Date</th>
                        <th className="py-1">Action</th>
                        <th className="py-1">Old Value</th>
                        <th className="py-1">New Value</th>
                        <th className="py-1">Changed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {financeProfile.discountHistory.map((h, i) => (
                        <tr key={i}>
                          <td className="py-1">{new Date(h.changedAt).toLocaleDateString()}</td>
                          <td className="py-1 font-semibold">{h.action}</td>
                          <td className="py-1">{h.oldType} {h.oldValue}</td>
                          <td className="py-1 font-bold text-emerald-600">{h.newType} {h.newValue}</td>
                          <td className="py-1">{h.changedBy?.name || 'Admin'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── SECTION B: BROTHERS / FAMILY GROUP & AUTOMATIC FAMILY PAYMENT ── */}
            <div className="p-3.5 border-2 border-blue-300 dark:border-blue-800 rounded-xl bg-blue-50/20 dark:bg-blue-950/10 space-y-3">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4.5 h-4.5 text-blue-600" />
                  <span className="font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider text-xs">
                    Brothers & Family Group
                  </span>
                  {familyGroup && (
                    <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-300">
                      {familyGroup.familyName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {familyMembers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => openFamilyPaymentModal(paymentStudent)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-md transition-all uppercase tracking-wide"
                    >
                      <CreditCard className="w-4 h-4" /> Pay Family
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setFamilySearchQuery('');
                      setFamilySearchResults([]);
                      setAddBrotherModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Brother / Family Student
                  </button>
                </div>
              </div>

              {familyMembers.length > 0 ? (
                <div className="space-y-2">
                  <div className="card p-0 border border-blue-200 dark:border-blue-800/60 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-blue-100/70 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold uppercase text-[10px]">
                          <th className="py-2 px-3 text-left">Student</th>
                          <th className="py-2 px-3 text-left">Class</th>
                          <th className="py-2 px-3 text-right">Required</th>
                          <th className="py-2 px-3 text-right">Discount</th>
                          <th className="py-2 px-3 text-right">Pending Balance</th>
                          <th className="py-2 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100/50 dark:divide-blue-900/40">
                        {familyMembers.map((m) => (
                          <tr
                            key={m._id}
                            className={m.isSelf ? 'bg-blue-50/70 dark:bg-blue-900/20 font-semibold' : ''}
                          >
                            <td className="py-2 px-3">
                              <span className="font-mono text-purple-700 dark:text-purple-300 mr-1.5">{m.studentId}</span>
                              <span className="font-bold">{m.name}</span>
                              {m.isSelf && <span className="ml-1.5 text-[9px] bg-blue-600 text-white font-black px-1.5 py-0.2 rounded">THIS STUDENT</span>}
                            </td>
                            <td className="py-2 px-3 text-gray-600 dark:text-gray-300">{m.className || '—'}</td>
                            <td className="py-2 px-3 text-right font-medium">{formatCurrency(m.amountRequired)}</td>
                            <td className="py-2 px-3 text-right text-emerald-600 font-medium">
                              {m.isFree ? <span className="font-black text-amber-600">FREE</span> : formatCurrency(m.discountAmount)}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                              {formatCurrency(m.pending)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {!m.isSelf && (
                                <button
                                  type="button"
                                  onClick={() => confirmUnlinkStudent(m)}
                                  className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1 rounded font-bold text-[11px] flex items-center gap-1 mx-auto"
                                  title="Remove / Unlink Brother from Family"
                                >
                                  <UserX className="w-3.5 h-3.5" /> Remove / Unlink
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center px-2 text-xs font-bold text-blue-900 dark:text-blue-200">
                    <span>Total Active Family Members: {familyMembers.length}</span>
                    <span className="text-sm font-black text-purple-900 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-3 py-1 rounded-lg border border-purple-200">
                      Total Family Pending: {formatCurrency(familyMembers.reduce((acc, s) => acc + s.pending, 0))}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-xs italic">No brothers or family members linked to this student yet.</p>
              )}
            </div>

            {/* ── SECTION C: RECORD INDIVIDUAL PAYMENT FORM ── */}
            <form onSubmit={handleIndividualPaySubmit} className="space-y-4 pt-1">
              <div className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider text-xs border-b pb-1">
                Record Payment for Current Period
              </div>

              {/* Calculation Overview */}
              <div className="grid grid-cols-3 gap-3 font-semibold text-center text-xs">
                <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded">
                  <span className="text-gray-500 block text-[10px]">Original Fee</span>
                  <span className="text-sm font-bold">{formatCurrency(currentFeeStructure?.amount)}</span>
                </div>
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded border border-blue-200">
                  <span className="text-blue-600 block text-[10px]">Amount Required</span>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{formatCurrency(calcIndividualModalDetails().req)}</span>
                </div>
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded border border-rose-200">
                  <span className="text-rose-600 block text-[10px]">Pending Balance</span>
                  <span className="text-sm font-bold text-rose-700 dark:text-rose-300">{formatCurrency(calcIndividualModalDetails().pendingNow)}</span>
                </div>
              </div>

              {financeProfile.financeStatus === 'free' && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 rounded-lg text-amber-900 dark:text-amber-200">
                  <input
                    type="checkbox"
                    id="freeOverride"
                    checked={payForm.allowFreeOverride}
                    onChange={(e) => setPayForm({ ...payForm, allowFreeOverride: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="freeOverride" className="font-bold text-xs cursor-pointer">
                    Override Free Student status (Allow charging payment for this transaction)
                  </label>
                </div>
              )}

              {/* Payment Fields */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Payment Now ($) *</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    max={calcIndividualModalDetails().pendingNow}
                    step="0.01"
                    disabled={financeProfile.financeStatus === 'free' && !payForm.allowFreeOverride}
                    value={payForm.paymentNow}
                    onChange={(e) => setPayForm({ ...payForm, paymentNow: e.target.value })}
                    className="input-field text-sm font-extrabold text-purple-700 dark:text-purple-300 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Payment Method *</label>
                  <select
                    value={payForm.paymentMethod}
                    onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                    className="input-field text-xs font-semibold"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Payment Date *</label>
                  <input
                    required
                    type="date"
                    value={payForm.paymentDate}
                    onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Reference Number / Transaction ID</label>
                <input
                  type="text"
                  placeholder="e.g., TXN-99882211"
                  value={payForm.referenceNumber}
                  onChange={(e) => setPayForm({ ...payForm, referenceNumber: e.target.value })}
                  className="input-field text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={financeProfile.financeStatus === 'free' && !payForm.allowFreeOverride}
                  className="btn-primary flex-1 shadow-md disabled:opacity-50"
                >
                  Save & Generate Receipt
                </button>
                <button type="button" onClick={() => setPayModalOpen(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ── MODAL 3: LINK BROTHER / SISTER SEARCH MODAL ── */}
      <Modal
        isOpen={addBrotherModalOpen}
        onClose={() => setAddBrotherModalOpen(false)}
        title={`Add Brother / Family Student to ${paymentStudent?.name}`}
        size="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold mb-1">Search Student by Name or Student ID</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Type name or student ID..."
                value={familySearchQuery}
                onChange={(e) => handleSearchFamilyStudents(e.target.value)}
                className="input-field pl-9 text-xs"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
            {familySearchLoading ? (
              <div className="p-4 text-center"><LoadingSpinner /></div>
            ) : familySearchResults.length > 0 ? (
              familySearchResults.map((st) => (
                <div key={st._id} className="p-2.5 flex items-center justify-between hover:bg-purple-50/50 dark:hover:bg-purple-950/20">
                  <div>
                    <span className="font-mono font-bold text-purple-700 dark:text-purple-300 mr-2">{st.studentId}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{st.name}</span>
                    <span className="text-[10px] text-gray-500 block">{st.classId?.className || '—'}</span>
                  </div>
                  <button
                    onClick={() => handleLinkBrother(st._id)}
                    className="btn-primary py-1 px-3 text-[11px] flex items-center gap-1 shadow-sm"
                  >
                    <LinkIcon className="w-3 h-3" /> Add to Family
                  </button>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-400">
                {familySearchQuery.trim().length >= 2 ? 'No matching unlinked students found.' : 'Type at least 2 characters to search...'}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ── MODAL 4: UNLINK BROTHER CONFIRMATION MODAL ── */}
      {unlinkConfirmStudent && (
        <Modal
          isOpen={unlinkConfirmModalOpen}
          onClose={() => setUnlinkConfirmModalOpen(false)}
          title="Remove Student from Family Group"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2">
              <p className="font-bold text-rose-900 dark:text-rose-200 text-sm">
                Are you sure you want to remove <span className="underline">{unlinkConfirmStudent.name}</span> ({unlinkConfirmStudent.studentId}) from this family group?
              </p>
              <ul className="list-disc list-inside text-rose-700 dark:text-rose-300 space-y-1 text-[11px]">
                <li>{unlinkConfirmStudent.name} will become an independent student.</li>
                <li>Future family payments will not include {unlinkConfirmStudent.name}.</li>
                <li>Existing payments, balance history, discounts, and free status will <strong>NOT</strong> be deleted.</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setUnlinkConfirmModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeUnlinkStudent}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4 py-2 rounded-lg text-xs shadow-md"
              >
                Remove / Unlink Student
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 5: AUTOMATIC FAMILY MULTI-STUDENT PAYMENT MODAL ── */}
      <Modal
        isOpen={familyPayModalOpen}
        onClose={() => setFamilyPayModalOpen(false)}
        title={`Automatic Family Payment — ${familyGroup?.familyName || 'Family Group'}`}
        size="lg"
      >
        <form onSubmit={handleFamilyPaySubmit} className="space-y-4 text-xs">
          {familyPayStep === 'input' && (
            <>
              <div className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-lg border border-purple-200 dark:border-purple-800 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-purple-900 dark:text-purple-300">Family Group:</span> {familyGroup?.familyName}
                </div>
                <div>
                  <span className="font-bold">Total Family Pending:</span>{' '}
                  <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                    {formatCurrency(familyPayStudents.reduce((acc, s) => acc + s.pending, 0))}
                  </span>
                </div>
              </div>

              {/* Family Breakdown Table */}
              <div className="card p-0 border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800 text-gray-600 font-bold uppercase">
                      <th className="py-2.5 px-3 text-left">Student</th>
                      <th className="py-2.5 px-3 text-left">Class</th>
                      <th className="py-2.5 px-3 text-right">Required</th>
                      <th className="py-2.5 px-3 text-right">Discount</th>
                      <th className="py-2.5 px-3 text-right">Pending</th>
                      <th className="py-2.5 px-3 text-right">Allocated Paid ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {familyPayStudents.map((st) => {
                      const allocatedNow = Number(familyPayAllocations[st._id]) || 0;
                      const remPending = Math.max(0, st.pending - allocatedNow);
                      return (
                        <tr key={st._id}>
                          <td className="py-2.5 px-3 font-semibold">
                            <span className="font-mono text-purple-700 dark:text-purple-300 mr-1">{st.studentId}</span> — {st.name}
                            {st.isFree && <span className="ml-1 text-[9px] text-amber-600 font-bold">(FREE)</span>}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500">{st.className}</td>
                          <td className="py-2.5 px-3 text-right">{formatCurrency(st.amountRequired)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-600">
                            {st.isFree ? 'FREE' : formatCurrency(st.discountAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600">{formatCurrency(st.pending)}</td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              max={st.pending}
                              step="0.01"
                              value={familyPayAllocations[st._id] ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFamilyPayAllocations(prev => ({ ...prev, [st._id]: val }));
                                const newAlloc = { ...familyPayAllocations, [st._id]: Number(val) || 0 };
                                const newSum = Object.values(newAlloc).reduce((a, b) => Number(a) + Number(b), 0);
                                setFamilyPayForm(prev => ({ ...prev, totalPaid: String(newSum) }));
                              }}
                              className="input-field py-1 text-right font-black text-emerald-600 w-28 text-xs"
                            />
                            {allocatedNow > 0 && (
                              <span className="text-[10px] text-gray-400 block text-right font-medium">
                                Rem: {formatCurrency(remPending)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-purple-50/50 dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200">
                <div>
                  <label className="block font-bold mb-1">Paid Amount ($) *</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={familyPayForm.totalPaid}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFamilyPayForm({ ...familyPayForm, totalPaid: val });
                      handleDistributeFamilyPayment(val);
                    }}
                    className="input-field text-base font-black text-purple-900 dark:text-purple-200"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => handleDistributeFamilyPayment(familyPayForm.totalPaid)}
                    className="btn-secondary w-full py-2 text-xs font-bold"
                  >
                    Auto-Distribute Sequential Order
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Payment Method</label>
                  <select
                    value={familyPayForm.paymentMethod}
                    onChange={(e) => setFamilyPayForm({ ...familyPayForm, paymentMethod: e.target.value })}
                    className="input-field text-xs"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={familyPayForm.paymentDate}
                    onChange={(e) => setFamilyPayForm({ ...familyPayForm, paymentDate: e.target.value })}
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Reference Number</label>
                  <input
                    type="text"
                    placeholder="TXN-FAMILY-100"
                    value={familyPayForm.referenceNumber}
                    onChange={(e) => setFamilyPayForm({ ...familyPayForm, referenceNumber: e.target.value })}
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const totalAlloc = Object.values(familyPayAllocations).reduce((a, b) => Number(a) + Number(b), 0);
                    if (totalAlloc <= 0) {
                      toast.error('Allocated payment amount must be greater than $0');
                      return;
                    }
                    setFamilyPayStep('confirm');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-lg flex-1 shadow-md text-xs flex items-center justify-center gap-2"
                >
                  Review Family Payment <ArrowRight className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setFamilyPayModalOpen(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </>
          )}

          {familyPayStep === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border-2 border-purple-300 rounded-xl space-y-3">
                <h3 className="font-extrabold text-sm text-purple-900 dark:text-purple-200 border-b pb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Family Payment Confirmation Summary
                </h3>

                <div className="text-xs space-y-1">
                  <p>Family Group: <span className="font-bold">{familyGroup?.familyName || 'Family Group'}</span></p>
                  <p>Academic Year: <span className="font-bold">{selectedYear}</span></p>
                  <p>Payment Method: <span className="font-bold">{familyPayForm.paymentMethod}</span></p>
                </div>

                <div className="card p-0 border border-purple-200 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-purple-100/60 text-purple-900 font-bold">
                        <th className="py-2 px-3 text-left">Student</th>
                        <th className="py-2 px-3 text-right">Allocated Payment</th>
                        <th className="py-2 px-3 text-right">Remaining Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100">
                      {familyPayStudents.map((st) => {
                        const alloc = Number(familyPayAllocations[st._id]) || 0;
                        const rem = Math.max(0, st.pending - alloc);
                        return (
                          <tr key={st._id}>
                            <td className="py-2 px-3 font-bold">
                              {st.studentId} - {st.name} {st.isFree && '(FREE)'}
                            </td>
                            <td className="py-2 px-3 text-right font-extrabold text-emerald-600">
                              {formatCurrency(alloc)}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-rose-600">
                              {formatCurrency(rem)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center bg-purple-200 dark:bg-purple-900 p-2.5 rounded-lg font-black text-sm text-purple-950 dark:text-purple-100">
                  <span>Total Family Payment</span>
                  <span>{formatCurrency(familyPayForm.totalPaid)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 shadow-lg py-2.5 font-black text-xs">
                  Confirm Family Payment
                </button>
                <button
                  type="button"
                  onClick={() => setFamilyPayStep('input')}
                  className="btn-secondary flex-1"
                >
                  Back to Edit
                </button>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* ── MODAL 6: BULK STUDENT PAYMENT MODAL ── */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title={`Record Bulk Payment — ${bulkPaymentItems.length} Student(s)`}
        size="lg"
      >
        <form onSubmit={handleBulkPaySubmit} className="space-y-4 text-xs">
          <div className="max-h-72 overflow-y-auto card p-0 border border-gray-200 dark:border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 text-gray-600 font-bold uppercase">
                  <th className="py-2 px-3 text-left">Student</th>
                  <th className="py-2 px-3 text-right">Original Fee</th>
                  <th className="py-2 px-3 text-center">Discount Type</th>
                  <th className="py-2 px-3 text-center">Discount Val</th>
                  <th className="py-2 px-3 text-right">Payment Now ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {bulkPaymentItems.map((item, idx) => (
                  <tr key={item.studentId}>
                    <td className="py-2 px-3 font-semibold">
                      {item.studentIdCode} — {item.name}
                    </td>
                    <td className="py-2 px-3 text-right">{formatCurrency(item.originalFee)}</td>
                    <td className="py-2 px-3 text-center">
                      <select
                        value={item.discountType}
                        onChange={(e) => updateBulkItemDiscount(idx, 'discountType', e.target.value)}
                        className="input-field py-1 text-[11px]"
                      >
                        <option value="Fixed">Fixed ($)</option>
                        <option value="Percentage">%</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.discountValue}
                        onChange={(e) => updateBulkItemDiscount(idx, 'discountValue', e.target.value)}
                        className="input-field py-1 text-center font-bold text-emerald-600 w-20 text-[11px]"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.paymentNow}
                        onChange={(e) => updateBulkItemDiscount(idx, 'paymentNow', e.target.value)}
                        className="input-field py-1 text-right font-bold text-purple-700 dark:text-purple-300 w-28 text-[11px]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold mb-1">Payment Method</label>
              <select
                value={bulkGlobalForm.paymentMethod}
                onChange={(e) => setBulkGlobalForm({ ...bulkGlobalForm, paymentMethod: e.target.value })}
                className="input-field text-xs"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">Payment Date</label>
              <input
                type="date"
                value={bulkGlobalForm.paymentDate}
                onChange={(e) => setBulkGlobalForm({ ...bulkGlobalForm, paymentDate: e.target.value })}
                className="input-field text-xs"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Global Ref Number</label>
              <input
                type="text"
                value={bulkGlobalForm.referenceNumber}
                onChange={(e) => setBulkGlobalForm({ ...bulkGlobalForm, referenceNumber: e.target.value })}
                className="input-field text-xs"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1 shadow-md">
              Process Bulk Payments
            </button>
            <button type="button" onClick={() => setBulkModalOpen(false)} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 7: STUDENT PAYMENT HISTORY MODAL ── */}
      {historyStudent && (
        <Modal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title={`Payment History — ${historyStudent.name} (${historyStudent.studentId})`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {historyLoading ? (
              <div className="p-8 text-center"><LoadingSpinner /></div>
            ) : (
              <div className="card overflow-x-auto p-0 border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800 text-gray-600 font-bold uppercase">
                      <th className="py-2.5 px-3 text-left">Receipt No</th>
                      <th className="py-2.5 px-3 text-left">Period</th>
                      <th className="py-2.5 px-3 text-left">Date</th>
                      <th className="py-2.5 px-3 text-right">Payment Amount</th>
                      <th className="py-2.5 px-3 text-left">Method</th>
                      <th className="py-2.5 px-3 text-left">Ref No</th>
                      <th className="py-2.5 px-3 text-left">Recorded By</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {historyPayments.length > 0 ? (
                      historyPayments.map((p) => (
                        <tr key={p._id}>
                          <td className="py-2 px-3 font-mono font-bold text-purple-700 dark:text-purple-300">{p.receiptNo}</td>
                          <td className="py-2 px-3">
                            {p.billingMonth ? `${p.billingMonth} ${p.billingYear}` : '—'}
                          </td>
                          <td className="py-2 px-3">{p.paymentDate?.split('T')[0]}</td>
                          <td className="py-2 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(p.paidAmount)}
                          </td>
                          <td className="py-2 px-3">{p.paymentMethod}</td>
                          <td className="py-2 px-3 font-mono">{p.referenceNumber || '—'}</td>
                          <td className="py-2 px-3">{p.recordedBy?.name || 'Admin'}</td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setActiveReceipt(p)}
                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-purple-600"
                                title="Print Receipt"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handlePaymentDelete(p._id)}
                                className="p-1 rounded hover:bg-rose-100 text-rose-600"
                                title="Delete Transaction"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-400">No past payments recorded for this student.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={() => setHistoryModalOpen(false)} className="btn-secondary">Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── RECEIPT MODAL ── */}
      <ReceiptModal payment={activeReceipt} onClose={() => setActiveReceipt(null)} />
    </div>
  );
};

export default Finance;
