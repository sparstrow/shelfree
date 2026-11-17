/* Shelfree × shadcn/ui — class utilities.
 *
 * cn()  — shadcn's className composer. Here it's a clsx-style join (strings,
 *         arrays, and {class: cond} objects). NOTE: no tailwind-merge dedupe —
 *         at the Claude Code (B) handoff swap this for `twMerge(clsx(inputs))`.
 * cva() — faithful minimal class-variance-authority: base + variants +
 *         defaultVariants + compoundVariants, with class/className pass-through.
 */

export function cn(...inputs) {
  const out = [];
  const add = (v) => {
    if (!v) return;
    if (typeof v === 'string' || typeof v === 'number') out.push(String(v));
    else if (Array.isArray(v)) v.forEach(add);
    else if (typeof v === 'object') for (const k in v) if (v[k]) out.push(k);
  };
  inputs.forEach(add);
  return out.join(' ');
}

export function cva(base, config) {
  return (props = {}) => {
    const classes = [base];
    if (config && config.variants) {
      const defaults = config.defaultVariants || {};
      for (const key in config.variants) {
        const val = props[key] != null ? props[key] : defaults[key];
        if (val != null && config.variants[key][val]) classes.push(config.variants[key][val]);
      }
      for (const cv of config.compoundVariants || []) {
        const { class: cvClass, className: cvClassName, ...conds } = cv;
        const match = Object.keys(conds).every((k) => {
          const p = props[k] != null ? props[k] : defaults[k];
          return p === conds[k];
        });
        if (match) classes.push(cvClass || cvClassName);
      }
    }
    if (props.class) classes.push(props.class);
    if (props.className) classes.push(props.className);
    return cn(...classes);
  };
}
