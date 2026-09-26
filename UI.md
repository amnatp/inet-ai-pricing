# Frontend UI

The frontend uses shadcn/ui (New York), Tailwind CSS v4, Radix primitives, and Lucide icons.
Components live in src/components/ui; shared class merging is in src/lib/utils.ts.
components.json configures the registry and @ alias. Theme tokens are in src/index.css.

Use the shared Button, Input, Textarea, Card, Badge, and Table components for new screens.
The existing Modal and Check helpers wrap the shared Dialog and Checkbox components.
Native select, radio, and remaining row checkboxes retain their existing form behavior.

Build: npm run build
Add components: npx shadcn@latest add <component>

The retained application layout rules are in the base layer so Tailwind component utilities
can take precedence. Specific layout compatibility rules follow that layer.
