import { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface IslandPanelProps {
  /** Title displayed in the panel header */
  title?: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Actions to display in the header (buttons, icons, etc.) */
  actions?: ReactNode;
  /** Main content of the panel */
  children: ReactNode;
  /** Additional CSS classes for customization */
  className?: string;
}

/**
 * Island Panel Component (Modernized with shadcn/ui)
 */
export default function IslandPanel({
  title,
  subtitle,
  actions,
  children,
  className = ''
}: IslandPanelProps) {
  return (
    <Card className={cn("rounded-2xl overflow-hidden shadow-lg border-none", className)}>
      {(title || actions) && (
        <CardHeader className="border-b bg-muted/30 py-4 px-5 space-y-0">
          <div className="flex-1 min-w-0">
            {title && <CardTitle className="text-base truncate">{title}</CardTitle>}
            {subtitle && <CardDescription className="mt-0.5 truncate">{subtitle}</CardDescription>}
          </div>

          {actions && (
            <CardAction className="flex items-center gap-2 ml-4 shrink-0">
              {actions}
            </CardAction>
          )}
        </CardHeader>
      )}

      <CardContent className="p-5">
        {children}
      </CardContent>
    </Card>
  );
}
