import { NavLink, Outlet, Link } from 'react-router-dom'
import { LayoutDashboard, Receipt, Users as UsersIcon, ScanLine, Tag, Shapes, IndianRupee, ToggleLeft, KeyRound, Settings as SettingsIcon, ExternalLink } from 'lucide-react'

export default function AdminLayout() {
  return (
    <div className="admin">
      <aside className="admin-side">
        <NavLink to="/admin" end><LayoutDashboard size={17} /> Dashboard</NavLink>
        <NavLink to="/admin/offers"><Tag size={17} /> Offers</NavLink>
        <NavLink to="/admin/categories"><Shapes size={17} /> Categories</NavLink>
        <NavLink to="/admin/prices"><IndianRupee size={17} /> Prices</NavLink>
        <NavLink to="/admin/transactions"><Receipt size={17} /> Transactions</NavLink>
        <NavLink to="/admin/users"><UsersIcon size={17} /> Customers</NavLink>
        <NavLink to="/admin/billing"><ScanLine size={17} /> Counter billing</NavLink>
        <NavLink to="/admin/features"><ToggleLeft size={17} /> Features</NavLink>
        <NavLink to="/admin/apikeys"><KeyRound size={17} /> API Keys</NavLink>
        <NavLink to="/admin/settings"><SettingsIcon size={17} /> Settings</NavLink>
        <Link to="/" style={{ marginTop: 'auto' }}><ExternalLink size={16} /> Back to site</Link>
      </aside>
      <section className="admin-main">
        <Outlet />
      </section>
    </div>
  )
}
