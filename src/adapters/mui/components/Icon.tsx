// MUI doesn't have its own icon set in our dependency footprint, so we reuse
// lucide-react across adapters. The Icon canonical's adapter divergence is
// minimal — both adapters render the same SVG.
export { ShadcnIcon as MaterialIcon } from '../../shadcn/components/Icon'
