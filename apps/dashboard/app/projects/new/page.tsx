import { CreateProjectForm } from "@site-haus/ui/components/forms/create-project-form";

const NewPageRoute = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">New Project</h1>

      <CreateProjectForm />
    </div>
  );
};

export default NewPageRoute;
