'use client';

import React from 'react';
import { Avatar } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useAuth } from '@/hooks/auth/useAuth';

export interface CurrentUserAvatarProps {
  size?: number;
}

/**
 * Affiche l'avatar de l'utilisateur connecté ou une icône par défaut.
 */
const CurrentUserAvatar: React.FC<CurrentUserAvatarProps> = ({ size = 32 }) => {
  const { user, userMetadata } = useAuth();
  // On suppose que l'URL de l'avatar est dans userMetadata.avatar_url
  const avatarUrl = (userMetadata as any)?.avatar_url;
  const alt = userMetadata?.full_name || user?.email || 'Utilisateur';

  if (avatarUrl) {
    return (
      <Avatar
        alt={alt}
        src={avatarUrl}
        sx={{ width: size, height: size }}
      />
    );
  }
  return (
    <Avatar sx={{ width: size, height: size }}>
      <AccountCircleIcon fontSize="large" />
    </Avatar>
  );
};

export default CurrentUserAvatar; 

