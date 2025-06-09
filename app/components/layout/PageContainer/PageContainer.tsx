'use client';

import React, { ReactNode } from 'react';
import { Box, Container, Paper, Typography, Breadcrumbs, useTheme } from '@mui/material';
import Link from 'next/link';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

/**
 * Interface pour un élément de fil d'Ariane
 * 
 * @property {string} label - Texte à afficher pour l'élément
 * @property {string} [href] - URL de destination (optionnel pour le dernier élément)
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Interface des props du composant PageContainer
 * 
 * @property {string} [title] - Titre principal de la page
 * @property {string} [subtitle] - Sous-titre ou description de la page
 * @property {BreadcrumbItem[]} [breadcrumbs] - Éléments du fil d'Ariane
 * @property {ReactNode} children - Contenu de la page
 * @property {'xs' | 'sm' | 'md' | 'lg' | 'xl' | false} [maxWidth='xl'] - Largeur maximale du conteneur
 * @property {boolean} [withPaper=true] - Si true, enveloppe le contenu dans un composant Paper
 * @property {ReactNode} [headerAction] - Élément à afficher à droite de l'en-tête (ex: boutons d'action)
 */
export interface PageContainerProps {
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  withPaper?: boolean;
  headerAction?: ReactNode;
}

/**
 * Composant conteneur de page standardisé
 * 
 * PageContainer fournit une mise en page cohérente pour toutes les pages de l'application
 * avec une gestion automatique des titres, sous-titres, fil d'Ariane et actions.
 * Il applique également les espacements et les styles visuels conformes à la charte graphique.
 * 
 * @example
 * // Page simple avec titre
 * <PageContainer title="Tableau de bord">
 *   <Typography>Contenu de la page</Typography>
 * </PageContainer>
 * 
 * @example
 * // Page complète avec fil d'Ariane, titre, sous-titre et actions
 * <PageContainer
 *   title="Analyse des rôles"
 *   subtitle="Visualisez et optimisez la distribution des rôles"
 *   breadcrumbs={[
 *     { label: 'Accueil', href: '/' },
 *     { label: 'Administration', href: '/admin' },
 *     { label: 'Analyse des rôles' }
 *   ]}
 *   headerAction={
 *     <Button variant="contained" startIcon={<AddIcon />}>
 *       Nouveau rôle
 *     </Button>
 *   }
 * >
 *   <RoleAnalysisContent />
 * </PageContainer>
 * 
 * @example
 * // Page sans Paper et avec largeur personnalisée
 * <PageContainer
 *   title="Prévisualisation"
 *   withPaper={false}
 *   maxWidth="md"
 * >
 *   <PreviewContent />
 * </PageContainer>
 */
const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subtitle,
  breadcrumbs,
  children,
  maxWidth = 'xl',
  withPaper = true,
  headerAction
}) => {
  const theme = useTheme();

  const renderBreadcrumbs = () => {
    if (!breadcrumbs || breadcrumbs.length === 0) return null;

    return (
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{ mb: 2 }}
      >
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          return isLast ? (
            <Typography 
              key={item.label} 
              color="text.primary"
              sx={{ fontSize: '0.875rem' }}
            >
              {item.label}
            </Typography>
          ) : (
            <Link 
              key={item.label} 
              href={item.href || '#'}
              style={{ textDecoration: 'none' }}
            >
              <Typography 
                color="primary"
                sx={{ fontSize: '0.875rem' }}
              >
                {item.label}
              </Typography>
            </Link>
          );
        })}
      </Breadcrumbs>
    );
  };

  const renderHeader = () => {
    if (!title && !headerAction) return null;

    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: subtitle ? 1 : 3
        }}
      >
        <Box>
          {title && (
            <Typography variant="h5" component="h1" gutterBottom={!!subtitle}>
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        
        {headerAction && (
          <Box>
            {headerAction}
          </Box>
        )}
      </Box>
    );
  };

  const content = (
    <>
      {renderBreadcrumbs()}
      {renderHeader()}
      {children}
    </>
  );

  return (
    <Container maxWidth={maxWidth} sx={{ py: 4 }}>
      {withPaper ? (
        <Paper 
          elevation={0}
          sx={{ 
            p: 3,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          {content}
        </Paper>
      ) : content}
    </Container>
  );
};

export default PageContainer; 

