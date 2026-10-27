// Placeholder while amenities load or Privy initialises. No hooks: usable from server and client.
export default function OnboardingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-8 px-4 pt-10 pb-16 sm:px-6">
      <div className="hidden flex-[1_1_240px] flex-col gap-2 md:flex md:max-w-[300px]">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-13 animate-pulse rounded-lg bg-sunk-2" />
        ))}
      </div>
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
        <div className="h-[420px] animate-pulse rounded-xl bg-surface shadow-card" />
      </div>
    </div>
  )
}
