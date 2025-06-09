'use client';

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export interface BarChartProps {
  data: any[];
  xField: string;
  yField: string;
  title?: string;
}

const processData = (data: any[], xField: string) => {
  // Créer des tranches de scores (0-20, 21-40, etc.)
  const ranges = [
    { min: 0, max: 20, label: '0-20%' },
    { min: 21, max: 40, label: '21-40%' },
    { min: 41, max: 60, label: '41-60%' },
    { min: 61, max: 80, label: '61-80%' },
    { min: 81, max: 100, label: '81-100%' }
  ];

  // Compter le nombre d'éléments dans chaque tranche
  const counts = ranges.map(range => ({
    range: range.label,
    count: data.filter(item => {
      const value = item[xField];
      return value >= range.min && value <= range.max;
    }).length
  }));

  return counts;
};

/**
 * Composant BarChart pour afficher des données sous forme de graphique à barres
 */
const BarChart: React.FC<BarChartProps> = ({
  data,
  xField,
  yField,
  title
}) => {
  const processedData = processData(data, xField);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart
        data={processedData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="range" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#8884d8" />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export default BarChart; 

