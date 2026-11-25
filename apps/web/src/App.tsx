import { Navigate, Route, Routes } from 'react-router'
import AdminGuard from './components/admin-guard'
import Layout from './components/layout'
import ProtectedRoute from './components/protected-route'
import GymDetailPage from './pages/GymDetailPage'
import GymNewPage from './pages/GymNewPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import NotificationsPage from './pages/NotificationsPage'
import RegisterPage from './pages/RegisterPage'
import GymManager from './pages/admin/GymManager'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/gyms" element={<Navigate to="/" replace />} />
        <Route
          path="/gyms/new"
          element={
            <ProtectedRoute>
              <GymNewPage />
            </ProtectedRoute>
          }
        />
        <Route path="/gyms/:id" element={<GymDetailPage />} />
        <Route
          path="/admin/gyms"
          element={
            <AdminGuard>
              <GymManager />
            </AdminGuard>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
