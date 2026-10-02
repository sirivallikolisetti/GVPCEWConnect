export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          created_at: string
          faculty_id: string
          id: string
          message: string
        }
        Insert: {
          created_at?: string
          faculty_id: string
          id?: string
          message: string
        }
        Update: {
          created_at?: string
          faculty_id?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appt_date: string
          created_at: string
          end_time: string
          faculty_id: string
          faculty_response: string | null
          id: string
          note: string | null
          reason: string
          start_time: string
          status: Database["public"]["Enums"]["appt_status"]
          student_id: string | null
          student_name: string
          updated_at: string
        }
        Insert: {
          appt_date: string
          created_at?: string
          end_time: string
          faculty_id: string
          faculty_response?: string | null
          id?: string
          note?: string | null
          reason: string
          start_time: string
          status?: Database["public"]["Enums"]["appt_status"]
          student_id?: string | null
          student_name: string
          updated_at?: string
        }
        Update: {
          appt_date?: string
          created_at?: string
          end_time?: string
          faculty_id?: string
          faculty_response?: string | null
          id?: string
          note?: string | null
          reason?: string
          start_time?: string
          status?: Database["public"]["Enums"]["appt_status"]
          student_id?: string | null
          student_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_updates: {
        Row: {
          created_at: string
          faculty_id: string
          id: string
          location: string | null
          notify: boolean
          reason: string | null
          status: Database["public"]["Enums"]["avail_status"]
          valid_until: string
        }
        Insert: {
          created_at?: string
          faculty_id: string
          id?: string
          location?: string | null
          notify?: boolean
          reason?: string | null
          status: Database["public"]["Enums"]["avail_status"]
          valid_until: string
        }
        Update: {
          created_at?: string
          faculty_id?: string
          id?: string
          location?: string | null
          notify?: boolean
          reason?: string | null
          status?: Database["public"]["Enums"]["avail_status"]
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_updates_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          id: string
          name: string
        }
        Insert: {
          code: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      faculty: {
        Row: {
          bio: string | null
          cabin: string | null
          created_at: string
          department_id: string | null
          designation: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          subjects: string[]
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          cabin?: string | null
          created_at?: string
          department_id?: string | null
          designation?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          subjects?: string[]
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          cabin?: string | null
          created_at?: string
          department_id?: string | null
          designation?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          subjects?: string[]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faculty_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          faculty_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          faculty_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          faculty_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department_id: string | null
          email: string | null
          full_name: string
          id: string
          roll_no: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name: string
          id: string
          roll_no?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          roll_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_slots: {
        Row: {
          day_of_week: number
          end_time: string
          faculty_id: string
          id: string
          room: string | null
          section: string | null
          start_time: string
          subject: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          faculty_id: string
          id?: string
          room?: string | null
          section?: string | null
          start_time: string
          subject: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          faculty_id?: string
          id?: string
          room?: string | null
          section?: string | null
          start_time?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_registration: {
        Args: {
          p_claim_faculty_id?: string
          p_department_id: string
          p_designation?: string
          p_full_name: string
          p_role: Database["public"]["Enums"]["app_role"]
          p_roll_no?: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_faculty: { Args: { _fid: string }; Returns: boolean }
      unclaimed_faculty: {
        Args: never
        Returns: {
          department_code: string
          full_name: string
          id: string
        }[]
      }
    }
    Enums: {
      app_role: "student" | "faculty"
      appt_status: "pending" | "accepted" | "rejected" | "cancelled"
      avail_status: "available" | "busy" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "faculty"],
      appt_status: ["pending", "accepted", "rejected", "cancelled"],
      avail_status: ["available", "busy", "cancelled"],
    },
  },
} as const
