import { Navigate } from 'react-router-dom';

const Index = () => {
  // Redirect to dashboard as the main entry point
  return <Navigate to="/" replace />;
};

export default Index;
