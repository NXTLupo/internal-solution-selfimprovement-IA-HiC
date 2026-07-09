import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export interface PricingPlan {
  /** Plan name ("Starter", "Team", "Enterprise"). */
  name: string;
  /** REAL display price ("$24") - never a placeholder. */
  price: string;
  /** Billing period suffix rendered after the price ("/mo"). */
  period?: string;
  /** Feature bullets for the plan. */
  features: string[];
  /** Call-to-action label ("Choose Team"). */
  cta: string;
}

export interface PricingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** The plan columns (the Figma anatomy carries three). */
  plans: PricingPlan[];
  /** Index of the featured plan: 1.5px accent border + "Popular" pill + accent CTA. */
  highlight?: number;
  /** Label on the featured plan's pill. */
  highlightLabel?: string;
  /** Fires with the plan index when a CTA is clicked. */
  onSelect?: (index: number) => void;
}

/** proto/Pricing (Figma 465:20) - tiered pricing: three plan cards, the featured tier
 * marked by a 1.5px accent border plus a "Popular" accent pill (text, not color alone),
 * real prices, feature lists, accent CTA on the featured tier and outline on the rest. */
export const Pricing = React.forwardRef<HTMLDivElement, PricingProps>(
  ({ plans, highlight, highlightLabel = 'Popular', onSelect, className, ...props }, ref) => (
    <div ref={ref} className={cn('grid grid-cols-3 items-stretch gap-3', className)} {...props}>
      {plans.map((plan, i) => {
        const featured = i === highlight;
        return (
          <div
            key={plan.name}
            className={cn(
              'flex flex-col gap-3 rounded-lg bg-paper p-5',
              featured ? 'border-[1.5px] border-brand-accent' : 'border border-hairline'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-title text-micro font-semibold text-ink">{plan.name}</span>
              {featured && <Badge className="rounded-full">{highlightLabel}</Badge>}
            </div>
            <span className="flex items-baseline gap-1">
              <span className="font-title text-kicker font-semibold leading-none text-ink">{plan.price}</span>
              {plan.period && <span className="text-nano text-grey">{plan.period}</span>}
            </span>
            <ul className="flex flex-col gap-1.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-1.5 text-nano leading-relaxed text-grey">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" strokeWidth={2.5} aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              variant={featured ? 'default' : 'outline'}
              size="sm"
              className="mt-auto w-full rounded-md"
              onClick={() => onSelect?.(i)}
            >
              {plan.cta}
            </Button>
          </div>
        );
      })}
    </div>
  )
);
Pricing.displayName = 'Pricing';
