import {
  Shirt, Sparkles, Bed, Blinds, Flame, Baby, Footprints, Sofa,
  Package, Home, ClipboardList, Truck, Tag, Shapes,
} from 'lucide-react'

// Maps the icon names stored in the database (categories, cloth types,
// process steps) to lucide-react components.
const MAP = {
  shirt: Shirt,
  sparkles: Sparkles,
  bed: Bed,
  blinds: Blinds,
  flame: Flame,
  baby: Baby,
  footprints: Footprints,
  sofa: Sofa,
  package: Package,
  home: Home,
  'clipboard-list': ClipboardList,
  truck: Truck,
  tag: Tag,
}

export default function Icon({ name, size = 20, ...rest }) {
  const Cmp = MAP[name] || Shapes
  return <Cmp size={size} {...rest} />
}

export const ICON_NAMES = Object.keys(MAP)
