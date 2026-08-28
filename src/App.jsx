import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/common/LoadingSpinner';

import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import ResultSearch from './pages/auth/ResultSearch';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';

import AdminDashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import Students from './pages/admin/Students';
import Teachers from './pages/admin/Teachers';
import Classes from './pages/admin/Classes';
import Periods from './pages/admin/Periods';
import AdminAttendance from './pages/admin/Attendance';
import AdminExams from './pages/admin/Exams';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';
import Promotion from './pages/admin/Promotion';
import Finance from './pages/admin/Finance';

import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherAttendance from './pages/teacher/Attendance';
import TeacherExams from './pages/teacher/Exams';

import StudentDashboard from './pages/student/Dashboard';
import StudentAttendance from './pages/student/Attendance';
import ExamResults from './pages/student/ExamResults';

import ViewExamResults from './pages/exam-results/ViewExamResults';
import StudentExamResults from './pages/exam-results/StudentExamResults';

const RoleRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}/dashboard`} replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/result-search" element={<ResultSearch />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password/:token" element={<ResetPassword />} />
    <Route path="/" element={<RoleRedirect />} />

    {/* View Exam Results Module Routes */}
    <Route path="/exam-results" element={<ProtectedRoute roles={['admin', 'teacher']}><Layout><ViewExamResults /></Layout></ProtectedRoute>} />
    <Route path="/exam-results/student/:studentId" element={<ProtectedRoute roles={['admin', 'teacher']}><Layout><StudentExamResults /></Layout></ProtectedRoute>} />

    {/* Admin Routes */}
    <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
    <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><Layout><Users /></Layout></ProtectedRoute>} />
    <Route path="/admin/students" element={<ProtectedRoute roles={['admin']}><Layout><Students /></Layout></ProtectedRoute>} />
    <Route path="/admin/teachers" element={<ProtectedRoute roles={['admin']}><Layout><Teachers /></Layout></ProtectedRoute>} />
    <Route path="/admin/classes" element={<ProtectedRoute roles={['admin']}><Layout><Classes /></Layout></ProtectedRoute>} />
    <Route path="/admin/periods" element={<ProtectedRoute roles={['admin']}><Layout><Periods /></Layout></ProtectedRoute>} />
    <Route path="/admin/attendance" element={<ProtectedRoute roles={['admin']}><Layout><AdminAttendance /></Layout></ProtectedRoute>} />
    <Route path="/admin/exams" element={<ProtectedRoute roles={['admin']}><Layout><AdminExams /></Layout></ProtectedRoute>} />
    <Route path="/admin/view-exam-results" element={<ProtectedRoute roles={['admin']}><Layout><ViewExamResults /></Layout></ProtectedRoute>} />
    <Route path="/admin/promotion" element={<ProtectedRoute roles={['admin']}><Layout><Promotion /></Layout></ProtectedRoute>} />
    <Route path="/admin/finance" element={<ProtectedRoute roles={['admin']}><Layout><Finance /></Layout></ProtectedRoute>} />
    <Route path="/admin/reports" element={<ProtectedRoute roles={['admin']}><Layout><Reports /></Layout></ProtectedRoute>} />
    <Route path="/admin/settings" element={<ProtectedRoute roles={['admin']}><Layout><Settings /></Layout></ProtectedRoute>} />

    {/* Teacher Routes */}
    <Route path="/teacher/dashboard" element={<ProtectedRoute roles={['teacher']}><Layout><TeacherDashboard /></Layout></ProtectedRoute>} />
    <Route path="/teacher/attendance" element={<ProtectedRoute roles={['teacher']}><Layout><TeacherAttendance /></Layout></ProtectedRoute>} />
    <Route path="/teacher/exams" element={<ProtectedRoute roles={['teacher']}><Layout><TeacherExams /></Layout></ProtectedRoute>} />
    <Route path="/teacher/view-exam-results" element={<ProtectedRoute roles={['teacher']}><Layout><ViewExamResults /></Layout></ProtectedRoute>} />

    {/* Student Routes */}
    <Route path="/student/dashboard" element={<ProtectedRoute roles={['student']}><Layout><StudentDashboard /></Layout></ProtectedRoute>} />
    <Route path="/student/attendance" element={<ProtectedRoute roles={['student']}><Layout><StudentAttendance /></Layout></ProtectedRoute>} />
    <Route path="/student/exams" element={<ProtectedRoute roles={['student']}><Layout><ExamResults /></Layout></ProtectedRoute>} />

    {/* Shared */}
    <Route path="/profile" element={<ProtectedRoute roles={['admin', 'teacher', 'student']}><Layout><Profile /></Layout></ProtectedRoute>} />

    <Route path="/unauthorized" element={<NotFound />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <ThemeProvider>
    <SettingsProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        </BrowserRouter>
      </AuthProvider>
    </SettingsProvider>
  </ThemeProvider>
);

export default App;
