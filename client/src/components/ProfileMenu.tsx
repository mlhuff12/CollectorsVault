import React, { useState, useEffect } from 'react';
import {
  Menu,
  IconButton,
  Avatar,
  Typography,
  TextField,
  Button,
  Divider,
  FormControlLabel,
  Switch,
  Box,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../context/AuthContext';
import { useColorMode } from '../contexts/ColorModeContext';

const ProfileMenu: React.FC = () => {
  const { logout } = useAuth();
  const {
    mode,
    toggleColorMode,
    primaryColor,
    secondaryColor,
    setPrimaryColor,
    setSecondaryColor,
  } = useColorMode();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const [firstName, setFirstName] = useState<string>(() => localStorage.getItem('firstName') || '');
  const [lastName, setLastName] = useState<string>(() => localStorage.getItem('lastName') || '');

  useEffect(() => {
    localStorage.setItem('firstName', firstName);
  }, [firstName]);
  useEffect(() => {
    localStorage.setItem('lastName', lastName);
  }, [lastName]);

  const initials =
    firstName || lastName ? `${firstName.charAt(0) || ''}${lastName.charAt(0) || ''}`.toUpperCase() : '';

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleOpen}
        aria-label="User profile"
        aria-controls={open ? 'profile-menu' : undefined}
        aria-haspopup="true"
      >
        <Avatar>{initials || <PersonIcon />}</Avatar>
      </IconButton>
      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, width: 250 }}>
          <Typography variant="subtitle1">Profile</Typography>
          <TextField
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
            margin="dense"
          />
          <TextField
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
            margin="dense"
          />
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle1">Theme</Typography>
          <FormControlLabel
            control={<Switch checked={mode === 'dark'} onChange={toggleColorMode} />}
            label="Dark mode"
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <TextField
              type="color"
              label="Primary"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              sx={{ width: 60, p: 0 }}
            />
            <TextField
              type="color"
              label="Secondary"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              sx={{ width: 60, p: 0 }}
            />
          </Box>
          <Divider sx={{ my: 1 }} />
          <Button fullWidth color="secondary" onClick={logout}>
            Sign Out
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default ProfileMenu;
