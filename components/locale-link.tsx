'use client'

import NextLink, { LinkProps } from 'next/link'
import { forwardRef, ReactNode } from 'react'
import { useLocalePath } from '@/lib/i18n/use-locale'

type AnchorProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>

export interface LocaleLinkProps extends LinkProps, AnchorProps {
  children?: ReactNode
}

/**
 * `next/link` with the active locale prefixed onto app-relative hrefs.
 *
 * Import this instead of `next/link` so call sites keep writing plain paths
 * (`href="/pets"`). Spreading the prefix across every JSX literal instead would
 * guarantee that the next person to add a link forgets it.
 *
 * External URLs, anchors and `UrlObject` hrefs are passed through untouched.
 */
const LocaleLink = forwardRef<HTMLAnchorElement, LocaleLinkProps>(
  function LocaleLink({ href, children, ...rest }, ref) {
    const localePath = useLocalePath()
    const localized = typeof href === 'string' ? localePath(href) : href

    return (
      <NextLink href={localized} ref={ref} {...rest}>
        {children}
      </NextLink>
    )
  },
)

export default LocaleLink
export { LocaleLink }
