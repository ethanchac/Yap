import { BrowserRouter } from 'react-router-dom';
import AuthRoutes from './AuthRoutes'; // Import AuthRoutes

function App() {
  return (
    <div className="app-container" style={{ 
      minHeight: '100vh',
      backgroundColor: '#121212',
      fontFamily: 'Albert Sans',
      overflow: 'hidden' // Prevent scrollbars during transitions
    }}>
      <AuthRoutes />
    </div>
  );
}

export default App;