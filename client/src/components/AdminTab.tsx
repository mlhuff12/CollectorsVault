import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { AdminUser } from '../types';
import { deleteUserById, fetchAllUsers } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
        return <div className="status-message">Loading...</div>;
    }

    if (error) {
        return <div className="status-message error">Error: {error}</div>;
    }

    return (
        <div className="items-section">
            <h2>All Users</h2>
            {users.length === 0 && <p className="status-message">No users found.</p>}
            <table className="admin-users-table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Books</th>
                        <th>Movies</th>
                        <th>Games</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => {
                        const isSelf = user.username === username;
                        return (
                            <tr key={user.id}>
                                <td>{user.username}{user.isAdmin && <span className="category-badge admin">admin</span>}</td>
                                <td>{user.bookCount}</td>
                                <td>{user.movieCount}</td>
                                <td>{user.gameCount}</td>
                                <td>
                                    <button
                                        type="button"
                                        className="danger-icon-button"
                                        onClick={() => handleDelete(user)}
                                        disabled={isSelf || deletingId === user.id}
                                        title={isSelf ? 'Cannot delete your own account' : deletingId === user.id ? 'Deleting user' : 'Delete user'}
                                        aria-label={isSelf ? `Cannot delete ${user.username}` : deletingId === user.id ? `Deleting ${user.username}` : `Delete ${user.username}`}
                                    >
                                        {deletingId === user.id ? '…' : <FontAwesomeIcon icon={faTrashAlt} />}
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default AdminTab;
