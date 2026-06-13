"use client";

const TicketsLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return <div className="pb-6">{children}</div>;
};

export default TicketsLayout;
