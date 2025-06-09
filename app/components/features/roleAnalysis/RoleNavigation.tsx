'use client';

import React from 'react';
import { 
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography
} from '@mui/material';
import {
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import Link from 'next/link';

interface RoleNavigationProps {
  activeSection?: string;
}

export function RoleNavigation({ activeSection = 'roles' }: RoleNavigationProps) {
  const navigationItems = [
    {
      id: 'analysis',
      label: 'Analyse des Rôles',
      icon: <AnalyticsIcon />,
      href: '/dashboard/analysis/roles/analysis'
    }
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Navigation
      </Typography>
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              component={Link}
              href={item.href}
              selected={activeSection === item.id}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
} 

