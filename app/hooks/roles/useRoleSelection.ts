import { useState, useCallback, useMemo } from 'react';
import { Transaction, Role } from '@/types/roles';

interface UseRoleSelectionProps {
  availableTransactions?: Transaction[];
  initialRole?: Role;
}

interface UseRoleSelectionReturn {
  roleName: string;
  setRoleName: (name: string) => void;
  selectedTransactions: Transaction[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  roleQualityScore: number;
  filteredTransactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  removeTransaction: (transactionId: string) => void;
  calculateQualityScore: () => number;
  resetSelection: () => void;
  isValid: boolean;
}

export function useRoleSelection({ 
  availableTransactions = [],
  initialRole
}: UseRoleSelectionProps): UseRoleSelectionReturn {
  const [roleName, setRoleName] = useState(initialRole?.name || '');
  const [selectedTransactions, setSelectedTransactions] = useState<Transaction[]>(
    initialRole?.transactions || []
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [roleQualityScore, setRoleQualityScore] = useState(
    initialRole?.qualityScore || 0
  );

  const filteredTransactions = useMemo(() => {
    if (!Array.isArray(availableTransactions)) return [];
    
    return availableTransactions.filter(transaction => {
      if (!transaction?.name) return false;
      
      const isNotSelected = !selectedTransactions.some(
        selected => selected.id === transaction.id
      );
      const matchesSearch = transaction.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return isNotSelected && matchesSearch;
    });
  }, [availableTransactions, selectedTransactions, searchQuery]);

  const addTransaction = useCallback((transaction: Transaction) => {
    setSelectedTransactions(prev => [...prev, transaction]);
  }, []);

  const removeTransaction = useCallback((transactionId: string) => {
    setSelectedTransactions(prev =>
      prev.filter(t => t.id !== transactionId)
    );
  }, []);

  const calculateQualityScore = useCallback(() => {
    // Facteurs de qualité:
    // 1. Nombre de transactions (min 3, max 20)
    // 2. Diversité des types de transactions
    // 3. Fréquence d'utilisation moyenne
    
    if (selectedTransactions.length < 3) return 0;

    const transactionTypes = new Set(
      selectedTransactions.map(t => t.type)
    );
    const typesDiversity = transactionTypes.size / selectedTransactions.length;
    
    const avgFrequency = selectedTransactions.reduce(
      (sum, t) => sum + (t.frequency || 0), 
      0
    ) / selectedTransactions.length;

    const sizeScore = Math.min(selectedTransactions.length / 20, 1) * 0.4;
    const diversityScore = typesDiversity * 0.3;
    const frequencyScore = Math.min(avgFrequency / 100, 1) * 0.3;

    const totalScore = Math.round(
      (sizeScore + diversityScore + frequencyScore) * 100
    );

    setRoleQualityScore(totalScore);
    return totalScore;
  }, [selectedTransactions]);

  const resetSelection = useCallback(() => {
    setRoleName('');
    setSelectedTransactions([]);
    setSearchQuery('');
    setRoleQualityScore(0);
  }, []);

  const isValid = useMemo(() => {
    return roleName.length > 0 && selectedTransactions.length >= 3;
  }, [roleName, selectedTransactions]);

  return {
    roleName,
    setRoleName,
    selectedTransactions,
    searchQuery,
    setSearchQuery,
    roleQualityScore,
    filteredTransactions,
    addTransaction,
    removeTransaction,
    calculateQualityScore,
    resetSelection,
    isValid
  };
} 
