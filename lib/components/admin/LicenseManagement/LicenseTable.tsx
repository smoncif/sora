'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Typography,
  Stack,
  useTheme,
  alpha,
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

  return (
    <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <TableCell>
              <Typography variant="subtitle2" fontWeight="bold">
                Rôle simple
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2" fontWeight="bold">
                Type de licence
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2" fontWeight="bold">
                Ordre
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2" fontWeight="bold">
                Créé le
              </Typography>
            </TableCell>
            <TableCell align="center">
              <Typography variant="subtitle2" fontWeight="bold">
                Actions
              </Typography>
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
            licenses.map((license) => (
              <TableRow key={license.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {license.simpleRole}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={license.licenseType.name}
                    variant="outlined"
                    size="small"
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={license.licenseType.displayOrder}
                    variant="filled"
                    size="small"
                    color="secondary"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
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
    </TableContainer>
  );
};
