import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why ATG Mall",
  description:
    "Why shop with ATG Mall — transparent landed costs, worldwide shipping, sourcing expertise, consolidated shipping and real order tracking.",
};

export default function WhyAtgMallPage() {
  return <WhyChooseUs />;
}
