import { Button } from "@site-haus/ui/components/base/button";
import { Plus } from "lucide-react";

const ProjectsRoute = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold">Projects</h1>
      <p className="font-light tracking-wide">
        View all open projects for Site Haus.
      </p>
      <Button size="sm">
        New Project <Plus />
      </Button>
    </div>
  );
};

export default ProjectsRoute;
