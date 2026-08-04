import { Suspense } from 'react'
import { LoginPage } from '@/components/auth/login-page'

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  )
}
