import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Printer, FileText, Download, CheckCircle2,
  XCircle, Award, GraduationCap, Building2, User, FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { printElement } from '../../utils/exportHelpers';

const StudentExamResults = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Preserve filters
  const classId = searchParams.get('classId') || '';
  const seasonId = searchParams.get('seasonId') || '';
  const subject = searchParams.get('subject') || 'ALL';
  const examType = searchParams.get('examType') || '';
  const academicYear = searchParams.get('academicYear') || '';

  useEffect(() => {
    fetchStudentData();
  }, [studentId, classId, seasonId, examType, subject]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/exam-results/student/${studentId}`, {
        params: { classId, seasonId, examType, subject },
      });
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch student exam results');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const backQuery = new URLSearchParams({
      classId,
      seasonId,
      subject,
      examType,
      academicYear,
    }).toString();

    navigate(`/exam-results?${backQuery}`);
  };

  const handleDownloadPDF = () => {
    const studentName = (data?.studentInfo?.name || 'Student').replace(/\s+/g, '_');
    const year = data?.studentInfo?.academicYear || '2026';
    const documentTitle = `${studentName}_ExamResult_${year}`;

    // Temporarily set document title for print-to-pdf
    const originalTitle = document.title;
    document.title = documentTitle;
    window.print();
    document.title = originalTitle;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500 font-medium">Loading student exam results...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.studentInfo) {
    return (
      <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Student Result Not Found</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">No exam records could be found for this student and selection.</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Class Results
        </button>
      </div>
    );
  }

  const { school, studentInfo, examDetails, summary, subjectResults } = data;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 print:p-0 print:m-0 print:max-w-none print-sheet">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 11px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden, nav, header, aside {
            display: none !important;
          }
          .print-sheet {
            page-break-after: avoid !important;
            break-after: avoid !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          table {
            width: 100% !important;
            font-size: 11px !important;
          }
          th {
            padding: 4px 6px !important;
            font-size: 10px !important;
          }
          td {
            padding: 4px 6px !important;
          }
        }
      `}</style>
      {/* ACTION HEADER (HIDDEN ON PRINT) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Class Results
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={printElement}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Result
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* PRINT SHEET CONTAINER */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden print:shadow-none print:border-none print:rounded-none">

        {/* COMPACT PRINT SCHOOL HEADER WITH LOGO ALONE IN CENTER */}
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 print:bg-none print:p-0 print:border-b-2 print:border-black print:pb-2">
          <div className="flex flex-col items-center justify-center text-center gap-1.5">
            {school.schoolLogo ? (
              <img
                src={school.schoolLogo}
                alt="School Logo"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl p-1 bg-white border border-gray-200 shadow-md print:border-black"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary-600 text-white rounded-xl flex items-center justify-center shadow-md print:border print:border-black">
                <GraduationCap className="w-10 h-10" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight print:text-black leading-tight">
                {school.schoolName || 'School Management System'}
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 print:text-gray-700">
                {school.schoolAddress || '123 Education Street'} · Phone: {school.schoolPhone || '+1 234 567 8900'} · Email: {school.schoolEmail || 'info@school.edu'}
              </p>
            </div>
            <span className="inline-block px-3 py-0.5 bg-primary-50 text-primary-800 dark:bg-primary-950/80 dark:text-primary-300 text-[11px] font-bold rounded-full uppercase tracking-wider print:border-black print:bg-white print:text-black border border-primary-200 dark:border-primary-800">
              Official Report Card — Academic Year {studentInfo.academicYear}
            </span>
          </div>
        </div>

        {/* STUDENT & EXAM DETAILS HEADER CARD */}
        <div className="p-6 bg-gray-50/50 dark:bg-gray-750/50 border-b border-gray-200 dark:border-gray-700 print:bg-white print:p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block">Student Name</span>
              <span className="font-bold text-gray-900 dark:text-white text-base print:text-black">{studentInfo.name}</span>
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block">Admission Number</span>
              <span className="font-mono font-bold text-primary-600 dark:text-primary-400 print:text-black">{studentInfo.admissionNumber}</span>
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block">Class & Grade</span>
              <span className="font-semibold text-gray-900 dark:text-white print:text-black">{studentInfo.className} ({studentInfo.gradeLevel})</span>
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block">Category</span>
              <span className="font-semibold text-gray-900 dark:text-white print:text-black">{studentInfo.category}</span>
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block">Exam Season</span>
              <span className="font-semibold text-gray-900 dark:text-white print:text-black">{examDetails.seasonName}</span>
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block">Exam Selection</span>
              <span className="font-semibold text-primary-600 dark:text-primary-400 print:text-black">
                {examDetails.examTypeLabel}
              </span>
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block">Subject Filter</span>
              <span className="font-semibold text-gray-900 dark:text-white print:text-black">{examDetails.subjectFilter}</span>
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block">Class Rank</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 text-base print:text-black">
                {summary.classRank}
              </span>
            </div>
          </div>
        </div>

        {/* STUDENT RESULT SUMMARY CARDS */}
        <div className="p-3 px-6 border-b border-gray-200 dark:border-gray-700 print:p-1.5 print:px-3">
          <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 print:mb-1 print:text-[9px]">Overall Performance Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 print:grid-cols-7 print:gap-1">
            <div className="bg-gray-50/70 dark:bg-gray-750 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-center print:border-gray-400 print:p-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium print:text-[8px] print:text-black">Total Subjects</span>
              <span className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5 block print:text-black print:text-xs print:mt-0">{summary.totalSubjects}</span>
            </div>

            <div className="bg-gray-50/70 dark:bg-gray-750 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-center print:border-gray-400 print:p-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium print:text-[8px] print:text-black">Total Marks</span>
              <span className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5 block print:text-black print:text-xs print:mt-0">{summary.totalMarksObtained ?? summary.totalMarks}</span>
            </div>

            <div className="bg-gray-50/70 dark:bg-gray-750 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-center print:border-gray-400 print:p-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium print:text-[8px] print:text-black">Average %</span>
              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 block print:text-black print:text-xs print:mt-0">{summary.average}</span>
            </div>

            <div className="bg-gray-50/70 dark:bg-gray-750 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-center print:border-gray-400 print:p-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium print:text-[8px] print:text-black">Overall Grade</span>
              <span className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5 block print:text-black print:text-xs print:mt-0">{summary.overallGrade}</span>
            </div>

            <div className="bg-gray-50/70 dark:bg-gray-750 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-center print:border-gray-400 print:p-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium print:text-[8px] print:text-black">Passed</span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block print:text-black print:text-xs print:mt-0">{summary.passed}</span>
            </div>

            <div className="bg-gray-50/70 dark:bg-gray-750 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-center print:border-gray-400 print:p-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium print:text-[8px] print:text-black">Failed</span>
              <span className="text-sm font-extrabold text-red-600 dark:text-red-400 mt-0.5 block print:text-black print:text-xs print:mt-0">{summary.failed}</span>
            </div>

            <div className="bg-gray-50/70 dark:bg-gray-750 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-center print:border-gray-400 print:p-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium print:text-[8px] print:text-black">Overall Status</span>
              <span className={`text-sm font-extrabold mt-0.5 block ${
                summary.overallStatus === 'PASS' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              } print:text-black print:text-xs print:mt-0`}>
                {summary.overallStatus}
              </span>
            </div>
          </div>
        </div>

        {/* SUBJECT RESULTS TABLE — Columnar Breakdown (Monthly 1 | Midterm | Monthly 2 | Final | Total) */}
        <div className="p-6 print:p-4">
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Subject Examination Breakdown</h3>

          {subjectResults.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No individual subject exam results available for this selection.
            </div>
          ) : (() => {
            // Collect all unique exam types from all subjects, preserving order
            const allExamTypes = [];
            subjectResults.forEach(r => {
              (r.examBreakdown || []).forEach(b => {
                if (!allExamTypes.includes(b.examType)) allExamTypes.push(b.examType);
              });
            });

            // Column totals
            const colTotals = {};
            allExamTypes.forEach(t => { colTotals[t] = 0; });
            let grandTotal = 0;

            const rows = subjectResults.map((r, idx) => {
              const examMap = {};
              (r.examBreakdown || []).forEach(b => { examMap[b.examType] = b.marksObtained; });
              allExamTypes.forEach(t => { colTotals[t] += (examMap[t] ?? 0); });
              grandTotal += r.marksObtained;
              return { ...r, examMap, idx };
            });

            const avg = rows.length > 0 ? (grandTotal / rows.length).toFixed(2) : '0.00';

            return (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 print:border-black print:rounded-none">
                <table className="w-full text-left text-sm border-collapse">
                  {/* Header */}
                  <thead>
                    <tr className="bg-primary-700 text-white text-xs font-bold uppercase print:bg-gray-800 print:text-white">
                      <th className="px-3 py-3 text-center border border-primary-600 print:border-black w-10">No</th>
                      <th className="px-4 py-3 border border-primary-600 print:border-black">Subjects</th>
                      {allExamTypes.map(t => (
                        <th key={t} className="px-3 py-3 text-center border border-primary-600 print:border-black whitespace-nowrap">{t}</th>
                      ))}
                      <th className="px-3 py-3 text-center border border-primary-600 print:border-black font-extrabold">Total</th>
                      <th className="px-3 py-3 text-center border border-primary-600 print:border-black">Grade</th>
                      <th className="px-3 py-3 text-center border border-primary-600 print:border-black">Status</th>
                    </tr>
                  </thead>

                  {/* Body */}
                  <tbody>
                    {rows.map((r) => {
                      const obt = r.marksObtained ?? r.marks;
                      const isBelow50 = obt !== undefined && obt !== null && Number(obt) < 50;
                      return (
                        <tr
                          key={r.idx}
                          className={`${r.idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'} hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-colors`}
                        >
                          <td className="px-3 py-2.5 text-center text-gray-500 dark:text-gray-400 font-medium text-xs border border-gray-200 dark:border-gray-700 print:border-gray-400 print:text-black">
                            {r.idx + 1}
                          </td>
                          <td className="px-4 py-2.5 font-semibold border border-gray-200 dark:border-gray-700 print:border-gray-400">
                            <div className="relative group inline-block">
                              <span
                                className={`cursor-pointer transition-colors ${
                                  isBelow50 ? 'text-red-600 dark:text-red-400 font-bold print:text-red-600' : 'text-gray-900 dark:text-white print:text-black'
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
                          {allExamTypes.map(t => (
                            <td key={t} className="px-3 py-2.5 text-center border border-gray-200 dark:border-gray-700 print:border-gray-400">
                              {r.examMap[t] !== undefined ? (
                                <span className={`font-mono font-bold text-base ${
                                  isBelow50 ? 'text-red-600 dark:text-red-400 print:text-red-600' : 'text-gray-900 dark:text-white print:text-black'
                                }`}>
                                  {r.examMap[t]}
                                </span>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                          ))}
                          {/* Total */}
                          <td className="px-3 py-2.5 text-center border border-gray-200 dark:border-gray-700 print:border-gray-400">
                            <span className={`font-mono font-extrabold text-lg ${
                              isBelow50 ? 'text-red-600 dark:text-red-400 print:text-red-600' : 'text-primary-700 dark:text-primary-300 print:text-black'
                            }`}>
                              {r.marksObtained}
                            </span>
                          </td>
                          {/* Grade */}
                          <td className="px-3 py-2.5 text-center border border-gray-200 dark:border-gray-700 print:border-gray-400">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                              isBelow50
                                ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 print:bg-none print:text-red-600'
                                : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 print:bg-none print:text-black'
                            }`}>
                              {r.grade}
                            </span>
                          </td>
                          {/* Status */}
                          <td className="px-3 py-2.5 text-center border border-gray-200 dark:border-gray-700 print:border-gray-400">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              r.status === 'Pass' || r.status === 'PASS'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                            } print:bg-none print:text-black`}>
                              {r.status === 'Pass' || r.status === 'PASS' ? <CheckCircle2 className="w-3 h-3 print:hidden" /> : <XCircle className="w-3 h-3 print:hidden" />}
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* TOTAL Row */}
                  <tfoot>
                    <tr className="bg-gray-100 dark:bg-gray-700 font-bold text-gray-800 dark:text-gray-200 border-t-2 border-gray-300 dark:border-gray-600 print:border-black print:bg-gray-200 print:text-black">
                      <td colSpan={2} className="px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 print:border-black print:text-black">
                        TOTAL
                      </td>
                      {allExamTypes.map(t => (
                        <td key={t} className="px-3 py-2.5 text-center font-mono font-extrabold text-base border border-gray-300 dark:border-gray-600 print:border-black print:text-black">
                          {colTotals[t]}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-mono font-extrabold text-lg text-primary-700 dark:text-primary-300 border border-gray-300 dark:border-gray-600 print:border-black print:text-black">
                        {grandTotal}
                      </td>
                      <td colSpan={2} className="border border-gray-300 dark:border-gray-600 print:border-black" />
                    </tr>

                    {/* AVG Row */}
                    <tr className="bg-primary-50 dark:bg-primary-950/30 font-bold print:bg-gray-100 print:text-black">
                      <td colSpan={2} className="px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-primary-700 dark:text-primary-300 border border-gray-300 dark:border-gray-600 print:border-black print:text-black">
                        AVG
                      </td>
                      {allExamTypes.map(t => (
                        <td key={t} className="border border-gray-300 dark:border-gray-600 print:border-black" />
                      ))}
                      <td className="px-3 py-2.5 text-center font-mono font-extrabold text-base text-primary-700 dark:text-primary-300 border border-gray-300 dark:border-gray-600 print:border-black print:text-black">
                        {avg}
                      </td>
                      <td colSpan={2} className="border border-gray-300 dark:border-gray-600 print:border-black" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })()}
        </div>

        {/* PRINT SIGNATURE BLOCK */}
        <div className="p-8 border-t border-gray-200 dark:border-gray-700 mt-6 print:block">
          <div className="grid grid-cols-3 gap-8 text-center pt-6">
            <div className="border-t border-gray-300 dark:border-gray-600 pt-2 print:border-black">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 block print:text-black">Class Teacher</span>
              <span className="text-xs text-gray-400 block mt-6 print:mt-10">Signature & Date</span>
            </div>

            <div className="border-t border-gray-300 dark:border-gray-600 pt-2 print:border-black">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 block print:text-black">Exam Officer</span>
              <span className="text-xs text-gray-400 block mt-6 print:mt-10">Signature & Date</span>
            </div>

            <div className="border-t border-gray-300 dark:border-gray-600 pt-2 print:border-black">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 block print:text-black">Principal</span>
              <span className="text-xs text-gray-400 block mt-6 print:mt-10">Stamp & Signature</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentExamResults;
