'use client';

import React, { useState } from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  useTheme,
  Toolbar,
  ListItemButton,
  Box,
  Collapse
} from '@mui/material';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

// Icons

import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import LayersIcon from '@mui/icons-material/Layers';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ListIcon from '@mui/icons-material/List';
import AnalyticsIcon from '@mui/icons-material/Analytics';


/**
 * Interface d'un élément de navigation dans la barre latérale
 * 
 * @property {string} text - Texte à afficher pour l'élément
 * @property {React.ReactNode} [icon] - Icône à afficher à gauche du texte
 * @property {string} [path] - URL de destination (si c'est un lien)
 * @property {SidebarItem[]} [children] - Sous-éléments pour créer des menus imbriqués
 */
export interface SidebarItem {
  text: string;
  icon?: React.ReactNode;
  path?: string;
  children?: SidebarItem[];
}

/**
 * Interface des props du composant Sidebar
 * 
 * @property {boolean} [open=true] - Si true, la barre latérale est déployée
 * @property {number} [width=240] - Largeur de la barre latérale en pixels
 * @property {SidebarItem[]} [items] - Éléments de navigation à afficher
 * @property {() => void} [onClose] - Callback appelé quand l'utilisateur ferme la barre latérale (pour les variantes temporaires)
 * @property {'permanent' | 'persistent' | 'temporary'} [variant='permanent'] - Type d'affichage de la barre latérale
 */
export interface SidebarProps {
  open?: boolean;
  width?: number;
  items?: SidebarItem[];
  onClose?: () => void;
  variant?: 'permanent' | 'persistent' | 'temporary';
}

const defaultItems: SidebarItem[] = [
  {
    text: 'Utilisateurs',
    icon: <PeopleIcon />,
    path: '/dashboard/users'
  },
  {
    text: 'Analyse de Rôles',
    icon: <AnalyticsIcon />,
    path: '/dashboard/analysis/roles/analysis'
  },
  {
    text: 'Rapports',
    icon: <BarChartIcon />,
    path: '/dashboard/reports'
  },
  {
    text: 'Paramètres',
    icon: <SettingsIcon />,
    path: '/dashboard/settings'
  }
];

/**
 * Composant de barre latérale pour la navigation dans l'application
 * 
 * La barre latérale affiche une liste de liens de navigation, avec support pour
 * les menus hiérarchiques (sous-menus), les icônes, et la mise en évidence
 * automatique de l'élément actif basée sur le chemin URL courant.
 * 
 * Ce composant s'adapte aux différentes tailles d'écran et peut être configuré
 * pour être permanent (toujours visible), persistant (peut être fermé mais reste
 * dans le flux), ou temporaire (s'affiche par-dessus le contenu et peut être fermé).
 * 
 * @example
 * // Barre latérale simple avec éléments par défaut
 * <Sidebar />
 * 
 * @example
 * // Barre latérale personnalisée avec navigation spécifique
 * <Sidebar
 *   open={isSidebarOpen}
 *   onClose={handleCloseSidebar}
 *   variant="temporary"
 *   items={[
 *     {
 *       text: 'Accueil',
 *       icon: <HomeIcon />,
 *       path: '/'
 *     },
 *     {
 *       text: 'Administration',
 *       icon: <AdminIcon />,
 *       children: [
 *         {
 *           text: 'Utilisateurs',
 *           path: '/admin/users'
 *         },
 *         {
 *           text: 'Paramètres',
 *           path: '/admin/settings'
 *         }
 *       ]
 *     }
 *   ]}
 * />
 * 
 * @example
 * // Intégration dans une mise en page avec contenu principal
 * <Box sx={{ display: 'flex' }}>
 *   <Sidebar />
 *   <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
 *     {children}
 *   </Box>
 * </Box>
 */
const Sidebar: React.FC<SidebarProps> = ({ 
  open = true, 
  width = 240,
  items = defaultItems,
  onClose,
  variant = 'permanent'
}) => {
  const theme = useTheme();
  const pathname = usePathname();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const handleItemClick = (text: string) => {
    setOpenItems(prev => ({
      ...prev,
      [text]: !prev[text]
    }));
  };

  const isItemActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/');
  };

  const renderNavItems = (navItems: SidebarItem[], level = 0) => {
    return navItems.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isOpen = openItems[item.text] || false;
      const isActive = item.path ? isItemActive(item.path) : false;
      
      return (
        <React.Fragment key={item.text}>
          {hasChildren ? (
            <>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleItemClick(item.text)}
                  sx={{ 
                    pl: 2 + level * 2,
                    backgroundColor: isActive ? 'rgba(0, 0, 0, 0.08)' : 'transparent'
                  }}
                >
                  {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
                  <ListItemText primary={item.text} />
                  {isOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              </ListItem>
              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                <List disablePadding>
                  {item.children && renderNavItems(item.children, level + 1)}
                </List>
              </Collapse>
            </>
          ) : (
            <ListItem disablePadding>
              <Link href={item.path || '#'} style={{ textDecoration: 'none', width: '100%', color: 'inherit' }}>
                <ListItemButton
                  sx={{ 
                    pl: 2 + level * 2,
                    backgroundColor: isActive ? 'rgba(0, 0, 0, 0.08)' : 'transparent'
                  }}
                >
                  {level === 0 && item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </Link>
            </ListItem>
          )}
        </React.Fragment>
      );
    });
  };

  const drawerContent = (
    <>
      <Toolbar />
      <Divider />
      <List>
        {renderNavItems(items)}
      </List>
    </>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: open ? width : 0 }, flexShrink: { md: 0 } }}
    >
      <Drawer
        variant={variant}
        open={open}
        onClose={onClose}
        sx={{
          '& .MuiDrawer-paper': {
            position: 'relative',
            whiteSpace: 'nowrap',
            width: width,
            boxSizing: 'border-box',
            ...(!open && {
              overflowX: 'hidden',
              width: theme.spacing(7),
              [theme.breakpoints.up('md')]: {
                width: theme.spacing(9),
              },
            }),
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar; 