import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle, fallbackMessage } = this.props;

      return (
        <div className="max-w-3xl mx-auto my-8 px-4 sm:px-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#EBE8E0] shadow-sm text-center space-y-5">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-[#2D3630]">
                {fallbackTitle || 'তথ্য প্রদর্শনে সাময়িক সমস্যা হয়েছে'}
              </h3>
              <p className="text-xs sm:text-sm text-[#7A877E] max-w-md mx-auto leading-relaxed">
                {fallbackMessage ||
                  'পৃষ্ঠাটির তথ্য রেন্ডার করার সময় একটি সাময়িক ত্রুটি দেখা দিয়েছে। নিচের বাটনে ক্লিক করে পুনরায় চেষ্টা করুন।'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>পুনরায় লোড করুন</span>
              </button>

              <Link
                to="/"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F7F5F0] hover:bg-[#EBE8E0] text-[#2D3630] border border-[#EBE8E0] text-xs font-semibold transition-colors"
              >
                <Home className="w-4 h-4 text-[#5C665F]" />
                <span>হোমে ফিরে যান</span>
              </Link>
            </div>

            {/* Collapsible Technical Details (for debugging) */}
            {this.state.error && (
              <div className="pt-4 border-t border-[#EBE8E0]/70 text-left">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="inline-flex items-center gap-1.5 text-[11px] text-[#7A877E] hover:text-[#2D3630] font-mono transition-colors mx-auto"
                >
                  <span>কারিগরি বিবরণ</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {this.state.showDetails && (
                  <div className="mt-3 p-3.5 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] font-mono text-[11px] text-[#C25442] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    <strong>Error:</strong> {this.state.error.message || String(this.state.error)}
                    {this.state.errorInfo?.componentStack && (
                      <div className="mt-2 text-[#7A877E] text-[10px]">
                        <strong>Component Stack:</strong>
                        {this.state.errorInfo.componentStack}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
