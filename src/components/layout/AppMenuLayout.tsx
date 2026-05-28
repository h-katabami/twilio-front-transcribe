import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function AppMenuLayout() {
  const { signOut } = useAuth();

  return (
    <main className="page-layout">
      <header className="page-header page-hero app-shell-header">
        <div className="app-shell-title-row">
          <h1>AIC 書き起こし管理</h1>
          <nav className="menu-bar" aria-label="メインメニュー">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `menu-link${isActive ? " is-active" : ""}`}
            >
              ダッシュボード
            </NavLink>
            <NavLink
              to="/logs"
              className={({ isActive }) => `menu-link${isActive ? " is-active" : ""}`}
            >
              通話ログ
            </NavLink>
          </nav>
        </div>
        <button type="button" onClick={() => void signOut()}>サインアウト</button>
      </header>

      <Outlet />
    </main>
  );
}
