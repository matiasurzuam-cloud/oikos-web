import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from 'react'
import type { Models } from 'appwrite'
import oikosLogo from '@/imports/oikos-logo.png'
import oikosWatermark from '@/imports/oikos-logo-watermark.png'
import menuData from '@/data/menu.json'
import { account, tablesDB, isAppwriteConfigured, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID, PLATO_DEL_DIA_ROW_ID } from '@/lib/appwrite'

// ─── Types ────────────────────────────────────────────────────────────────────
interface RawMenuItem {
  id: string
  nombre: string
  descripcion: string
  imagen: string
  precio?: number | null
  precioIndividual?: number
  precioGrande?: number
  precioX2?: number
}
interface RawCategory { categoria: string; slug: string; items: RawMenuItem[] }

type PriceInfo =
  | { kind: 'single'; price: number }
  | { kind: 'unset' }
  | { kind: 'variant'; individual: number; grande: number }
  | { kind: 'x2'; price: number }

interface MenuItem {
  id: string
  name: string
  description: string
  image: string
  category: string
  price: PriceInfo
}

interface CartItem { cartId: string; name: string; unitPrice: number; qty: number; image: string }

// ─── Data ─────────────────────────────────────────────────────────────────────
function classifyPrice(item: RawMenuItem): PriceInfo {
  if (item.precioIndividual != null && item.precioGrande != null) {
    return { kind: 'variant', individual: item.precioIndividual, grande: item.precioGrande }
  }
  if (item.precioX2 != null) return { kind: 'x2', price: item.precioX2 }
  if (item.precio != null) return { kind: 'single', price: item.precio }
  return { kind: 'unset' }
}

const CATEGORY_ICONS: Record<string, string> = {
  churrasco: '🥩',
  ave: '🍗',
  mechada: '🌯',
  lomo: '🥖',
  'al-plato': '🍽️',
  pizzas: '🍕',
  cafeteria: '☕',
  postres: '🍰',
  'papas-y-snacks': '🍟',
  'tragos-y-cocteles': '🍹',
  almuerzos: '🍲',
}

const CARTA = (menuData as { carta: RawCategory[] }).carta

const MENU: MenuItem[] = CARTA.flatMap(cat =>
  cat.items.map(item => ({
    id: item.id,
    name: item.nombre,
    description: item.descripcion,
    image: item.imagen,
    category: cat.slug,
    price: classifyPrice(item),
  }))
)

const CATS = CARTA.map(cat => ({ key: cat.slug, icon: CATEGORY_ICONS[cat.slug] ?? '✦', label: cat.categoria }))

const GALLERY = [
  { url:'/images/general-mesas.jpg',      label:'Comedor Principal'    },
  { url:'/images/entrada-terraza.jpg',    label:'Entrada y Terraza'    },
  { url:'/images/pasteleria.jpg',         label:'Pastelería Artesanal' },
]

const MARQUEE = ['Artesanal','Molina · Chile','Masas Caseras','Cafetería de Autor','Pizzas al Horno','Happy Hour','Tradición Molinense']

function getStatus() {
  const d = new Date().getDay(), m = new Date().getHours()*60+new Date().getMinutes()
  if (d===0) return m>=1080 ? {open:true,  next:'Cierra a las 00:00'} : {open:false, next:'Abre a las 18:00'}
  if (d>=5)  return m>=480  ? {open:true,  next:'Cierra a la 01:00 AM'} : {open:false, next:'Abre a las 08:00'}
  return               m>=480  ? {open:true,  next:'Cierra a las 00:00'} : {open:false, next:'Abre a las 08:00'}
}

const fmt = (n: number) => '$' + n.toLocaleString('es-CL')
const WHATSAPP_NUMBER = '56900000000'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:     '#07060A',
  surface:'#100F14',
  border: 'rgba(255,255,255,0.07)',
  amber:  '#C47D3B',
  amberDim:'rgba(196,125,59,0.12)',
  text:   '#EDE9E0',
  muted:  'rgba(237,233,224,0.4)',
  faint:  'rgba(237,233,224,0.12)',
  red:    '#9E2A2B',
}

// ─── Small reusables ───────────────────────────────────────────────────────────
const Label = ({ children }: { children: string }) => (
  <p style={{ color: C.amber, fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
    {children}
  </p>
)

const Divider = () => <div style={{ height: '1px', background: C.border, width: '100%' }} />

// Aparece con un fade + slide-up sutil cuando entra al viewport (una sola vez)
function Reveal({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return <div ref={ref} className={`reveal ${visible ? 'is-visible' : ''}${className ? ' ' + className : ''}`} style={style}>{children}</div>
}

// Separador decorativo entre secciones: línea con degradado + ✦, para no dejar
// el límite entre dos bloques como un corte plano de color sólido
function SectionOrnament() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'18px', padding:'0 32px' }} aria-hidden="true">
      <span style={{ height:'1px', width:'96px', maxWidth:'20vw', background:'linear-gradient(to right, transparent, rgba(196,125,59,0.5))' }} />
      <span style={{ color:C.amber, fontSize:'13px' }}>✦</span>
      <span style={{ height:'1px', width:'96px', maxWidth:'20vw', background:'linear-gradient(to left, transparent, rgba(196,125,59,0.5))' }} />
    </div>
  )
}

// Capa de fondo compartida (textura de marca + resplandores difusos) para que las
// secciones con harto espacio vacío no se sientan planas. Va como primer hijo de
// una sección con position:relative — el contenido real (que va después en el DOM)
// pinta encima sin necesitar z-index explícito.
function SectionBackdrop({ blobPosition = 'top-right' }: { blobPosition?: 'top-right' | 'bottom-left' }) {
  const blobStyle: CSSProperties = blobPosition === 'top-right'
    ? { top: '-10%', right: '-8%' }
    : { bottom: '-10%', left: '-8%' }
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }} aria-hidden="true">
      <div style={{ position:'absolute', inset:0, backgroundImage:`url(${oikosWatermark})`, backgroundRepeat:'repeat', backgroundSize:'130px 60px', opacity:0.05 }} />
      <div style={{ position:'absolute', width:'46vw', height:'46vw', maxWidth:'620px', maxHeight:'620px', borderRadius:'50%', background:'radial-gradient(circle, rgba(196,125,59,0.14), transparent 70%)', filter:'blur(10px)', ...blobStyle }} />
    </div>
  )
}

// ─── Plato del Día ────────────────────────────────────────────────────────────
interface PlatoDelDia { activo: boolean; nombre: string; descripcion: string; precio: string }
interface PlatoDelDiaRow extends Models.Row, PlatoDelDia {}

function PlatoDelDiaCard({ plato }: { plato: PlatoDelDia }) {
  if (!plato.activo || !plato.nombre.trim()) return null
  return (
    <div className="lg:absolute lg:top-[84px] lg:right-8 lg:w-[380px] plato-glow plato-float" style={{
      marginTop: '32px',
      position: 'relative',
      borderRadius: '26px',
      padding: '2px',
      overflow: 'hidden',
      background: `linear-gradient(135deg, ${C.amber}, rgba(196,125,59,0.15) 45%, ${C.amber})`,
    }}>
      {/* cinta "HOY" */}
      <div style={{ position:'absolute', top:'20px', right:'-38px', transform:'rotate(45deg)', background:C.red, color:'white', fontSize:'10px', fontWeight:800, letterSpacing:'0.14em', padding:'5px 44px', zIndex:2, boxShadow:'0 4px 10px rgba(0,0,0,0.35)' }}>HOY</div>

      <div style={{ position:'relative', borderRadius:'24px', padding:'30px', overflow:'hidden', background:'linear-gradient(165deg, #221A10 0%, #14110C 60%, #100D08 100%)' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:`url(${oikosWatermark})`, backgroundRepeat:'repeat', backgroundSize:'100px 46px', opacity:0.15, mixBlendMode:'soft-light', pointerEvents:'none' }} />
        <div className="plato-shimmer" />

        <div style={{ position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'20px' }}>
            <div className="plato-pulse-ring" style={{ width:'52px', height:'52px', borderRadius:'16px', background:`linear-gradient(135deg, ${C.amber}, #8A5A2A)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2v7c0 1.1.9 2 2 2h1a2 2 0 0 0 2-2V2" /><path d="M7 2v20" />
                <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize:'13px', fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:C.amber, lineHeight:1.3 }}>🍽 Plato del Día</p>
              <p style={{ fontSize:'11px', color:C.muted }}>Disponible hoy en el local</p>
            </div>
          </div>

          <p className="serif" style={{ fontSize:'30px', fontWeight:800, color:'white', marginBottom:'10px', lineHeight:1.08 }}>{plato.nombre}</p>
          <p style={{ fontSize:'14px', lineHeight:1.6, color:'rgba(237,233,224,0.68)', marginBottom: plato.precio.trim() ? '22px' : 0 }}>{plato.descripcion}</p>

          {plato.precio.trim() && (
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <span style={{ height:'1px', flex:1, background:'linear-gradient(to right, rgba(196,125,59,0.5), transparent)' }} />
              <span style={{ display:'inline-flex', alignItems:'center', padding:'9px 20px', borderRadius:'999px', background:`linear-gradient(135deg, ${C.amber}, #8A5A2A)`, color:'white', fontSize:'17px', fontWeight:800, boxShadow:'0 8px 20px rgba(196,125,59,0.4)' }}>{plato.precio}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Admin Drawer ─────────────────────────────────────────────────────────────
function AdminDrawer({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<'checking'|'login'|'edit'>('checking')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [activo, setActivo] = useState(true)
  const [saveState, setSaveState] = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [saveError, setSaveError] = useState('')

  const loadPlato = async () => {
    try {
      const row = await tablesDB.getRow<PlatoDelDiaRow>({ databaseId: APPWRITE_DATABASE_ID, tableId: APPWRITE_COLLECTION_ID, rowId: PLATO_DEL_DIA_ROW_ID })
      setNombre(row.nombre ?? '')
      setDescripcion(row.descripcion ?? '')
      setPrecio(row.precio ?? '')
      setActivo(Boolean(row.activo))
    } catch {
      // no hay documento todavía — se crea al guardar por primera vez
    }
  }

  useEffect(() => {
    if (!isAppwriteConfigured) { setStatus('login'); return }
    account.get()
      .then(async () => { await loadPlato(); setStatus('edit') })
      .catch(() => setStatus('login'))
  }, [])

  const handleLogin = async () => {
    setAuthError(''); setLoggingIn(true)
    try {
      await account.createEmailPasswordSession({ email, password })
      await loadPlato()
      setStatus('edit')
    } catch {
      setAuthError('Correo o contraseña incorrectos.')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    try { await account.deleteSession({ sessionId: 'current' }) } catch { /* sesión ya cerrada */ }
    setEmail(''); setPassword(''); setStatus('login')
  }

  const handleSave = async () => {
    setSaveState('saving')
    setSaveError('')
    try {
      await tablesDB.upsertRow<PlatoDelDiaRow>({ databaseId: APPWRITE_DATABASE_ID, tableId: APPWRITE_COLLECTION_ID, rowId: PLATO_DEL_DIA_ROW_ID, data: { nombre, descripcion, precio, activo } })
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
      setSaveState('error')
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '12px',
    background: C.faint, border: `1px solid ${C.border}`,
    color: C.text, fontSize: '14px', outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  }
  const onFieldFocus = (e: { target: { style: { borderColor: string } } }) => (e.target.style.borderColor = C.amber)
  const onFieldBlur  = (e: { target: { style: { borderColor: string } } }) => (e.target.style.borderColor = C.border)

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', justifyContent:'flex-end' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(7,6,10,0.75)', backdropFilter:'blur(12px)' }} onClick={onClose} />
      <div style={{ position:'relative', width:'100%', maxWidth:'420px', display:'flex', flexDirection:'column', background:C.surface, borderLeft:`1px solid ${C.border}` }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px', borderBottom:`1px solid ${C.border}` }}>
          <p className="serif" style={{ fontSize:'20px', fontWeight:700, color:C.text }}>Panel Admin</p>
          <button onClick={onClose} style={{ width:'36px', height:'36px', borderRadius:'50%', background:C.faint, border:'none', cursor:'pointer', color:C.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'24px', display:'flex', flexDirection:'column', gap:'16px' }}>

          {!isAppwriteConfigured && (
            <div style={{ padding:'14px 16px', borderRadius:'12px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ fontSize:'13px', color:'#F87171', lineHeight:1.5 }}>
                Appwrite no está configurado todavía. Agrega <code>VITE_APPWRITE_ENDPOINT</code>, <code>VITE_APPWRITE_PROJECT_ID</code>, <code>VITE_APPWRITE_DATABASE_ID</code> y <code>VITE_APPWRITE_COLLECTION_ID</code> en tu archivo <code>.env</code> (mira <code>.env.example</code>) y reinicia el servidor.
              </p>
            </div>
          )}

          {status==='checking' && <p style={{ fontSize:'13px', color:C.muted }}>Verificando sesión…</p>}

          {status==='login' && isAppwriteConfigured && (
            <form onSubmit={e=>{ e.preventDefault(); handleLogin() }} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <Label>Iniciar sesión</Label>
              <input type="email" placeholder="Correo" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle} onFocus={onFieldFocus} onBlur={onFieldBlur} autoComplete="username" />
              <input type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} onFocus={onFieldFocus} onBlur={onFieldBlur} autoComplete="current-password" />
              {authError && <p style={{ fontSize:'12px', color:'#F87171' }}>{authError}</p>}
              <button type="submit" disabled={loggingIn || !email.trim() || !password.trim()}
                style={{ padding:'13px', borderRadius:'14px', background:C.amber, color:'white', fontWeight:700, fontSize:'14px', border:'none', cursor:'pointer', fontFamily:'inherit', opacity: (loggingIn || !email.trim() || !password.trim()) ? 0.4 : 1, transition:'opacity 0.2s' }}>
                {loggingIn ? 'Ingresando…' : 'Iniciar sesión'}
              </button>
            </form>
          )}

          {status==='edit' && (
            <>
              <Label>Plato del Día</Label>

              <label style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', borderRadius:'12px', cursor:'pointer', background: activo ? C.amberDim : C.faint, border:`1px solid ${activo ? 'rgba(196,125,59,0.3)' : C.border}` }}>
                <input type="checkbox" checked={activo} onChange={e=>setActivo(e.target.checked)} style={{ width:'16px', height:'16px', accentColor:C.amber }} />
                <span style={{ fontSize:'13px', fontWeight:600, color:C.text }}>Mostrar tarjeta en el inicio</span>
              </label>

              <div>
                <Label>Nombre del plato</Label>
                <input placeholder="Ej: Cazuela de Vacuno" value={nombre} onChange={e=>setNombre(e.target.value)} style={inputStyle} onFocus={onFieldFocus} onBlur={onFieldBlur} />
              </div>
              <div>
                <Label>Descripción</Label>
                <textarea placeholder="Breve descripción (1-2 líneas)" value={descripcion} onChange={e=>setDescripcion(e.target.value)} rows={3} style={{ ...inputStyle, resize:'none' }} onFocus={onFieldFocus} onBlur={onFieldBlur} />
              </div>
              <div>
                <Label>Precio (opcional)</Label>
                <input placeholder="Ej: $7.200" value={precio} onChange={e=>setPrecio(e.target.value)} style={inputStyle} onFocus={onFieldFocus} onBlur={onFieldBlur} />
              </div>

              <button onClick={handleSave} disabled={saveState==='saving' || !nombre.trim()}
                style={{ padding:'13px', borderRadius:'14px', background:C.amber, color:'white', fontWeight:700, fontSize:'14px', border:'none', cursor:'pointer', fontFamily:'inherit', opacity: (saveState==='saving' || !nombre.trim()) ? 0.4 : 1, transition:'opacity 0.2s' }}>
                {saveState==='saving' ? 'Guardando…' : 'Guardar cambios'}
              </button>
              {saveState==='saved' && <p style={{ fontSize:'12px', color:'#34D399', textAlign:'center' }}>Guardado ✓ — ya está visible para todos los visitantes.</p>}
              {saveState==='error' && <p style={{ fontSize:'12px', color:'#F87171', textAlign:'center' }}>No se pudo guardar: {saveError || 'error desconocido'}</p>}

              <Divider />
              <button onClick={handleLogout} style={{ padding:'12px', borderRadius:'14px', background:'none', color:C.muted, fontWeight:600, fontSize:'13px', border:`1px solid ${C.border}`, cursor:'pointer', fontFamily:'inherit' }}>
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Cart Drawer ──────────────────────────────────────────────────────────────
function CartDrawer({ cart, onClose, onQty, onRemove }: {
  cart: CartItem[]; onClose: () => void
  onQty: (cartId: string, d: number) => void; onRemove: (cartId: string) => void
}) {
  const [mode, setMode] = useState<'pickup'|'delivery'>('pickup')
  const [name, setName] = useState(''), [addr, setAddr] = useState(''), [notes, setNotes] = useState('')
  const sub = cart.reduce((s,i) => s+i.unitPrice*i.qty, 0)
  const total = sub + (mode==='delivery' ? 1500 : 0)

  const sendWA = () => {
    const lines = cart.map(i => `• ${i.qty}× ${i.name} — ${fmt(i.unitPrice*i.qty)}`).join('\n')
    const msg = `¡Hola OIKO'S! 🛒\n\n*Cliente:* ${name}\n\n*Pedido:*\n${lines}\n\n*Entrega:* ${mode==='pickup' ? '📍 Retiro en Membrillar 1214' : `🛵 Delivery: ${addr}`}\n\n*TOTAL:* ${fmt(total)}${notes?`\n\n*Notas:* ${notes}`:''}`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '12px',
    background: C.faint, border: `1px solid ${C.border}`,
    color: C.text, fontSize: '14px', outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', justifyContent:'flex-end' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(7,6,10,0.75)', backdropFilter:'blur(12px)' }} onClick={onClose} />
      <div style={{ position:'relative', width:'100%', maxWidth:'400px', display:'flex', flexDirection:'column', background:C.surface, borderLeft:`1px solid ${C.border}` }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px', borderBottom:`1px solid ${C.border}` }}>
          <div>
            <p className="serif" style={{ fontSize:'20px', fontWeight:700, color:C.text }}>Tu Pedido</p>
            {cart.length>0 && <p style={{ fontSize:'12px', color:C.amber, marginTop:'2px' }}>{cart.reduce((s,i)=>s+i.qty,0)} ítem(s) seleccionado(s)</p>}
          </div>
          <button onClick={onClose} style={{ width:'36px', height:'36px', borderRadius:'50%', background:C.faint, border:'none', cursor:'pointer', color:C.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {cart.length===0 ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px', color:C.muted }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.98-1.68L21 6H6"/></svg>
            <p style={{ fontSize:'14px' }}>Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            <div style={{ flex:1, overflowY:'auto', padding:'24px', display:'flex', flexDirection:'column', gap:'20px' }}>
              {/* Items */}
              <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                {cart.map(item => (
                  <div key={item.cartId} style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}>
                    <img src={item.image} alt={item.name} style={{ width:'60px', height:'60px', borderRadius:'12px', objectFit:'cover', background:C.faint, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:'13px', fontWeight:600, color:C.text, lineHeight:1.3 }}>{item.name}</p>
                      <p style={{ fontSize:'13px', fontWeight:700, color:C.amber, marginTop:'4px' }}>{fmt(item.unitPrice)}</p>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'10px' }}>
                        <button onClick={() => onQty(item.cartId,-1)} style={{ width:'28px', height:'28px', borderRadius:'50%', background:C.faint, border:`1px solid ${C.border}`, color:C.text, cursor:'pointer', fontSize:'14px', fontWeight:700 }}>−</button>
                        <span style={{ width:'20px', textAlign:'center', fontSize:'13px', fontWeight:700, color:C.text }}>{item.qty}</span>
                        <button onClick={() => onQty(item.cartId,1)} style={{ width:'28px', height:'28px', borderRadius:'50%', background:C.amberDim, border:`1px solid rgba(196,125,59,0.2)`, color:C.amber, cursor:'pointer', fontSize:'14px', fontWeight:700 }}>+</button>
                        <button onClick={() => onRemove(item.cartId)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:C.red, opacity:0.6 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Divider />

              {/* Delivery */}
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                <Label>Tipo de entrega</Label>
                {(['pickup','delivery'] as const).map(opt => (
                  <label key={opt} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', borderRadius:'12px', cursor:'pointer', background: mode===opt ? C.amberDim : C.faint, border:`1px solid ${mode===opt ? 'rgba(196,125,59,0.3)' : C.border}`, transition:'all 0.2s' }}>
                    <div style={{ width:'16px', height:'16px', borderRadius:'50%', border:`2px solid ${mode===opt?C.amber:'rgba(255,255,255,0.25)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {mode===opt && <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:C.amber }} />}
                    </div>
                    <input type="radio" name="del" checked={mode===opt} onChange={() => setMode(opt)} style={{ display:'none' }} />
                    <div>
                      <p style={{ fontSize:'13px', fontWeight:600, color:C.text }}>{opt==='pickup' ? '📍 Retiro en Local' : '🛵 Delivery en Molina'}</p>
                      <p style={{ fontSize:'12px', color:C.muted, marginTop:'2px' }}>{opt==='pickup' ? 'Membrillar 1214 — Sin costo' : '+$1.500'}</p>
                    </div>
                  </label>
                ))}
              </div>

              <Divider />

              {/* Form */}
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                <Label>Tus datos</Label>
                <input placeholder="Tu nombre" value={name} onChange={e=>setName(e.target.value)} style={inputStyle} onFocus={e=>(e.target.style.borderColor=C.amber)} onBlur={e=>(e.target.style.borderColor=C.border)} />
                {mode==='delivery' && <input placeholder="Dirección de entrega" value={addr} onChange={e=>setAddr(e.target.value)} style={inputStyle} onFocus={e=>(e.target.style.borderColor=C.amber)} onBlur={e=>(e.target.style.borderColor=C.border)} />}
                <textarea placeholder="Notas para la cocina (opcional)" value={notes} onChange={e=>setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize:'none' }} onFocus={e=>(e.target.style.borderColor=C.amber)} onBlur={e=>(e.target.style.borderColor=C.border)} />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding:'20px 24px', borderTop:`1px solid ${C.border}`, background:C.bg }}>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:C.muted }}>
                  <span>Subtotal</span><span>{fmt(sub)}</span>
                </div>
                {mode==='delivery' && <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:C.muted }}><span>Envío</span><span>{fmt(1500)}</span></div>}
                <Divider />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'16px', fontWeight:700 }}>
                  <span className="serif" style={{ color:C.text }}>Total</span>
                  <span style={{ color:C.amber }}>{fmt(total)}</span>
                </div>
              </div>
              <button onClick={sendWA} disabled={!name.trim()||(mode==='delivery'&&!addr.trim())}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', padding:'14px', borderRadius:'14px', background:'#25D366', color:'white', fontWeight:700, fontSize:'14px', border:'none', cursor:'pointer', fontFamily:'inherit', opacity: (!name.trim()||(mode==='delivery'&&!addr.trim())) ? 0.35 : 1, transition:'opacity 0.2s' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Enviar Pedido por WhatsApp
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Menu Card ────────────────────────────────────────────────────────────────
function QtyStepper({ qty, onDec, onInc }: { qty: number; onDec: () => void; onInc: () => void }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
      <button onClick={onDec} style={{ width:'28px', height:'28px', borderRadius:'50%', background:C.faint, border:'none', color:C.text, cursor:'pointer', fontSize:'15px', fontWeight:700 }}>−</button>
      <span style={{ width:'16px', textAlign:'center', fontSize:'13px', fontWeight:700, color:C.text }}>{qty}</span>
      <button onClick={onInc} style={{ width:'28px', height:'28px', borderRadius:'50%', background:C.amber, border:'none', color:'white', cursor:'pointer', fontSize:'15px', fontWeight:700 }}>+</button>
    </div>
  )
}

function AddButton({ onClick, small }: { onClick: () => void; small?: boolean }) {
  return (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:'6px', padding: small ? '6px 12px' : '8px 16px', borderRadius:'999px', background:C.amberDim, color:C.amber, border:`1px solid rgba(196,125,59,0.2)`, cursor:'pointer', fontSize: small ? '12px' : '13px', fontWeight:600, fontFamily:'inherit', transition:'all 0.18s', whiteSpace:'nowrap' }}
      onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background=C.amber;(e.currentTarget as HTMLButtonElement).style.color='white'}}
      onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background=C.amberDim;(e.currentTarget as HTMLButtonElement).style.color=C.amber}}>
      + Agregar
    </button>
  )
}

function MenuCard({ item, cart, onAdd, onQty }: {
  item: MenuItem; cart: CartItem[]
  onAdd: (item: MenuItem, variant?: 'individual'|'grande') => void
  onQty: (cartId: string, d: number) => void
}) {
  const findInCart = (cartId: string) => cart.find(c=>c.cartId===cartId)

  return (
    <div style={{ borderRadius:'20px', overflow:'hidden', background:C.surface, border:`1px solid ${C.border}`, transition:'all 0.22s', cursor:'default', display:'flex', flexDirection:'column' }}
      onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor='rgba(196,125,59,0.25)';(e.currentTarget as HTMLDivElement).style.transform='translateY(-3px)'}}
      onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.border;(e.currentTarget as HTMLDivElement).style.transform='translateY(0)'}}>
      <div style={{ position:'relative', height:'190px', overflow:'hidden', flexShrink:0, background:C.faint, backgroundImage:`url(${oikosWatermark})`, backgroundRepeat:'repeat', backgroundSize:'110px 50px', backgroundPosition:'center' }}>
        <img src={item.image} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'center' }} />
      </div>
      <div style={{ padding:'20px', display:'flex', flexDirection:'column', flex:1 }}>
        <p className="serif" style={{ fontSize:'16px', fontWeight:700, color:C.text, marginBottom:'6px' }}>{item.name}</p>
        <p style={{ fontSize:'13px', color:C.muted, lineHeight:1.55, marginBottom:'20px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', flex:1 }}>{item.description}</p>

        {item.price.kind === 'single' && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:'17px', fontWeight:800, color:C.amber }}>{fmt(item.price.price)}</span>
            {(() => {
              const inCart = findInCart(item.id)
              return inCart
                ? <QtyStepper qty={inCart.qty} onDec={()=>onQty(item.id,-1)} onInc={()=>onQty(item.id,1)} />
                : <AddButton onClick={()=>onAdd(item)} />
            })()}
          </div>
        )}

        {item.price.kind === 'x2' && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:'17px', fontWeight:800, color:C.amber }}>{fmt(item.price.price)} <span style={{ fontSize:'12px', fontWeight:600, color:C.muted }}>x2</span></span>
            {(() => {
              const inCart = findInCart(item.id)
              return inCart
                ? <QtyStepper qty={inCart.qty} onDec={()=>onQty(item.id,-1)} onInc={()=>onQty(item.id,1)} />
                : <AddButton onClick={()=>onAdd(item)} />
            })()}
          </div>
        )}

        {item.price.kind === 'unset' && (
          <div style={{ display:'flex', alignItems:'center' }}>
            <span style={{ fontSize:'13px', fontWeight:600, color:C.muted, fontStyle:'italic' }}>Precio a consultar</span>
          </div>
        )}

        {item.price.kind === 'variant' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {(['individual','grande'] as const).map(variant => {
              const price = variant === 'individual' ? (item.price as { individual:number }).individual : (item.price as { grande:number }).grande
              const cartId = `${item.id}:${variant}`
              const inCart = findInCart(cartId)
              return (
                <div key={variant} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'13px', color:C.muted }}>
                    {variant === 'individual' ? 'Individual' : 'Grande'} · <b style={{ color:C.amber, fontSize:'14px' }}>{fmt(price)}</b>
                  </span>
                  {inCart
                    ? <QtyStepper qty={inCart.qty} onDec={()=>onQty(cartId,-1)} onInc={()=>onQty(cartId,1)} />
                    : <AddButton small onClick={()=>onAdd(item, variant)} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Reservation Section ─────────────────────────────────────────────────────
function ReservationSection() {
  const [name, setName]     = useState('')
  const [phone, setPhone]   = useState('')
  const [date, setDate]     = useState('')
  const [time, setTime]     = useState('')
  const [guests, setGuests] = useState('2')
  const [notes, setNotes]   = useState('')
  const [sent, setSent]     = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const isValid = name.trim().length > 0 && phone.trim().length > 0 && date.length > 0 && time.length > 0 && Number(guests) > 0

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '12px',
    background: C.faint, border: `1px solid ${C.border}`,
    color: C.text, fontSize: '14px', outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  }
  const onFieldFocus = (e: { target: { style: { borderColor: string } } }) => (e.target.style.borderColor = C.amber)
  const onFieldBlur  = (e: { target: { style: { borderColor: string } } }) => (e.target.style.borderColor = C.border)

  const sendWA = () => {
    if (!isValid) return
    const parsedDate = new Date(`${date}T00:00:00`)
    const dateLabel = isNaN(parsedDate.getTime())
      ? date
      : parsedDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const msg = `¡Hola OIKO'S! 📅 Quiero reservar una mesa\n\n*Nombre:* ${name}\n*Teléfono:* ${phone}\n*Fecha:* ${dateLabel}\n*Hora:* ${time}\n*Personas:* ${guests}${notes ? `\n*Notas:* ${notes}` : ''}\n\nQuedo atento/a a la confirmación, ¡gracias!`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank')
    setSent(true)
  }

  return (
    <section id="reservas" style={{ position:'relative', padding:'80px 32px', background:C.surface, borderTop:`1px solid ${C.border}` }}>
      <SectionBackdrop blobPosition="top-right" />
      <div style={{ position:'relative', maxWidth:'1200px', margin:'0 auto' }}>
        <SectionOrnament />
        <div style={{ height:'40px' }} />
        <Reveal style={{ textAlign:'center', marginBottom:'56px' }}>
          <Label>Reserva tu Mesa</Label>
          <h2 className="serif" style={{ fontSize:'clamp(2rem,4vw,3.5rem)', fontWeight:900, letterSpacing:'-0.03em', color:C.text, marginBottom:'16px' }}>Aparta tu Lugar</h2>
          <p style={{ fontSize:'14px', color:C.muted, maxWidth:'480px', margin:'0 auto' }}>Completa tus datos y te confirmamos por WhatsApp en minutos.</p>
        </Reveal>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))', gap:'16px', alignItems:'stretch' }}>

          {/* Form */}
          <div style={{ borderRadius:'24px', padding:'36px', background:C.bg, border:`1px solid ${C.border}` }}>
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                <div>
                  <Label>Nombre</Label>
                  <input placeholder="Tu nombre" value={name} onChange={e=>setName(e.target.value)} style={inputStyle} onFocus={onFieldFocus} onBlur={onFieldBlur} />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <input type="tel" placeholder="+56 9 1234 5678" value={phone} onChange={e=>setPhone(e.target.value)} style={inputStyle} onFocus={onFieldFocus} onBlur={onFieldBlur} />
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'14px' }}>
                <div>
                  <Label>Fecha</Label>
                  <input type="date" min={today} value={date} onChange={e=>setDate(e.target.value)} style={{ ...inputStyle, colorScheme:'dark' }} onFocus={onFieldFocus} onBlur={onFieldBlur} />
                </div>
                <div>
                  <Label>Hora</Label>
                  <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{ ...inputStyle, colorScheme:'dark' }} onFocus={onFieldFocus} onBlur={onFieldBlur} />
                </div>
                <div>
                  <Label>Personas</Label>
                  <input type="number" min="1" max="40" value={guests} onChange={e=>setGuests(e.target.value)} style={inputStyle} onFocus={onFieldFocus} onBlur={onFieldBlur} />
                </div>
              </div>

              <div>
                <Label>Notas (opcional)</Label>
                <textarea placeholder="Ocasión especial, silla para bebé, alergias…" value={notes} onChange={e=>setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize:'none' }} onFocus={onFieldFocus} onBlur={onFieldBlur} />
              </div>

              <button onClick={sendWA} disabled={!isValid}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', padding:'14px', borderRadius:'14px', background:'#25D366', color:'white', fontWeight:700, fontSize:'14px', border:'none', cursor:'pointer', fontFamily:'inherit', opacity: isValid ? 1 : 0.35, transition:'opacity 0.2s' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Reservar por WhatsApp
              </button>
              {sent && (
                <p style={{ fontSize:'12px', color:C.amber, textAlign:'center' }}>Se abrió WhatsApp con los datos de tu reserva — envía el mensaje para confirmarla.</p>
              )}
            </div>
          </div>

          {/* Why reserve */}
          <div style={{ borderRadius:'24px', padding:'36px', background:'linear-gradient(160deg, #1A140C 0%, #100D08 100%)', border:`1px solid ${C.border}`, display:'flex', flexDirection:'column', justifyContent:'space-between', gap:'32px' }}>
            <div>
              <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:C.amberDim, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'20px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <p className="serif" style={{ fontSize:'20px', fontWeight:700, color:C.text, marginBottom:'20px' }}>¿Por qué reservar?</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                {[
                  'Confirmación directa por WhatsApp',
                  'Tu mesa lista al llegar, sin esperas',
                  'Ideal para cumpleaños y grupos',
                  'Grupos de 8+ personas: te recomendamos llamar directo',
                ].map(t => (
                  <div key={t} style={{ display:'flex', alignItems:'flex-start', gap:'10px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="3" style={{ flexShrink:0, marginTop:'2px' }}><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ fontSize:'13px', color:C.muted, lineHeight:1.5 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Divider />
              <p style={{ fontSize:'13px', color:C.muted, margin:'20px 0 12px' }}>¿Prefieres hablar directo con nosotros?</p>
              <a href={`tel:+${WHATSAPP_NUMBER}`}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'13px', borderRadius:'14px', fontSize:'13px', fontWeight:600, textDecoration:'none', color:C.text, border:`1px solid ${C.border}`, transition:'border-color 0.2s' }}
                onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(196,125,59,0.35)')}
                onMouseLeave={e=>(e.currentTarget.style.borderColor=C.border)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                Llamar al local
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [cat, setCat]         = useState(CATS[0].key)
  const [cart, setCart]       = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [search, setSearch]   = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [platoDelDia, setPlatoDelDia] = useState<PlatoDelDia>({ activo: false, nombre: '', descripcion: '', precio: '' })
  const [adminOpen, setAdminOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const st = getStatus()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 32)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    if (!isAppwriteConfigured) return
    tablesDB.getRow<PlatoDelDiaRow>({ databaseId: APPWRITE_DATABASE_ID, tableId: APPWRITE_COLLECTION_ID, rowId: PLATO_DEL_DIA_ROW_ID })
      .then(row => setPlatoDelDia({ activo: Boolean(row.activo), nombre: row.nombre ?? '', descripcion: row.descripcion ?? '', precio: row.precio ?? '' }))
      .catch(() => { /* no hay plato cargado todavía — la tarjeta se mantiene oculta */ })
  }, [])

  const addToCart = (item: MenuItem, variant?: 'individual'|'grande') => {
    let unitPrice: number
    let suffix = ''
    if (item.price.kind === 'variant') {
      if (!variant) return
      unitPrice = variant === 'individual' ? item.price.individual : item.price.grande
      suffix = variant === 'individual' ? ' (Individual)' : ' (Grande)'
    } else if (item.price.kind === 'x2') {
      unitPrice = item.price.price
      suffix = ' (x2)'
    } else if (item.price.kind === 'single') {
      unitPrice = item.price.price
    } else {
      return
    }
    const cartId = variant ? `${item.id}:${variant}` : item.id
    const name = item.name + suffix
    setCart(p => {
      const ex = p.find(i=>i.cartId===cartId)
      return ex ? p.map(i=>i.cartId===cartId?{...i,qty:i.qty+1}:i) : [...p,{ cartId, name, unitPrice, qty:1, image:item.image }]
    })
  }
  const handleQty    = (cartId:string,d:number) => setCart(p=>p.map(i=>i.cartId===cartId?{...i,qty:Math.max(0,i.qty+d)}:i).filter(i=>i.qty>0))
  const handleRemove = (cartId:string)           => setCart(p=>p.filter(i=>i.cartId!==cartId))

  const filtered = MENU.filter(item =>
    item.category===cat &&
    (!search || item.name.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase()))
  )

  const cartCount = cart.reduce((s,i)=>s+i.qty,0)
  const cartTotal = cart.reduce((s,i)=>s+i.unitPrice*i.qty,0)

  return (
    <div style={{ minHeight:'100vh', background:C.bg, color:C.text, fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>

      {/* ── NAV ───────────────────────────────────────────────────────────── */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:40,
        background: scrolled ? 'rgba(7,6,10,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.border}` : 'none',
        transition:'all 0.3s',
      }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 32px', height:'64px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'24px' }}>
          <img src={oikosLogo} alt="OIKO'S" style={{ height:'50px', objectFit:'contain', filter:'drop-shadow(0 0 14px rgba(196,125,59,0.35))' }} />

          <div style={{ display:'flex', alignItems:'center', gap:'32px' }}>
            <div style={{ display:'none', alignItems:'center', gap:'32px' }} className="hidden md:flex">
              {[['Menú','#menu'],['Reservas','#reservas'],['Ambiente','#galeria'],['Horarios','#horarios']].map(([l,h])=>(
                <a key={l} href={h} style={{ fontSize:'13px', fontWeight:500, color:C.muted, textDecoration:'none', transition:'color 0.2s' }}
                  onMouseEnter={e=>(e.currentTarget.style.color=C.amber)}
                  onMouseLeave={e=>(e.currentTarget.style.color=C.muted)}>{l}</a>
              ))}
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div title={st.open ? `Abierto — ${st.next}` : `Cerrado — ${st.next}`}
                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', borderRadius:'999px', background: st.open?'rgba(52,211,153,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${st.open?'rgba(52,211,153,0.18)':'rgba(239,68,68,0.18)'}`, cursor:'default' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: st.open?'#34D399':'#F87171', animation: st.open?'pulse 2s infinite':'', flexShrink:0 }} />
                <span style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.05em', color: st.open?'#34D399':'#F87171', whiteSpace:'nowrap' }}>{st.open?'ABIERTO':'CERRADO'}</span>
                <span className="hidden sm:inline" style={{ fontSize:'11px', color: st.open?'rgba(52,211,153,0.7)':'rgba(239,68,68,0.7)', whiteSpace:'nowrap' }}>· {st.next}</span>
              </div>
              <button onClick={()=>setCartOpen(true)} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 16px', borderRadius:'999px', background:cartCount>0?C.amber:C.faint, color:'white', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:600, fontFamily:'inherit', transition:'all 0.2s' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.98-1.68L21 6H6"/></svg>
                {cartCount>0 ? `${cartCount} · ${fmt(cartTotal)}` : 'Carrito'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'flex-end' }}>
        <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
          <img src="/images/general-mesas.jpg" alt="" aria-hidden="true" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', transform:'scale(1.2)', filter:'blur(28px) brightness(0.5)' }} />
          <div style={{ position:'absolute', inset:0, backgroundImage:`url(${oikosWatermark})`, backgroundRepeat:'repeat', backgroundSize:'140px 64px', opacity:0.14, mixBlendMode:'soft-light' }} />
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 60% 55% at center, transparent 40%, rgba(196,125,59,0.16) 100%)' }} />
          <img src="/images/general-mesas.jpg" alt="Interior OIKO'S" className="object-cover md:object-contain" style={{
            position:'relative', width:'100%', height:'100%',
            filter:'drop-shadow(0 20px 60px rgba(0,0,0,0.5))',
            maskImage:'radial-gradient(ellipse 78% 82% at center, black 55%, transparent 100%)',
            WebkitMaskImage:'radial-gradient(ellipse 78% 82% at center, black 55%, transparent 100%)',
          }} />
          <div className="grain" style={{ position:'absolute', inset:0, opacity:0.5, mixBlendMode:'overlay', pointerEvents:'none' }} />
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, #07060A 0%, rgba(7,6,10,0.65) 55%, rgba(7,6,10,0.2) 100%)' }} />
        </div>

        <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:'1200px', margin:'0 auto', padding:'96px 32px 80px' }}>
          <h1 className="serif" style={{ fontSize:'clamp(3rem,8vw,7.5rem)', fontWeight:900, lineHeight:0.92, letterSpacing:'-0.03em', marginBottom:'32px' }}>
            El Sabor<br />de la{' '}
            <em style={{ color:C.amber, fontStyle:'italic' }}>Tradición</em>
            <br />en Molina
          </h1>

          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:'24px' }}>
            <p style={{ fontSize:'15px', lineHeight:1.7, color:'rgba(237,233,224,0.5)', maxWidth:'420px' }}>
              Masas y panes 100% artesanales · Cafetería de autor · Almuerzos caseros · Pizzas al horno y happy hour.
            </p>
            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
              <button onClick={()=>menuRef.current?.scrollIntoView({behavior:'smooth'})}
                style={{ display:'flex', alignItems:'center', gap:'10px', padding:'14px 28px', borderRadius:'999px', background:C.amber, color:'white', border:'none', cursor:'pointer', fontSize:'14px', fontWeight:700, fontFamily:'inherit', boxShadow:'0 0 32px rgba(196,125,59,0.25)', transition:'all 0.2s' }}
                onMouseEnter={e=>((e.currentTarget as HTMLButtonElement).style.transform='translateY(-1px)')}
                onMouseLeave={e=>((e.currentTarget as HTMLButtonElement).style.transform='translateY(0)')}>
                Ver Menú
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <a href="#galeria" style={{ display:'flex', alignItems:'center', padding:'14px 28px', borderRadius:'999px', color:C.muted, border:`1px solid ${C.border}`, fontSize:'14px', fontWeight:600, textDecoration:'none', transition:'border-color 0.2s' }}
                onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(196,125,59,0.35)')}
                onMouseLeave={e=>(e.currentTarget.style.borderColor=C.border)}>
                Conocer el Local
              </a>
            </div>
          </div>

          <PlatoDelDiaCard plato={platoDelDia} />

          {/* Bottom stats */}
          <div style={{ marginTop:'64px', paddingTop:'32px', borderTop:`1px solid ${C.border}`, display:'flex', gap:'48px', flexWrap:'wrap' }}>
            {[['⭐ 4.9','Valoración'],['8+','Categorías'],['2020','Desde'],['Membrillar 1214','Molina, Chile']].map(([v,l])=>(
              <div key={l}>
                <p style={{ fontSize:'18px', fontWeight:700, color:C.text }}>{v}</p>
                <p style={{ fontSize:'12px', color:C.muted, marginTop:'2px' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARQUEE ───────────────────────────────────────────────────────── */}
      <div style={{ overflow:'hidden', borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:'18px 0', background:C.surface }}>
        <div className="marquee" style={{ display:'flex', gap:'40px', width:'max-content', whiteSpace:'nowrap' }}>
          {[...MARQUEE,...MARQUEE,...MARQUEE].map((t,i)=>(
            <span key={i} style={{ display:'flex', alignItems:'center', gap:'40px' }}>
              <span style={{ fontSize:'12px', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:C.muted }}>{t}</span>
              <span style={{ color:C.amber, fontSize:'10px' }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── MENU ──────────────────────────────────────────────────────────── */}
      <section id="menu" ref={menuRef} style={{ position:'relative', padding:'80px 32px', background:C.bg }}>
        <SectionBackdrop blobPosition="top-right" />
        <div style={{ position:'relative', maxWidth:'1200px', margin:'0 auto' }}>

          {/* Section header */}
          <Reveal style={{ display:'grid', gridTemplateColumns:'1fr auto', alignItems:'end', gap:'24px', marginBottom:'48px' }}>
            <div>
              <Label>Carta Digital</Label>
              <h2 className="serif" style={{ fontSize:'clamp(2rem,4vw,3.5rem)', fontWeight:900, letterSpacing:'-0.03em', color:C.text, lineHeight:1 }}>Nuestra Carta</h2>
            </div>
            <div style={{ position:'relative' }}>
              <svg style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:C.muted }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar…"
                style={{ paddingLeft:'40px', paddingRight:'16px', paddingTop:'12px', paddingBottom:'12px', borderRadius:'999px', background:C.surface, border:`1px solid ${C.border}`, color:C.text, fontSize:'13px', outline:'none', fontFamily:'inherit', width:'200px', transition:'border-color 0.2s' }}
                onFocus={e=>(e.target.style.borderColor=C.amber)} onBlur={e=>(e.target.style.borderColor=C.border)} />
            </div>
          </Reveal>

          {/* Category tabs */}
          <div style={{ display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'4px', marginBottom:'40px', scrollbarWidth:'none' }}>
            {CATS.map(c=>(
              <button key={c.key} onClick={()=>setCat(c.key)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 18px', borderRadius:'999px', fontSize:'13px', fontWeight:600, whiteSpace:'nowrap', flexShrink:0, cursor:'pointer', fontFamily:'inherit', transition:'all 0.18s', background: cat===c.key?C.amber:C.surface, color: cat===c.key?'white':C.muted, border: cat===c.key?'none':`1px solid ${C.border}` }}>
                <span>{c.icon}</span>{c.label}
              </button>
            ))}
          </div>

          {/* Happy hour banner */}
          {cat==='tragos-y-cocteles' && (
            <div style={{ borderRadius:'20px', overflow:'hidden', marginBottom:'32px', background:'linear-gradient(135deg,#9E2A2B,#6B1718)', padding:'24px 32px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px' }}>
              <div>
                <Label>Oferta Especial</Label>
                <p className="serif" style={{ fontSize:'22px', fontWeight:700, color:'white' }}>Happy Hour 🍹</p>
                <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.55)', marginTop:'4px' }}>Cócteles seleccionados · Lun–Vie 18:00–20:00</p>
              </div>
              <div style={{ padding:'10px 22px', borderRadius:'999px', background:'rgba(255,255,255,0.1)', fontSize:'14px', fontWeight:700, color:'white', flexShrink:0 }}>Hasta −35%</div>
            </div>
          )}

          {/* Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'16px' }}>
            {filtered.map(item => (
              <MenuCard key={item.id} item={item} cart={cart} onAdd={addToCart} onQty={handleQty} />
            ))}
          </div>

          {filtered.length===0 && (
            <div style={{ textAlign:'center', padding:'80px 0', color:C.muted }}>
              <p className="serif" style={{ fontSize:'32px', fontWeight:700, color:C.faint, marginBottom:'8px' }}>Sin resultados</p>
              <p style={{ fontSize:'14px' }}>Intenta con otra búsqueda o categoría</p>
            </div>
          )}
        </div>
      </section>

      <ReservationSection />

      {/* ── GALLERY ───────────────────────────────────────────────────────── */}
      <section id="galeria" style={{ position:'relative', padding:'80px 32px', background:C.surface }}>
        <SectionBackdrop blobPosition="bottom-left" />
        <div style={{ position:'relative', maxWidth:'1200px', margin:'0 auto' }}>
          <SectionOrnament />
          <div style={{ height:'40px' }} />
          <Reveal style={{ display:'grid', gridTemplateColumns:'1fr 1fr', alignItems:'end', gap:'24px', marginBottom:'48px' }}>
            <div>
              <Label>Nuestro Espacio</Label>
              <h2 className="serif" style={{ fontSize:'clamp(2rem,4vw,3.5rem)', fontWeight:900, letterSpacing:'-0.03em', color:C.text, lineHeight:1 }}>Tradición y Calidez</h2>
            </div>
            <p style={{ fontSize:'14px', lineHeight:1.7, color:C.muted }}>
              Arcos de piedra natural, vigas de madera noble y una vitrina de pastelería artesanal que te invita a quedarte.
            </p>
          </Reveal>

          {/* Photo grid — all three shown together, same 3:4 aspect as the source photos so nothing gets cropped */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'16px' }}>
            {GALLERY.map(img => (
              <div key={img.url} style={{ position:'relative', borderRadius:'24px', overflow:'hidden', aspectRatio:'3 / 4', background:C.faint }}>
                <img src={img.url} alt={img.label} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'transform 0.5s' }}
                  onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.05)')}
                  onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(7,6,10,0.6) 0%, transparent 45%)', pointerEvents:'none' }} />
                <p className="serif" style={{ position:'absolute', bottom:'20px', left:'20px', right:'20px', fontSize:'18px', fontWeight:700, color:'white' }}>{img.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HORARIOS ──────────────────────────────────────────────────────── */}
      <section id="horarios" style={{ position:'relative', padding:'80px 32px', background:C.bg }}>
        <SectionBackdrop blobPosition="top-right" />
        <div style={{ position:'relative', maxWidth:'1200px', margin:'0 auto' }}>
          <SectionOrnament />
          <div style={{ height:'40px' }} />
          <Reveal style={{ textAlign:'center', marginBottom:'64px' }}>
            <Label>Encuéntranos</Label>
            <h2 className="serif" style={{ fontSize:'clamp(2rem,4vw,3.5rem)', fontWeight:900, letterSpacing:'-0.03em', color:C.text }}>Horarios y Ubicación</h2>
          </Reveal>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:'16px' }}>
            {/* Hours */}
            <div style={{ borderRadius:'24px', padding:'36px', background:C.surface, border:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'32px' }}>
                <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:C.amberDim, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <p className="serif" style={{ fontSize:'18px', fontWeight:700, color:C.text }}>Horarios de Atención</p>
              </div>
              {[['Lunes a Jueves','08:00 – 00:00'],['Viernes y Sábado','08:00 – 01:00 AM'],['Domingo','18:00 – 00:00']].map(([d,h],i,arr)=>(
                <div key={d} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 0', borderBottom: i<arr.length-1?`1px solid ${C.border}`:'none' }}>
                  <span style={{ fontSize:'14px', color:C.muted }}>{d}</span>
                  <span style={{ fontSize:'14px', fontWeight:700, color:C.amber }}>{h}</span>
                </div>
              ))}
              <div style={{ marginTop:'24px', display:'flex', alignItems:'center', gap:'10px', padding:'14px 18px', borderRadius:'14px', background: st.open?'rgba(52,211,153,0.07)':'rgba(239,68,68,0.07)', border:`1px solid ${st.open?'rgba(52,211,153,0.15)':'rgba(239,68,68,0.15)'}` }}>
                <div style={{ width:'7px', height:'7px', borderRadius:'50%', background: st.open?'#34D399':'#F87171', flexShrink:0 }} />
                <span style={{ fontSize:'13px', fontWeight:600, color: st.open?'#34D399':'#F87171' }}>
                  {st.open?`Abierto ahora · ${st.next}`:`Cerrado · ${st.next}`}
                </span>
              </div>
            </div>

            {/* Location */}
            <div style={{ borderRadius:'24px', padding:'36px', background:C.surface, border:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'32px' }}>
                <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:C.amberDim, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <p className="serif" style={{ fontSize:'18px', fontWeight:700, color:C.text }}>Dónde Estamos</p>
              </div>

              <div style={{ borderRadius:'16px', overflow:'hidden', marginBottom:'24px', height:'240px', background:C.faint, position:'relative' }}>
                <iframe
                  title="Ubicación OIKO'S en Google Maps"
                  src="https://maps.google.com/maps?q=Membrillar+1214+Molina+Chile&output=embed"
                  width="100%" height="100%" style={{ border:0, display:'block', filter:'grayscale(0.3) contrast(1.05)' }}
                  loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>

              <div style={{ marginBottom:'24px' }}>
                <p style={{ fontWeight:600, color:C.text }}>Membrillar 1214</p>
                <p style={{ fontSize:'13px', color:C.muted, marginTop:'4px' }}>Molina, Maule, Chile</p>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                {[['Google Maps','https://maps.google.com/?q=Membrillar+1214+Molina+Chile',true],['Waze','https://waze.com/ul?q=Membrillar+1214+Molina+Chile',false]].map(([l,h,p])=>(
                  <a key={l as string} href={h as string} target="_blank" rel="noopener noreferrer"
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'13px', borderRadius:'14px', fontSize:'13px', fontWeight:600, textDecoration:'none', transition:'all 0.2s', background: p?C.amber:C.faint, color: p?'white':C.muted, border: p?'none':`1px solid ${C.border}` }}>
                    {l as string}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ background:C.surface, borderTop:`1px solid ${C.border}`, padding:'64px 32px 40px' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between', gap:'48px', marginBottom:'56px' }}>
            <div>
              <img src={oikosLogo} alt="OIKO'S" style={{ height:'60px', objectFit:'contain', filter:'drop-shadow(0 0 14px rgba(196,125,59,0.3))', marginBottom:'16px', display:'block' }} />
              <p className="serif" style={{ fontSize:'13px', fontStyle:'italic', color:C.muted, maxWidth:'260px', lineHeight:1.6 }}>
                "Honrando las recetas artesanales de nuestra tierra."
              </p>
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              {[{l:'Instagram',icon:<><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></>},{l:'Facebook',icon:<path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>}].map(({l,icon})=>(
                <a key={l} href="#" aria-label={l} style={{ width:'42px', height:'42px', borderRadius:'50%', background:C.faint, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', color:C.muted, textDecoration:'none', transition:'all 0.2s' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.color=C.amber;(e.currentTarget as HTMLAnchorElement).style.borderColor='rgba(196,125,59,0.25)'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.color=C.muted;(e.currentTarget as HTMLAnchorElement).style.borderColor=C.border}}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{icon}</svg>
                </a>
              ))}
            </div>
          </div>
          <Divider />
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'8px', paddingTop:'24px' }}>
            <p style={{ fontSize:'12px', color:'rgba(237,233,224,0.2)' }}>© 2026 OIKO'S — Sabor y Tradición Molinense</p>
            <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
              <p style={{ fontSize:'12px', color:'rgba(237,233,224,0.15)' }}>Membrillar 1214 · Molina, Maule ✦</p>
              <button onClick={()=>setAdminOpen(true)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px', borderRadius:'999px', background:C.faint, border:`1px solid ${C.border}`, cursor:'pointer', fontSize:'12px', fontWeight:600, color:C.muted, fontFamily:'inherit', transition:'all 0.2s' }}
                onMouseEnter={e=>{ e.currentTarget.style.color=C.amber; e.currentTarget.style.borderColor='rgba(196,125,59,0.35)' }}
                onMouseLeave={e=>{ e.currentTarget.style.color=C.muted; e.currentTarget.style.borderColor=C.border }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                Admin
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating cart (mobile) */}
      {cartCount>0 && !cartOpen && (
        <button onClick={()=>setCartOpen(true)} style={{ position:'fixed', bottom:'24px', right:'24px', zIndex:30, display:'flex', alignItems:'center', gap:'10px', padding:'14px 22px', borderRadius:'999px', background:C.amber, color:'white', border:'none', cursor:'pointer', fontWeight:700, fontSize:'14px', fontFamily:'inherit', boxShadow:'0 8px 32px rgba(196,125,59,0.35)', transition:'transform 0.2s' }}
          onMouseEnter={e=>((e.currentTarget as HTMLButtonElement).style.transform='translateY(-2px)')}
          onMouseLeave={e=>((e.currentTarget as HTMLButtonElement).style.transform='translateY(0)')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.98-1.68L21 6H6"/></svg>
          {cartCount} ítems · {fmt(cartTotal)}
        </button>
      )}

      {cartOpen && <CartDrawer cart={cart} onClose={()=>setCartOpen(false)} onQty={handleQty} onRemove={handleRemove} />}
      {adminOpen && <AdminDrawer onClose={()=>setAdminOpen(false)} />}
    </div>
  )
}
