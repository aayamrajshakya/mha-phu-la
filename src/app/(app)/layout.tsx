import BottomNav from '@/components/layout/BottomNav'
import SideDrawer from '@/components/layout/SideDrawer'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white shadow-sm">
      <SideDrawer />
      <main className="flex-1 pb-20 overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
