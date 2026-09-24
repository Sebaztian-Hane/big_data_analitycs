import { FolderOpen, FolderPlus, Settings, Users } from 'lucide-react'
import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import CreateProjectModal from '../../components/projects/CreateProjectModal'
import { useAuth } from '../../context/AuthContext'
import { useProject } from '../../context/ProjectContext'

const myAiUrl = import.meta.env.VITE_MY_AI_URL || 'https://my-ai-brown-beta.vercel.app/'

export default function ProjectsPage() {
  const { projects, activeProject, setActiveProject, loading } = useProject()
  const { isAdmin } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  const openMyAi = () => window.open(myAiUrl, '_blank', 'noopener,noreferrer')
  const activate = (event: MouseEvent, project: (typeof projects)[number]) => {
    event.stopPropagation()
    setActiveProject(project)
  }
  const openSettings = (event: MouseEvent, projectId: string) => {
    event.stopPropagation()
    navigate(`/admin/proyectos/${projectId}`)
  }
  const openFromKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openMyAi() }
  }

  return <div className="space-y-6">
    <section className="flex items-end justify-between gap-4">
      <div><p className="text-sm font-medium text-[var(--accent)]">{isAdmin ? 'Administración' : 'Colaboración'}</p><h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">Proyectos</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Selecciona un proyecto o abre su acceso a My_AI.</p></div>
      {isAdmin && <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"><FolderPlus size={16}/>Nuevo proyecto</button>}
    </section>
    {loading ? <p className="py-16 text-center text-sm text-[var(--text-muted)]">Cargando proyectos...</p> : projects.length === 0 ? <p className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-muted)]">No perteneces a ningún proyecto.</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => <article key={project.id} role="link" tabIndex={0} aria-label={`Abrir ${project.name} en My_AI`} onClick={openMyAi} onKeyDown={openFromKeyboard} className={`cursor-pointer rounded-2xl border bg-[var(--surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${activeProject?.id === project.id ? 'border-[var(--accent)]' : 'border-[var(--border-soft)]'}`}>
        <div className="flex items-start justify-between"><FolderOpen className="text-[var(--accent)]"/>{isAdmin && <button aria-label="Configurar proyecto" onClick={(event) => openSettings(event, project.id)} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"><Settings size={16}/></button>}</div>
        <h3 className="mt-4 font-semibold text-[var(--text-primary)]">{project.name}</h3><p className="mt-2 min-h-10 text-sm text-[var(--text-secondary)]">{project.description || 'Sin descripción'}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]"><span className="flex items-center gap-1"><Users size={13}/>{project.memberCount}</span><button onClick={(event) => activate(event, project)} className="font-medium text-[var(--accent)]">{activeProject?.id === project.id ? 'Activo' : 'Activar'}</button></div>
      </article>)}
    </div>}
    {isAdmin && showCreate && <CreateProjectModal
      onClose={() => setShowCreate(false)}
      onCreated={(id) => { setShowCreate(false); navigate(`/admin/proyectos/${id}`) }}
    />}
  </div>
}
