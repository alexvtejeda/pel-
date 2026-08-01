import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function ensureUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/**
 * The name to show for a member-published listing. `display_name` is nullable
 * (a Google sign-up can skip the onboarding wizard that sets it), and a blank
 * attribution line reads as a broken card — so fall back to the email's local
 * part rather than showing nothing or the full address.
 */
export function ownerDisplayName(owner: { display_name?: string | null; email: string }): string {
  const name = owner.display_name?.trim()
  if (name) return name
  return owner.email.split('@')[0]
}

export function instagramUrl(handle: string): string {
  let clean = handle.trim()
  if (clean.startsWith('http')) return clean
  clean = clean.replace(/^@/, '')
  return `https://instagram.com/${clean}`
}
