export function PawIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="5.5" cy="10" r="2" />
      <circle cx="9.5" cy="5.5" r="2" />
      <circle cx="14.5" cy="5.5" r="2" />
      <circle cx="18.5" cy="10" r="2" />
      <path d="M12 11c-3 0-6 4.5-6 7a3 3 0 0 0 3 3c1.2 0 2-.6 3-.6s1.8.6 3 .6a3 3 0 0 0 3-3c0-2.5-3-7-6-7z" />
    </svg>
  )
}

export function PawLogo() {
  return (
    <span className="flex items-center gap-2.5 text-ink">
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand text-white">
        <PawIcon />
      </span>
      <span className="font-display text-[22px] font-extrabold tracking-tight">Dogi</span>
    </span>
  )
}
