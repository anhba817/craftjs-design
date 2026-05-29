// MUI doesn't have a dedicated Video primitive — re-export the shadcn
// adapter so the native <video> player is consistent across adapters.
// The visual difference between adapters is dominated by the browser's
// built-in player chrome anyway.
export { ShadcnVideo as MaterialVideo } from '../../shadcn/components/Video'
