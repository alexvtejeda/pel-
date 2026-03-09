"use client"

import { AnimatePresence, motion } from "framer-motion"
import type React from "react"
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useOnClickOutside } from "@/packages/hooks"

interface ModalContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false)

  return <ModalContext.Provider value={{ open, setOpen }}>{children}</ModalContext.Provider>
}

export const useModal = () => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider")
  }
  return context
}

export function Modal({ children }: { children: ReactNode }) {
  return <ModalProvider>{children}</ModalProvider>
}

export const ModalTrigger = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  const { setOpen } = useModal()
  return (
    <button
      type="button"
      className={cn(
        "px-4 py-2 rounded-md text-black dark:text-white text-center relative overflow-hidden",
        className,
      )}
      onClick={() => setOpen(true)}
    >
      {children}
    </button>
  )
}

export const ModalBody = ({ children, className }: { children: ReactNode; className?: string }) => {
  const { open } = useModal()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }
  }, [open])

  const modalRef = useRef<HTMLDivElement>(null)
  const { setOpen } = useModal()
  useOnClickOutside(modalRef as React.RefObject<HTMLElement>, () => setOpen(false))

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{
            opacity: 1,
            backdropFilter: "blur(10px)",
          }}
          className="fixed perspective-midrange transform-3d inset-0 h-full w-full  flex items-center justify-center z-50"
          exit={{
            opacity: 0,
            backdropFilter: "blur(0px)",
          }}
          initial={{
            opacity: 0,
          }}
        >
          <Overlay />

          <motion.div
            animate={{
              opacity: 1,
              scale: 1,
              rotateX: 0,
              y: 0,
            }}
            className={cn(
              "min-h-[50%] max-h-[90%] md:max-w-[40%] bg-white dark:bg-neutral-950 border border-transparent dark:border-neutral-800 md:rounded-2xl relative z-50 flex flex-col flex-1 overflow-hidden",
              className,
            )}
            exit={{
              opacity: 0,
              scale: 0.8,
              rotateX: 10,
            }}
            initial={{
              opacity: 0,
              scale: 0.5,
              rotateX: 40,
              y: 40,
            }}
            ref={modalRef}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 15,
            }}
          >
            <CloseIcon />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const ModalContent = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  return <div className={cn("flex flex-col flex-1 p-8 md:p-10", className)}>{children}</div>
}

export const ModalFooter = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  return (
    <div className={cn("flex justify-end p-4 bg-gray-100 dark:bg-neutral-900", className)}>
      {children}
    </div>
  )
}

const Overlay = ({ className }: { className?: string }) => {
  return (
    <motion.div
      animate={{
        opacity: 1,
        backdropFilter: "blur(10px)",
      }}
      className={`fixed inset-0 h-full w-full bg-black bg-opacity-50 z-50 ${className}`}
      exit={{
        opacity: 0,
        backdropFilter: "blur(0px)",
      }}
      initial={{
        opacity: 0,
      }}
    />
  )
}

const CloseIcon = () => {
  const { setOpen } = useModal()
  return (
    <button type="button" className="absolute top-4 right-4 group" onClick={() => setOpen(false)}>
      <svg
        aria-label="Close"
        className="text-black dark:text-white h-4 w-4 group-hover:scale-125 group-hover:rotate-3 transition duration-200"
        fill="none"
        height="24"
        role="img"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0 0h24v24H0z" fill="none" stroke="none" />
        <path d="M18 6l-12 12" />
        <path d="M6 6l12 12" />
      </svg>
    </button>
  )
}

// Demo
export function Demo() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <Modal>
        <ModalTrigger className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg">
          Open Modal
        </ModalTrigger>
        <ModalBody>
          <ModalContent>
            <h2 className="text-2xl font-bold mb-4">Welcome!</h2>
            <p className="text-muted-foreground">
              This is an animated modal with 3D rotation effects. Click outside or press the X to
              close.
            </p>
          </ModalContent>
          <ModalFooter>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
              Continue
            </button>
          </ModalFooter>
        </ModalBody>
      </Modal>
    </div>
  )
}
