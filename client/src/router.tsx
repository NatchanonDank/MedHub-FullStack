import { createBrowserRouter, NavLink, Outlet, Link, useNavigate } from 'react-router';
import { MedListPage } from './pages/MedListPage';
import { MedDetailPage } from './pages/MedDetailPage';
import { InteractionCheckerPage } from './pages/InteractionCheckerPage';
import { MyKitPage } from './pages/MyKitPage';
import { SymptomReportPage } from './pages/SymptomReportPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AuthModal } from './components/AuthModal';
import { useMedStore } from './stores/useMedStore';
import { useMyKit } from './hooks/useMedications';

function RootLayout() {
  const { user, logout, openAuthModal } = useMedStore();
  const { kitItems = [] } = useMyKit();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
      isActive
        ? 'bg-primary text-primary-content font-semibold'
        : 'text-base-content/80 hover:bg-base-200 hover:text-base-content'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-base-200/60">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-base-100/95 backdrop-blur border-b border-base-300 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/icon.png" alt="MedHub" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-xl font-extrabold tracking-tight text-primary">MedHub</span>
            {isAdmin && (
              <span className="badge badge-warning badge-sm px-2.5 py-2.5 font-bold text-warning-content tracking-wide">
                ADMIN
              </span>
            )}
          </Link>

          {/* Desktop Menu */}
          <nav className="hidden lg:flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              ข้อมูลยา
            </NavLink>
            <NavLink to="/interactions" className={navLinkClass}>
              เช็กยาตีกัน
            </NavLink>
            <NavLink to="/my-kit" className={({ isActive }) => `${navLinkClass({ isActive })} inline-flex items-center gap-2`}>
              <span>กระเป๋ายา</span>
              {user && kitItems.length > 0 && (
                <span className="badge badge-secondary badge-sm px-1.5 py-0.5 font-semibold leading-none">
                  {kitItems.length}
                </span>
              )}
            </NavLink>
            <NavLink to="/reports" className={navLinkClass}>
              รายงานอาการ
            </NavLink>

            {/* เมนูพิเศษที่ปรากฏเฉพาะบัญชี ADMIN เท่านั้น */}
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `ml-1 px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-warning text-warning-content shadow-sm'
                      : 'bg-warning/15 text-warning hover:bg-warning/25 border border-warning/40'
                  }`
                }
              >
                <span>จัดการ</span>
              </NavLink>
            )}
          </nav>

          {/* Auth Controls & Mobile Drawer Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex flex-col items-end text-xs leading-tight whitespace-nowrap">
                  <span className="font-bold text-base-content">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn btn-sm btn-outline btn-error whitespace-nowrap"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <button onClick={openAuthModal} className="btn btn-sm btn-primary px-4">
                เข้าสู่ระบบ
              </button>
            )}

            {/* Mobile Hamburger Menu */}
            <div className="dropdown dropdown-end lg:hidden">
              <label tabIndex={0} className="btn btn-ghost btn-square">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </label>
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content mt-3 z-[50] p-3 shadow-lg bg-base-100 rounded-2xl w-64 border border-base-300 space-y-1"
              >
                <li>
                  <NavLink to="/" end>
                    ข้อมูลยา
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/interactions">เช็กยาตีกัน</NavLink>
                </li>
                <li>
                  <NavLink to="/my-kit">
                    กระเป๋ายา {user && kitItems.length > 0 ? `(${kitItems.length})` : ''}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/reports">รายงานอาการ</NavLink>
                </li>
                {isAdmin && (
                  <li className="pt-2 border-t border-base-200">
                    <NavLink
                      to="/admin"
                      className="bg-warning/20 text-warning font-bold hover:bg-warning/30"
                    >
                      จัดการระบบ (Admin)
                    </NavLink>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-base-100 border-t border-base-300 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-base-content/60">
          <p>© 2026 MedHub — Full-Stack Medication Database & Community Pharmacovigilance</p>
          <p>ข้อมูลยาเพื่อการศึกษาอ้างอิงจาก @pharmacology.studies</p>
        </div>
      </footer>

      {/* Global Auth Modal */}
      <AuthModal />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <MedListPage /> },
      { path: 'med/:id', element: <MedDetailPage /> },
      { path: 'medications/:id', element: <MedDetailPage /> },
      { path: 'interactions', element: <InteractionCheckerPage /> },
      { path: 'my-kit', element: <MyKitPage /> },
      { path: 'reports', element: <SymptomReportPage /> },
      { path: 'admin', element: <AdminDashboardPage /> },
    ],
  },
]);