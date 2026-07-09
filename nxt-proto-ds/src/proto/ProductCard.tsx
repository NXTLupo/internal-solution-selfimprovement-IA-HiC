import * as React from 'react';
import { Heart, Image as ImageIcon, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../ui/button';

export interface ProductCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Product name - the card's heading. */
  name: string;
  /** Quiet category line above the name ("Outerwear"). */
  category?: string;
  /** Rating line rendered next to the filled star ("4.6 · In stock"). */
  rating?: string;
  /** Display price ("$128.00") - bind a REAL value, never a placeholder. */
  price: string;
  /** Product photo; omit to render the token-colored placeholder well. */
  imageSrc?: string;
  /** Alt text for the product photo. */
  imageAlt?: string;
  /** Primary action label. */
  addLabel?: string;
  onAdd?: () => void;
  /** Wishlist toggle state (drives aria-pressed on the heart button). */
  wishlisted?: boolean;
  onWishlistToggle?: () => void;
}

/** proto/Product (Figma 465:2) - e-commerce product card: 1:1 image well, category
 * kicker, name, star rating, price, accent add-to-cart plus outline wishlist heart. */
export const ProductCard = React.forwardRef<HTMLDivElement, ProductCardProps>(
  (
    {
      name,
      category,
      rating,
      price,
      imageSrc,
      imageAlt,
      addLabel = 'Add to cart',
      onAdd,
      wishlisted = false,
      onWishlistToggle,
      className,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn('flex w-[13.125rem] flex-col overflow-hidden rounded-lg border border-hairline bg-paper', className)}
      {...props}
    >
      {imageSrc ? (
        <img src={imageSrc} alt={imageAlt || name} className="aspect-square w-full object-cover" />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-ecru" aria-hidden="true">
          <ImageIcon className="h-6 w-6 text-grey" strokeWidth={1.5} />
        </div>
      )}
      <div className="flex flex-col gap-1.5 p-4">
        {category && <span className="text-nano text-grey">{category}</span>}
        <span className="font-title text-micro font-semibold leading-snug text-ink">{name}</span>
        {rating && (
          <span className="flex items-center gap-1 text-nano text-success">
            <Star className="h-3 w-3 shrink-0 fill-current" strokeWidth={0} aria-hidden="true" />
            {rating}
          </span>
        )}
        <span className="font-title text-label font-semibold text-ink">{price}</span>
        <div className="mt-1.5 flex items-center gap-2">
          <Button size="sm" onClick={onAdd} className="flex-1 rounded-md">
            {addLabel}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-md"
            aria-pressed={wishlisted}
            aria-label="Save to wishlist"
            onClick={onWishlistToggle}
          >
            <Heart className={cn('h-3.5 w-3.5', wishlisted ? 'fill-current text-rust' : 'text-ink')} strokeWidth={2} />
          </Button>
        </div>
      </div>
    </div>
  )
);
ProductCard.displayName = 'ProductCard';
