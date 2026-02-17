import { redirect } from 'next/navigation'

export default function TrackerFromScratchPage() {
  redirect('/tracker?mode=manual')
}
