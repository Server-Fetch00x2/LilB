import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import NoteDetail from './pages/NoteDetail';
import CalendarPage from './pages/CalendarPage';
import SettingsPage from './pages/SettingsPage';
import Layout from './components/Layout';
import PinLock from './components/PinLock';

function ProtectedRoute({ children }) {
  const { isAuthenticated, pinVerified, hasPin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (hasPin && !pinVerified) return <PinLock />;
  return children;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="notes" element={<Navigate to="/" />} />
        <Route path="note/new" element={<NoteDetail />} />
        <Route path="note/:id" element={<NoteDetail />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
