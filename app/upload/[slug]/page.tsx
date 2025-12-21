import UploadClient from "./UploadClient";

export default function UploadPage({ params }: { params: { slug: string } }) {
  return <UploadClient slug={params.slug} />;
}
