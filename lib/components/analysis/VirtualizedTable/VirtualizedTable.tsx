'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Box,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';

export interface VirtualizedTableColumn {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => React.ReactNode;
  sortable?: boolean;
  onClick?: () => void;
}

export interface VirtualizedTableProps {
  columns: VirtualizedTableColumn[];
  data: any[];
  height?: number;
  itemHeight?: number;
  renderRow: (item: any, index: number, style: React.CSSProperties) => React.ReactNode;
  onRowClick?: (item: any, index: number) => void;
  headerComponent?: React.ReactNode;
  footerComponent?: React.ReactNode;
  overscan?: number;
}

const VirtualizedTableRow = memo(({ 
  index, 
  style, 
  data: { items, renderRow, onRowClick } 
}: {
  index: number;
  style: React.CSSProperties;
  data: {
    items: any[];
    renderRow: (item: any, index: number, style: React.CSSProperties) => React.ReactNode;
    onRowClick?: (item: any, index: number) => void;
  };
}) => {
  const item = items[index];
  const theme = useTheme();
  
  const handleClick = useCallback(() => {
    onRowClick?.(item, index);
  }, [item, index, onRowClick]);

  return (
    <div 
      style={{
        ...style,
        cursor: onRowClick ? 'pointer' : 'default',
      }}
      onClick={handleClick}
    >
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          '&:hover': onRowClick ? {
            backgroundColor: alpha(theme.palette.action.hover, 0.04),
          } : {},
          transition: 'background-color 0.15s ease',
        }}
      >
        {renderRow(item, index, style)}
      </Box>
    </div>
  );
});

VirtualizedTableRow.displayName = 'VirtualizedTableRow';

export const VirtualizedTable = memo<VirtualizedTableProps>(({
  columns,
  data,
  height = 400,
  itemHeight = 48,
  renderRow,
  onRowClick,
  headerComponent,
  footerComponent,
  overscan = 5,
}) => {
  const theme = useTheme();

  const itemData = useMemo(() => ({
    items: data,
    renderRow,
    onRowClick,
  }), [data, renderRow, onRowClick]);

  const tableHeight = useMemo(() => {
    // Calculer la hauteur dynamique basée sur le nombre d'éléments
    const maxItemsToShow = Math.floor(height / itemHeight);
    const itemsToShow = Math.min(data.length, maxItemsToShow);
    return itemsToShow * itemHeight;
  }, [data.length, height, itemHeight]);

  if (data.length === 0) {
    return (
      <TableContainer component={Paper} sx={{ height, bgcolor: 'background.paper' }}>
        <Table>
          {headerComponent && (
            <TableHead>
              {headerComponent}
            </TableHead>
          )}
          <TableBody>
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                align="center" 
                sx={{ 
                  py: 4,
                  color: 'text.secondary',
                  fontStyle: 'italic'
                }}
              >
                Aucune donnée à afficher
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {footerComponent && footerComponent}
      </TableContainer>
    );
  }

  return (
    <Box sx={{ height, width: '100%' }}>
      <TableContainer 
        component={Paper} 
        sx={{ 
          height: '100%',
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Table stickyHeader>
          {headerComponent && (
            <TableHead>
              {headerComponent}
            </TableHead>
          )}
        </Table>
        
        {/* Zone virtualisée */}
        <Box 
          sx={{ 
            height: `calc(100% - ${headerComponent ? '48px' : '0px'} - ${footerComponent ? '56px' : '0px'})`,
            overflow: 'hidden',
          }}
        >
          <List
            height={tableHeight}
            itemCount={data.length}
            itemSize={itemHeight}
            itemData={itemData}
            overscanCount={overscan}
            style={{
              outline: 'none',
            }}
          >
            {VirtualizedTableRow}
          </List>
        </Box>

        {footerComponent && (
          <Box 
            sx={{ 
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
              bgcolor: 'background.paper',
            }}
          >
            {footerComponent}
          </Box>
        )}
      </TableContainer>
    </Box>
  );
});

VirtualizedTable.displayName = 'VirtualizedTable';

export default VirtualizedTable; 