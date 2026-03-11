import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Drawer, List, ListItem, ListItemText, Box, Avatar } from '@mui/material';
import { Link } from 'react-router-dom';
import ProfileMenu from './ProfileMenu';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Books', path: '/books' },
  { label: 'Movies', path: '/movies' },
  { label: 'Games', path: '/games' },
  { label: 'Admin', path: '/admin', adminOnly: true },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const { isAdmin } = useAuth();

  const handleDrawerToggle = () => {
    setDrawerOpen((prev) => !prev);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
            {/* logo circle with "vc" letters */}
            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, fontSize: 14 }}>vc</Avatar>
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Collector's Vault
          </Typography>
          <ProfileMenu />
        </Toolbar>
      </AppBar>
      <Drawer open={drawerOpen} onClose={handleDrawerToggle}>
        <Box sx={{ width: 250 }} role="presentation" onClick={handleDrawerToggle} onKeyDown={handleDrawerToggle}>
          <List>
            {navItems.map(({ label, path, adminOnly }) => {
              if (adminOnly && !isAdmin) {
                return null;
              }
              return (
                <ListItem component={Link} to={path} key={label}>
                  <ListItemText primary={label} />
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 2 }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
