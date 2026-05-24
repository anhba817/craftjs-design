import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

export function ShadcnTabs({
  props,
  rootRef,
  composedClasses = {},
  composedInlineStyles = {},
}: AdapterRenderProps) {
  const { tabs, defaultValue } = props as {
    tabs: { value: string; label: string; content: string }[]
    defaultValue: string
  }
  return (
    <span ref={rootRef} style={{ display: 'contents' }}>
      <Tabs
        defaultValue={defaultValue}
        className={cn(composedClasses.root)}
        style={composedInlineStyles.root}
      >
        <TabsList
          className={cn(composedClasses.tabs)}
          style={composedInlineStyles.tabs}
        >
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent
            key={t.value}
            value={t.value}
            className={cn(composedClasses.content)}
            style={composedInlineStyles.content}
          >
            {t.content}
          </TabsContent>
        ))}
      </Tabs>
    </span>
  )
}
