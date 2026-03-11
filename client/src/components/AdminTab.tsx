import React, { useEffect, useState } from 'react';
import { AdminUser } from '../models';
import { deleteUserById, fetchAllUsers } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Typography,
    CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * AdminTab displays a list of all users for admin management.
 * Each row shows the user's username, book count, movie count, and game count.
 * Admins can delete any user except themselves.
 */
const AdminTab: React.FC = () => {
    const { username } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        const loadUsers = async () => {
            setLoading(true);
            try {
                const data = await fetchAllUsers();
                setUsers(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load users');
            } finally {
                setLoading(false);
            }
        };

        loadUsers();
    }, []);

    const handleDelete = async (user: AdminUser) => {
        const confirmed = window.confirm(`Delete user "${user.username}" and all their data?`);
        if (!confirmed) {
            return;
        }

        setDeletingId(user.id);
        try {
            await deleteUserById(user.id);
            setUsers((previous) => previous.filter((u) => u.id !== user.id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete user');
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return <Typography color="text.secondary">Loading…</Typography>;
    }

    if (error) {
        return <Typography color="error">Error: {error}</Typography>;
    }

    return (
        <>
            <Typography variant="h6" gutterBottom>All Users</Typography>
            {users.length === 0 && <Typography color="text.secondary">No users found.</Typography>}
            <TableContainer component={Paper}>
                <Table size="small" aria-label="admin users table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Username</TableCell>
                            <TableCell>Books</TableCell>
                            <TableCell>Movies</TableCell>
                            <TableCell>Games</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => {
                            const isSelf = user.username === username;
                            return (
                                <TableRow key={user.id} hover>
                                    <TableCell>
                                        {user.username}{' '}
                                        {user.isAdmin && <Chip size="small" label="admin" color="warning" sx={{ ml: 1 }} />}
                                    </TableCell>
                                    <TableCell>{user.bookCount}</TableCell>
                                    <TableCell>{user.movieCount}</TableCell>
                                    <TableCell>{user.gameCount}</TableCell>
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDelete(user)}
                                            disabled={isSelf || deletingId === user.id}
                                            title={isSelf ? 'Cannot delete your own account' : deletingId === user.id ? 'Deleting user' : 'Delete user'}
                                            aria-label={isSelf ? `Cannot delete ${user.username}` : deletingId === user.id ? `Deleting ${user.username}` : `Delete ${user.username}`}
                                        >
                                            {deletingId === user.id ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );
};

export default AdminTab;
