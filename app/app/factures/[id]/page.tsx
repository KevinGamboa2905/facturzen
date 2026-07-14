import { BuilderPage } from "@/components/app/builder-page";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BuilderPage kind="FAC" id={id} basePath="/app" />;
}
