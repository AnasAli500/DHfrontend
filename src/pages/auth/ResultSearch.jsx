import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Printer,
  BookOpen,
  User,
  Award,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { isGradePassed } from '../../utils/gradeCalculator';

const ResultSearch = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { theme, setTheme } = useTheme();
  const [rollNumber, setRollNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!rollNumber.trim()) {
      toast.error('Tad fadlan geli Roll Number / Student ID');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setResultData(null);

    try {
      const res = await api.get('/exam-results/public-search', {
        params: { rollNumber: rollNumber.trim() },
      });
      setResultData(res.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Waa la heli waayay natiijada';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const cycleTheme = () => {
    const themes = ['light', 'dark', 'system'];
    const next = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(next);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const themeLabel = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';

  const schoolDisplayName = settings?.schoolName || 'DhambaalSchool';

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4 sm:p-6 md:p-8 overflow-x-hidden font-sans transition-colors duration-300">
      {/* Print styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* Dynamic Background Glowing Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-600/20 dark:bg-primary-600/30 rounded-full blur-[128px] pointer-events-none no-print" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 dark:bg-indigo-600/30 rounded-full blur-[128px] pointer-events-none no-print" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-300/10 dark:bg-purple-900/10 rounded-full blur-[150px] pointer-events-none no-print" />

      {/* Top-right controls: Language Switcher + Theme Toggle */}
      <div className="absolute top-5 right-5 z-20 flex items-center gap-2 no-print">
        {/* Language Switcher */}
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 rounded-2xl p-1.5 shadow-lg transition-all duration-300 hover:border-primary-500/30">
          <LanguageSwitcher />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={cycleTheme}
          title={`Switch theme (${themeLabel})`}
          id="result-theme-toggle"
          className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 rounded-2xl px-3 py-2 shadow-lg transition-all duration-300 hover:border-primary-500/30 text-gray-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400"
        >
          <ThemeIcon className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">{themeLabel}</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl border border-gray-200/80 dark:border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden relative z-10 p-6 sm:p-8 md:p-10 my-6 print-area transition-colors duration-300">

        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-gray-200/80 dark:border-slate-800/80 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-primary-600/30">
              {settings?.schoolLogo ? (
                <img src={settings.schoolLogo} alt="School Logo" className="w-8 h-8 object-contain rounded-lg" />
              ) : (
                <GraduationCap className="w-7 h-7 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
                {schoolDisplayName}
              </h1>
              <p className="text-xs text-gray-500 dark:text-slate-400">Student Exam Result Portal</p>
            </div>
          </div>

          <Link
            to="/login"
            className="no-print inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800/80 hover:bg-gray-200 dark:hover:bg-slate-700/80 border border-gray-200 dark:border-slate-700/80 rounded-xl transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 text-primary-500 dark:text-primary-400" />
            <span>Back to Login</span>
          </Link>
        </div>

        {/* Search Input Section */}
        <div className="no-print bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 mb-8 shadow-inner transition-colors duration-300">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary-500 dark:text-primary-400" />
            <span>Result Search</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">
            Enter your Roll Number or Student ID to view your published exam result.
          </p>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="Enter Roll Number"
                className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/80 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-200"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-3.5 px-6 bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-primary-600/30 hover:shadow-primary-600/50 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search Result</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Messages */}
        {errorMessage && (
          <div className="p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl text-center space-y-2 animate-fadeIn mb-6 transition-colors duration-300">
            <AlertCircle className="w-10 h-10 text-red-500 dark:text-red-400 mx-auto" />
            <h3 className="text-base font-bold text-red-700 dark:text-red-200">{errorMessage}</h3>
            <p className="text-xs text-red-500 dark:text-red-300/80">
              {errorMessage.includes('Student not found') || errorMessage.includes('ma jiro')
                ? 'Please verify the Roll Number / Student ID entered and try again.'
                : 'Your exam results have not been published by the administration yet.'}
            </p>
          </div>
        )}

        {/* Result Display Card */}
        {resultData && resultData.studentInfo && (
          <div className="space-y-6 animate-fadeIn">

            {/* Action Bar (Print) */}
            <div className="no-print flex items-center justify-between bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/50 rounded-xl p-3.5 transition-colors duration-300">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Official Published Result</span>
              </div>
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Result</span>
              </button>
            </div>

            {/* Student Info Card */}
            <div className="bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 transition-colors duration-300">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold block mb-1">Student Name</span>
                  <span className="text-gray-900 dark:text-white font-bold text-sm sm:text-base">{resultData.studentInfo.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold block mb-1">Roll Number / ID</span>
                  <span className="text-primary-600 dark:text-primary-400 font-mono font-bold text-sm sm:text-base">{resultData.studentInfo.admissionNumber}</span>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold block mb-1">Class &amp; Grade</span>
                  <span className="text-gray-700 dark:text-slate-200 font-semibold">{resultData.studentInfo.className} ({resultData.studentInfo.gradeLevel})</span>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold block mb-1">Academic Year</span>
                  <span className="text-gray-700 dark:text-slate-200 font-semibold">{resultData.studentInfo.academicYear}</span>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold block mb-1">Class Rank</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold text-sm sm:text-base inline-flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    {resultData.summary.rank || resultData.summary.classRank || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-gray-50 dark:bg-slate-950/80 border border-gray-200 dark:border-slate-800 p-4 rounded-xl text-center transition-colors duration-300">
                <span className="text-[11px] text-gray-400 dark:text-slate-400 uppercase tracking-wider block mb-1 font-semibold">Total Marks</span>
                <span className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  {resultData.summary.totalMarksObtained} <span className="text-xs text-gray-400 dark:text-slate-500 font-normal">/ {resultData.summary.totalMaxMarks}</span>
                </span>
              </div>

              <div className="bg-gray-50 dark:bg-slate-950/80 border border-gray-200 dark:border-slate-800 p-4 rounded-xl text-center transition-colors duration-300">
                <span className="text-[11px] text-gray-400 dark:text-slate-400 uppercase tracking-wider block mb-1 font-semibold">Percentage</span>
                <span className="text-lg sm:text-xl font-extrabold text-primary-600 dark:text-primary-400">
                  {resultData.summary.percentage}
                </span>
              </div>

              <div className="bg-gray-50 dark:bg-slate-950/80 border border-gray-200 dark:border-slate-800 p-4 rounded-xl text-center transition-colors duration-300">
                <span className="text-[11px] text-gray-400 dark:text-slate-400 uppercase tracking-wider block mb-1 font-semibold">Overall Grade</span>
                <span className="text-lg sm:text-xl font-extrabold text-purple-600 dark:text-purple-400">
                  {resultData.summary.overallGrade}
                </span>
              </div>

              <div className="bg-gray-50 dark:bg-slate-950/80 border border-gray-200 dark:border-slate-800 p-4 rounded-xl text-center transition-colors duration-300">
                <span className="text-[11px] text-gray-400 dark:text-slate-400 uppercase tracking-wider block mb-1 font-semibold">Class Rank</span>
                <span className="text-lg sm:text-xl font-extrabold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                  <Award className="w-4 h-4 inline" />
                  {resultData.summary.rank || resultData.summary.classRank || 'N/A'}
                </span>
              </div>

              <div className="bg-gray-50 dark:bg-slate-950/80 border border-gray-200 dark:border-slate-800 p-4 rounded-xl text-center transition-colors duration-300">
                <span className="text-[11px] text-gray-400 dark:text-slate-400 uppercase tracking-wider block mb-1 font-semibold">Result Status</span>
                {(() => {
                  const isPassed = isGradePassed(resultData.summary.overallGrade) || resultData.summary.isOverallPassed;
                  return (
                    <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                      isPassed
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                        : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30'
                    }`}>
                      {isPassed ? 'PASSED' : 'FAILED'}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Subject Marks Table */}
            {resultData.subjectResults && resultData.subjectResults.length > 0 && (
              <div className="bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors duration-300">
                <div className="p-4 bg-white dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-300 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary-500 dark:text-primary-400" />
                    Subject Marks Breakdown
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-slate-400">{resultData.summary.seasonName}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700 dark:text-slate-300">
                    <thead className="bg-gray-100 dark:bg-slate-900/90 text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4 text-center">Final Exam</th>
                        <th className="py-3 px-4 text-center">Percentage</th>
                        <th className="py-3 px-4 text-center">Grade</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-800/60">
                      {resultData.subjectResults.map((sub, idx) => {
                        const obt = sub.marksObtained !== undefined ? sub.marksObtained : (sub.marks !== undefined ? sub.marks : parseFloat(sub.percentage));
                        const isBelow50 = obt !== undefined && obt !== null && Number(obt) < 50;
                        const isSubPassed = isGradePassed(sub.grade) || sub.status === 'Pass' || sub.status === 'PASS';
                        return (
                          <tr key={idx} className="hover:bg-gray-100 dark:hover:bg-slate-900/40 transition-colors">
                            <td className="py-3 px-4 font-semibold">
                              <div className="relative group inline-block">
                                <span
                                  className={`cursor-pointer transition-colors ${
                                    isBelow50 ? 'text-red-500 dark:text-red-400 font-bold' : 'text-gray-900 dark:text-white'
                                  }`}
                                  title={`Subject: ${sub.subject}`}
                                >
                                  {sub.subject}
                                </span>
                                <div className="pointer-events-none absolute left-0 bottom-full mb-1.5 hidden group-hover:flex flex-col items-center z-50 whitespace-nowrap no-print">
                                  <div className="bg-gray-800 dark:bg-slate-800 text-white text-xs font-semibold py-1 px-2.5 rounded shadow-lg border border-gray-700 dark:border-slate-700">
                                    Subject: {sub.subject}
                                  </div>
                                  <div className="w-2 h-2 -mt-1 rotate-45 bg-gray-800 dark:bg-slate-800"></div>
                                </div>
                              </div>
                            </td>
                            <td className={`py-3 px-4 text-center font-mono font-bold ${
                              isBelow50 ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-slate-200'
                            }`}>
                              {sub.marksObtained}
                            </td>
                            <td className={`py-3 px-4 text-center font-semibold ${
                              isBelow50 ? 'text-red-500 dark:text-red-400' : 'text-primary-600 dark:text-primary-400'
                            }`}>
                              {sub.percentage}
                            </td>
                            <td className={`py-3 px-4 text-center font-bold ${
                              isBelow50 ? 'text-red-500 dark:text-red-400' : 'text-purple-600 dark:text-purple-300'
                            }`}>
                              {sub.grade}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                                isSubPassed
                                  ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                              }`}>
                                {isSubPassed ? 'Pass' : 'Fail'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Remarks */}
            {(resultData.summary.teacherRemarks || resultData.summary.principalRemarks) && (
              <div className="bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 rounded-xl p-4 text-xs text-gray-600 dark:text-slate-300 space-y-1.5 transition-colors duration-300">
                {resultData.summary.teacherRemarks && (
                  <p><span className="text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Teacher Remarks:</span> {resultData.summary.teacherRemarks}</p>
                )}
                {resultData.summary.principalRemarks && (
                  <p><span className="text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Principal Remarks:</span> {resultData.summary.principalRemarks}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="no-print mt-8 pt-6 border-t border-gray-200 dark:border-slate-800/60 flex items-center justify-between text-xs text-gray-400 dark:text-slate-500 transition-colors duration-300">
          <span>&copy; {new Date().getFullYear()} {schoolDisplayName}</span>
          <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 font-medium transition-colors">
            Back to Login Portal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResultSearch;
