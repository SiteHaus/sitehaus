const ProjectsLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return <div className="mx-auto max-w-2xl">{children}</div>;
};

export default ProjectsLayout;
