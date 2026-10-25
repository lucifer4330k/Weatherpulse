import { Loader2, AlertTriangle } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <Loader2 className={`${sizeClasses[size]} text-primary-500 animate-spin ${className}`} aria-hidden="true" />
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton ${className}`} />
  );
}

export function ErrorMessage({ message, onRetry, className = '' }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div className={`glass-card p-8 text-center ${className}`}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-white font-medium mb-1">Something went wrong</h3>
      <p className="text-neutral-400 text-sm mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          Try Again
        </button>
      )}
    </div>
  );
}

export function Tooltip({ children, content, position = 'top' }: { children: ReactElement; content: ReactNode; position?: 'top' | 'bottom' | 'left' | 'right' }) {
  // Simple tooltip implementation - in production, use a proper tooltip library
  return (
    <div className="relative inline-block" data-tooltip={typeof content === 'string' ? content : ''}>
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="glass-card p-8 text-center">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-neutral-800/50 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-white font-medium mb-1">{title}</h3>
      <p className="text-neutral-400 text-sm mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

export function Badge({ children, variant = 'default', className = '' }: { children: ReactNode; variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'; className?: string }) {
  const variants = {
    default: 'bg-neutral-700 text-neutral-300',
    primary: 'bg-primary-500/20 text-primary-300 border border-primary-500/30',
    success: 'bg-green-500/20 text-green-300 border border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-300 border border-red-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = '', padding = 'p-4' }: { children: ReactNode; className?: string; padding?: string }) {
  return (
    <div className={`glass-card ${padding} ${className}`}>
      {children}
    </div>
  );
}

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`divider ${className}`} />;
}