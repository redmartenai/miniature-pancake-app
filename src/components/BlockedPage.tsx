/*
 * A web page from the supplied design whose data the backend doesn't serve yet. It keeps the page's
 * header and card layout (eyebrow + title per card, as designed) and states what each card needs.
 */
import { Card, CardHeader, Page, PageHeader } from '@/components/ui'
import { Unavailable } from '@/components/states'
import type { Blocker } from '@/lib/blockers'

export interface BlockedCard { eyebrow: string; title: string; blocker?: Blocker; wide?: boolean }

export function BlockedPage({ eyebrow, title, blocker, cards }: { eyebrow: string; title: string; blocker: Blocker; cards: BlockedCard[] }) {
  return (
    <Page>
      <PageHeader eyebrow={eyebrow} title={title} />
      <Unavailable blocker={blocker} className="mb-5" />
      <div className="grid gap-5 xl:grid-cols-2">
        {cards.map(c => (
          <Card key={c.title} className={c.wide ? 'xl:col-span-2' : undefined}>
            <CardHeader eyebrow={c.eyebrow} title={c.title} />
            {c.blocker && c.blocker !== blocker
              ? <Unavailable blocker={c.blocker} compact />
              : <div className="grid h-28 place-items-center rounded-[12px] border border-dashed border-line text-[13px] text-stone">Appears here once connected</div>}
          </Card>
        ))}
      </div>
    </Page>
  )
}
