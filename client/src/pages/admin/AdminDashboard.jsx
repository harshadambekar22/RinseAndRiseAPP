import LoadingIcon from '../../components/LoadingIcon'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [s, setS] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/summary')
      .then(({ data }) => setS(data))
      .catch(() => setError('Could not load the dashboard.'))
  }, [])

  if (error) return <div className="alert-error">{error}</div>
  if (!s) return <div className="loading-wrap"><LoadingIcon /><span>Loading dashboard…</span></div>

  const cards = [
    { label: 'Revenue (all time)', value: inr(s.revenueTotal), tone: 'teal' },
    { label: 'Revenue today',      value: inr(s.revenueToday), tone: 'amber' },
    { label: 'Total orders',       value: s.totalOrders, to: '/admin/transactions' },
    { label: 'Orders today',       value: s.ordersToday },
    { label: 'Pending pickups',    value: s.pendingPickups },
    { label: 'In cleaning',        value: s.inCleaning },
    { label: 'Customers',          value: s.customerCount, to: '/admin/users' },
  ]

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <p className="muted" style={{ marginTop: 0 }}>A snapshot of today and overall performance.</p>
      <div className="stats" style={{ marginTop: 16 }}>
        {cards.map((c) => {
          const Tag = c.to ? 'button' : 'div'
          return (
            <Tag
              className={`stat ${c.to ? 'stat-link' : ''}`}
              key={c.label}
              type={c.to ? 'button' : undefined}
              onClick={c.to ? () => navigate(c.to) : undefined}
            >
              <div className="label">{c.label}</div>
              <div className={`value ${c.tone || ''}`}>{c.value}</div>
            </Tag>
          )
        })}
      </div>
    </>
  )
}
