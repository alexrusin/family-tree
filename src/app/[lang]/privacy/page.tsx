import { generateInformationalPageMetadata, renderInformationalPage } from '../informational-page'

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/privacy'>) {
  return generateInformationalPageMetadata(params, 'privacy')
}

export default async function PrivacyPage({
  params,
}: PageProps<'/[lang]/privacy'>) {
  return renderInformationalPage(params, 'privacy')
}
