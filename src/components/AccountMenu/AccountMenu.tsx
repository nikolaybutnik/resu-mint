import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './AccountMenu.module.scss'
import { FaUser, FaUserCheck } from 'react-icons/fa'
import { useAuthStore } from '@/stores'
import Portal from '@/components/shared/Portal/Portal'
import { ROUTES } from '@/lib/constants'

const AccountMenu: React.FC = () => {
  const { user, signOut } = useAuthStore()
  const router = useRouter()

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // TODO: handle toast messages when infrastructure is in place.
  const handleLogin = () => {
    setIsMenuOpen(false)
    router.push(ROUTES.LOGIN)
  }

  const handleLogout = async () => {
    const { error } = await signOut()

    if (!error) {
      setIsMenuOpen(false)
      // TODO: redirect to welcome page when in place
    }
  }

  return (
    <div className={styles.accountMenu}>
      <button
        className={styles.iconBtn}
        onClick={() => setIsMenuOpen((prev) => !prev)}
      >
        <div className={styles.icon}>
          {user ? (
            user.email?.slice(0, 1).toUpperCase() || <FaUserCheck />
          ) : (
            <FaUser />
          )}
        </div>
      </button>

      {isMenuOpen && (
        <Portal>
          <div className={styles.overlay} onClick={() => setIsMenuOpen(false)}>
            <div
              className={styles.optionsContainer}
              onClick={(e) => e.stopPropagation()}
            >
              {user ? (
                <button className={styles.option} onClick={handleLogout}>
                  Log out
                </button>
              ) : (
                <button className={styles.option} onClick={handleLogin}>
                  Log in
                </button>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}

export default AccountMenu
