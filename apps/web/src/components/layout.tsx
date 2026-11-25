import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '@/contexts/auth-context'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    setUserMenuOpen(false)
    navigate('/')
  }

  return (
    <>
      <nav className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex shrink-0 items-center gap-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 text-white shadow-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.4 14.4 9.6 9.6" />
                  <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" />
                  <path d="m21.5 21.5-1.4-1.4" />
                  <path d="M3.9 3.9 2.5 2.5" />
                  <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" />
                </svg>
              </span>
              <span className="text-gradient text-base font-bold">健身地图</span>
            </Link>

            <div className="hidden items-center gap-1 text-sm sm:flex">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `rounded-md px-2 py-1 ${isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent'}`
                }
              >
                地图
              </NavLink>
              {user && (
                <NavLink
                  to="/notifications"
                  className={({ isActive }) =>
                    `rounded-md px-2 py-1 ${isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent'}`
                  }
                >
                  通知
                </NavLink>
              )}
              {user?.role === 'ADMIN' && (
                <NavLink
                  to="/admin/gyms"
                  className={({ isActive }) =>
                    `rounded-md px-2 py-1 ${isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent'}`
                  }
                >
                  审核
                </NavLink>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/gyms/new"
              className="hidden rounded-full border border-input px-3 py-1.5 text-sm hover:bg-accent sm:inline-block"
            >
              + 提交健身房
            </Link>
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-accent"
                >
                  <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-muted text-sm">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      (user.nickname?.[0] ?? user.email[0] ?? '用').toUpperCase()
                    )}
                  </span>
                  <span className="hidden text-sm sm:inline">{user.nickname ?? user.email}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-1 w-40 rounded-md border bg-background p-1 shadow-md">
                    {user.role === 'ADMIN' && (
                      <Link
                        to="/admin/gyms"
                        onClick={() => setUserMenuOpen(false)}
                        className="block rounded px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        健身房审核
                      </Link>
                    )}
                    <Link
                      to="/notifications"
                      onClick={() => setUserMenuOpen(false)}
                      className="block rounded px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      通知
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      退出
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
                登录
              </Link>
            )}
          </div>
        </div>
      </nav>
      <Outlet />
    </>
  )
}
