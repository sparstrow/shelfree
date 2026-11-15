import React from 'react';

/**
 * User avatar — shows initials with a deterministic colour derived from the name,
 * or a photo if `src` is provided. Used in the nav rail user pill and record cards.
 *
 * @startingPoint section="Components" subtitle="Avatar + Tabs — identity and navigation" viewport="700x180"
 */
export interface AvatarProps {
  /** Full name — used for initials and colour derivation */
  name: string;
  /** Override the background colour (any CSS colour string) */
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Photo URL — renders an `<img>` instead of initials */
  src?: string;
}
export declare function Avatar(props: AvatarProps): JSX.Element;

/**
 * Segmented tab control. Renders inside a muted pill container with active-tab highlight.
 * Used for list-view status filters (All · Open · Overdue · Paid) and sub-nav tabs.
 */
export interface TabItem {
  id: string;
  label: string;
  /** Optional count shown dimmed after the label */
  count?: number | string;
}
export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onSelect?: (id: string) => void;
}
export declare function Tabs(props: TabsProps): JSX.Element;
