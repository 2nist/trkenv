import React from "react";
import dynamic from "next/dynamic";

const TimelineCPSPage = dynamic(() => import("../../src/components/TimelineCPS"), { ssr: false });

export default function Page({ params }: { params: { id: string } }) {
  return <TimelineCPSPage params={params} />;
}
