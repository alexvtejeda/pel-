'use client'

import Link, { LinkProps } from 'next/link'
import { MouseEvent, forwardRef, ReactNode } from 'react'
import { useRouteTransition } from './route-transition-context'

type AnchorProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>

export interface TransitionLinkProps extends LinkProps, AnchorProps {
  children: ReactNode
}

export const TransitionLink = forwardRef<HTMLAnchorElement, TransitionLinkProps>(
  function TransitionLink({ href, onClick, children, ...rest }, ref) {
    const { navigate, status } = useRouteTransition()

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event)
      if (event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (event.button !== 0) return
      if (typeof href !== 'string') return

      event.preventDefault()
      if (status !== 'idle') return
      void navigate(href)
    }

    return (
      <Link href={href} ref={ref} onClick={handleClick} {...rest}>
        {children}
      </Link>
    )
  },
)
