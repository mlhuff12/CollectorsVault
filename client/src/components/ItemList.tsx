import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { VaultItem } from '../types';
import { deleteItem, fetchItems } from '../services/api';

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
        const confirmed = window.confirm(`Delete \"${item.title}\"?`);

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
        return <div className="status-message">Loading...</div>;
    }

    if (error) {
        return <div className="status-message error">Error: {error}</div>;
    }

    return (
        <div className="items-section">
            <h2>{title}</h2>
            {visibleItems.length === 0 && <p className="status-message">No items found in this category yet.</p>}
            <ul className="items-list">
                {visibleItems.map(item => (
                    <li key={`${item.category}-${item.id}`} className="item-row">
                        <div className="item-title-group">
                            <span>{item.title}</span>
                            <span className={`category-badge ${item.category}`}>{item.category}</span>
                        </div>
                        <div className="item-actions">
                            {item.dateAdded && <small>Added {new Date(item.dateAdded).toLocaleDateString()}</small>}
                            <button
                                type="button"
                                className="danger-icon-button"
                                onClick={() => handleDelete(item)}
                                disabled={deletingId === item.id}
                                title={deletingId === item.id ? 'Deleting item' : 'Delete item'}
                                aria-label={deletingId === item.id ? 'Deleting item' : `Delete ${item.title}`}
                            >
                                {deletingId === item.id ? '…' : <FontAwesomeIcon icon={faTrashAlt} />}
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ItemList;