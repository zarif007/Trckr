import type {
  ProjectFile,
  ModuleFile,
  ProjectFileType,
} from '../../dashboard-context'
import { PROJECT_FILE_LABELS } from '../../dashboard-context'

type BaseConfigFile = Pick<ProjectFile | ModuleFile, 'id' | 'type' | 'updatedAt'>

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
  TType extends ProjectFileType,
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
    const type = file.type as TType
    const Icon = icons[type]
    return {
      kind: 'file' as const,
      id: file.id,
      label: PROJECT_FILE_LABELS[type],
      sublabel,
      icon: Icon,
      updatedAt: file.updatedAt,
      href: `${baseHref}/file/${file.id}`,
    }
  })
}

