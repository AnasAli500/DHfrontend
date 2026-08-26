import { useRef } from 'react';
import { Printer, X, Award, CheckCircle2, XCircle, UserCheck } from 'lucide-react';

const ResultCardModal = ({ open, onClose, cardData }) => {
  const printRef = useRef(null);

  if (!open || !cardData) return null;

  const { school, student, season, processed, subjectExams, attendanceSummary } = cardData;

  const handlePrint = () => {
    window.print();
  };

  const isPassed = processed?.isOverallPassed;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-card, #printable-report-card * {
            visibility: visible;
          }
          #printable-report-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
        {/* Action Header */}
        <div className="no-print flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-600" />
            <h3 className="font-bold text-gray-900 dark:text-white">Student Official Report Card</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="btn-primary flex items-center gap-2 text-sm py-1.5 px-4">
              <Printer className="w-4 h-4" /> Print / Export PDF
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div id="printable-report-card" ref={printRef} className="p-8 space-y-6 bg-white text-gray-900">
          {/* COMPACT School Header WITH CENTERED LOGO ALONE */}
          <div className="flex flex-col items-center justify-center text-center border-b-2 border-primary-600 pb-3 space-y-1">
            {school.schoolLogo ? (
              <img
                src={school.schoolLogo}
                alt="School Logo"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl p-1 border border-gray-200 bg-white shadow-md"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
                SMS
              </div>
            )}
            <div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">{school.schoolName || 'DEMO HIGH SCHOOL'}</h1>
              <p className="text-[11px] text-gray-600">{school.schoolAddress || '123 Education Street'} · {school.schoolPhone || '+252 61 000 0000'} · {school.schoolEmail || 'info@school.edu.so'}</p>
            </div>
            <span className="inline-block px-3 py-0.5 bg-primary-100 text-primary-800 text-[11px] font-bold rounded-full uppercase tracking-wider">
              Official Report Card — {season.name} ({student.academicYear})
            </span>
          </div>

          {/* Student Information Grid */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm">
            <div>
              <span className="text-xs text-gray-500 block uppercase font-medium">Student Name</span>
              <strong className="text-gray-900">{student.name}</strong>
            </div>
            <div>
              <span className="text-xs text-gray-500 block uppercase font-medium">Admission No</span>
              <strong className="font-mono text-primary-700">{student.studentId}</strong>
            </div>
            <div>
              <span className="text-xs text-gray-500 block uppercase font-medium">Class / Category</span>
              <strong className="text-gray-900">{student.className} ({student.categoryName})</strong>
            </div>
            <div>
              <span className="text-xs text-gray-500 block uppercase font-medium">Gender</span>
              <strong className="text-gray-900">{student.gender || 'N/A'}</strong>
            </div>
          </div>

          {/* Subject Performance Table */}
          <div>
            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">Subject Performance</h4>
            <table className="w-full text-sm border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100 text-gray-800 text-xs uppercase">
                  <th className="border border-gray-300 p-2 text-left">#</th>
                  <th className="border border-gray-300 p-2 text-left">Subject</th>
                  <th className="border border-gray-300 p-2 text-center">Obtained</th>
                  <th className="border border-gray-300 p-2 text-center">%</th>
                  <th className="border border-gray-300 p-2 text-center">Grade</th>
                  <th className="border border-gray-300 p-2 text-center">Attendance</th>
                  <th className="border border-gray-300 p-2 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {subjectExams.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-gray-500 text-xs">No exam records found for this season.</td>
                  </tr>
                ) : (
                  subjectExams.map((e, idx) => (
                    <tr key={e._id || idx} className="border-b border-gray-200">
                      <td className="border border-gray-300 p-2 text-gray-500 font-mono text-xs">{idx + 1}</td>
                      <td className="border border-gray-300 p-2 font-medium">{e.subject}</td>
                      <td className="border border-gray-300 p-2 text-center font-extrabold text-base text-primary-700">{e.marks}</td>
                      <td className="border border-gray-300 p-2 text-center font-bold">{e.percentage}%</td>
                      <td className="border border-gray-300 p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          e.grade === 'A+' || e.grade === 'A' ? 'bg-green-100 text-green-800' :
                          e.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                          e.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                          e.grade === 'D' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {e.grade}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-2 text-center text-xs">{e.attendance}</td>
                      <td className="border border-gray-300 p-2 text-xs text-gray-600">{e.remarks || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Overall Summary & Badges */}
          <div className="grid grid-cols-3 gap-4">
            {/* Overall Score Summary */}
            <div className="col-span-2 border border-gray-300 rounded-xl p-4 bg-gray-50 flex justify-between items-center">
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold">Total Score</span>
                <div className="text-2xl font-black text-gray-900">
                  {processed?.totalMarksObtained ?? 0}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Overall Percentage: <strong className="text-gray-900">{processed?.percentage ?? 0}%</strong> · Grade: <strong className="text-primary-700">{processed?.overallGrade || 'N/A'}</strong> · GPA: <strong className="text-gray-900">{processed?.gpa ?? 0}</strong>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 uppercase font-semibold block">Class Position</span>
                <span className="text-3xl font-black text-primary-700">{processed?.position || 'N/A'}</span>
              </div>
            </div>

            {/* Status Badge */}
            <div className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center ${
              isPassed ? 'bg-green-50 border-green-300 text-green-900' : 'bg-red-50 border-red-300 text-red-900'
            }`}>
              {isPassed ? <CheckCircle2 className="w-8 h-8 text-green-600 mb-1" /> : <XCircle className="w-8 h-8 text-red-600 mb-1" />}
              <span className="text-xs uppercase font-bold tracking-wider">Result Status</span>
              <strong className="text-lg font-black">{isPassed ? 'PASSED / PROMOTED' : 'FAILED / NEEDS RETAKE'}</strong>
            </div>
          </div>

          {/* Attendance Breakdown */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 flex items-center justify-around text-xs">
            <div className="flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-green-600" /> Present: <strong>{attendanceSummary?.present || 0}</strong></div>
            <div className="flex items-center gap-1.5"><XCircle className="w-4 h-4 text-red-500" /> Absent: <strong>{attendanceSummary?.absent || 0}</strong></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Excused: <strong>{attendanceSummary?.excused || 0}</strong></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Late: <strong>{attendanceSummary?.late || 0}</strong></div>
          </div>

          {/* Remarks & Signatures */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-300 text-xs">
            <div>
              <span className="font-bold text-gray-800 uppercase block mb-1">Teacher Remarks:</span>
              <p className="p-2 bg-gray-50 border border-gray-200 rounded text-gray-700 italic">{processed?.teacherRemarks || 'Good effort throughout the season.'}</p>
              <div className="mt-8 border-b border-gray-400 w-48"></div>
              <span className="text-[10px] text-gray-500">Class Teacher Signature</span>
            </div>
            <div>
              <span className="font-bold text-gray-800 uppercase block mb-1">Principal Remarks:</span>
              <p className="p-2 bg-gray-50 border border-gray-200 rounded text-gray-700 italic">{processed?.principalRemarks || 'Satisfactory academic progress.'}</p>
              <div className="mt-8 border-b border-gray-400 w-48"></div>
              <span className="text-[10px] text-gray-500">Principal Signature & Stamp</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultCardModal;
