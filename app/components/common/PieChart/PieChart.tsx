'use client';

import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

/**
 * Interface des props du composant PieChart
 * 
 * @property {any[]} data - Tableau de données à afficher dans le graphique
 * @property {string} valueField - Nom de la propriété contenant la valeur numérique à représenter
 * @property {string} nameField - Nom de la propriété contenant le libellé à afficher
 * @property {string} [title] - Titre optionnel du graphique
 */
export interface PieChartProps {
  /** Tableau de données à afficher dans le graphique */
  data: any[];
  /** Nom de la propriété contenant la valeur numérique à représenter */
  valueField: string;
  /** Nom de la propriété contenant le libellé à afficher */
  nameField: string;
  /** Titre optionnel du graphique */
  title?: string;
}

// Couleurs pour le graphique
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#EC7063', '#5D6D7E'];

/**
 * Composant PieChart pour afficher des données sous forme de graphique circulaire
 * 
 * Ce composant encapsule Recharts pour fournir un graphique circulaire simple
 * et configurable. Il filtre automatiquement les valeurs nulles ou négatives
 * et gère l'affichage des labels, tooltips et légendes.
 * 
 * @example
 * // Données d'exemple
 * const roleDistribution = [
 *   { role: 'Admin', count: 5 },
 *   { role: 'User', count: 25 },
 *   { role: 'Editor', count: 12 },
 *   { role: 'Viewer', count: 30 }
 * ];
 * 
 * // Graphique simple
 * <PieChart 
 *   data={roleDistribution}
 *   nameField="role"
 *   valueField="count"
 *   title="Distribution des Rôles"
 * />
 * 
 * // Dans un conteneur avec taille personnalisée
 * <Box sx={{ height: 400, width: '100%' }}>
 *   <PieChart 
 *     data={roleDistribution}
 *     nameField="role"
 *     valueField="count"
 *   />
 * </Box>
 */
const PieChart: React.FC<PieChartProps> = ({
  data,
  valueField,
  nameField,
  title
}) => {
  // Transformation des données pour le graphique
  const chartData = data.map(item => ({
    name: item[nameField] || 'Non défini',
    value: item[valueField] || 0
  })).filter(item => item.value > 0);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPieChart>
        <Pie
          data={chartData}
          labelLine={false}
          outerRadius={80}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${value}`, 'Quantité']} />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

export default PieChart; 

