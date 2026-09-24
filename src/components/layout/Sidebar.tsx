import { Activity, BarChart3, ClipboardList, Database, FileText, FolderOpen, LayoutDashboard, Package, ScrollText, ShoppingBag, Sparkles, Truck, UserCog, Users, X, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import { useProject } from '../../context/ProjectContext'
import type { AppModule } from '../../types/permission.types'

interface Props { open: boolean; onClose: () => void }
interface Item { label: string; path: string; icon: LucideIcon; module?: AppModule; admin?: boolean }

const operationItems: Item[] = [
  { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { label: 'Clientes', path: '/app/clientes', icon: Users, module: 'clients' },
  { label: 'Ventas', path: '/app/ventas', icon: ShoppingBag, module: 'sales' },
  { label: 'Productos', path: '/app/productos', icon: Package, module: 'products' },
  { label: 'Envíos', path: '/app/envios', icon: Truck, module: 'shipments' },
  { label: 'Actividades', path: '/app/actividades', icon: Activity, module: 'activities' },
]

const analysisItems: Item[] = [
  { label: 'Documentación', path: '/app/documentacion', icon: FileText, module: 'documentation' },
  { label: 'Datasets', path: '/app/datasets', icon: Database, module: 'datasets' },
  { label: 'Insights', path: '/app/insights', icon: Sparkles, module: 'insights' },
]

const administrationItems: Item[] = [
  { label: 'Solicitudes', path: '/admin/solicitudes', icon: ClipboardList, admin: true },
  { label: 'Usuarios y permisos', path: '/admin/usuarios', icon: UserCog, admin: true },
  { label: 'Auditoría', path: '/admin/auditoria', icon: ScrollText, admin: true },
]

function MenuLink({ item, onClick }: { item: Item; onClick: () => void }) {
  const Icon = item.icon
  return <NavLink to={item.path} onClick={onClick} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'}`}>
    {({ isActive }) => <><Icon size={18} strokeWidth={1.8} className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} /><span>{item.label}</span></>}
  </NavLink>
}

function MenuGroup({ title, items, onClose }: { title: string; items: Item[]; onClose: () => void }) {
  if (items.length === 0) return null
  return <section className="mt-7 first:mt-0">
    <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{title}</p>
    <div className="space-y-1">{items.map((item) => <MenuLink key={item.path} item={item} onClick={onClose} />)}</div>
  </section>
}

export default function Sidebar({ open, onClose }: Props) {
  const { isAdmin, can } = useAuth()
  const { activeProject } = useProject()
  const visible = (items: Item[]) => items.filter((item) => item.admin ? isAdmin : !item.module || can(item.module))

  return <>
    {open && <button type="button" aria-label="Cerrar menú" onClick={onClose} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[var(--border-soft)] bg-[var(--sidebar)] transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="flex h-20 items-center justify-between border-b border-[var(--border-soft)] px-6"><span className="flex items-center gap-3 font-semibold tracking-tight text-[var(--text-primary)]"><i className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent)] text-white"><BarChart3 size={19} /></i>Kargia</span><button type="button" onClick={onClose} className="rounded-lg p-2 text-[var(--text-secondary)] lg:hidden"><X size={18} /></button></div>
      <nav className="flex-1 overflow-y-auto px-4 py-5">
        {activeProject && <div className="mb-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] px-3 py-2.5"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Proyecto activo</p><p className="mt-1 truncate text-xs font-semibold text-[var(--text-primary)]">{activeProject.name}</p></div>}
        <MenuGroup title="Operación" items={visible(operationItems)} onClose={onClose} />
        <MenuGroup title="Datos y análisis" items={visible(analysisItems)} onClose={onClose} />
        <MenuGroup title="Colaboración" items={[{ label: 'Mis proyectos', path: '/app/proyectos', icon: FolderOpen }]} onClose={onClose} />
        <MenuGroup title="Administración" items={visible(administrationItems)} onClose={onClose} />
      </nav>
    </aside>
  </>
}
