import { generateInformationalPageMetadata, renderInformationalPage } from '../informational-page'

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/support'>) {
  return generateInformationalPageMetadata(params, 'support')
}

export default async function SupportPage({
  params,
}: PageProps<'/[lang]/support'>) {
  return renderInformationalPage(params, 'support')
}
