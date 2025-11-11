'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Typography,
  Stack,
  useTheme,
  alpha,
  TablePagination,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  TableChart as TableChartIcon,
} from '@mui/icons-material';
import { SimpleRoleLicenseWithType } from 'lib/types/roleAnalysis';

interface LicenseTableProps {
  licenses: SimpleRoleLicenseWithType[];
  loading: boolean;
  onEdit: (license: SimpleRoleLicenseWithType) => void;
  onDelete: (license: SimpleRoleLicenseWithType) => void;
}

export const LicenseTable: React.FC<LicenseTableProps> = ({
  licenses,
  loading,
  onEdit,
  onDelete,
}) => {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Paginer les licences
  const paginatedLicenses = licenses.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow sx={{ background: alpha(theme.palette.background.default, 0.5) }}>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Rôle simple
            </TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Type de licence
            </TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Ordre
            </TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Créé le
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {licenses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                <Stack alignItems="center" spacing={2}>
                  <TableChartIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                  <Typography variant="h6" color="text.secondary">
                    Aucune licence configurée
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ajoutez des licences ou importez un fichier Excel pour commencer
                  </Typography>
                </Stack>
              </TableCell>
            </TableRow>
          ) : (
            paginatedLicenses.map((license) => (
              <TableRow 
                key={license.id} 
                sx={{
                  '&:hover': {
                    background: alpha(theme.palette.primary.main, 0.02),
                  },
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={600} fontSize="0.875rem">
                    {license.simpleRole}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={license.licenseType.name}
                    size="small"
                    color="primary"
                    sx={{ fontSize: '0.75rem', fontWeight: 500 }}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={license.licenseType.displayOrder}
                    size="small"
                    color="secondary"
                    sx={{ fontSize: '0.75rem', fontWeight: 500 }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" fontSize="0.8125rem">
                    {new Date(license.createdAt).toLocaleDateString('fr-FR')}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(license)}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onDelete(license)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={licenses.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Lignes par page :"
        labelDisplayedRows={({ from, to, count }: { from: number; to: number; count: number }) =>
          `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
        }
        sx={{
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          background: alpha(theme.palette.background.default, 0.3),
        }}
      />
    </TableContainer>
  );
};
