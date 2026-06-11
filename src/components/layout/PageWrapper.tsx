import type { ReactNode } from 'react'
import { TopBar } from './TopBar'

interface PageWrapperProps {
  title: string
  action?: ReactNode
  children: ReactNode
  noPadding?: boolean
}

export function PageWrapper({ title, action, children, noPadding = false }: PageWrapperProps) {
  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0">
      <TopBar title={title} action={action} />
      <main className={['flex-1 overflow-y-auto pb-20 md:pb-0', noPadding ? '' : 'p-4 md:p-6'].join(' ')}>
        {children}
      </main>
    </div>
  )
}
