import { Suspense, lazy, type ComponentProps } from 'react'
import type GymMapInner from './GymMap'

const GymMap = lazy(() => import('./GymMap'))

export default function LazyGymMap(props: ComponentProps<typeof GymMapInner>) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-muted/30 text-sm text-muted-foreground">
          地图加载中…
        </div>
      }
    >
      <GymMap {...props} />
    </Suspense>
  )
}
