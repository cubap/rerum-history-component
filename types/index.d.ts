export interface RerumVersionItem {
  '@id'?: string
  id?: string
  _id?: string
  label?: string
  name?: string
  __rerum?: {
    id?: string
    createdAt?: string | number
    isOverwritten?: string | number
    history?: {
      id?: string
      previous?: string | RerumVersionItem
      next?: Array<string | RerumVersionItem>
      prime?: string
    }
  }
  [key: string]: unknown
}

export interface RerumVersionSummary {
  id: string
  label: string
  item: RerumVersionItem
  children: string[]
  parent: string | null
}

export interface RerumHistoryGraph {
  nodes: Map<string, RerumVersionItem>
  children: Map<string, string[]>
  roots: string[]
  idFor: (item: RerumVersionItem) => string
}

export declare class RerumHistoryData {
  constructor(documentUri: string)
  documentUri: string
  items: RerumVersionItem[]
  graph: RerumHistoryGraph | null
  fetch(): Promise<void>
  getItems(): RerumVersionItem[]
  getGraph(): RerumHistoryGraph | null
  getRoots(): string[]
  getNodes(): Map<string, RerumVersionItem>
  getChildren(): Map<string, string[]>
  getSummary(id: string, labelKey?: string): RerumVersionSummary | null
  getAllSummaries(labelKey?: string): RerumVersionSummary[]
  abort(): void
}

export declare class RerumHistoryTree extends HTMLElement {
  static readonly observedAttributes: string[]
  documentUri: string
  nodeLabelKey: string
  filter: string
  refresh(): Promise<void>
}

declare global {
  interface HTMLElementTagNameMap {
    'rerum-history-tree': RerumHistoryTree
  }
}
