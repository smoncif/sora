'use client';

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  SelectChangeEvent
} from '@mui/material';
import { Transaction, BusinessRole } from 'lib/types/roleAnalysis';

interface RoleSelectionFormProps {
  transactions: Transaction[];
  onSave: (role: BusinessRole) => void;
  onCancel: () => void;
}

export function RoleSelectionForm({ transactions, onSave, onCancel }: RoleSelectionFormProps) {
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');

  const handleTransactionChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedTransactions(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSubmit = () => {
    const role: BusinessRole = {
      id: `role_${Date.now()}`,
      name: roleName,
      description,
      transactions: selectedTransactions,
      createdAt: new Date().toISOString()
    };
    onSave(role);
  };
  
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Sélection des Transactions pour le Rôle
      </Typography>
      
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
        <TextField
            fullWidth
          label="Nom du rôle"
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          required
        />
        </Grid>
        
        <Grid size={{ xs: 12 }}>
        <TextField
            fullWidth
          label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          multiline
            rows={3}
        />
        </Grid>
        
        <Grid size={{ xs: 12 }}>
          <FormControl fullWidth>
            <InputLabel>Transactions</InputLabel>
          <Select
              multiple
              value={selectedTransactions}
              onChange={handleTransactionChange}
              input={<OutlinedInput label="Transactions" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const transaction = transactions.find(t => t.id === value);
                    return (
                      <Chip 
                        key={value} 
                        label={transaction?.name || value}
                        size="small"
                      />
                    );
                  })}
      </Box>
              )}
            >
              {transactions.map((transaction) => (
                <MenuItem key={transaction.id} value={transaction.id}>
                  {transaction.name} ({transaction.code})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        </Grid>
        
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined" onClick={onCancel}>
          Annuler
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
              disabled={!roleName || selectedTransactions.length === 0}
        >
              Sauvegarder
        </Button>
      </Box>
        </Grid>
      </Grid>
    </Paper>
  );
} 

