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
      role_analyses: {
        Row: {
          id: string
          created_at: string
          name: string
          description: string | null
          metrics: {
            totalRoles: number
            globalCoverageScore: number
            globalQualityScore: number
            globalSecurityScore: number
            globalOverallScore: number
            roleMetrics: Record<string, {
              roleId: string
              name: string
              transactionCount: number
              coverageScore: number
              qualityScore: number
              securityScore: number
              overallScore: number
              issues: number
            }>
          }
          version: number
          status: 'draft' | 'final'
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string | null
          metrics: {
            totalRoles: number
            globalCoverageScore: number
            globalQualityScore: number
            globalSecurityScore: number
            globalOverallScore: number
            roleMetrics: Record<string, {
              roleId: string
              name: string
              transactionCount: number
              coverageScore: number
              qualityScore: number
              securityScore: number
              overallScore: number
              issues: number
            }>
          }
          version?: number
          status?: 'draft' | 'final'
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string | null
          metrics?: {
            totalRoles: number
            globalCoverageScore: number
            globalQualityScore: number
            globalSecurityScore: number
            globalOverallScore: number
            roleMetrics: Record<string, {
              roleId: string
              name: string
              transactionCount: number
              coverageScore: number
              qualityScore: number
              securityScore: number
              overallScore: number
              issues: number
            }>
          }
          version?: number
          status?: 'draft' | 'final'
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 
