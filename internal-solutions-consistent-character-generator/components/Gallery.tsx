import React from 'react';
import { CheckIcon, DownloadIcon, TrashIcon } from './ui';

interface GalleryItem {
  id: string;
  imageUrl: string;
  title: string;
}

interface ImageCardProps {
  item: GalleryItem;
  isSelected: boolean;
  isDownloadable?: boolean;
  hideTitle?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ item, isSelected, isDownloadable, hideTitle, onSelect, onDelete }) => {
  const cardClasses = ['gallery-card'];
  if (onSelect) {
    cardClasses.push('interactive');
  }
  if (isSelected) {
    cardClasses.push('selected');
  }

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onSelect) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      className={cardClasses.join(' ')}
      onClick={onSelect}
      onKeyDown={handleCardKeyDown}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : -1}
      aria-pressed={onSelect ? isSelected : undefined}
    >
      <img src={item.imageUrl} alt={item.title || 'Generated preview'} />
      <div className="gallery-overlay" />

      <div className="gallery-actions">
        {isDownloadable && (
          <a
            href={item.imageUrl}
            download={`${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'scene'}.png`}
            onClick={(event) => event.stopPropagation()}
            className="gallery-chip download"
            aria-label="Download"
          >
            <DownloadIcon className="w-5 h-5" />
          </a>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="gallery-chip"
            aria-label="Delete"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {isSelected && onSelect && (
        <div className="selection-indicator" aria-hidden="true">
          <CheckIcon className="w-5 h-5" />
        </div>
      )}

      {!hideTitle && (
        <div className="gallery-titlebar">
          <p title={item.title}>{item.title || 'Untitled'}</p>
        </div>
      )}
    </div>
  );
};

interface GalleryProps {
  title: string;
  items: GalleryItem[];
  selectedIds?: string[];
  onItemSelect?: (id: string) => void;
  onItemDelete?: (id: string) => void;
  isDownloadable?: boolean;
  hideTitle?: boolean;
  emptyStateMessage: string;
}

export const Gallery: React.FC<GalleryProps> = ({
  title,
  items,
  selectedIds = [],
  onItemSelect,
  onItemDelete,
  isDownloadable,
  hideTitle,
  emptyStateMessage,
}) => {
  return (
    <section className="glass-panel gallery-container">
      <h2 className="gallery-title">{title}</h2>
      {items.length > 0 ? (
        <div className="gallery-grid">
          {items.map((item) => (
            <ImageCard
              key={item.id}
              item={item}
              isSelected={selectedIds.includes(item.id)}
              onSelect={onItemSelect ? () => onItemSelect(item.id) : undefined}
              onDelete={onItemDelete ? () => onItemDelete(item.id) : undefined}
              isDownloadable={isDownloadable}
              hideTitle={hideTitle}
            />
          ))}
        </div>
      ) : (
        <div className="gallery-empty">{emptyStateMessage}</div>
      )}
    </section>
  );
};
