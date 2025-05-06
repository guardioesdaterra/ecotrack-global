export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Activity = Database['public']['Tables']['ecotrack']['Row']

export type Database = {
  public: {
    Tables: {
      ecotrack: {
        Row: {
          id: string
          user_id?: string
          title: string
          type: string
          description?: string | null
          country: string
          city?: string | null
          street?: string | null
          email?: string | null
          hyperlink?: string | null
          latitude?: number | null
          longitude?: number | null
          photos?: string | null
          created_at?: string | null
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          type: string
          description?: string | null
          country: string
          city?: string | null
          street?: string | null
          email?: string | null
          hyperlink?: string | null
          latitude?: number | null
          longitude?: number | null
          photos?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          type?: string
          description?: string | null
          country?: string
          city?: string | null
          street?: string | null
          email?: string | null
          hyperlink?: string | null
          latitude?: number | null
          longitude?: number | null
          photos?: string | null
          created_at?: string | null
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
} 