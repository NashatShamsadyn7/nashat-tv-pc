// Drawer toggle for the sidebar on phones (styles in mobile.css).
import './mobile.css'

const button = document.createElement('button')
button.id = 'web-nav-toggle'
button.type = 'button'
button.setAttribute('aria-label', 'Menu')
button.innerHTML =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'
button.addEventListener('click', () => document.documentElement.classList.toggle('web-nav-open'))
document.body.append(button)

// Close after navigating, or when tapping the dimmed backdrop.
document.addEventListener('click', (e) => {
  const root = document.documentElement
  if (!root.classList.contains('web-nav-open') || button.contains(e.target as Node)) return
  const target = e.target as HTMLElement
  const inAside = target.closest('aside')
  if (!inAside || target.closest('a')) root.classList.remove('web-nav-open')
})
