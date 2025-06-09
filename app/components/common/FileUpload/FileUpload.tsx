'use client';

import React, { useRef, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  useTheme,
  alpha,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

export interface FileUploadProps {
  accept?: string;
  maxSize?: number; // en MB
  onFileSelect: (file: File) => void;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  disabled?: boolean;
  title?: string;
  subtitle?: string;
  buttonText?: string;
}

/**
 * Composant d'upload de fichiers moderne avec drag & drop
 */
export const FileUpload: React.FC<FileUploadProps> = ({
  accept = '*',
  maxSize = 100,
  onFileSelect,
  loading = false,
  error = null,
  success = null,
  disabled = false,
  title = 'Glissez-déposez votre fichier ici',
  subtitle = 'ou cliquez pour sélectionner',
  buttonText = 'Choisir un fichier',
}) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > maxSize * 1024 * 1024) {
        // Gérer l'erreur de taille via le parent
        return;
    }
      onFileSelect(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [maxSize, onFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled && !loading) {
      setIsDragOver(true);
    }
  }, [disabled, loading]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    if (disabled || loading) return;

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.size > maxSize * 1024 * 1024) {
        // Gérer l'erreur de taille via le parent
        return;
      }
      onFileSelect(file);
    }
  }, [disabled, loading, maxSize, onFileSelect]);

  const handleClick = useCallback(() => {
    if (!disabled && !loading) {
      fileInputRef.current?.click();
    }
  }, [disabled, loading]);

  const getStatusColor = () => {
    if (error) return theme.palette.error.main;
    if (success) return theme.palette.success.main;
    if (isDragOver) return theme.palette.primary.main;
    return alpha(theme.palette.text.secondary, 0.4);
  };

  const getStatusIcon = () => {
    if (error) return <ErrorIcon sx={{ fontSize: 40, color: theme.palette.error.main }} />;
    if (success) return <SuccessIcon sx={{ fontSize: 40, color: theme.palette.success.main }} />;
    if (loading) return <FileIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />;
    return <UploadIcon sx={{ fontSize: 40, color: getStatusColor() }} />;
  };
  
  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled || loading}
      />
      
      <Paper
        elevation={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        sx={{
          p: 5,
          textAlign: 'center',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          border: `2px dashed ${getStatusColor()}`,
          borderRadius: 3,
          backgroundColor: isDragOver 
            ? alpha(theme.palette.primary.main, 0.04)
            : 'transparent',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': !disabled && !loading ? {
            borderColor: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
            '& .upload-icon': {
              transform: 'translateY(-4px)',
              color: theme.palette.primary.main,
            },
          } : {},
          opacity: disabled ? 0.6 : 1,
          minHeight: 200,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Box 
          className="upload-icon"
          sx={{ 
            mb: 2,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {getStatusIcon()}
        </Box>
        
        <Typography
          variant="h6"
          sx={{
            mb: 1,
            color: theme.palette.text.primary,
            fontWeight: 500,
            fontSize: '1.1rem',
          }}
        >
          {loading ? 'Traitement en cours...' : title}
          </Typography>
          
        <Typography
          variant="body2"
          sx={{
            mb: 3,
            color: theme.palette.text.secondary,
            fontSize: '0.9rem',
          }}
        >
          {loading ? 'Veuillez patienter' : subtitle}
                          </Typography>
                          
        {!loading && (
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            disabled={disabled}
            sx={{
              borderRadius: 2,
              px: 4,
              py: 1.2,
              fontWeight: 500,
              textTransform: 'none',
              background: theme.palette.primary.main,
              '&:hover': {
                background: theme.palette.primary.dark,
                transform: 'translateY(-1px)',
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              },
            }}
          >
            {buttonText}
          </Button>
        )}
        
        {loading && (
          <Box sx={{ mt: 2, width: '60%' }}>
                      <LinearProgress 
              sx={{ 
                height: 6,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  borderRadius: 3,
                }
              }}
            />
                    </Box>
                  )}
                  
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 3,
            color: alpha(theme.palette.text.secondary, 0.7),
            fontSize: '0.75rem',
          }}
        >
          Formats supportés: {accept} • Taille max: {maxSize}MB
        </Typography>
      </Paper>
          
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mt: 2,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            bgcolor: alpha(theme.palette.error.main, 0.05),
          }}
        >
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert 
          severity="success" 
          sx={{ 
            mt: 2,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            bgcolor: alpha(theme.palette.success.main, 0.05),
          }}
        >
          {success}
        </Alert>
      )}
    </Box>
  );
};

