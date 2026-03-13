import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function instagramUrl(handle: string): string {
  let clean = handle.trim()
  if (clean.startsWith('http')) return clean
  clean = clean.replace(/^@/, '')
  return `https://instagram.com/${clean}`
}
