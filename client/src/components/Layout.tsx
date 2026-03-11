import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  Box,
  Avatar,
  useTheme,
  Tooltip,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import BookIcon from '@mui/icons-material/Book';
import MovieIcon from '@mui/icons-material/Movie';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BarcodeIcon from 'mdi-material-ui/Barcode';
import { Link, useLocation } from 'react-router-dom';
import ProfileMenu from './ProfileMenu';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { label: 'Home', path: '/', icon: <HomeIcon fontSize="small" /> },
  { label: 'Books', path: '/books', icon: <BookIcon fontSize="small" /> },
  { label: 'Movies', path: '/movies', icon: <MovieIcon fontSize="small" /> },
  { label: 'Games', path: '/games', icon: <SportsEsportsIcon fontSize="small" /> },
  { label: 'Admin', path: '/admin', icon: <AdminPanelSettingsIcon fontSize="small" />, adminOnly: true },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const { isAdmin } = useAuth();
  const location = useLocation();
  const theme = useTheme();

  const handleDrawerToggle = () => {
    setDrawerOpen((prev) => !prev);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
            {/* logo circle with "vc" letters */}
            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, fontSize: 14 }}>vc</Avatar>
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Collector's Vault
          </Typography>
          <Tooltip title="Scan Barcode">
            <IconButton
              color="inherit"
              aria-label="Scan barcode"
              onClick={() => window.dispatchEvent(new Event('open-scan-modal'))}
            >
              <BarcodeIcon />
            </IconButton>
          </Tooltip>
          <ProfileMenu />
        </Toolbar>
      </AppBar>
      <Drawer
        open={drawerOpen}
        onClose={handleDrawerToggle}
        PaperProps={{
          sx: {
            width: 240,
            bgcolor: theme.palette.background.paper,
          },
        }}
      >
        <Box sx={{ width: 240 }} role="presentation" onClick={handleDrawerToggle} onKeyDown={handleDrawerToggle}>
          <List>
            {navItems.map(({ label, path, adminOnly, icon }) => {
              if (adminOnly && !isAdmin) {
                return null;
              }
              const selected = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
              return (
                <ListItemButton
                  component={Link}
                  to={path}
                  key={label}
                  selected={selected}
                >
                  <ListItemIcon sx={{ color: selected ? 'primary.main' : 'inherit' }}>
                    {icon}
                  </ListItemIcon>
                  <ListItemText primary={label} />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 2, overflowY: 'auto', minHeight: 0 }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
