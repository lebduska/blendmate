import * as React from "react"

import {
  Group as ResizableGroup,
  Panel as ResizablePanelPrimitive,
  Separator as ResizableSeparator,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizableGroup>) {
  return (
    <ResizableGroup
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full",
        props.orientation === "vertical" ? "flex-col" : "flex-row",
        className
      )}
      {...props}
    />
  )
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePanelPrimitive>) {
  return <ResizablePanelPrimitive data-slot="resizable-panel" {...props} />
}

/**
 * Resizable handle with col-resize cursor.
 *
 * Wrapper div needed because react-resizable-panels Separator
 * doesn't properly apply cursor styles. The wrapper controls
 * cursor while the inner Separator handles drag logic.
 *
 * Note: ew-resize cursor doesn't work in WKWebView, use col-resize instead.
 */
function ResizableHandle({
  withHandle,
  className,
  style,
  ...props
}: React.ComponentProps<typeof ResizableSeparator> & {
  withHandle?: boolean
}) {
  return (
    <div
      data-slot="resizable-handle"
      className={className}
      style={{
        cursor: "col-resize",
        width: "24px",
        marginInline: "-10px", // 24px - 10px - 10px = 4px visual gap
        flexShrink: 0,
        zIndex: 10,
        ...style,
      }}
    >
      <ResizableSeparator
        style={{
          cursor: "col-resize",
          width: "100%",
          height: "100%",
          background: "transparent",
        }}
        {...props}
      />
    </div>
  )
}
export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
