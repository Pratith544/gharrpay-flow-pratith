import { ReactNode } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  suffix?: string;
  color?: string;
}

const KpiCard = ({ title, value, change, icon, suffix, color }: KpiCardProps) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ background: color ? `${color}15` : 'hsl(var(--accent))' }}>
          <div style={{ color: color || 'hsl(var(--primary))' }}>{icon}</div>
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'stat-up' : isNegative ? 'stat-down' : 'text-muted-foreground'}`}>
            {isPositive ? <ArrowUp size={12} /> : isNegative ? <ArrowDown size={12} /> : null}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-display font-bold text-foreground">
        {value}{suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{title}</p>
    </div>
  );
};

export default KpiCard;
