import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorMessage } from '../../components/ErrorMessage';

type DashboardErrorBoundaryProps = {
  children: ReactNode;
};

type DashboardErrorBoundaryState = {
  hasError: boolean;
};

export class DashboardErrorBoundary extends Component<
  DashboardErrorBoundaryProps,
  DashboardErrorBoundaryState
> {
  override state: DashboardErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): DashboardErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Dashboard rendering failed.', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="dashboard-shell dashboard-error-shell">
          <ErrorMessage
            title="画面を表示できません"
            description="ページを再読み込みして、もう一度お試しください。"
          />
        </main>
      );
    }

    return this.props.children;
  }
}
