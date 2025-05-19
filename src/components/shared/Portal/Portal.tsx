import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

interface PortalProps {
  children: React.ReactNode
}

const Portal = ({ children }: PortalProps) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  return mounted ? createPortal(children, document.body) : null
}

export default Portal
