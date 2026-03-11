import React, { useState, useEffect } from 'react';
import {
  Menu,
  MenuItem,
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
import Modal from './Modal';
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const open = Boolean(anchorEl);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const openSettings = () => {
      handleClose();
      setSettingsOpen(true);
  };
  const closeSettings = () => setSettingsOpen(false);

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
      <MenuItem>
        <Button fullWidth color="primary" onClick={openSettings}>
          Settings
        </Button>
      </MenuItem>
      <MenuItem>
        <Button fullWidth color="secondary" onClick={logout}>
          SIGN OUT
        </Button>
      </MenuItem>
      </Menu>

      <Modal show={settingsOpen} title="Settings" onClose={closeSettings} onConfirm={closeSettings} confirmText="Save">
        <Box sx={{ p: 1 }}>
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
              sx={{ width: 120, p: 0 }}
            />
            <TextField
              type="color"
              label="Secondary"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              sx={{ width: 120, p: 0 }}
            />
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default ProfileMenu;
