import { OnboardingForm } from '@/components/onboarding/OnboardingForm'
import { getNiches } from '@/lib/niches'

export default async function OnboardingPage() {
  const niches = await getNiches()
  return <OnboardingForm niches={niches} />
}
