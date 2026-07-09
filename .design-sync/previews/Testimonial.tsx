import * as React from 'react';
import { Testimonial } from 'nxt-proto-ds';

export const CustomerQuote = () => (
  <Testimonial
    quote="The citation trail is the whole product for us. Partners stopped asking where a number came from because the answer is already on the page."
    name="Alicia Moreno"
    role="VP Benefits, mid-market retailer"
    style={{ width: 480 }}
  />
);

export const ShortQuote = () => (
  <Testimonial
    quote="Our quarterly review went from three weeks of assembly to one afternoon of editing."
    name="Tom Okafor"
    role="Head of Ops, regional health system"
    style={{ width: 480 }}
  />
);
