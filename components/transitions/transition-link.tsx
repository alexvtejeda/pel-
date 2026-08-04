'use client'

import Link, { LinkProps } from 'next/link'
import { MouseEvent, forwardRef, ReactNode } from 'react'
import { useRouteTransition } from './route-transition-context'
import { useLocalePath } from '@/lib/i18n/use-locale'

type AnchorProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>

export interface TransitionLinkProps extends LinkProps, AnchorProps {
  children: ReactNode
}

export const TransitionLink = forwardRef<HTMLAnchorElement, TransitionLinkProps>(
  function TransitionLink({ href, onClick, children, ...rest }, ref) {
    const { navigate, status } = useRouteTransition()
    const localePath = useLocalePath()
    // Both the rendered href and the programmatic navigate() must carry the
    // locale, or a middle-click and a left-click would go to different places.
    const localizedHref = typeof href === 'string' ? localePath(href) : href

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event)
      if (event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (event.button !== 0) return
      if (typeof localizedHref !== 'string') return

      event.preventDefault()
      if (status !== 'idle') return
      void navigate(localizedHref)
    }

    return (
      <Link href={localizedHref} ref={ref} onClick={handleClick} {...rest}>
        {children}
      </Link>
    )
  },
)
