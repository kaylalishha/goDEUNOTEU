import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BottomNav, CsFab, type TabKey } from '../components/Chrome'
import { HomeTab } from '../tabs/HomeTab'
import { OrderTab, ProfileTab, TagihanTab } from '../tabs/MenuTabs'

const TABS: TabKey[] = ['home', 'order', 'tagihan', 'profile']

// /id?tab=order|tagihan|profile — the tab lives in the URL so it survives a
// reload and Back from a sub-page lands on the right tab (FR-GO-L-003).
export default function Landing() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: TabKey = TABS.includes(raw as TabKey) ? (raw as TabKey) : 'home'

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [tab])

  function select(next: TabKey) {
    setParams(next === 'home' ? {} : { tab: next })
  }

  return (
    <div className="relative min-h-screen">
      {tab === 'home' && <HomeTab />}
      {tab === 'order' && <OrderTab />}
      {tab === 'tagihan' && <TagihanTab />}
      {tab === 'profile' && <ProfileTab />}
      <BottomNav active={tab} onSelect={select} />
      <CsFab />
    </div>
  )
}
