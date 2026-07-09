import * as React from 'react';
import { ProductCard } from 'nxt-proto-ds';

export const Standard = () => (
  <ProductCard
    category="Reports"
    name="2026 Benefits Benchmark Report"
    rating="4.8 · In stock"
    price="$249.00"
    addLabel="Add to cart"
  />
);

export const Wishlisted = () => (
  <ProductCard
    category="Toolkits"
    name="Plan Design Workshop Kit"
    price="$89.00"
    wishlisted
  />
);
