import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Item categories — quiet-help text (prototype `uomCatHelpText().cat`). */
export const ITEM_CATEGORIES_HELP: HelpMap = {
  page: {
    title: 'Item categories',
    body: 'Organise your catalogue into the groups your team actually uses. Nest categories as deep as you need, colour-code each one for fast scanning, and reuse them when classifying items, posting groups and reports.',
  },
  parent: {
    title: 'Parent',
    body: 'The category this one sits under. A category with sub-categories shows as a group; top-level categories have no parent.',
  },
  items: {
    title: 'Items',
    body: 'How many items are classified under this category, including its sub-categories.',
  },
  status: {
    title: 'Status',
    body: 'Inactive categories are hidden from item pickers. Items already in one keep it.',
  },
  code: {
    title: 'Code',
    body: 'Short code used in reports, imports and filters, e.g. SBH. Letters and numbers only, up to 8 characters.',
  },
  name: {
    title: 'Category name',
    body: 'The name items carry and pickers show, e.g. Sambrani Holder. Renaming updates every item in the category.',
  },
  fParent: {
    title: 'Parent category',
    body: 'Nest this under any category, to any depth, or keep it top-level. A category can’t sit under itself or one of its own sub-categories.',
  },
  fColor: {
    title: 'Accent colour',
    body: 'The colour dot shown beside this category in lists, the tree and pickers, for fast scanning.',
  },
  fActive: {
    title: 'Active',
    body: 'On: offered when classifying items and shown in reports. Off: hidden from item pickers — items already in it keep it.',
  },
  desc: {
    title: 'Description',
    body: 'Optional. What belongs in this category.',
  },
}
