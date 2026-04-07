"use client";

const TicketsLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return <div className="py-6">{children}</div>;
};

export default TicketsLayout;
