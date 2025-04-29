export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ecotrack: {
        Row: {
          id: string
          title: string
          type: string
          description: string
          country: string
          city: string | null
          street: string | null
          email: string | null
          hyperlink: string | null
          responsible: string | null
          latitude: number | null
          longitude: number | null
          photos: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          type: string
          description: string
          country: string
          city?: string | null
          street?: string | null
          email?: string | null
          hyperlink?: string | null
          responsible?: string | null
          latitude?: number | null
          longitude?: number | null
          photos?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          type?: string
          description?: string
          country?: string
          city?: string | null
          street?: string | null
          email?: string | null
          hyperlink?: string | null
          responsible?: string | null
          latitude?: number | null
          longitude?: number | null
          photos?: string | null
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
} 