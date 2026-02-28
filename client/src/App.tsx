import React from 'react';
import { BrowserRouter as Router, Redirect, Route, Switch } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import VaultPage from './pages/VaultPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

const ProtectedRoute: React.FC<{ path: string; exact?: boolean; component: React.ComponentType }> = ({ component: Component, ...rest }) => {
    const { isAuthenticated } = useAuth();
    return (
        <Route
            {...rest}
            render={() =>
                isAuthenticated ? <Component /> : <Redirect to="/login" />
            }
        />
    );
};

const AppRoutes: React.FC = () => {
    return (
        <Switch>
            <Route exact path="/login" component={LoginPage} />
            <Route exact path="/signup" component={SignupPage} />
            <ProtectedRoute exact path="/" component={VaultPage} />
            <ProtectedRoute exact path="/books" component={VaultPage} />
            <ProtectedRoute exact path="/movies" component={VaultPage} />
            <ProtectedRoute exact path="/games" component={VaultPage} />
            <Redirect to="/" />
        </Switch>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <Router>
                <AppRoutes />
            </Router>
        </AuthProvider>
    );
};

export default App;