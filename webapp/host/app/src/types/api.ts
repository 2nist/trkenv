export interface PaletteListItem {
  id: string
  experiment_id?: string | null
  name: string
  updated_at?: string | null
}

export interface PaletteListResponse {
  items: PaletteListItem[]
  total?: number
}

export interface CanvasDoc {
  id: string
  name?: string
  nodes?: any[]
  groups?: any[]
  grid_size?: number
  snap?: boolean
  zoom?: number
  viewport?: { x?: number; y?: number }
  meta?: Record<string, any>
}
