export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ecotrack: {
        Row: {
          id: number
          title: string
          type: string
          description: string | null
          latitude: number | null
          longitude: number | null
          country: string | null
          city: string | null
          responsible: string | null
          created_at: string
          direct_benefited?: number | null
          indirect_benefited?: number | null
          photos?: string[] | null
        }
        Insert: {
          id?: number
          title: string
          type: string
          description?: string | null
          latitude?: number | null
          longitude?: number | null
          country?: string | null
          city?: string | null
          responsible?: string | null
          created_at?: string
          direct_benefited?: number | null
          indirect_benefited?: number | null
          photos?: string[] | null
        }
        Update: {
          id?: number
          title?: string
          type?: string
          description?: string | null
          latitude?: number | null
          longitude?: number | null
          country?: string | null
          city?: string | null
          responsible?: string | null
          created_at?: string
          direct_benefited?: number | null
          indirect_benefited?: number | null
          photos?: string[] | null
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
} 