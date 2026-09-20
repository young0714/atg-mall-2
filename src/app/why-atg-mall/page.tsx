import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why ATG Mall",
  description:
    "Why shop with ATG Mall? Transparent landed costs, worldwide shipping, sourcing expertise, consolidated shipping and real order tracking.",
  openGraph: {
    title: "Why ATG Mall",
    description: "Why shop with ATG Mall? Transparent landed costs, worldwide shipping, sourcing expertise, consolidated shipping and real order tracking.",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Why ATG Mall",
    description: "Why shop with ATG Mall? Transparent landed costs, worldwide shipping, sourcing expertise, consolidated shipping and real order tracking.",
    images: ["/logo.png"],
  },
};

export default function WhyAtgMallPage() {
  return <WhyChooseUs />;
}
