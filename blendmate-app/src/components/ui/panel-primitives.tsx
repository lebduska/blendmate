/**
 * Shared panel primitives for consistent UI across panels
 */

import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip';
import { useTranslation } from 'react-i18next';
import { getObjectCategory, getObjectsByCategory } from '@/domain/blender';

// ============================================================================
// GroupCard - Card with header, icon, count, and collapsible content
// ============================================================================

interface GroupCardProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  isEmpty?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function GroupCard({
  icon,
  label,
  count,
  isEmpty = false,
  children,
  className,
}: GroupCardProps) {
  const showEmpty = isEmpty || count === 0;

  return (
    <div
      className={cn(
        "rounded overflow-hidden",
        showEmpty && "opacity-50",
        className
      )}
      style={{ background: 'var(--islands-color-background-secondary)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-1.5"
        style={{
          borderBottom: showEmpty ? 'none' : '1px solid var(--islands-color-border-subtle)'
        }}
      >
        <span style={{ color: showEmpty ? 'var(--islands-color-text-tertiary)' : 'var(--blender-orange-light)' }}>
          {icon}
        </span>
        <span
          className="text-xs font-medium flex-1"
          style={{ color: showEmpty ? 'var(--islands-color-text-tertiary)' : 'var(--islands-color-text-primary)' }}
        >
          {label}
        </span>
        {showEmpty ? (
          <span
            className="text-[10px] italic"
            style={{ color: 'var(--islands-color-text-tertiary)' }}
          >
            none
          </span>
        ) : count !== undefined && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{
              background: 'var(--islands-color-background-elevated)',
              color: 'var(--islands-color-text-tertiary)',
            }}
          >
            {count}
          </span>
        )}
      </div>

      {/* Content */}
      {!showEmpty && children && (
        <div className="divide-y" style={{ borderColor: 'var(--islands-color-border-subtle)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ItemRow - Row with optional indicator, name, value, type, and action
// ============================================================================

interface ItemRowProps {
  name: string;
  value?: string;
  type?: string;
  enabled?: boolean;
  implicit?: boolean;
  showIndicator?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ItemRow({
  name,
  value,
  type,
  enabled = true,
  implicit = false,
  showIndicator = true,
  onClick,
  className,
}: ItemRowProps) {
  const hasAction = !!onClick;

  return (
    <button
      onClick={onClick}
      disabled={!hasAction}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors",
        hasAction && "hover:bg-[var(--islands-color-background-elevated)]",
        !hasAction && "cursor-default",
        className
      )}
    >
      {/* Status indicator */}
      {showIndicator && !implicit && (
        <span
          className={cn(
            "size-1.5 rounded-full shrink-0",
            enabled ? "bg-green-500" : "bg-red-500/50"
          )}
        />
      )}

      {/* Name and value/type */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-xs truncate",
              implicit
                ? "text-[var(--islands-color-text-tertiary)]"
                : enabled
                  ? "text-[var(--islands-color-text-primary)]"
                  : "text-[var(--islands-color-text-tertiary)]"
            )}
          >
            {name}
          </p>
          {value && (
            <p
              className="text-[10px] truncate ml-auto font-mono"
              style={{ color: 'var(--islands-color-text-secondary)' }}
            >
              {value}
            </p>
          )}
        </div>
        {type && !implicit && (
          <p className="text-[10px] truncate" style={{ color: 'var(--islands-color-text-tertiary)' }}>
            {type}
          </p>
        )}
      </div>

      {/* Action arrow */}
      {hasAction && (
        <ChevronRight
          className="size-3.5 shrink-0"
          style={{ color: 'var(--islands-color-text-tertiary)' }}
        />
      )}
    </button>
  );
}

// ============================================================================
// EmptyState - Centered empty state with icon and text
// ============================================================================

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center h-full gap-3 p-6 text-center", className)}>
      <div
        className="size-12 rounded-full flex items-center justify-center"
        style={{ background: 'var(--islands-color-background-elevated)' }}
      >
        <span style={{ color: 'var(--islands-color-text-tertiary)' }}>
          {icon}
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium" style={{ color: 'var(--islands-color-text-secondary)' }}>
          {title}
        </p>
        {description && (
          <p className="text-xs" style={{ color: 'var(--islands-color-text-tertiary)' }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ObjectHeader - Header showing object/item info with icon
// ============================================================================

interface ObjectHeaderProps {
  icon: React.ReactNode;
  name: string;
  type?: string;
  iconBackground?: string;
  className?: string;
}

export function ObjectHeader({
  icon,
  name,
  type,
  iconBackground = 'var(--blender-orange-dark)',
  className,
}: ObjectHeaderProps) {
  const { t } = useTranslation();

  // Get category info for tooltip
  const category = type ? getObjectCategory(type) : null;
  const siblings = category ? getObjectsByCategory(category).filter(s => s !== type) : [];

  return (
    <div
      className={cn("flex items-center gap-2 pb-2 border-b", className)}
      style={{ borderColor: 'var(--islands-color-border-subtle)' }}
    >
      <div
        className="size-8 rounded flex items-center justify-center shrink-0"
        style={{ background: iconBackground }}
      >
        <span className="text-white">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--islands-color-text-primary)' }}>
          {name}
        </p>
        {type && (
          <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--islands-color-text-tertiary)' }}>
            {category ? (
              <Tooltip delayDuration={300}>
                <TooltipTrigger className="cursor-help hover:underline">
                  {type}
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="max-w-xs p-3">
                  <div className="space-y-2">
                    {/* Category header */}
                    <div
                      className="text-[10px] font-semibold uppercase tracking-wide pb-1 border-b"
                      style={{
                        color: 'var(--blender-orange-light)',
                        borderColor: 'var(--islands-color-border-subtle)'
                      }}
                    >
                      {t(`object.categories.${category}.name`)}
                    </div>

                    {/* Description */}
                    <p className="text-xs" style={{ color: 'var(--islands-color-text-secondary)' }}>
                      {t(`object.descriptions.${type}`, { defaultValue: '' })}
                    </p>

                    {/* Siblings */}
                    {siblings.length > 0 && (
                      <div className="pt-1">
                        <p
                          className="text-[10px] mb-1"
                          style={{ color: 'var(--islands-color-text-tertiary)' }}
                        >
                          {t('object.siblings')}:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {siblings.map(sibling => (
                            <span
                              key={sibling}
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                background: 'var(--islands-color-background-elevated)',
                                color: 'var(--islands-color-text-secondary)'
                              }}
                            >
                              {t(`object.types.${sibling}`, { defaultValue: sibling })}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              type
            )}
          </div>
        )}
      </div>
    </div>
  );
}
