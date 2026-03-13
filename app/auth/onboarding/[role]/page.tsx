import { OnboardingClient } from '@/components/auth/onboarding/onboarding-client'

export function generateStaticParams() {
  return [
    { role: 'member' },
    { role: 'rescue_center' },
    { role: 'business' },
  ]
}

export default async function OnboardingPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  return <OnboardingClient role={role} />
}
