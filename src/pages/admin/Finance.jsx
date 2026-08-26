import { useEffect, useState, useRef } from 'react';
import {
  DollarSign, TrendingDown, Wallet, AlertCircle,
  Plus, Pencil, Trash2, Printer, LayoutDashboard,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Annual'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Mobile Money'];
const EXPENSE_CATEGORIES = ['Salary', 'Utilities', 'Supplies', 'Maintenance', 'Other'];
const STATUS_COLORS = { Paid: 'text-green-600 bg-green-100 dark:bg-green-900/30', Partial: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30', Pending: 'text-red-600 bg-red-100 dark:bg-red-900/30' };

const emptyFeeForm = { name: '', amount: '', classId: '', academicYear: '', term: 'Term 1', dueDate: '', description: '' };
const emptyPaymentForm = { studentId: '', classId: '', feeId: '', feeName: '', amount: '', paidAmount: '', paymentMethod: 'Cash', paymentDate: new Date().toISOString().split('T')[0], academicYear: '', term: '', note: '' };
const emptyExpenseForm = { title: '', category: 'Salary', amount: '', payee: '', date: new Date().toISOString().split('T')[0], description: '' };

const formatCurrency = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ReceiptModal = ({ payment, onClose }) => {
  const { t } = useTranslation();
  const printRef = useRef(null);

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Receipt ${payment.receiptNo}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
        h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .label { color: #666; }
        .value { font-weight: 600; }
        .status { text-align: center; margin-top: 20px; font-size: 18px; font-weight: bold; }
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.print();
  };

  if (!payment) return null;

  return (
    <Modal isOpen={!!payment} onClose={onClose} title={t('finance.paymentReceipt')} size="md">
      <div ref={printRef}>
        <h2 className="text-center text-xl font-bold mb-4 border-b pb-2">{t('finance.paymentReceipt')}</h2>
        <div className="space-y-2 text-sm">
          {[
            [t('finance.receiptNo'), payment.receiptNo],
            [t('finance.studentName'), payment.studentId?.name],
            [t('finance.studentId'), payment.studentId?.studentId],
            [t('students.class'), payment.classId?.className || '—'],
            [t('finance.feeName'), payment.feeName],
            [t('finance.totalAmount'), formatCurrency(payment.amount)],
            [t('finance.amountPaid'), formatCurrency(payment.paidAmount)],
            [t('finance.balance'), formatCurrency(payment.balance)],
            [t('finance.paymentMethod'), payment.paymentMethod],
            [t('finance.paymentDate'), payment.paymentDate?.split('T')[0]],
            [t('common.status'), payment.status],
            [t('attendance.recordedBy'), payment.recordedBy?.name || '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium">{value ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={handlePrint} className="btn-primary flex items-center gap-2 flex-1 justify-center">
          <Printer className="w-4 h-4" /> {t('finance.printReceipt')}
        </button>
        <button onClick={onClose} className="btn-secondary flex-1">{t('common.close')}</button>
      </div>
    </Modal>
  );
};

const Finance = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('overview');

  const TABS = [
    { id: 'overview', label: t('finance.overview'), icon: LayoutDashboard },
    { id: 'fees', label: t('finance.feeStructure'), icon: DollarSign },
    { id: 'payments', label: t('finance.payments'), icon: Wallet },
    { id: 'expenses', label: t('finance.expenses'), icon: TrendingDown },
  ];

  // Shared data
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);

  // Overview
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Fees tab
  const [feeModal, setFeeModal] = useState(false);
  const [feeEditId, setFeeEditId] = useState(null);
  const [feeForm, setFeeForm] = useState(emptyFeeForm);

  // Payments tab
  const [payments, setPayments] = useState([]);
  const [payPage, setPayPage] = useState(1);
  const [payPages, setPayPages] = useState(1);
  const [payFilter, setPayFilter] = useState({ status: '', classId: '', studentId: '' });
  const [payModal, setPayModal] = useState(false);
  const [payEditId, setPayEditId] = useState(null);
  const [payForm, setPayForm] = useState(emptyPaymentForm);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [payLoading, setPayLoading] = useState(true);

  // Expenses tab
  const [expenses, setExpenses] = useState([]);
  const [expPage, setExpPage] = useState(1);
  const [expPages, setExpPages] = useState(1);
  const [expCategory, setExpCategory] = useState('');
  const [expModal, setExpModal] = useState(false);
  const [expEditId, setExpEditId] = useState(null);
  const [expForm, setExpForm] = useState(emptyExpenseForm);
  const [expLoading, setExpLoading] = useState(true);

  const fetchShared = async () => {
    const [c, s, f] = await Promise.all([
      api.get('/classes', { params: { limit: 100 } }),
      api.get('/students', { params: { limit: 500 } }),
      api.get('/finance/fees'),
    ]);
    setClasses(c.data.classes);
    setStudents(s.data.students);
    setFees(f.data);
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const { data } = await api.get('/finance/summary');
      setSummary(data);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchPayments = async () => {
    setPayLoading(true);
    try {
      const { data } = await api.get('/finance/payments', {
        params: { page: payPage, limit: 10, ...payFilter },
      });
      setPayments(data.payments);
      setPayPages(data.pages);
    } finally {
      setPayLoading(false);
    }
  };

  const fetchExpenses = async () => {
    setExpLoading(true);
    try {
      const { data } = await api.get('/finance/expenses', {
        params: { page: expPage, limit: 10, category: expCategory || undefined },
      });
      setExpenses(data.expenses);
      setExpPages(data.pages);
    } finally {
      setExpLoading(false);
    }
  };

  useEffect(() => { fetchShared(); }, []);
  useEffect(() => { if (tab === 'overview') fetchSummary(); }, [tab]);
  useEffect(() => { if (tab === 'fees') fetchShared(); }, [tab]);
  useEffect(() => { if (tab === 'payments') fetchPayments(); }, [tab, payPage, payFilter]);
  useEffect(() => { if (tab === 'expenses') fetchExpenses(); }, [tab, expPage, expCategory]);

  // Fee handlers
  const openFeeCreate = () => { setFeeEditId(null); setFeeForm(emptyFeeForm); setFeeModal(true); };
  const openFeeEdit = (f) => {
    setFeeEditId(f._id);
    setFeeForm({
      name: f.name, amount: f.amount, classId: f.classId?._id || '',
      academicYear: f.academicYear, term: f.term,
      dueDate: f.dueDate?.split('T')[0] || '', description: f.description || '',
    });
    setFeeModal(true);
  };

  const handleFeeSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...feeForm, amount: Number(feeForm.amount), classId: feeForm.classId || undefined };
    try {
      if (feeEditId) {
        await api.put(`/finance/fees/${feeEditId}`, payload);
        toast.success('Fee structure updated');
      } else {
        await api.post('/finance/fees', payload);
        toast.success('Fee structure created');
      }
      setFeeModal(false);
      fetchShared();
      if (tab === 'overview') fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleFeeDelete = async (id) => {
    if (!confirm('Delete this fee structure?')) return;
    try {
      await api.delete(`/finance/fees/${id}`);
      toast.success('Fee structure deleted');
      fetchShared();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // Payment handlers
  const openPayCreate = () => { setPayEditId(null); setPayForm(emptyPaymentForm); setPayModal(true); };
  const openPayEdit = (p) => {
    setPayEditId(p._id);
    setPayForm({
      studentId: p.studentId?._id || '', classId: p.classId?._id || '',
      feeId: p.feeId?._id || '', feeName: p.feeName, amount: p.amount,
      paidAmount: p.paidAmount, paymentMethod: p.paymentMethod,
      paymentDate: p.paymentDate?.split('T')[0] || '',
      academicYear: p.academicYear || '', term: p.term || '', note: p.note || '',
    });
    setPayModal(true);
  };

  const handleStudentChange = (studentId) => {
    const student = students.find((s) => s._id === studentId);
    setPayForm((f) => ({
      ...f, studentId,
      classId: student?.classId?._id || student?.classId || f.classId,
    }));
  };

  const handleFeeTypeChange = (feeId) => {
    const fee = fees.find((f) => f._id === feeId);
    setPayForm((f) => ({
      ...f, feeId,
      feeName: fee?.name || f.feeName,
      amount: fee?.amount ?? f.amount,
      academicYear: fee?.academicYear || f.academicYear,
      term: fee?.term || f.term,
    }));
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...payForm,
      amount: Number(payForm.amount),
      paidAmount: Number(payForm.paidAmount),
      classId: payForm.classId || undefined,
      feeId: payForm.feeId || undefined,
      term: payForm.term || undefined,
      academicYear: payForm.academicYear || undefined,
    };
    try {
      if (payEditId) {
        await api.put(`/finance/payments/${payEditId}`, payload);
        toast.success('Payment updated');
      } else {
        await api.post('/finance/payments', payload);
        toast.success('Payment recorded');
      }
      setPayModal(false);
      fetchPayments();
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handlePayDelete = async (id) => {
    if (!confirm('Delete this payment record?')) return;
    try {
      await api.delete(`/finance/payments/${id}`);
      toast.success('Payment deleted');
      fetchPayments();
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handlePrintReceipt = async (id) => {
    try {
      const { data } = await api.get(`/finance/payments/${id}`);
      setReceiptPayment(data);
    } catch {
      toast.error('Failed to load receipt');
    }
  };

  // Expense handlers
  const openExpCreate = () => { setExpEditId(null); setExpForm(emptyExpenseForm); setExpModal(true); };
  const openExpEdit = (ex) => {
    setExpEditId(ex._id);
    setExpForm({
      title: ex.title, category: ex.category, amount: ex.amount,
      payee: ex.payee || '', date: ex.date?.split('T')[0] || '',
      description: ex.description || '',
    });
    setExpModal(true);
  };

  const handleExpSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...expForm, amount: Number(expForm.amount) };
      if (expEditId) {
        await api.put(`/finance/expenses/${expEditId}`, payload);
        toast.success('Expense updated');
      } else {
        await api.post('/finance/expenses', payload);
        toast.success('Expense recorded');
      }
      setExpModal(false);
      fetchExpenses();
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleExpDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/finance/expenses/${id}`);
      toast.success('Expense deleted');
      fetchExpenses();
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const overviewCards = [
    { label: t('finance.totalRevenue'), value: formatCurrency(summary?.totalCollected), icon: DollarSign, color: 'bg-green-500' },
    { label: t('finance.totalExpenses'), value: formatCurrency(summary?.totalExpenses), icon: TrendingDown, color: 'bg-red-500' },
    { label: t('finance.netBalance'), value: formatCurrency(summary?.netBalance), icon: Wallet, color: 'bg-blue-500' },
    { label: t('finance.pendingPayments'), value: summary?.pendingFees ?? 0, icon: AlertCircle, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('finance.title')}</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        summaryLoading ? <LoadingSpinner /> : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {overviewCards.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="stat-card">
                  <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">{t('finance.payments')}</h3>
                {summary?.recentPayments?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-2 px-2">{t('finance.receiptNo')}</th>
                          <th className="text-left py-2 px-2">{t('attendance.student')}</th>
                          <th className="text-left py-2 px-2">{t('finance.amountPaid')}</th>
                          <th className="text-left py-2 px-2">{t('common.status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.recentPayments.map((p) => (
                          <tr key={p._id} className="border-b border-gray-100 dark:border-gray-700/50">
                            <td className="py-2 px-2 font-mono text-xs">{p.receiptNo}</td>
                            <td className="py-2 px-2">{p.studentId?.name}</td>
                            <td className="py-2 px-2">{formatCurrency(p.paidAmount)}</td>
                            <td className="py-2 px-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">{t('common.noDataFound')}</p>
                )}
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-4">{t('finance.expenses')}</h3>
                {summary?.expenseBreakdown?.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={summary.expenseBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="amount" fill="#9333ea" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-400 text-sm">{t('common.noDataFound')}</p>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* Fees Tab */}
      {tab === 'fees' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openFeeCreate} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t('finance.addFee')}
            </button>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4">{t('finance.feeName')}</th>
                  <th className="text-left py-3 px-4">{t('finance.totalAmount')}</th>
                  <th className="text-left py-3 px-4">{t('students.class')}</th>
                  <th className="text-left py-3 px-4">Term</th>
                  <th className="text-left py-3 px-4">{t('students.academicYear')}</th>
                  <th className="text-left py-3 px-4">Due Date</th>
                  <th className="text-right py-3 px-4">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {fees.length ? fees.map((f) => (
                  <tr key={f._id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-3 px-4 font-medium">{f.name}</td>
                    <td className="py-3 px-4">{formatCurrency(f.amount)}</td>
                    <td className="py-3 px-4">{f.classId?.className || t('attendance.allClasses')}</td>
                    <td className="py-3 px-4">{f.term}</td>
                    <td className="py-3 px-4">{f.academicYear}</td>
                    <td className="py-3 px-4">{f.dueDate ? f.dueDate.split('T')[0] : '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openFeeEdit(f)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleFeeDelete(f._id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">{t('common.noDataFound')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {tab === 'payments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <select value={payFilter.status} onChange={(e) => { setPayFilter((f) => ({ ...f, status: e.target.value })); setPayPage(1); }} className="input-field w-auto">
                <option value="">{t('common.all')} Statuses</option>
                {['Paid', 'Partial', 'Pending'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={payFilter.classId} onChange={(e) => { setPayFilter((f) => ({ ...f, classId: e.target.value })); setPayPage(1); }} className="input-field w-auto">
                <option value="">{t('attendance.allClasses')}</option>
                {classes.map((c) => <option key={c._id} value={c._id}>{c.className}</option>)}
              </select>
              <select value={payFilter.studentId} onChange={(e) => { setPayFilter((f) => ({ ...f, studentId: e.target.value })); setPayPage(1); }} className="input-field w-auto">
                <option value="">{t('common.all')} Students</option>
                {students.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <button onClick={openPayCreate} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t('finance.addPayment')}
            </button>
          </div>

          {payLoading ? <LoadingSpinner /> : (
            <>
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4">{t('finance.receiptNo')}</th>
                      <th className="text-left py-3 px-4">{t('attendance.student')}</th>
                      <th className="text-left py-3 px-4">{t('finance.feeName')}</th>
                      <th className="text-left py-3 px-4">{t('finance.totalAmount')}</th>
                      <th className="text-left py-3 px-4">{t('finance.amountPaid')}</th>
                      <th className="text-left py-3 px-4">{t('finance.balance')}</th>
                      <th className="text-left py-3 px-4">{t('common.status')}</th>
                      <th className="text-right py-3 px-4">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length ? payments.map((p) => (
                      <tr key={p._id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-3 px-4 font-mono text-xs">{p.receiptNo}</td>
                        <td className="py-3 px-4">{p.studentId?.name}</td>
                        <td className="py-3 px-4">{p.feeName}</td>
                        <td className="py-3 px-4">{formatCurrency(p.amount)}</td>
                        <td className="py-3 px-4">{formatCurrency(p.paidAmount)}</td>
                        <td className="py-3 px-4">{formatCurrency(p.balance)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => handlePrintReceipt(p._id)} title={t('finance.printReceipt')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><Printer className="w-4 h-4" /></button>
                            <button onClick={() => openPayEdit(p)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handlePayDelete(p._id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={8} className="py-8 text-center text-gray-400">{t('common.noDataFound')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={payPage} pages={payPages} onPageChange={setPayPage} />
            </>
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <select value={expCategory} onChange={(e) => { setExpCategory(e.target.value); setExpPage(1); }} className="input-field w-auto">
              <option value="">{t('common.all')} Categories</option>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={openExpCreate} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t('finance.addExpense')}
            </button>
          </div>

          {expLoading ? <LoadingSpinner /> : (
            <>
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4">Title</th>
                      <th className="text-left py-3 px-4">{t('students.category')}</th>
                      <th className="text-left py-3 px-4">{t('finance.totalAmount')}</th>
                      <th className="text-left py-3 px-4">Payee</th>
                      <th className="text-left py-3 px-4">{t('common.date')}</th>
                      <th className="text-right py-3 px-4">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length ? expenses.map((ex) => (
                      <tr key={ex._id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-3 px-4 font-medium">{ex.title}</td>
                        <td className="py-3 px-4">{ex.category}</td>
                        <td className="py-3 px-4">{formatCurrency(ex.amount)}</td>
                        <td className="py-3 px-4">{ex.payee || '—'}</td>
                        <td className="py-3 px-4">{ex.date?.split('T')[0]}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openExpEdit(ex)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleExpDelete(ex._id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="py-8 text-center text-gray-400">{t('common.noDataFound')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={expPage} pages={expPages} onPageChange={setExpPage} />
            </>
          )}
        </div>
      )}

      {/* Fee Modal */}
      <Modal isOpen={feeModal} onClose={() => setFeeModal(false)} title={feeEditId ? t('finance.editFee') : t('finance.addFee')}>
        <form onSubmit={handleFeeSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('finance.feeName')} *</label>
            <input required value={feeForm.name} onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })} className="input-field" placeholder="Tuition Fee Term 1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('finance.totalAmount')} (USD) *</label>
              <input required type="number" min="0" step="0.01" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('students.class')}</label>
              <select value={feeForm.classId} onChange={(e) => setFeeForm({ ...feeForm, classId: e.target.value })} className="input-field">
                <option value="">{t('attendance.allClasses')}</option>
                {classes.map((c) => <option key={c._id} value={c._id}>{c.className}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Term *</label>
              <select required value={feeForm.term} onChange={(e) => setFeeForm({ ...feeForm, term: e.target.value })} className="input-field">
                {TERMS.map((termItem) => <option key={termItem} value={termItem}>{termItem}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('students.academicYear')} *</label>
              <input required value={feeForm.academicYear} onChange={(e) => setFeeForm({ ...feeForm, academicYear: e.target.value })} className="input-field" placeholder="2024-2025" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input type="date" value={feeForm.dueDate} onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={feeForm.description} onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })} className="input-field" rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">{feeEditId ? t('common.update') : t('common.create')}</button>
            <button type="button" onClick={() => setFeeModal(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title={payEditId ? t('finance.editPayment') : t('finance.addPayment')} size="lg">
        <form onSubmit={handlePaySubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('attendance.student')} *</label>
              <select required value={payForm.studentId} onChange={(e) => handleStudentChange(e.target.value)} className="input-field">
                <option value="">{t('common.select')} student</option>
                {students.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.studentId})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('students.class')}</label>
              <select value={payForm.classId} onChange={(e) => setPayForm({ ...payForm, classId: e.target.value })} className="input-field">
                <option value="">{t('classes.selectClass')}</option>
                {classes.map((c) => <option key={c._id} value={c._id}>{c.className}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('finance.feeName')}</label>
            <select value={payForm.feeId} onChange={(e) => handleFeeTypeChange(e.target.value)} className="input-field">
              <option value="">{t('common.select')} fee (optional)</option>
              {fees.map((f) => <option key={f._id} value={f._id}>{f.name} — {formatCurrency(f.amount)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('finance.feeName')} *</label>
            <input required value={payForm.feeName} onChange={(e) => setPayForm({ ...payForm, feeName: e.target.value })} className="input-field" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('finance.totalAmount')} *</label>
              <input required type="number" min="0" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('finance.amountPaid')} *</label>
              <input required type="number" min="0" step="0.01" value={payForm.paidAmount} onChange={(e) => setPayForm({ ...payForm, paidAmount: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('finance.paymentMethod')} *</label>
              <select required value={payForm.paymentMethod} onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })} className="input-field">
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('finance.paymentDate')} *</label>
              <input required type="date" value={payForm.paymentDate} onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('students.academicYear')}</label>
              <input value={payForm.academicYear} onChange={(e) => setPayForm({ ...payForm, academicYear: e.target.value })} className="input-field" placeholder="2024-2025" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Term</label>
              <select value={payForm.term} onChange={(e) => setPayForm({ ...payForm, term: e.target.value })} className="input-field">
                <option value="">—</option>
                {TERMS.map((termItem) => <option key={termItem} value={termItem}>{termItem}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Note</label>
            <textarea value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} className="input-field" rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">{payEditId ? t('common.update') : t('finance.addPayment')}</button>
            <button type="button" onClick={() => setPayModal(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
          </div>
        </form>
      </Modal>

      {/* Expense Modal */}
      <Modal isOpen={expModal} onClose={() => setExpModal(false)} title={expEditId ? t('finance.editExpense') : t('finance.addExpense')}>
        <form onSubmit={handleExpSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input required value={expForm.title} onChange={(e) => setExpForm({ ...expForm, title: e.target.value })} className="input-field" placeholder="Teacher Salaries — January" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('students.category')} *</label>
              <select required value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value })} className="input-field">
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('finance.totalAmount')} (USD) *</label>
              <input required type="number" min="0" step="0.01" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Payee</label>
              <input value={expForm.payee} onChange={(e) => setExpForm({ ...expForm, payee: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('common.date')} *</label>
              <input required type="date" value={expForm.date} onChange={(e) => setExpForm({ ...expForm, date: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} className="input-field" rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">{expEditId ? t('common.update') : t('common.create')}</button>
            <button type="button" onClick={() => setExpModal(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
          </div>
        </form>
      </Modal>

      <ReceiptModal payment={receiptPayment} onClose={() => setReceiptPayment(null)} />
    </div>
  );
};

export default Finance;
