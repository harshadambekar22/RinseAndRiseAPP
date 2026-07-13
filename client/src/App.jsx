import LoadingIcon from './components/LoadingIcon'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ClothSelection from './pages/ClothSelection'
import Schedule from './pages/Schedule'
import Payment from './pages/Payment'
import OrderSuccess from './pages/OrderSuccess'
import Tracking from './pages/Tracking'
import MyOrders from './pages/MyOrders'

import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import Transactions from './pages/admin/Transactions'
import Users from './pages/admin/Users'
import ShopBilling from './pages/admin/ShopBilling'
import Offers from './pages/admin/Offers'
import Categories from './pages/admin/Categories'
import Prices from './pages/admin/Prices'
import Features from './pages/admin/Features'
import ApiKeys from './pages/admin/ApiKeys'
import Settings from './pages/admin/Settings'

export default function App() {
  const { ready } = useAuth()
  const location = useLocation()
  const isAdminArea = location.pathname.startsWith('/admin')

  if (!ready) return <div className="loading-wrap"><LoadingIcon /></div>

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Order flow — selection & payment require sign-in via ProtectedRoute */}
        <Route path="/order" element={<ClothSelection />} />
        <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
        <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
        <Route path="/order/success/:id" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
        <Route path="/track/:id" element={<ProtectedRoute><Tracking /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />

        {/* Admin dashboard */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="offers" element={<Offers />} />
          <Route path="categories" element={<Categories />} />
          <Route path="prices" element={<Prices />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="users" element={<Users />} />
          <Route path="billing" element={<ShopBilling />} />
          <Route path="features" element={<Features />} />
          <Route path="apikeys" element={<ApiKeys />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isAdminArea && <Footer />}
    </>
  )
}
