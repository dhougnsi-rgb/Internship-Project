import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { apiCall } from '../api'

const sicknessColors = ['#0066ff', '#00c9b1', '#ff6b35', '#f7c59f', '#6a4c93']

type ChartEntry = { name: string; value: number }

type Stats = {
  total_patients: number
  total_consultations: number
  total_translations: number
  pending_appointments: number
  diagnosis_data: ChartEntry[]
  language_data: ChartEntry[]
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    total_patients: 0,
    total_consultations: 0,
    total_translations: 0,
    pending_appointments: 0,
    diagnosis_data: [],
    language_data: [],
  })

  useEffect(() => {
    apiCall('/dashboard/stats')
      .then((data: Stats) => setStats(data))
      .catch(() => {/* silently keep zeros if request fails */})
  }, [])

  const { diagnosis_data, language_data } = stats

  return (
    <section className="dashboard-content">
      <h1>Dashboard</h1>
      <div className="dashboard-boxes">
        <div className="empty-state">
          <h3>Total Patients</h3>
          <h3>{stats.total_patients}</h3>
          <small>Patients enregistrés sur la plateforme</small>
        </div>
        <div className="empty-state">
          <h3>Consultations</h3>
          <h3>{stats.total_consultations}</h3>
          <small>Consultations enregistrées</small>
        </div>
        <div className="empty-state">
          <h3>Rendez-vous en attente</h3>
          <h3>{stats.pending_appointments}</h3>
          <small>Demandes de rendez-vous en attente</small>
        </div>
      </div>

      <div className="charts-grid">
        <section className="chart-card">
          <div className="chart-heading">
            <div>
              <p className="chart-eyebrow">Patients</p>
              <h2>Maladies les plus fréquentes</h2>
            </div>
            <span className="chart-period">Cette année</span>
          </div>
          <div className="recharts-pie-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={diagnosis_data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92}>
                  {diagnosis_data.map((item, index) => (
                    <Cell key={item.name} fill={sicknessColors[index % sicknessColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
            {diagnosis_data.length === 0 && (
              <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: 8 }}>Aucune donnée disponible</p>
            )}
            {diagnosis_data.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                {diagnosis_data.map((item, i) => (
                  <li key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#374151' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: sicknessColors[i % sicknessColors.length], display: 'inline-block' }} />
                    {item.name} ({item.value})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="chart-card">
          <div className="chart-heading">
            <div>
              <p className="chart-eyebrow">Langues</p>
              <h2>Patients par langue</h2>
            </div>
            <span className="chart-period">Total: {language_data.reduce((sum, d) => sum + d.value, 0)}</span>
          </div>
          <div className="recharts-bar-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={language_data} margin={{ top: 16, right: 8, left: -16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eef6" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#b9c8da' }} tickLine={false} />
                <YAxis tick={{ fill: '#8a98aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(45, 115, 213, 0.08)' }} />
                <Bar dataKey="value" fill="#0066ff" radius={[7, 7, 0, 0]} barSize={70} />
              </BarChart>
            </ResponsiveContainer>
            {language_data.length === 0 && (
              <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: 8 }}>Aucune donnée disponible</p>
            )}
          </div>
          <p className="axis-caption">Nombre de traductions</p>
        </section>
      </div>
    </section>
  )
}
