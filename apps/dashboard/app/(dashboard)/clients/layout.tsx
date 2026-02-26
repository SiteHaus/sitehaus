const ClientsLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return <div className="mx-auto max-w-5xl">{children}</div>;
};

export default ClientsLayout;
