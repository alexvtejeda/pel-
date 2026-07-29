/**
 * Mirrors UserPetCard's shape — square photo, then the name / meta / status
 * lines — so the grid does not jump when the real pets land. Keep the wrapper's
 * radius, border and shadow in sync with UserPetCard.
 */
export function UserPetCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-xs border bg-card animate-pulse">
      <div className="aspect-square bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 w-2/3 rounded-xl bg-muted" />
        <div className="h-3 w-1/2 rounded-xl bg-muted" />
        <div className="h-3 w-1/3 rounded-xl bg-muted" />
      </div>
    </div>
  )
}
