import { GradientButton } from "@/components/ui/gradient-button"

function Demo() {
  return (
    <div className="flex gap-8">
      <GradientButton size="default" variant="default">Get Started</GradientButton>
      <GradientButton size="default" variant="variant">Explore</GradientButton>
      <GradientButton size="sm" variant="default">Small Button</GradientButton>
      <GradientButton size="lg" variant="variant">Large Button</GradientButton>
    </div>
  )
}

export { Demo } 