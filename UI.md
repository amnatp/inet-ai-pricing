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

Local-charge tables show independent buying/selling currencies and units, minimums, status and Remark. Incomplete local imports display Error and remain inactive; missing UOM displays Unit not set. The upload dialog provides persistent history, corrections, retry and a downloadable CSV error report. See [the import contract](../docs/import-data-contract.md).

Customs/transport country controls display names while submitting country codes. Transport Port, Origin Location and Destination Location use the shared PortInput master lookup; lists use PortName for readable location labels. Province, city and postcode remain address inputs. Show Location mapping review notes in Remark; these notes alone do not change a legacy record's active status.

Customs/transport master location inputs offer ALL (All locations) alongside master suggestions. This wildcard is valid without a master code and does not remove country or other tariff restrictions.
