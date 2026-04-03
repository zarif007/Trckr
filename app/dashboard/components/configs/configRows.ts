import type {
 SystemFileType,
 TrackerSchema,
} from '../../dashboard-context'
import { SYSTEM_FILE_LABELS } from '../../dashboard-context'

type BaseConfigFile = Pick<TrackerSchema, 'id' | 'systemType' | 'updatedAt'>

export type ConfigTileRow = {
 kind: 'file'
 id: string
 label: string
 sublabel: string
 icon: typeof import('lucide-react').FileText
 updatedAt: string
 href: string
}

export function buildConfigRows<
 TFile extends BaseConfigFile,
 TType extends SystemFileType,
>({
 files,
 baseHref,
 icons,
 sublabel = '',
}: {
 files: TFile[]
 baseHref: string
 icons: Record<TType, typeof import('lucide-react').FileText>
 sublabel?: string
}): ConfigTileRow[] {
 return files.map((file) => {
 const type = file.systemType as TType
 const Icon = icons[type]
 return {
 kind: 'file' as const,
 id: file.id,
 label: SYSTEM_FILE_LABELS[type],
 sublabel,
 icon: Icon,
 updatedAt: file.updatedAt,
 href: `${baseHref}/${file.id}/edit`,
 }
 })
}
