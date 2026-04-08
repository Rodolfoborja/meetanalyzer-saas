import { motion } from 'framer-motion';
import { FileAudio, FolderOpen, Search, Plus } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: 'meetings' | 'folder' | 'search';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const icons = {
  meetings: FileAudio,
  folder: FolderOpen,
  search: Search,
};

export function EmptyState({
  icon = 'folder',
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const IconComponent = icons[icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <IconComponent className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
