import { Lead, PIPELINE_STAGES, SOURCE_LABELS } from '@/types/crm';
import { Phone, MessageCircle, Clock, MapPin, IndianRupee } from 'lucide-react';

interface LeadCardProps {
  lead: Lead;
  compact?: boolean;
}

const sourceColors: Record<string, string> = {
  whatsapp: 'bg-emerald-100 text-emerald-700',
  website: 'bg-blue-100 text-blue-700',
  instagram: 'bg-pink-100 text-pink-700',
  facebook: 'bg-indigo-100 text-indigo-700',
  phone: 'bg-amber-100 text-amber-700',
  landing_page: 'bg-purple-100 text-purple-700',
};

const LeadCard = ({ lead, compact }: LeadCardProps) => {
  const stage = PIPELINE_STAGES.find(s => s.key === lead.status);

  return (
    <div className="pipeline-card">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium text-sm text-foreground">{lead.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Phone size={10} />
            {lead.phone}
          </p>
        </div>
        <span className={`badge-pipeline text-[10px] ${sourceColors[lead.source] || 'bg-secondary text-secondary-foreground'}`}>
          {SOURCE_LABELS[lead.source]}
        </span>
      </div>

      {!compact && (
        <div className="space-y-1.5 mt-3">
          {lead.preferredLocation && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin size={11} /> {lead.preferredLocation}
            </p>
          )}
          {lead.budget && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <IndianRupee size={11} /> {lead.budget}
            </p>
          )}
          {lead.firstResponseTime !== undefined && (
            <p className="text-xs flex items-center gap-1.5">
              <Clock size={11} className={lead.firstResponseTime <= 5 ? 'text-emerald-500' : 'text-red-500'} />
              <span className={lead.firstResponseTime <= 5 ? 'text-emerald-600' : 'text-red-600'}>
                {lead.firstResponseTime} min response
              </span>
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-[9px] font-bold text-primary">{lead.assignedAgent.charAt(0)}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">{lead.assignedAgent.split(' ')[0]}</span>
        </div>
        <button className="p-1 rounded hover:bg-secondary transition-colors">
          <MessageCircle size={13} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default LeadCard;
