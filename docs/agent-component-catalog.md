# Agent Component Catalog

This document is a machine-readable catalog of foundational UI components (Atoms) in the Style Atelier project.
It is automatically generated and synchronized on pre-commit to ensure AI agents and developers can easily reference available options.

> [!IMPORTANT]
> **Avoid using raw HTML tags** like `<button>`, `<input>`, or `<img>`. Instead, you MUST use the corresponding Atom components documented below.

## AdviceViewer

No description provided.

### Props

| Prop     | Type     | Required | Default | Description |
| -------- | -------- | -------- | ------- | ----------- |
| `advice` | `string` | Yes      | `-`     | -           |

## AiStatusBadge

No description provided.

### Props

| Prop         | Type                                                              | Required | Default | Description |
| ------------ | ----------------------------------------------------------------- | -------- | ------- | ----------- |
| `status`     | `string`                                                          | No       | `-`     | -           |
| `statusType` | `"ready" \| "downloading" \| "fallbackWebGpu" \| "fallbackModel"` | No       | `-`     | -           |

## Button

No description provided.

### Props

| Prop        | Type                                                           | Required | Default | Description |
| ----------- | -------------------------------------------------------------- | -------- | ------- | ----------- |
| `variant`   | `"primary" \| "secondary" \| "ghost" \| "danger" \| "outline"` | No       | `-`     | -           |
| `size`      | `"xs" \| "sm" \| "md" \| "lg" \| "icon"`                       | No       | `-`     | -           |
| `fullWidth` | `boolean`                                                      | No       | `-`     | -           |

## HelpTooltip

No description provided.

### Props

| Prop        | Type                                                                                                     | Required | Default | Description |
| ----------- | -------------------------------------------------------------------------------------------------------- | -------- | ------- | ----------- |
| `content`   | `string`                                                                                                 | Yes      | `-`     | -           |
| `position`  | `"top" \| "bottom" \| "left" \| "right" \| "top-left" \| "top-right" \| "bottom-left" \| "bottom-right"` | No       | `top`   | -           |
| `className` | `string`                                                                                                 | No       | `-`     | -           |

## IconButton

No description provided.

### Props

| Prop      | Type                                                               | Required | Default | Description |
| --------- | ------------------------------------------------------------------ | -------- | ------- | ----------- |
| `variant` | `"danger" \| "slate" \| "white" \| "indigo" \| "yellow" \| "blue"` | No       | `-`     | -           |
| `size`    | `"xs" \| "sm" \| "md" \| "lg"`                                     | No       | `-`     | -           |
| `rounded` | `boolean`                                                          | No       | `-`     | -           |

## ImageThumbnailItem

No description provided.

### Props

| Prop         | Type         | Required | Default | Description |
| ------------ | ------------ | -------- | ------- | ----------- |
| `imgUrl`     | `string`     | Yes      | `-`     | -           |
| `alt`        | `string`     | Yes      | `-`     | -           |
| `isSelected` | `boolean`    | Yes      | `-`     | -           |
| `orderLabel` | `string`     | Yes      | `-`     | -           |
| `onClick`    | `() => void` | Yes      | `-`     | -           |

## Input

No description provided.

### Props

No custom props.

## OpfsImage

No description provided.

### Props

| Prop  | Type     | Required | Default | Description |
| ----- | -------- | -------- | ------- | ----------- |
| `src` | `string` | No       | `-`     | -           |
| `alt` | `string` | Yes      | `-`     | -           |

## RarityBadge

No description provided.

### Props

| Prop   | Type                                          | Required | Default | Description |
| ------ | --------------------------------------------- | -------- | ------- | ----------- |
| `tier` | `"Common" \| "Rare" \| "Epic" \| "Legendary"` | Yes      | `-`     | -           |

## Tooltip

No description provided.

### Props

| Prop        | Type                                                                                                     | Required | Default | Description |
| ----------- | -------------------------------------------------------------------------------------------------------- | -------- | ------- | ----------- |
| `content`   | `string`                                                                                                 | Yes      | `-`     | -           |
| `position`  | `"top" \| "bottom" \| "left" \| "right" \| "top-left" \| "top-right" \| "bottom-left" \| "bottom-right"` | No       | `top`   | -           |
| `className` | `string`                                                                                                 | No       | `-`     | -           |
