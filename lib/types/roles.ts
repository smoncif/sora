export interface Transaction {
  id: string;
  name: string;
  description?: string;
  type: string;
  frequency?: number;
  lastUsed?: Date;
  metadata?: Record<string, any>;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  transactions: Transaction[];
  qualityScore: number;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

export interface RoleAnalysis {
  roleId: string;
  analysisDate: Date;
  metrics: {
    coverage: number;
    consistency: number;
    uniqueness: number;
    efficiency: number;
  };
  recommendations?: string[];
  comparisonData?: {
    similarRoles: string[];
    overlapPercentages: Record<string, number>;
  };
} 
