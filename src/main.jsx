import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{color: 'red', padding: '20px', background: 'white', zIndex: 9999, position: 'relative'}}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error && typeof this.state.error.toString === 'function' ? this.state.error.toString() : 'Unknown Error'}</pre>
          <pre>{this.state.error && this.state.error.stack ? this.state.error.stack : ''}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
console.log("main.jsx executed successfully!");
