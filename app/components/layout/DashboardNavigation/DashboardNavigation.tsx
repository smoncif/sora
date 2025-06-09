'use client';

import React, { useState, useEffect } from 'react';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Paper } from '@mui/material';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GroupIcon from '@mui/icons-material/Group';
import SecurityIcon from '@mui/icons-material/Security';

const navigationItems = [
  {
    text: 'Business Role Analysis',
    icon: <AssignmentIcon />,
    href: '/dashboard/analysis/roles/analysis'
  },
  {
    text: 'User Mapping',
    icon: <GroupIcon />,
    href: '/dashboard/users/mapping'
  },
  {
    text: 'SoD Risk Remediation',
    icon: <SecurityIcon />,
    href: '/dashboard/risks/remediation'
  }
];

/**
 * Navigation latérale spécifique au tableau de bord
 */
const DashboardNavigation = () => {
  const pathname = usePathname();
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    setCurrentPath(pathname || '');
  }, [pathname]);

  return (
    <Box component={Paper} sx={{ width: 280, height: '100%' }}>
      <List>
        {navigationItems.map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <ListItemButton
              selected={currentPath === item.href}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </Link>
        ))}
      </List>
    </Box>
  );
};

export default DashboardNavigation; 
