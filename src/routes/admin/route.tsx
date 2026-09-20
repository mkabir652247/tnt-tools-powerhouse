import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  Settings,
  Tags,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw redirect({ to: "/" });
    return { user: data.user };
  },
  component: AdminLayout,
  errorComponent: ({ error }) => (
    <div className="container-tnt py-16 text-center">
      <h1 className="font-display text-xl font-bold uppercase">Admin panel didn't load</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="container-tnt py-16 text-center text-muted-foreground">Page not found.</div>
  ),
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package, exact: false },
  { to: "/admin/categories", label: "Categories", icon: Tags, exact: false },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes, exact: false },
  { to: "/admin/orders", label: "Orders", icon: Receipt, exact: false },
  { to: "/admin/customers", label: "Customers", icon: Users, exact: false },
  { to: "/admin/settings", label: "Settings", icon: Settings, exact: false },
] as const;

function AdminLayout() {
  const { user } = Route.useRouteContext();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside
        className={`${open ? "block" : "hidden"} border-b border-border bg-surface lg:sticky lg:top-0 lg:block lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r`}
      >
        <div className="hidden px-4 py-5 lg:block">
          <Logo />
        </div>
        <nav className="flex flex-col p-2">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              onClick={() => setOpen(false)}
              activeProps={{ className: "bg-primary/15 text-primary" }}
              className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <item.icon width={17} height={17} />
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={signOut}
            className="mt-2 flex items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm font-semibold text-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut width={17} height={17} />
            Sign out
          </button>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-sm border border-border lg:hidden"
          >
            {open ? <X width={18} height={18} /> : <Menu width={18} height={18} />}
          </button>
          <span className="font-display text-sm font-bold uppercase tracking-wide">
            TNT Tools Admin
          </span>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/" className="text-xs text-muted-foreground hover:text-primary">
              View store
            </Link>
            <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground sm:block">
              {user.email}
            </span>
          </div>
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
