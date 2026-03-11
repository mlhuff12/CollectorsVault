import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { VaultItem } from '../models';
import { deleteItem, fetchItems } from '../services/api';
import {
    Box,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Typography,
    Chip,
} from '@mui/material';

/** Props accepted by {@link ItemList}. */
interface ItemListProps {
    /** Incremented by the parent to trigger a data refresh. */
    refreshKey?: number;
    /** Heading displayed above the list. */
    title?: string;
    /** When provided, only items of this category are shown. */
    categoryFilter?: VaultItem['category'];
}

/**
 * ItemList fetches and displays the authenticated user's vault items.
 * Each item can be deleted via the trash icon button.
 * Re-fetches whenever `refreshKey` changes.
 */
const ItemList: React.FC<ItemListProps> = ({ refreshKey = 0, title = "Collector's Vault Items", categoryFilter }) => {
    const [items, setItems] = useState<VaultItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        const loadItems = async () => {
            setLoading(true);
            try {
                const data = await fetchItems();
                setItems(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load items');
            } finally {
                setLoading(false);
            }
        };

        loadItems();
    }, [refreshKey]);

    const visibleItems = categoryFilter
        ? items.filter((item) => item.category === categoryFilter)
        : items;

    const handleDelete = async (item: VaultItem) => {
        const confirmed = window.confirm(`Delete "${item.title}"?`);

        if (!confirmed) {
            return;
        }

        setDeletingId(item.id);
        try {
            await deleteItem(item.id);
            setItems((previous) => previous.filter((entry) => entry.id !== item.id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete item');
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
        <Box>
            <Typography variant="h5" gutterBottom>
                {title}
            </Typography>
            {visibleItems.length === 0 && (
                <Typography color="text.secondary">
                    No items found in this category yet.
                </Typography>
            )}
            <List>
                {visibleItems.map((item) => (
                    <ListItem key={`${item.category}-${item.id}`} disableGutters>
                        <ListItemText
                            primary={item.title}
                            secondary={
                                <>
                                    {item.dateAdded && (
                                        <Typography variant="caption" color="textSecondary">
                                            Added {new Date(item.dateAdded).toLocaleDateString()}
                                        </Typography>
                                    )}
                                </>
                            }
                        />
                        <Chip label={item.category} size="small" sx={{ mr: 1 }} />
                        <ListItemSecondaryAction>
                            <IconButton
                                edge="end"
                                color="error"
                                onClick={() => handleDelete(item)}
                                disabled={deletingId === item.id}
                                title={
                                    deletingId === item.id ? 'Deleting item' : 'Delete item'
                                }
                                aria-label={
                                    deletingId === item.id
                                        ? 'Deleting item'
                                        : `Delete ${item.title}`
                                }
                                size="small"
                            >
                                {deletingId === item.id ? '…' : <FontAwesomeIcon icon={faTrashAlt} />}
                            </IconButton>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
        </Box>
    );
};

export default ItemList;