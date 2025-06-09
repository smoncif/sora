'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Scatter,
  ScatterChart,
  ZAxis,
  ReferenceArea,
  ReferenceLine,
  LabelList
} from 'recharts';
import { Box, Typography, Paper, Card, CardContent, useTheme } from '@mui/material';
import { Role, RoleAnalysis } from '@/types/roles';

interface RoleHistoryEvent {
  id: string;
  date: Date;
  type: 'creation' | 'modification' | 'optimization' | 'deletion' | 'analysis';
  roleId?: string;
  roleName?: string;
  analysisId?: string;
  analysisName?: string;
  metrics?: {
    coverageScore?: number;
    qualityScore?: number;
    securityScore?: number;
    overallScore?: number;
  };
  description: string;
}

interface RoleHistoryTimelineProps {
  events: RoleHistoryEvent[];
  title?: string;
  startDate?: Date;
  endDate?: Date;
  highlightedRoleIds?: string[];
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Fonction pour transformer les événements pour la timeline
const processEventsForTimeline = (
  events: RoleHistoryEvent[],
  startDate?: Date,
  endDate?: Date,
  highlightedRoleIds?: string[]
) => {
  // Trier les événements par date
  const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Filtrer par dates si spécifiées
  const filteredEvents = sortedEvents.filter(event => {
    if (startDate && event.date < startDate) return false;
    if (endDate && event.date > endDate) return false;
    return true;
  });

  // Regrouper les événements par jour pour la visualisation
  const eventsByDay: { [key: string]: any } = {};
  
  filteredEvents.forEach(event => {
    const dateKey = event.date.toISOString().split('T')[0];
    
    if (!eventsByDay[dateKey]) {
      eventsByDay[dateKey] = {
        date: event.date,
        dateFormatted: formatDate(event.date),
        creations: 0,
        modifications: 0,
        optimizations: 0,
        deletions: 0,
        analyses: 0,
        events: [],
        highlightedEvents: 0
      };
    }
    
    eventsByDay[dateKey][`${event.type}s`] += 1;
    eventsByDay[dateKey].events.push(event);
    
    // Compter les événements mis en évidence
    if (highlightedRoleIds && event.roleId && highlightedRoleIds.includes(event.roleId)) {
      eventsByDay[dateKey].highlightedEvents += 1;
    }
  });
  
  return Object.values(eventsByDay);
};

export const RoleHistoryTimeline: React.FC<RoleHistoryTimelineProps> = ({
  events,
  title = "Historique des Rôles",
  startDate,
  endDate,
  highlightedRoleIds
}) => {
  const theme = useTheme();
  const processedData = processEventsForTimeline(events, startDate, endDate, highlightedRoleIds);
  
  // Couleurs pour les différents types d'événements
  const eventColors = {
    creations: theme.palette.success.main,
    modifications: theme.palette.info.main,
    optimizations: theme.palette.warning.main,
    deletions: theme.palette.error.main,
    analyses: theme.palette.secondary.main
  };

  // Obtenir le nombre total d'événements
  const totalEvents = events.length;
  
  // Calculer les statistiques pour le résumé
  const stats = {
    creations: events.filter(e => e.type === 'creation').length,
    modifications: events.filter(e => e.type === 'modification').length,
    optimizations: events.filter(e => e.type === 'optimization').length,
    deletions: events.filter(e => e.type === 'deletion').length,
    analyses: events.filter(e => e.type === 'analysis').length,
  };

  return (
    <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        {title}
      </Typography>
      
      {/* Cartes de statistiques */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card variant="outlined" sx={{ minWidth: 120 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              Créations
            </Typography>
            <Typography variant="h6">
              {stats.creations}
            </Typography>
          </CardContent>
        </Card>
        
        <Card variant="outlined" sx={{ minWidth: 120 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              Modifications
            </Typography>
            <Typography variant="h6">
              {stats.modifications}
            </Typography>
          </CardContent>
        </Card>
        
        <Card variant="outlined" sx={{ minWidth: 120 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              Optimisations
            </Typography>
            <Typography variant="h6">
              {stats.optimizations}
            </Typography>
          </CardContent>
        </Card>
        
        <Card variant="outlined" sx={{ minWidth: 120 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              Suppressions
            </Typography>
            <Typography variant="h6">
              {stats.deletions}
            </Typography>
          </CardContent>
        </Card>
        
        <Card variant="outlined" sx={{ minWidth: 120 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              Analyses
            </Typography>
            <Typography variant="h6">
              {stats.analyses}
            </Typography>
          </CardContent>
        </Card>
      </Box>
      
      {/* Timeline */}
      <Box sx={{ height: 400, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={processedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="dateFormatted" 
              angle={-45} 
              textAnchor="end"
              tickMargin={20}
            />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'highlightedEvents') {
                  return [`${value} événement(s) mis en évidence`, 'Mise en évidence'];
                }
                if (typeof name === 'string') {
                  return [value, name.charAt(0).toUpperCase() + name.slice(0, -1) + 's'];
                }
                return [value, name];
              }}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            <Bar 
              yAxisId="left" 
              dataKey="creations" 
              name="Créations" 
              fill={eventColors.creations}
              barSize={20}
              stackId="stack"
            />
            <Bar 
              yAxisId="left" 
              dataKey="modifications" 
              name="Modifications" 
              fill={eventColors.modifications}
              barSize={20}
              stackId="stack"
            />
            <Bar 
              yAxisId="left" 
              dataKey="optimizations" 
              name="Optimisations" 
              fill={eventColors.optimizations}
              barSize={20}
              stackId="stack"
            />
            <Bar 
              yAxisId="left" 
              dataKey="deletions" 
              name="Suppressions" 
              fill={eventColors.deletions}
              barSize={20}
              stackId="stack"
            />
            <Bar 
              yAxisId="left" 
              dataKey="analyses" 
              name="Analyses" 
              fill={eventColors.analyses}
              barSize={20}
              stackId="stack"
            />
            
            {/* Ligne pour les événements mis en évidence */}
            {highlightedRoleIds && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="highlightedEvents"
                name="Mise en évidence"
                stroke={theme.palette.primary.main}
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
      
      {/* Liste des événements récents */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Événements récents
        </Typography>
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          {events.slice().sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5).map((event, index) => (
            <Box key={event.id} sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle1">
                {event.roleName || event.analysisName || "Événement sans nom"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDate(event.date)} - {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {event.description}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};

export default RoleHistoryTimeline; 
