import { requireAuth } from "@/app/lib/auth/session";
import { Sidebar } from "@/app/components/layout/sidebar";
import { SignOutButton } from "@/app/components/layout/sign-out";
export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAuth();
  return <div className="app-shell"><Sidebar/><div className="main-column"><header className="topbar"><span className="topbar-label">COMMERCIAL FLEET · KENYA</span><div className="user-info"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span>{user.name}</span><SignOutButton/></div></header><main className="content">{children}</main></div></div>;
}
