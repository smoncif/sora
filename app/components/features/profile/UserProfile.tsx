"use client";

import { FC } from 'react';
import { Box, Avatar, Typography, Paper } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';

interface UserProfileProps {
  showDetails?: boolean;
}

const UserProfile: FC<UserProfileProps> = ({ showDetails = true }) => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Paper 
      elevation={2}
      sx={{ 
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2
      }}
    >
      <Avatar 
        src={user.user_metadata?.avatar_url || undefined}
        alt={user.user_metadata?.full_name || 'User'}
        sx={{ width: 80, height: 80 }}
      />
      
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6">
          {user.user_metadata?.full_name || user.email?.split('@')[0]}
        </Typography>
        {showDetails && (
          <>
            <Typography variant="body1" color="text.secondary">
              {user.email}
            </Typography>
            {user.user_metadata?.role && (
              <Typography variant="body2" color="text.secondary">
                Role: {user.user_metadata.role}
              </Typography>
            )}
          </>
        )}
      </Box>
    </Paper>
  );
};

export default UserProfile; 

