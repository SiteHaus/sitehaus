const ProjectsLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return <div className="mx-auto max-w-5xl py-6">{children}</div>;
};

export default ProjectsLayout;
