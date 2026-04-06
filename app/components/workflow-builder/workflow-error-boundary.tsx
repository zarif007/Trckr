"use client";

import React, { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WorkflowErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Workflow builder error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div
            className={cn(
              theme.surface.card,
              theme.border.default,
              theme.radius.md,
              "p-8 max-w-md"
            )}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <h2 className="text-lg font-semibold">
                Workflow Builder Error
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Something went wrong while rendering the workflow builder. This
              could be due to invalid workflow data or a bug in the editor.
            </p>
            {this.state.error && (
              <details className="mb-4">
                <summary className="text-xs font-medium cursor-pointer hover:text-foreground">
                  Error details
                </summary>
                <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-x-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              <Button onClick={this.handleReset} size="sm">
                Reload Page
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
