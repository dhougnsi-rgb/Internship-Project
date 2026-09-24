import { Outlet } from 'react-router-dom'
import Sidebar from './sidebar'
import Topbar from './topbar'

export default function AppLayout() {
	return (
		<div className="dashboard-shell">
			<Sidebar />
			<main className="dashboard-main">
				<Topbar />
				<section className="dashboard-content">
					<Outlet />
				</section>
			</main>
		</div>
	)
}
