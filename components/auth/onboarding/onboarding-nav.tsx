'use client'

import { useRouter } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import React from 'react'
import { Logo } from '@/components/logo'

type BreadcrumbItemType = {
  label: string
  href?: string
  current?: boolean
  changeRole?: boolean
}

type Props = {
  items: BreadcrumbItemType[]
}

export function OnboardingNav({ items }: Props) {
    const router = useRouter()
    function handleClick(item: BreadcrumbItemType) {
        if (item.changeRole) {
        sessionStorage.setItem("pelu_changing_role", "1")
        router.push("/auth/role-selection")
        return
        }

        if (item.href) {
        router.push(item.href)
        }
    }
    return ( 
        <nav className="relative shrink-0 bg-card z-10 inset-shadow-[0px_0px_1px_2px_var(--color-input)]">
          <div className="container mx-auto flex gap-8 items-center px-4 py-5">
            <Logo width={32} height={32} />
            <Breadcrumb>
                <BreadcrumbList>
                    {items.map((item, i) => (
                    <React.Fragment key={i}>
                        <BreadcrumbItem>
                        {item.current ? (
                            <BreadcrumbPage>{item.label}</BreadcrumbPage>
                        ) : (
                            <button
                            onClick={() => handleClick(item)}
                            className="hover:text-foreground transition-colors"
                            >
                            {item.label}
                            </button>
                        )}
                        </BreadcrumbItem>

                        {i < items.length - 1 && <BreadcrumbSeparator />}
                    </React.Fragment>
                    ))}
                </BreadcrumbList>
            </Breadcrumb>
          </div>
        </nav>
    )
}