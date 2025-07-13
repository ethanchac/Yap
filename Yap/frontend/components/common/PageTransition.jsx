import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const PageTransition = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Start with page hidden
    setIsVisible(false);
    
    // Show the new page after a brief delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div 
      className={`transition-all duration-600 ${
        isVisible 
          ? 'opacity-100 blur-0' 
          : 'opacity-0 blur-sm'
      }`}
      style={{
        minHeight: '100vh',
        filter: isVisible ? 'blur(0px)' : 'blur(8px)',
        transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
