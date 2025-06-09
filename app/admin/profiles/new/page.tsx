'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function NewProfilePage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/admin/profiles/edit/new');
  }, [router]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '200px'
    }}>
      <CircularProgress size={40} sx={{ mb: 2 }} />
      <Typography>Redirection vers le formulaire de création...</Typography>
    </Box>
  );
} 



