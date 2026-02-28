import React from 'react';
import { BrowserRouter as Router, Redirect, Route, Switch } from 'react-router-dom';
import VaultPage from './pages/VaultPage';

const App: React.FC = () => {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={VaultPage} />
        <Route exact path="/books" component={VaultPage} />
        <Route exact path="/movies" component={VaultPage} />
        <Route exact path="/games" component={VaultPage} />
        <Redirect to="/" />
      </Switch>
    </Router>
  );
};

export default App;