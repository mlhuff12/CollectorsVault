import React from 'react';
import { BrowserRouter as Router, Redirect, Route, Switch } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import VaultPage from './pages/VaultPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

/** Props accepted by {@link ProtectedRoute}. */
interface ProtectedRouteProps {
    path: string;
    exact?: boolean;
    component: React.ComponentType;
}

/**
 * ProtectedRoute wraps a {@link Route} and redirects unauthenticated users
 * to /login. Authenticated users are rendered the given component normally.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component, ...rest }) => {
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

/** Declares the application's client-side routes. */
const AppRoutes: React.FC = () => {
    return (
        <Switch>
            <Route exact path="/login" component={LoginPage} />
            <Route exact path="/signup" component={SignupPage} />
            <ProtectedRoute exact path="/" component={VaultPage} />
            <ProtectedRoute exact path="/books" component={VaultPage} />
            <ProtectedRoute exact path="/movies" component={VaultPage} />
            <ProtectedRoute exact path="/games" component={VaultPage} />
            <ProtectedRoute exact path="/admin" component={VaultPage} />
            <Redirect to="/" />
        </Switch>
    );
};

/** Root application component. Wraps the app in {@link AuthProvider} and a {@link Router}. */
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