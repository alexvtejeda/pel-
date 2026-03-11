import { OnboardingClient } from '@/components/auth/onboarding/onboarding-client'

export function generateStaticParams() {
  return [
    { role: 'adopter' },
    { role: 'member' },
    { role: 'rescue_center' },
  ]
}

export default async function OnboardingPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  return <OnboardingClient role={role} />
}
